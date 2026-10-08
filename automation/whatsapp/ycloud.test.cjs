const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');

const {
  createYCloudMessenger,
  createYCloudWebhookHandler,
  parseYCloudEvent,
  verifyYCloudSignature,
} = require('./ycloud.cjs');

// Synthetic fixtures shaped like the examples in the YCloud documentation.
const SECRET = 'whsec_test';
const NOW = new Date('2026-10-09T18:00:00Z');
const BUSINESS = '+56900000000';
const CUSTOMER = '+56900000022';

const inboundText = {
  id: 'evt_in_1',
  type: 'whatsapp.inbound_message.received',
  apiVersion: 'v2',
  createTime: '2026-10-09T18:00:01.000Z',
  whatsappInboundMessage: {
    id: 'msg1',
    wamid: 'wamid.test',
    from: CUSTOMER,
    fromUserId: 'US.1',
    customerProfile: { name: 'Prueba' },
    to: BUSINESS,
    sendTime: '2026-10-09T18:00:00.000Z',
    type: 'text',
    text: { body: 'precio' },
  },
};

const echo = {
  id: 'evt_echo_1',
  type: 'whatsapp.smb.message.echoes',
  apiVersion: 'v2',
  createTime: '2026-10-09T18:05:01.000Z',
  whatsappMessage: {
    id: 'msg2',
    status: 'sent',
    from: BUSINESS,
    to: CUSTOMER,
    toUserId: 'US.1',
    sendTime: '2026-10-09T18:05:00.000Z',
    type: 'text',
    text: { body: 'Texto de prueba' },
  },
};

function sign(rawBody, secret = SECRET, at = NOW) {
  const t = Math.floor(at.getTime() / 1000);
  return 't=' + t + ',s=' + crypto.createHmac('sha256', secret).update(t + '.' + rawBody).digest('hex');
}

test('signature: accepts the documented scheme and rejects everything else', () => {
  const body = JSON.stringify(inboundText);

  assert.equal(verifyYCloudSignature(sign(body), body, SECRET, NOW), true);
  assert.equal(verifyYCloudSignature(sign(body), body + ' ', SECRET, NOW), false);
  assert.equal(verifyYCloudSignature(sign(body, 'other'), body, SECRET, NOW), false);
  assert.equal(verifyYCloudSignature(sign(body, SECRET, new Date(NOW.getTime() - 10 * 60 * 1000)), body, SECRET, NOW), false);
  assert.equal(verifyYCloudSignature('', body, SECRET, NOW), false);
  assert.equal(verifyYCloudSignature('t=abc,s=zz', body, SECRET, NOW), false);
  assert.throws(() => verifyYCloudSignature(sign(body), body, '', NOW));
});

test('parse: inbound text, inbound media, echo and unrelated events', () => {
  assert.deepEqual(parseYCloudEvent(inboundText), {
    kind: 'inbound',
    event: {
      eventId: 'evt_in_1',
      chatId: CUSTOMER,
      phone: CUSTOMER,
      kind: 'text',
      text: 'precio',
      at: '2026-10-09T18:00:00.000Z',
    },
  });

  const audio = structuredClone(inboundText);
  Object.assign(audio.whatsappInboundMessage, { type: 'audio', text: undefined, audio: { id: '1' } });
  assert.equal(parseYCloudEvent(audio).event.kind, 'other');
  assert.equal(parseYCloudEvent(audio).event.text, undefined);

  const noPhone = structuredClone(inboundText);
  delete noPhone.whatsappInboundMessage.from;
  assert.deepEqual([parseYCloudEvent(noPhone).event.chatId, parseYCloudEvent(noPhone).event.phone], ['US.1', null]);

  assert.deepEqual(parseYCloudEvent(echo), {
    kind: 'echo',
    event: { eventId: 'evt_echo_1', chatId: CUSTOMER, phone: CUSTOMER, at: '2026-10-09T18:05:00.000Z' },
  });

  assert.deepEqual(parseYCloudEvent({ id: 'evt_x', type: 'whatsapp.message.updated' }), { kind: 'ignored' });
  assert.deepEqual(parseYCloudEvent(null), { kind: 'ignored' });
});

test('webhook handler: verifies before dispatching', async () => {
  const calls = [];
  const handle = createYCloudWebhookHandler({
    secret: SECRET,
    now: () => NOW,
    frontdesk: {
      handleInbound: async (event) => { calls.push(['inbound', event.eventId]); },
      handleEcho: async (event) => { calls.push(['echo', event.eventId]); },
    },
  });
  const deliver = (payload, signature) => {
    const rawBody = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return handle({ rawBody, signature: signature === undefined ? sign(rawBody) : signature });
  };

  assert.equal(await deliver(inboundText, 't=1,s=' + '0'.repeat(64)), 401);
  assert.deepEqual(calls, []);

  assert.equal(await deliver(inboundText), 200);
  assert.equal(await deliver(echo), 200);
  assert.equal(await deliver({ id: 'evt_x', type: 'whatsapp.message.updated' }), 200);
  assert.equal(await deliver('not json'), 400);
  assert.deepEqual(calls, [['inbound', 'evt_in_1'], ['echo', 'evt_echo_1']]);
});

test('messenger: posts text to the direct-send endpoint and reports only the status on failure', async () => {
  const requests = [];
  let status = 200;
  const messenger = createYCloudMessenger({
    apiKey: 'key_test',
    businessPhone: BUSINESS,
    ownerPhone: '+56900000001',
    fetch: async (url, init) => {
      requests.push({ url, init });
      return { ok: status < 300, status };
    },
  });

  await messenger.send(CUSTOMER, 'Texto visita.');
  await messenger.notifyOwner('Aviso de prueba');

  assert.equal(requests[0].url, 'https://api.ycloud.com/v2/whatsapp/messages/sendDirectly');
  assert.equal(requests[0].init.headers['X-API-Key'], 'key_test');
  assert.deepEqual(JSON.parse(requests[0].init.body),
    { from: BUSINESS, to: CUSTOMER, type: 'text', text: { body: 'Texto visita.' } });
  assert.equal(JSON.parse(requests[1].init.body).to, '+56900000001');

  status = 403;
  await assert.rejects(messenger.send(CUSTOMER, 'Texto privado'), (error) =>
    /HTTP 403/.test(error.message) && !/privado|569/.test(error.message));
});
