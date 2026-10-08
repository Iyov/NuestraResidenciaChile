const crypto = require('node:crypto');

const YCLOUD_SEND_URL = 'https://api.ycloud.com/v2/whatsapp/messages/sendDirectly';
const SIGNATURE_TOLERANCE_SECONDS = 300;

/**
 * YCloud signs "<t>.<raw body>" with HMAC-SHA256 and sends "t=<unix seconds>,s=<hex>"
 * in the YCloud-Signature header. The raw body must be the bytes received, not re-serialized JSON.
 */
function verifyYCloudSignature(header, rawBody, secret, now) {
  if (!secret) throw new Error('The YCloud webhook secret is required.');

  const parts = Object.fromEntries(String(header || '').split(',').map((part) => {
    const index = part.indexOf('=');
    return index < 0 ? [part.trim(), ''] : [part.slice(0, index).trim(), part.slice(index + 1).trim()];
  }));
  if (!/^\d+$/.test(parts.t || '') || !/^[0-9a-f]{64}$/i.test(parts.s || '')) return false;

  const ageSeconds = Math.abs(toMillis(now) / 1000 - Number(parts.t));
  if (ageSeconds > SIGNATURE_TOLERANCE_SECONDS) return false;

  const expected = crypto.createHmac('sha256', secret).update(parts.t + '.' + rawBody).digest();
  return crypto.timingSafeEqual(expected, Buffer.from(parts.s, 'hex'));
}

/** Translates a YCloud webhook into the events `frontdesk.cjs` understands. */
function parseYCloudEvent(payload) {
  if (!payload || typeof payload !== 'object' || !payload.id) return { kind: 'ignored' };

  if (payload.type === 'whatsapp.inbound_message.received' && payload.whatsappInboundMessage) {
    const message = payload.whatsappInboundMessage;
    const chatId = message.from || message.fromUserId;
    if (!chatId) return { kind: 'ignored' };
    return {
      kind: 'inbound',
      event: {
        eventId: payload.id,
        chatId,
        phone: message.from || null,
        kind: message.type === 'text' ? 'text' : 'other',
        text: message.type === 'text' && message.text ? message.text.body : undefined,
        at: message.sendTime || payload.createTime,
      },
    };
  }

  // Sent by Francisco from the WhatsApp Business app (coexistence), not through the API.
  if (payload.type === 'whatsapp.smb.message.echoes' && payload.whatsappMessage) {
    const message = payload.whatsappMessage;
    const chatId = message.to || message.toUserId;
    if (!chatId) return { kind: 'ignored' };
    return {
      kind: 'echo',
      event: {
        eventId: payload.id,
        chatId,
        phone: message.to || null,
        at: message.sendTime || message.createTime || payload.createTime,
      },
    };
  }

  return { kind: 'ignored' };
}

/**
 * Returns the HTTP status for one webhook delivery. YCloud retries on anything
 * other than 2xx, and the front desk ignores event ids it has already processed.
 */
function createYCloudWebhookHandler(options) {
  const { frontdesk, secret } = options;
  const now = options.now || (() => new Date());

  return async function handleYCloudWebhook(request) {
    if (!verifyYCloudSignature(request.signature, request.rawBody, secret, now())) return 401;

    let payload;
    try {
      payload = JSON.parse(request.rawBody);
    } catch (error) {
      return 400;
    }

    const parsed = parseYCloudEvent(payload);
    if (parsed.kind === 'inbound') await frontdesk.handleInbound(parsed.event);
    if (parsed.kind === 'echo') await frontdesk.handleEcho(parsed.event);
    return 200;
  };
}

/** Messenger port for `frontdesk.cjs`. Only free-form text; templates are not implemented. */
function createYCloudMessenger(options) {
  const { apiKey, businessPhone, ownerPhone } = options;
  const fetchImpl = options.fetch || globalThis.fetch;
  if (!apiKey || !businessPhone || !ownerPhone) {
    throw new Error('The YCloud API key, business phone and owner phone are required.');
  }

  async function send(chatId, text) {
    const response = await fetchImpl(YCLOUD_SEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify({ from: businessPhone, to: chatId, type: 'text', text: { body: text } }),
    });
    // The response body can echo the recipient and message, so only the status is reported.
    if (!response.ok) throw new Error('YCloud rejected the message with HTTP ' + response.status + '.');
  }

  return {
    send,
    notifyOwner: (text) => send(ownerPhone, text),
  };
}

function toMillis(at) {
  return at instanceof Date ? at.getTime() : new Date(at).getTime();
}

module.exports = {
  createYCloudMessenger,
  createYCloudWebhookHandler,
  parseYCloudEvent,
  verifyYCloudSignature,
};
