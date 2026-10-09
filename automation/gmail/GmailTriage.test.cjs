const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const scriptSource = fs.readFileSync(path.join(__dirname, 'GmailTriage.gs'), 'utf8');

const OWN = 'buzon@nrc.example.test';
const RECIPIENT = 'responsable@example.test';
const SEEN = 'NRC_GMAIL_SEEN';

// Synthetic messages only.
function message(id, from, subject, extra = {}) {
  return Object.assign({ id, threadId: `t-${id}`, internalDate: String(Date.parse('2026-10-09T17:32:00Z')), from, subject, snippet: '' }, extra);
}

const person = (id, subject = 'Consulta', extra) => message(id, 'Persona Prueba <persona@example.test>', subject, extra);

function createContext({ inbox = [], properties = { NRC_GMAIL_ALERT_TO: RECIPIENT }, lockFree = true, sendFails = false } = {}) {
  const state = { inbox, properties: Object.assign({}, properties), sent: [], triggers: [], gets: [], logs: [], lockReleased: false };

  const context = {
    console: { log: (line) => state.logs.push(line) },
    Gmail: {
      Users: {
        getProfile: () => ({ emailAddress: OWN }),
        Messages: {
          list: (userId, options) => {
            state.listOptions = options;
            return state.inbox.length ? { messages: state.inbox.map(({ id, threadId }) => ({ id, threadId })) } : {};
          },
          get: (userId, id, options) => {
            state.gets.push(options);
            const found = state.inbox.find((entry) => entry.id === id);
            const headers = [
              ['From', found.from], ['Subject', found.subject], ['List-Unsubscribe', found.listUnsubscribe],
              ['Precedence', found.precedence], ['Auto-Submitted', found.autoSubmitted],
            ].filter(([, value]) => value !== undefined).map(([name, value]) => ({ name, value }));
            return { id, threadId: found.threadId, internalDate: found.internalDate, snippet: found.snippet, payload: { headers } };
          },
        },
      },
    },
    MailApp: {
      sendEmail: (to, subject, body) => {
        if (sendFails) throw new Error('Synthetic send failure.');
        state.sent.push({ to, subject, body });
      },
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (key) => (key in state.properties ? state.properties[key] : null),
        setProperty: (key, value) => { state.properties[key] = value; },
      }),
    },
    LockService: {
      getScriptLock: () => ({ tryLock: () => lockFree, releaseLock: () => { state.lockReleased = true; } }),
    },
    ScriptApp: {
      getProjectTriggers: () => state.triggers.slice(),
      deleteTrigger: (trigger) => { state.triggers = state.triggers.filter((entry) => entry !== trigger); },
      newTrigger: (handler) => {
        const trigger = { handler, getHandlerFunction: () => handler };
        const builder = {
          timeBased: () => builder,
          everyMinutes: (minutes) => { trigger.minutes = minutes; return builder; },
          create: () => { state.triggers.push(trigger); return trigger; },
        };
        return builder;
      },
    },
    Utilities: {
      formatDate: (date, timeZone) => {
        const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
          timeZone, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
        }).formatToParts(date).map((part) => [part.type, part.value]));
        return `${parts.day}-${parts.month} ${parts.hour}:${parts.minute}`;
      },
    },
  };
  vm.createContext(context);
  vm.runInContext(scriptSource, context);
  return { context, state };
}

function classify(mail) {
  const { context } = createContext();
  return context.classifyNrcMail_(mail, OWN);
}

test('a mail written by a person is a possible inquiry', () => {
  assert.equal(classify({ from: 'Persona Prueba <persona@example.test>', subject: 'Información', snippet: 'Hola, quisiera saber de la residencia' }), 'consulta');
  assert.equal(classify({ from: 'persona@example.test', subject: '', snippet: '' }), 'consulta');
  assert.equal(classify({ from: '', subject: '', snippet: '' }), 'consulta');
});

test('requests about personal data or not being contacted are named apart', () => {
  assert.equal(classify({ from: 'persona@example.test', subject: 'Por favor no me escriban más', snippet: '' }), 'privacidad');
  assert.equal(classify({ from: 'persona@example.test', subject: 'Solicitud', snippet: 'Pido eliminar mis datos según la Ley 21.719' }), 'privacidad');
});

test('complaints are named apart', () => {
  assert.equal(classify({ from: 'persona@example.test', subject: 'Reclamo', snippet: '' }), 'reclamo');
  assert.equal(classify({ from: 'persona@example.test', subject: 'Hola', snippet: 'Es urgente' }), 'reclamo');
});

