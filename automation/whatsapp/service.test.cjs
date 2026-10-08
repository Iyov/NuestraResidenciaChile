const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { DatabaseSync } = require('node:sqlite');

const { createService } = require('./service.cjs');
const { createSheetPorts } = require('./sheet.cjs');
const { createD1Store } = require('./store.cjs');

// Synthetic fixtures only.
const NOW = new Date('2026-10-09T18:00:00Z');
const OWNER = '+56900000001';
const BUSINESS = '+56900000000';
const KNOWN = '56900000022';
const ADAPTER_URL = 'https://script.example.test/exec';
const YCLOUD_URL = 'https://api.ycloud.com/v2/whatsapp/messages/sendDirectly';
const ANSWER_BASE = [
  '| FAQ-08 | precio | Texto precio. | f | d | aprobada (Prueba, 2026-01-01) |',
  '| MSG-01 | saludo | ¡Hola, buenas tardes! Soy Prueba. | aprobada (Prueba, 2026-01-01) |',
  '| MSG-02 | formulario | Texto formulario. | aprobada (Prueba, 2026-01-01) |',
  '| MSG-03 | derivación | Texto derivación. | aprobada (Prueba, 2026-01-01) |',
].join('\n');

/** The subset of the Cloudflare D1 API that store.cjs uses, on an in-memory SQLite database. */
function createFakeD1() {
  const database = new DatabaseSync(':memory:');
  database.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
  const statement = (sql, values) => ({
    bind: (...bound) => statement(sql, bound),
    run: async () => ({ meta: { changes: Number(database.prepare(sql).run(...values).changes) } }),
    first: async () => database.prepare(sql).get(...values) || null,
    all: async () => ({ results: database.prepare(sql).all(...values) }),
  });
  return { prepare: (sql) => statement(sql, []), raw: database };
}

function createEnv(extra) {
  return Object.assign({
    YCLOUD_WEBHOOK_SECRET: 'whsec_test',
    YCLOUD_API_KEY: 'key_test',
    NRC_BUSINESS_PHONE: BUSINESS,
    NRC_OWNER_PHONE: OWNER,
    SHEET_ADAPTER_URL: ADAPTER_URL,
    SHEET_ADAPTER_TOKEN: 'synthetic-token-0123456789abcdef0123456789',
    STATE_KEY_SECRET: 'synthetic-state-key-0123456789abcdef',
    DB: createFakeD1(),
  }, extra);
}

function createFakeFetch() {
  const sentTo = [];
  const sheetCalls = [];
  const fetch = async (url, init) => {
    const body = JSON.parse(init.body);
    if (url === YCLOUD_URL) {
      sentTo.push([body.to, body.text.body]);
      return { ok: true, status: 200 };
    }
    assert.equal(url, ADAPTER_URL);
    sheetCalls.push(body.action);
    const answers = {
      findByPhone: { matches: body.phone === KNOWN ? [{ id: 22, contactName: 'Ana Prueba' }] : [] },
      findPhonesById: { phones: body.id === 22 ? [KNOWN] : [] },
      appendEvent: { ok: true },
    };
    return { ok: true, status: 200, json: async () => answers[body.action] };
  };
  return { fetch, sentTo, sheetCalls };
}

function delivery(id, from, text) {
  const rawBody = JSON.stringify({
    id,
    type: 'whatsapp.inbound_message.received',
    createTime: NOW.toISOString(),
    whatsappInboundMessage: { from, to: BUSINESS, sendTime: NOW.toISOString(), type: 'text', text: { body: text } },
  });
  const t = Math.floor(NOW.getTime() / 1000);
  const s = crypto.createHmac('sha256', 'whsec_test').update(t + '.' + rawBody).digest('hex');
  return { rawBody, signature: 't=' + t + ',s=' + s };
}

test('shadow mode is the default: answers go to Francisco, never to the prospect', async () => {
  const { fetch, sentTo, sheetCalls } = createFakeFetch();
  const service = createService(createEnv(), ANSWER_BASE, { fetch, now: () => NOW });

  assert.equal(service.shadow, true);
  assert.equal(await service.handleWebhook(delivery('evt_1', KNOWN, 'precio')), 200);
  assert.equal(await service.handleWebhook(delivery('evt_1', KNOWN, 'precio')), 200);

  assert.deepEqual(sentTo, [
    [OWNER, 'Modo sombra · habría respondido: ¡Hola, buenas tardes! Soy Prueba.'],
    [OWNER, 'Modo sombra · habría respondido: Texto precio.'],
  ]);
  assert.deepEqual(sheetCalls, ['findByPhone', 'appendEvent']);
});

