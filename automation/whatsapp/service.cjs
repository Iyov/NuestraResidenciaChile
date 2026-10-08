const { createFrontdesk, normalizePhone } = require('./frontdesk.cjs');
const { parseKnowledge } = require('./knowledge.cjs');
const { createSheetPorts } = require('./sheet.cjs');
const { createD1Store } = require('./store.cjs');
const { createYCloudMessenger, createYCloudWebhookHandler } = require('./ycloud.cjs');

const REQUIRED_SETTINGS = [
  'YCLOUD_WEBHOOK_SECRET',
  'YCLOUD_API_KEY',
  'NRC_BUSINESS_PHONE',
  'NRC_OWNER_PHONE',
  'SHEET_ADAPTER_URL',
  'SHEET_ADAPTER_TOKEN',
  'STATE_KEY_SECRET',
];

/**
 * Wires the front desk to YCloud, the sheet adapter and the D1 database.
 * `env` carries the settings and the DB binding; `answerBase` is the text of
 * specs/002-faq-base.md.
 */
function createService(env, answerBase, overrides) {
  const missing = REQUIRED_SETTINGS.filter((name) => !env[name]);
  if (missing.length || !env.DB) {
    throw new Error('Missing settings: ' + missing.concat(env.DB ? [] : ['DB']).join(', '));
  }

  const fetchImpl = (overrides && overrides.fetch) || globalThis.fetch;
  const now = (overrides && overrides.now) || (() => new Date());

  let messenger = createYCloudMessenger({
    apiKey: env.YCLOUD_API_KEY,
    businessPhone: env.NRC_BUSINESS_PHONE,
    ownerPhone: env.NRC_OWNER_PHONE,
    fetch: fetchImpl,
  });
  // Shadow mode is the default: only the exact value "off" lets messages reach prospects.
  const shadow = env.SHADOW_MODE !== 'off';
  if (shadow) messenger = createShadowMessenger(messenger, env.NRC_OWNER_PHONE);

  const sheet = createSheetPorts({ url: env.SHEET_ADAPTER_URL, token: env.SHEET_ADAPTER_TOKEN, fetch: fetchImpl });
  const frontdesk = createFrontdesk({
    knowledge: parseKnowledge(answerBase),
    prospects: sheet.prospects,
    events: sheet.events,
    messenger,
    store: createD1Store(env.DB, { keySecret: env.STATE_KEY_SECRET }),
    log: (entry) => console.log(JSON.stringify(entry)),
  }, { ownerPhone: env.NRC_OWNER_PHONE });

  return {
    shadow,
    handleWebhook: createYCloudWebhookHandler({ frontdesk, secret: env.YCLOUD_WEBHOOK_SECRET, now }),
    sendDueReminders: () => frontdesk.sendDueReminders(now()),
  };
}

/** Nothing reaches a prospect: Francisco receives what would have been sent. */
function createShadowMessenger(messenger, ownerPhone) {
  const owner = normalizePhone(ownerPhone);
  return {
    send(chatId, text) {
      if (normalizePhone(chatId) === owner) return messenger.send(chatId, text);
      return messenger.notifyOwner('Modo sombra · habría respondido: ' + text);
    },
    notifyOwner: (text) => messenger.notifyOwner(text),
  };
}

module.exports = { createService, createShadowMessenger };
