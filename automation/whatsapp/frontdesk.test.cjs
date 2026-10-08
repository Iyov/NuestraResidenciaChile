const assert = require('node:assert/strict');
const test = require('node:test');

const { classifyMessage, MOTIVES } = require('./classifier.cjs');
const { createFrontdesk, normalizePhone, shortName } = require('./frontdesk.cjs');
const { loadKnowledge, parseKnowledge } = require('./knowledge.cjs');

// Synthetic fixtures only: no real prospect, phone or message appears in this file.
const OWNER = '+56 9 0000 0001';
const KNOWN = '56900000022';
const OTHER_KNOWN = '56900000014';
const SHARED = '56900000099';
const STRANGER = '56900000555';
const AFTERNOON = '2026-10-09T18:00:00Z'; // 15:00 in Santiago
const NIGHT = '2026-10-10T02:30:00Z'; // 23:30 in Santiago

const ANSWER_BASE = [
  '| FAQ-02 | visita | Texto visita. | f | d | aprobada (Prueba, 2026-01-01) |',
  '| FAQ-03 | fin de semana | Texto fin de semana. | f | d | aprobada (Prueba, 2026-01-01) |',
  '| FAQ-05 | habitaciones | Texto habitaciones. | f | d | pendiente |',
  '| FAQ-08 | precio | Texto precio. | f | d | aprobada (Prueba, 2026-01-01); revisar |',
  '| MSG-01 | saludo | ¡Hola, buenas tardes! Soy Prueba. | aprobada (Prueba, 2026-01-01) |',
  '| MSG-02 | formulario | Texto formulario. | aprobada (Prueba, 2026-01-01) |',
  '| MSG-03 | derivación | Texto derivación. | aprobada (Prueba, 2026-01-01) |',
  '| MSG-05 | seguimiento | Texto seguimiento. | pendiente |',
].join('\n');

function setup(answerBase = ANSWER_BASE) {
  const sent = [];
  const notices = [];
  const rows = [];
  const logs = [];
  const processed = new Set();
  const chats = new Map();
  const sheet = [
    { id: 22, phone: KNOWN, contactName: 'Ana Prueba Ficticia' },
    { id: 14, phone: OTHER_KNOWN, contactName: 'Luis Ejemplo' },
    { id: 7, phone: SHARED, contactName: 'Eva Uno' },
    { id: 9, phone: SHARED, contactName: 'Eva Dos' },
  ];
  let sequence = 0;

  const frontdesk = createFrontdesk({
    knowledge: parseKnowledge(answerBase),
    prospects: {
      findByPhone: async (phone) => sheet.filter((row) => row.phone === phone),
      findPhonesById: async (id) => sheet.filter((row) => row.id === id).map((row) => row.phone),
    },
    messenger: {
      send: async (chatId, text) => { sent.push({ chatId, text }); },
      notifyOwner: async (text) => { notices.push(text); },
    },
    store: {
      markProcessed: async (eventId) => (processed.has(eventId) ? false : Boolean(processed.add(eventId))),
      getChat: async (key) => (chats.has(key) ? structuredClone(chats.get(key)) : null),
      putChat: async (key, chat) => { chats.set(key, structuredClone(chat)); },
      listChats: async () => Array.from(chats, ([key, chat]) => [key, structuredClone(chat)]),
    },
    events: { append: async (row) => { rows.push(row); } },
    log: (entry) => { logs.push(entry); },
  }, { ownerPhone: OWNER });

  const inbound = (phone, text, extra) => frontdesk.handleInbound(Object.assign({
    eventId: 'evt-' + (sequence += 1),
    chatId: phone,
    phone,
    kind: 'text',
    text,
    at: AFTERNOON,
  }, extra));
  const echo = (phone, extra) => frontdesk.handleEcho(Object.assign({
    eventId: 'evt-' + (sequence += 1),
    chatId: phone,
    phone,
    at: AFTERNOON,
  }, extra));

  return { frontdesk, inbound, echo, sent, notices, rows, logs, chats };
}

const texts = (sent) => sent.map((message) => message.text);