test('with shadow mode off the approved answer reaches the prospect, and commands still work', async () => {
  const { fetch, sentTo } = createFakeFetch();
  const service = createService(createEnv({ SHADOW_MODE: 'off' }), ANSWER_BASE, { fetch, now: () => NOW });

  await service.handleWebhook(delivery('evt_1', KNOWN, 'precio'));
  await service.handleWebhook(delivery('evt_2', OWNER, 'pausar 22'));
  await service.handleWebhook(delivery('evt_3', KNOWN, 'precio'));
  await service.handleWebhook(delivery('evt_4', OWNER, 'estado'));

  assert.deepEqual(sentTo, [
    [KNOWN, '¡Hola, buenas tardes! Soy Prueba.'],
    [KNOWN, 'Texto precio.'],
    [OWNER, 'Listo, asistente en pausa para el ID 22'],
    [OWNER, 'En pausa: 22. Pendientes: ninguno'],
  ]);
});

test('an unsigned delivery is refused before any work', async () => {
  const { fetch, sentTo, sheetCalls } = createFakeFetch();
  const service = createService(createEnv(), ANSWER_BASE, { fetch, now: () => NOW });

  assert.equal(await service.handleWebhook({ rawBody: delivery('evt_1', KNOWN, 'precio').rawBody, signature: '' }), 401);
  assert.deepEqual([sentTo, sheetCalls], [[], []]);
});

test('missing settings stop the service at start', () => {
  assert.throws(() => createService(createEnv({ YCLOUD_API_KEY: '', DB: null }), ANSWER_BASE),
    /Missing settings: YCLOUD_API_KEY, DB/);
});

test('store: atomic first-seen, state round trip and no phone at rest', async () => {
  const db = createFakeD1();
  const store = createD1Store(db, { keySecret: 'synthetic-state-key-0123456789abcdef' });

  assert.equal(await store.markProcessed('evt_1'), true);
  assert.equal(await store.markProcessed('evt_1'), false);

  assert.equal(await store.getChat(KNOWN), null);
  await store.putChat(KNOWN, { prospectId: 22, paused: true, pending: null });
  assert.deepEqual(await store.getChat(KNOWN), { prospectId: 22, paused: true, pending: null });

  const [[listedKey, listedChat]] = await store.listChats();
  await store.putChat(listedKey, Object.assign(listedChat, { paused: false }));
  assert.deepEqual(await store.getChat(KNOWN), { prospectId: 22, paused: false, pending: null });
  assert.equal((await store.listChats()).length, 1);

  const stored = JSON.stringify(db.raw.prepare('SELECT * FROM chats').all());
  assert.ok(!stored.includes(KNOWN));
  assert.throws(() => createD1Store(db, { keySecret: 'short' }));
});

test('sheet client: sends the token and reports failures without details', async () => {
  const requests = [];
  let answer = { ok: true, status: 200, json: async () => ({ matches: [{ id: 22, contactName: 'Ana Prueba' }] }) };
  const ports = createSheetPorts({
    url: ADAPTER_URL,
    token: 'tok',
    fetch: async (url, init) => { requests.push(init); return answer; },
  });

  assert.deepEqual(await ports.prospects.findByPhone(KNOWN), [{ id: 22, contactName: 'Ana Prueba' }]);
  assert.deepEqual(JSON.parse(requests[0].body), { token: 'tok', action: 'findByPhone', phone: KNOWN });
  assert.equal(requests[0].redirect, 'follow');

  answer = { ok: true, status: 200, json: async () => ({ error: 'Unauthorized.' }) };
  await assert.rejects(ports.prospects.findByPhone(KNOWN), /refused "findByPhone"/);
  answer = { ok: true, status: 200, json: async () => { throw new Error('html'); } };
  await assert.rejects(ports.events.append({ at: NOW, prospectId: 22, type: 'FAQ-08', derivation: '' }), /did not answer with JSON/);
  answer = { ok: false, status: 500 };
  await assert.rejects(ports.prospects.findPhonesById(22), /HTTP 500/);
});