test('automated mail is a notice unless its subject is urgent', () => {
  assert.equal(classify({ from: 'Servicio <ads-noreply@servicio.example.test>', subject: 'Novedades del mes' }), 'aviso');
  assert.equal(classify({ from: 'ventas@tienda.example.test', subject: 'Oferta', listUnsubscribe: '<mailto:baja@tienda.example.test>' }), 'aviso');
  assert.equal(classify({ from: 'equipo@lista.example.test', subject: 'Boletín', precedence: 'Bulk' }), 'aviso');
  assert.equal(classify({ from: 'persona@example.test', subject: 'Fuera de la oficina', autoSubmitted: 'auto-replied' }), 'aviso');
  assert.equal(classify({ from: 'persona@example.test', subject: 'Consulta', autoSubmitted: 'no' }), 'consulta');

  assert.equal(classify({ from: 'payments-noreply@servicio.example.test', subject: 'Tu pago fue rechazado' }), 'cuenta');
  assert.equal(classify({ from: 'no-reply@servicio.example.test', subject: 'Acción requerida: tu cuenta será suspendida' }), 'cuenta');
  assert.equal(classify({ from: 'notifications@servicio.example.test', subject: 'Tu dominio vence pronto' }), 'cuenta');
});

test('urgent words in the text of a newsletter do not make it urgent', () => {
  assert.equal(classify({ from: 'noreply@servicio.example.test', subject: 'Consejos', snippet: 'Evita que tu cuenta sea suspendida' }), 'aviso');
});

test('bounces, form receipts and own mail are recognized', () => {
  assert.equal(classify({ from: 'Mail Delivery Subsystem <mailer-daemon@googlemail.com>', subject: 'Delivery Status Notification (Failure)' }), 'rebote');
  assert.equal(classify({ from: 'correo@otro.example.test', subject: 'No se pudo entregar el mensaje' }), 'rebote');
  assert.equal(classify({ from: 'Formularios de Google <forms-receipts-noreply@google.com>', subject: 'Nueva respuesta' }), 'formulario');
  assert.equal(classify({ from: `NRC <${OWN.toUpperCase()}>`, subject: 'NRC correo: 1 por revisar' }), 'propio');
});

test('the display name does not decide who the sender is', () => {
  assert.equal(classify({ from: '"noreply@servicio.example.test" <persona@example.test>', subject: 'Hola' }), 'consulta');
});

test('the first run records the inbox without alerting', () => {
  const { context, state } = createContext({ inbox: [person('a1'), person('a2')] });

  const result = context.checkNrcInbox();

  assert.deepEqual({ ...result }, { baseline: true, checked: 0, alerted: 0 });
  assert.equal(state.sent.length, 0);
  assert.equal(state.gets.length, 0);
  assert.equal(state.properties[SEEN], 'a1,a2');
  assert.equal(state.lockReleased, true);
});