test('AC-001: a known question gets the approved wording, after one greeting', async () => {
  const { inbound, sent, notices, rows } = setup();

  assert.equal(await inbound(KNOWN, '¿Cuánto cuesta?'), 'FAQ-08');
  assert.equal(await inbound(KNOWN, 'y cómo agendo una visita'), 'FAQ-02');

  assert.deepEqual(texts(sent), ['¡Hola, buenas tardes! Soy Prueba.', 'Texto precio.', 'Texto visita.']);
  assert.deepEqual(notices, []);
  assert.deepEqual(rows.map((row) => [row.prospectId, row.type]), [[22, 'FAQ-08'], [22, 'FAQ-02']]);
});

test('the greeting follows the Santiago hour', async () => {
  const { inbound, sent } = setup();

  await inbound(KNOWN, 'precio', { at: NIGHT });

  assert.equal(sent[0].text, '¡Hola, buenas noches! Soy Prueba.');
});

test('AC-002: a question outside the base is handed over once, without a speculative answer', async () => {
  const { inbound, sent, notices, rows } = setup();

  assert.equal(await inbound(KNOWN, '¿Aceptan mascotas?'), 'derived');
  assert.equal(await inbound(KNOWN, '¿Y entonces?'), 'awaiting-owner');

  assert.deepEqual(texts(sent), ['¡Hola, buenas tardes! Soy Prueba.', 'Texto derivación.']);
  assert.deepEqual(notices, [
    'Tienes una respuesta pendiente de Nuestra Residencia · ID 22 · Ana P. · motivo: pregunta fuera de la base',
  ]);
  assert.deepEqual(rows, [
    { at: AFTERNOON, prospectId: 22, type: 'derivado: pregunta fuera de la base', derivation: 'pendiente' },
  ]);
});

test('reserved topics are handed over even when they also match an answer', async () => {
  const { inbound, sent, notices } = setup();

  await inbound(KNOWN, '¿Cuál es el precio con descuento?');
  await inbound(OTHER_KNOWN, 'Mi mamá tiene demencia, ¿puede hacer una visita?');

  assert.ok(!texts(sent).includes('Texto precio.'));
  assert.ok(!texts(sent).includes('Texto visita.'));
  assert.match(notices[0], /ID 22 · Ana P\. · motivo: precio o pago$/);
  assert.match(notices[1], /ID 14 · Luis E\. · motivo: salud o autovalencia$/);
});

test('an answer that is not approved is never sent', async () => {
  const { inbound, sent, notices } = setup();

  assert.equal(await inbound(KNOWN, '¿Qué tipos de habitación tienen?'), 'derived');

  assert.ok(!texts(sent).includes('Texto habitaciones.'));
  assert.equal(notices.length, 1);
});

test('audio or files are handed over', async () => {
  const { inbound, notices } = setup();

  await inbound(KNOWN, undefined, { kind: 'audio' });

  assert.match(notices[0], /motivo: audio o archivo$/);
});

test('AC-004: an unknown number gets the form once and no ID', async () => {
  const { inbound, sent, notices, rows } = setup();

  assert.equal(await inbound(STRANGER, 'Hola, ¿cuánto cuesta?'), 'form-sent');
  assert.equal(await inbound(STRANGER, '¿Me pueden responder?'), 'derived');
  assert.equal(await inbound(STRANGER, '¿Hola?'), 'awaiting-owner');

  assert.deepEqual(texts(sent), ['¡Hola, buenas tardes! Soy Prueba.', 'Texto formulario.']);
  assert.deepEqual(notices, [
    'Tienes una respuesta pendiente de Nuestra Residencia · sin ID · motivo: número desconocido',
  ]);
  assert.deepEqual(rows.map((row) => row.prospectId), [null, null]);
});

test('a phone that matches two IDs is handed over without choosing one', async () => {
  const { inbound, notices, rows } = setup();

  assert.equal(await inbound(SHARED, '¿Cuánto cuesta?'), 'derived');

  assert.match(notices[0], /· sin ID · motivo:/);
  assert.equal(rows[0].prospectId, null);
});

test('a message without a phone is treated as an unknown number', async () => {
  const { inbound, sent } = setup();

  assert.equal(await inbound(null, 'precio', { chatId: 'user-abc' }), 'form-sent');

  assert.deepEqual(sent.map((message) => message.chatId), ['user-abc', 'user-abc']);
});

test('AC-006: once Francisco writes from the app the assistant stays silent', async () => {
  const { inbound, echo, sent, rows } = setup();

  await inbound(KNOWN, '¿Aceptan mascotas?');
  const before = sent.length;
  assert.equal(await echo(KNOWN), 'taken-over');
  assert.equal(await inbound(KNOWN, '¿Cuánto cuesta?'), 'paused');
  await echo(KNOWN);

  assert.equal(sent.length, before);
  assert.deepEqual(rows.map((row) => [row.type, row.derivation]), [
    ['derivado: pregunta fuera de la base', 'pendiente'],
    ['tomado por Francisco', 'resuelta'],
  ]);
});

test('owner commands pause, resume and report by ID only', async () => {
  const { inbound, echo, sent, rows } = setup();
  const lastReply = () => sent[sent.length - 1];

  await echo(KNOWN);
  await inbound(OTHER_KNOWN, '¿Aceptan mascotas?');

  await inbound(OWNER, 'pausar 14');
  assert.equal(lastReply().text, 'Listo, asistente en pausa para el ID 14');
  await inbound(OWNER, 'estado');
  assert.equal(lastReply().text, 'En pausa: 14, 22. Pendientes: 14');

  await inbound(OWNER, 'Reactivar 22');
  assert.equal(lastReply().text, 'Listo, asistente activo para el ID 22');
  assert.equal(await inbound(KNOWN, 'precio'), 'FAQ-08');

  await inbound(OWNER, 'reactivar todos');
  assert.equal(lastReply().text, 'Listo, asistente activo en 1 chat');
  await inbound(OWNER, 'estado');
  assert.equal(lastReply().text, 'En pausa: ninguno. Pendientes: ninguno');

  await inbound(OWNER, 'reactivar 999');
  assert.equal(lastReply().text, 'No encuentro el ID 999 en la hoja');
  await inbound(OWNER, 'hola');
  assert.match(lastReply().text, /^No reconozco ese comando/);

  assert.deepEqual(rows.map((row) => row.type).filter((type) => /pausado|reactivado/.test(type)),
    ['pausado', 'reactivado', 'reactivado']);
});

test('commands are ignored when they do not come from the owner', async () => {
  const { inbound, echo } = setup();

  await echo(KNOWN);
  await inbound(OTHER_KNOWN, 'reactivar 22');

  assert.equal(await inbound(KNOWN, 'precio'), 'paused');
});

test('AC-008: a repeated webhook event changes nothing', async () => {
  const { frontdesk, sent, notices, rows } = setup();
  const event = { eventId: 'same', chatId: KNOWN, phone: KNOWN, kind: 'text', text: 'precio', at: AFTERNOON };

  assert.equal(await frontdesk.handleInbound(event), 'FAQ-08');
  assert.equal(await frontdesk.handleInbound(event), 'duplicate');
  assert.equal(await frontdesk.handleEcho(event), 'duplicate');

  assert.equal(sent.length, 2);
  assert.equal(notices.length, 0);
  assert.equal(rows.length, 1);
});

test('one reminder after two hours, in daytime only', async () => {
  const { frontdesk, inbound, notices } = setup();

  await inbound(KNOWN, '¿Aceptan mascotas?', { at: NIGHT });
  assert.equal(await frontdesk.sendDueReminders('2026-10-10T03:00:00Z'), 0); // 30 minutes later
  assert.equal(await frontdesk.sendDueReminders('2026-10-10T05:00:00Z'), 0); // 02:00 in Santiago
  assert.equal(await frontdesk.sendDueReminders('2026-10-10T12:05:00Z'), 1); // 09:05 in Santiago
  assert.equal(await frontdesk.sendDueReminders('2026-10-10T15:00:00Z'), 0);

  assert.equal(notices[1],
    'Recordatorio: sigue pendiente una respuesta de Nuestra Residencia · ID 22 · Ana P. · motivo: pregunta fuera de la base');
});

test('greetings and thanks do not raise a handover on their own', async () => {
  const { inbound, sent, notices } = setup();

  assert.equal(await inbound(KNOWN, 'Hola, buenas tardes'), 'greeted');
  assert.equal(await inbound(KNOWN, 'precio'), 'FAQ-08');
  assert.equal(await inbound(KNOWN, 'Muchas gracias'), 'no-reply');

  assert.equal(sent.length, 2);
  assert.deepEqual(notices, []);
});