test('new mail that needs Francisco produces one alert without sender, subject or text', () => {
  const inbox = [
    person('b3', 'Asunto Secreto', { snippet: 'Texto privado del mensaje' }),
    message('b2', 'payments-noreply@servicio.example.test', 'Pago rechazado'),
    message('b1', 'boletin-noreply@servicio.example.test', 'Novedades'),
    person('a1'),
  ];
  const { context, state } = createContext({ inbox, properties: { NRC_GMAIL_ALERT_TO: RECIPIENT, [SEEN]: 'a1' } });

  const result = context.checkNrcInbox();

  assert.deepEqual({ ...result }, { baseline: false, checked: 3, alerted: 2 });
  assert.equal(state.sent.length, 1);
  const alert = state.sent[0];
  assert.equal(alert.to, RECIPIENT);
  assert.equal(alert.subject, 'NRC correo: 2 por revisar');
  assert.match(alert.body, /- posible consulta · 09-10 14:32\n {2}https:\/\/mail\.google\.com\/mail\/\?authuser=buzon%40nrc\.example\.test#all\/t-b3/);
  assert.match(alert.body, /- aviso de cuenta o cobro \(servicio\.example\.test\) · 09-10 14:32/);
  assert.doesNotMatch(alert.body, /Secreto|privado|Persona|persona@|t-b1/);
  assert.equal(state.properties[SEEN], 'b3,b2,b1,a1');
  assert.ok(state.logs.every((line) => !/Secreto|privado|persona/i.test(line)));
});

test('only headers are requested, never the body', () => {
  const { context, state } = createContext({ inbox: [person('b1')], properties: { NRC_GMAIL_ALERT_TO: RECIPIENT, [SEEN]: '' } });

  context.checkNrcInbox();

  assert.equal(state.listOptions.q, 'in:inbox newer_than:2d');
  assert.equal(state.gets.length, 1);
  assert.equal(state.gets[0].format, 'metadata');
});

test('a second run does not repeat an alert', () => {
  const { context, state } = createContext({ inbox: [person('b1')], properties: { NRC_GMAIL_ALERT_TO: RECIPIENT, [SEEN]: '' } });

  context.checkNrcInbox();
  const second = context.checkNrcInbox();

  assert.equal(state.sent.length, 1);
  assert.deepEqual({ ...second }, { baseline: false, checked: 0, alerted: 0 });
});

test('several new messages of one thread are one line', () => {
  const inbox = [person('b2', 'Consulta', { threadId: 't-1' }), person('b1', 'Consulta', { threadId: 't-1' })];
  const { context, state } = createContext({ inbox, properties: { NRC_GMAIL_ALERT_TO: RECIPIENT, [SEEN]: '' } });

  const result = context.checkNrcInbox();

  assert.equal(result.alerted, 1);
  assert.equal(state.sent[0].subject, 'NRC correo: 1 por revisar');
});

test('mail that needs nobody sends nothing and is remembered', () => {
  const inbox = [message('b1', 'boletin-noreply@servicio.example.test', 'Novedades'), message('b2', OWN, 'NRC correo: 1 por revisar')];
  const { context, state } = createContext({ inbox, properties: { NRC_GMAIL_ALERT_TO: RECIPIENT, [SEEN]: '' } });

  context.checkNrcInbox();

  assert.equal(state.sent.length, 0);
  assert.equal(state.properties[SEEN], 'b1,b2');
});

test('a failed send leaves the messages unseen so the next run retries', () => {
  const { context, state } = createContext({ inbox: [person('b1')], properties: { NRC_GMAIL_ALERT_TO: RECIPIENT, [SEEN]: 'a1' }, sendFails: true });

  assert.throws(() => context.checkNrcInbox(), /Synthetic send failure/);
  assert.equal(state.properties[SEEN], 'a1');
  assert.equal(state.lockReleased, true);
});

test('seen ids outside the current listing are kept, up to the cap', () => {
  const old = Array.from({ length: 460 }, (_, index) => `old${index}`);
  const { context, state } = createContext({ inbox: [person('b1')], properties: { NRC_GMAIL_ALERT_TO: RECIPIENT, [SEEN]: old.join(',') } });

  context.checkNrcInbox();

  const saved = state.properties[SEEN].split(',');
  assert.equal(saved.length, 450);
  assert.equal(saved[0], 'b1');
  assert.equal(saved[1], 'old0');
});

test('without a valid recipient nothing is read', () => {
  for (const value of [undefined, '', 'sin-arroba', 'a@example.test, b@example.test']) {
    const properties = value === undefined ? {} : { NRC_GMAIL_ALERT_TO: value };
    const { context, state } = createContext({ inbox: [person('b1')], properties });

    assert.throws(() => context.checkNrcInbox(), /NRC_GMAIL_ALERT_TO/);
    assert.equal(state.listOptions, undefined);
    assert.throws(() => context.installNrcGmailTriageTrigger(), /NRC_GMAIL_ALERT_TO/);
    assert.equal(state.triggers.length, 0);
  }
});

test('a busy lock stops the run', () => {
  const { context, state } = createContext({ inbox: [person('b1')], lockFree: false });

  assert.throws(() => context.checkNrcInbox(), /still running/);
  assert.equal(state.listOptions, undefined);
});

test('the preview counts categories and changes nothing', () => {
  const inbox = [person('b1'), person('b2'), message('b3', 'boletin-noreply@servicio.example.test', 'Novedades')];
  const { context, state } = createContext({ inbox });

  assert.deepEqual({ ...context.previewNrcGmailTriage() }, { consulta: 2, aviso: 1 });
  assert.equal(state.sent.length, 0);
  assert.equal(SEEN in state.properties, false);
});

test('installing twice leaves one trigger and uninstalling leaves none', () => {
  const { context, state } = createContext();
  state.triggers.push({ getHandlerFunction: () => 'otraFuncion' });

  context.installNrcGmailTriageTrigger();
  context.installNrcGmailTriageTrigger();

  const own = state.triggers.filter((trigger) => trigger.getHandlerFunction() === 'checkNrcInbox');
  assert.equal(own.length, 1);
  assert.equal(own[0].minutes, 15);

  context.uninstallNrcGmailTriageTrigger();
  assert.deepEqual(state.triggers.map((trigger) => trigger.getHandlerFunction()), ['otraFuncion']);
});