test('AC-009: logs, sheet rows and notices carry no phone or message text', async () => {
  const { inbound, echo, logs, rows, notices } = setup();

  await inbound(KNOWN, 'Texto privado sobre mascotas');
  await inbound(STRANGER, 'Otro texto privado');
  await inbound(STRANGER, 'Más texto privado');
  await echo(KNOWN);

  const recorded = JSON.stringify([logs, rows, notices]);
  assert.ok(!/privado/.test(recorded));
  assert.ok(![KNOWN, STRANGER].some((phone) => recorded.includes(phone)));
  assert.ok(!recorded.includes('Ficticia'));
  assert.deepEqual(Object.keys(logs[0]).sort(), ['eventId', 'outcome', 'prospectId']);
});

test('a failure midway alerts Francisco and is not retried against the prospect', async () => {
  const { frontdesk, sent, notices, logs, rows } = setup();
  const event = { eventId: 'boom', chatId: KNOWN, phone: KNOWN, kind: 'text', text: 'precio', at: AFTERNOON };
  rows.push = () => { throw new Error('sheet unavailable'); };

  assert.equal(await frontdesk.handleInbound(event), 'error');
  assert.equal(await frontdesk.handleInbound(event), 'duplicate');

  assert.equal(sent.length, 2);
  assert.deepEqual(notices, ['No pude procesar un mensaje de Nuestra Residencia. Revisa el WhatsApp de NRC.']);
  assert.deepEqual(logs[logs.length - 1], { eventId: 'boom', prospectId: null, outcome: 'error' });
});

test('classifier: closed set of intents', () => {
  const faq = (text) => classifyMessage(text).faqId;
  const motive = (text) => classifyMessage(text).motive;

  assert.equal(faq('¿Dónde están ubicados?'), 'FAQ-01');
  assert.equal(faq('Quiero agendar una visita'), 'FAQ-02');
  assert.equal(faq('¿Puedo ir de visita el sábado?'), 'FAQ-03');
  assert.equal(faq('cual es el valor mensual'), 'FAQ-08');
  assert.equal(faq('¿Tienen página web?'), 'FAQ-10');

  assert.equal(motive('No me escriban más por favor'), MOTIVES.noContact);
  assert.equal(motive('¿Estoy hablando con un bot?'), MOTIVES.identity);
  assert.equal(motive('¿Hay cupos disponibles?'), MOTIVES.availability);
  assert.equal(motive('¿Cuánto vale la habitación doble?'), MOTIVES.commercial);
  assert.equal(motive('Tengo un reclamo'), MOTIVES.complaint);
  assert.equal(motive('precio y dirección por favor'), MOTIVES.outOfBase);
  assert.equal(motive('x'.repeat(201) + ' precio'), MOTIVES.outOfBase);
  assert.equal(motive(''), MOTIVES.outOfBase);

  assert.equal(classifyMessage('Hola, soy Ana').intent, 'greeting');
  assert.equal(classifyMessage('ok gracias').intent, 'closing');
});

test('helpers', () => {
  assert.equal(normalizePhone('+56 9 0000 0022'), '56900000022');
  assert.equal(normalizePhone('900000022'), '56900000022');
  assert.equal(shortName('  ana   prueba ficticia '), 'ana P.');
  assert.equal(shortName('Ana'), 'Ana');
  assert.equal(shortName(''), '');
});

test('the SPEC-002 annex parses and its required messages are approved', () => {
  const knowledge = loadKnowledge();

  ['MSG-01', 'MSG-02', 'MSG-03', 'MSG-05', 'FAQ-02', 'FAQ-03', 'FAQ-08'].forEach((id) => {
    assert.ok(knowledge.isApproved(id), id + ' should be approved');
  });
  assert.match(knowledge.approvedText('MSG-01'), /buenas tardes/);
  assert.match(knowledge.approvedText('FAQ-08'), /32 UF \+ IVA/);
  assert.ok(!/2\.500\.000|doble/i.test(knowledge.approvedText('FAQ-08')));
  assert.equal(knowledge.approvedText('FAQ-11'), null);
});
