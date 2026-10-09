const NRC_GMAIL_TRIAGE_CONFIG = Object.freeze({
  query: 'in:inbox newer_than:2d',
  maxMessages: 100,
  // Only these headers and Gmail's short snippet are requested; bodies and attachments never are.
  metadataHeaders: ['From', 'Subject', 'List-Unsubscribe', 'Precedence', 'Auto-Submitted'],
  recipientProperty: 'NRC_GMAIL_ALERT_TO',
  seenProperty: 'NRC_GMAIL_SEEN',
  // A script property holds about 9 kB: 450 ids of 16 characters fit.
  maxSeenIds: 450,
  handler: 'checkNrcInbox',
  everyMinutes: 15,
  timeZone: 'America/Santiago',
  lockTimeoutMs: 30000,
});

const NRC_GMAIL_CATEGORIES = Object.freeze({
  inquiry: 'consulta',
  privacy: 'privacidad',
  complaint: 'reclamo',
  account: 'cuenta',
  bounce: 'rebote',
  form: 'formulario',
  notice: 'aviso',
  own: 'propio',
});

// Categories that reach Francisco, with the text of the alert line.
const NRC_GMAIL_ALERT_LABELS = Object.freeze({
  consulta: 'posible consulta',
  privacidad: 'pide no ser contactado o algo sobre sus datos',
  reclamo: 'reclamo o urgencia',
  cuenta: 'aviso de cuenta o cobro',
  rebote: 'correo no entregado',
});

const NRC_GMAIL_FORM_SENDER = 'forms-receipts-noreply@google.com';
const NRC_GMAIL_BOUNCE_SENDER = /^(mailer-daemon|postmaster)@/;
const NRC_GMAIL_AUTOMATED_SENDER = /^[^@]*(no[-_.]?reply|do[-_.]?not[-_.]?reply|notification|notificacion|alert|newsletter|mailer|bounce)[^@]*@/;
const NRC_GMAIL_BULK_PRECEDENCE = /^(bulk|list|junk)$/;

// All three are tested against text normalized by normalizeNrcMailText_.
const NRC_GMAIL_BOUNCE_SUBJECT = /\bdelivery status notification|\bundeliver|\bno se (pudo|ha podido) entregar|\bmensaje no entregado/;
const NRC_GMAIL_URGENT_SUBJECT = /\bsuspend|\bdesactivad|\binhabilitad|\bdeshabilitad|\bbloquead|\brechazad|\bdeclined|\bdisapproved|\bfailed|\bfallid|\bno se pudo (procesar|realizar|cobrar)|\bvenc(e|era|io|ido|imiento)\b|\bexpir|\baccion (requerida|necesaria)|\baction (required|needed)|\bactividad sospechosa|\bsuspicious|\bpago pendiente|\bpast due|\boverdue/;
const NRC_GMAIL_PRIVACY_TEXT = /\bno (me |nos )?(contacten|escriban|llamen|molesten)|\b(borr|elimin)(ar|en|a) mis datos|\bmis datos personales|\bdejen? de (escribir|llamar|contactar)|\bno quiero (mas|recibir)|\bdar(me)? de baja|\bderecho de (acceso|rectificacion|supresion|cancelacion|oposicion|portabilidad)|\bley 21 ?719|\bley 19 ?628/;
const NRC_GMAIL_COMPLAINT_TEXT = /\breclamo|\bqueja|\bdenuncia|\burgen|\bemergencia|\bestafa|\bsernac|\bdemanda/;

/**
 * Time-driven entry point (SPEC-006). Reads the headers of the new inbox
 * messages of the account that runs it and sends Francisco one alert when any
 * of them needs him. It never labels, marks as read, archives, deletes or
 * answers a message: the Gmail scope of this project is read-only.
 *
 * The first run only records what is already in the inbox, without alerting.
 */
function checkNrcInbox() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(NRC_GMAIL_TRIAGE_CONFIG.lockTimeoutMs)) throw new Error('Another inbox check is still running.');

  try {
    const properties = PropertiesService.getScriptProperties();
    const recipient = getNrcGmailAlertRecipient_(properties);
    const listed = listNrcInboxMessages_();
    const stored = properties.getProperty(NRC_GMAIL_TRIAGE_CONFIG.seenProperty);
    const seen = stored === null ? null : stored.split(',').filter(String);
    const listedIds = listed.map(function (message) { return message.id; });

    if (seen === null) {
      saveNrcSeenIds_(properties, listedIds, []);
      return logNrcTriageResult_({ baseline: true, checked: 0, alerted: 0 });
    }

    const fresh = listed.filter(function (message) { return seen.indexOf(message.id) < 0; });
    const ownAddress = fresh.length ? getNrcOwnAddress_() : '';
    const alerts = [];
    fresh.forEach(function (message) {
      const mail = readNrcMessageMeta_(message.id);
      const category = classifyNrcMail_(mail, ownAddress);
      if (!NRC_GMAIL_ALERT_LABELS[category]) return;
      // One line per thread: several new messages of a conversation are one thing to look at.
      if (alerts.some(function (alert) { return alert.threadId === mail.threadId; })) return;
      alerts.push({ category: category, threadId: mail.threadId, at: mail.at, domain: mail.domain });
    });

    // The alert goes out before the ids are saved: a failed send is retried on the next run.
    if (alerts.length) {
      const alert = buildNrcGmailAlert_(alerts, ownAddress);
      MailApp.sendEmail(recipient, alert.subject, alert.body);
    }
    saveNrcSeenIds_(properties, listedIds, seen);
    return logNrcTriageResult_({ baseline: false, checked: fresh.length, alerted: alerts.length });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Run from the editor to see what the rules make of the last two days. Returns
 * and logs counts per category only; sends nothing and remembers nothing.
 */
function previewNrcGmailTriage() {
  const ownAddress = getNrcOwnAddress_();
  const counts = {};
  listNrcInboxMessages_().forEach(function (message) {
    const category = classifyNrcMail_(readNrcMessageMeta_(message.id), ownAddress);
    counts[category] = (counts[category] || 0) + 1;
  });
  console.log(JSON.stringify(counts));
  return counts;
}

/**
 * Run once from the editor, signed in as the NRC account, after setting the
 * script property NRC_GMAIL_ALERT_TO. Running it again leaves a single trigger.
 */
function installNrcGmailTriageTrigger() {
  getNrcGmailAlertRecipient_(PropertiesService.getScriptProperties());
  uninstallNrcGmailTriageTrigger();
  ScriptApp.newTrigger(NRC_GMAIL_TRIAGE_CONFIG.handler)
    .timeBased()
    .everyMinutes(NRC_GMAIL_TRIAGE_CONFIG.everyMinutes)
    .create();
}

/** Stops the checks. The list of seen messages stays, so reinstalling does not repeat alerts. */
function uninstallNrcGmailTriageTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === NRC_GMAIL_TRIAGE_CONFIG.handler) ScriptApp.deleteTrigger(trigger);
  });
}

/**
 * mail: { from, subject, snippet, listUnsubscribe, precedence, autoSubmitted }.
 * Conservative on purpose: anything written by a person is at least a possible
 * inquiry, so an unknown sender reaches Francisco instead of being dropped.
 */
function classifyNrcMail_(mail, ownAddress) {
  const address = parseNrcMailAddress_(mail.from);
  const subject = normalizeNrcMailText_(mail.subject);

  if (address && address === String(ownAddress || '').toLowerCase()) return NRC_GMAIL_CATEGORIES.own;
  if (NRC_GMAIL_BOUNCE_SENDER.test(address) || NRC_GMAIL_BOUNCE_SUBJECT.test(subject)) return NRC_GMAIL_CATEGORIES.bounce;
  if (address === NRC_GMAIL_FORM_SENDER) return NRC_GMAIL_CATEGORIES.form;

  if (isNrcAutomatedMail_(mail, address)) {
    // Only the subject counts here: the body of a newsletter can mention anything.
    return NRC_GMAIL_URGENT_SUBJECT.test(subject) ? NRC_GMAIL_CATEGORIES.account : NRC_GMAIL_CATEGORIES.notice;
  }

  const text = (subject + ' ' + normalizeNrcMailText_(mail.snippet)).trim();
  if (NRC_GMAIL_PRIVACY_TEXT.test(text)) return NRC_GMAIL_CATEGORIES.privacy;
  if (NRC_GMAIL_COMPLAINT_TEXT.test(text)) return NRC_GMAIL_CATEGORIES.complaint;
  return NRC_GMAIL_CATEGORIES.inquiry;
}

function isNrcAutomatedMail_(mail, address) {
  const precedence = String(mail.precedence || '').trim().toLowerCase();
  const autoSubmitted = String(mail.autoSubmitted || '').trim().toLowerCase();
  return Boolean(String(mail.listUnsubscribe || '').trim())
    || NRC_GMAIL_BULK_PRECEDENCE.test(precedence)
    || (autoSubmitted !== '' && autoSubmitted !== 'no')
    || NRC_GMAIL_AUTOMATED_SENDER.test(address);
}

/**
 * alerts: [{ category, threadId, at, domain }]. The text carries no sender, no
 * subject and no message text: the kind of mail, when it arrived and the link
 * to open it. A service's domain is shown for account notices only.
 */
function buildNrcGmailAlert_(alerts, ownAddress) {
  const lines = alerts.map(function (alert) {
    const service = alert.category === NRC_GMAIL_CATEGORIES.account && alert.domain ? ' (' + alert.domain + ')' : '';
    const when = Utilities.formatDate(new Date(alert.at), NRC_GMAIL_TRIAGE_CONFIG.timeZone, 'dd-MM HH:mm');
    return '- ' + NRC_GMAIL_ALERT_LABELS[alert.category] + service + ' · ' + when + '\n  '
      + 'https://mail.google.com/mail/?authuser=' + encodeURIComponent(ownAddress) + '#all/' + alert.threadId;
  });
  return {
    subject: 'NRC correo: ' + alerts.length + ' por revisar',
    body: 'Correos nuevos por revisar en el buzón de NRC:\n\n' + lines.join('\n') + '\n',
  };
}

function listNrcInboxMessages_() {
  const response = Gmail.Users.Messages.list('me', {
    q: NRC_GMAIL_TRIAGE_CONFIG.query,
    maxResults: NRC_GMAIL_TRIAGE_CONFIG.maxMessages,
  });
  return (response && response.messages) || [];
}

function readNrcMessageMeta_(messageId) {
  const message = Gmail.Users.Messages.get('me', messageId, {
    format: 'metadata',
    metadataHeaders: NRC_GMAIL_TRIAGE_CONFIG.metadataHeaders,
  });
  const headers = {};
  ((message.payload && message.payload.headers) || []).forEach(function (header) {
    headers[String(header.name).toLowerCase()] = header.value;
  });
  const address = parseNrcMailAddress_(headers.from);
  return {
    threadId: message.threadId,
    at: Number(message.internalDate),
    from: headers.from,
    domain: address.slice(address.indexOf('@') + 1),
    subject: headers.subject,
    snippet: message.snippet,
    listUnsubscribe: headers['list-unsubscribe'],
    precedence: headers.precedence,
    autoSubmitted: headers['auto-submitted'],
  };
}

function getNrcOwnAddress_() {
  return String(Gmail.Users.getProfile('me').emailAddress || '').toLowerCase();
}

function getNrcGmailAlertRecipient_(properties) {
  const recipient = String(properties.getProperty(NRC_GMAIL_TRIAGE_CONFIG.recipientProperty) || '').trim();
  if (!/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(recipient)) {
    throw new Error('Set the script property NRC_GMAIL_ALERT_TO to one email address.');
  }
  return recipient;
}

// Newest first, so the cap drops the oldest ids.
function saveNrcSeenIds_(properties, listedIds, previousIds) {
  const ids = listedIds.slice();
  previousIds.forEach(function (id) { if (ids.indexOf(id) < 0) ids.push(id); });
  properties.setProperty(NRC_GMAIL_TRIAGE_CONFIG.seenProperty, ids.slice(0, NRC_GMAIL_TRIAGE_CONFIG.maxSeenIds).join(','));
}

// Counts only: no sender, subject or text is ever logged.
function logNrcTriageResult_(result) {
  console.log(JSON.stringify(result));
  return result;
}

function parseNrcMailAddress_(from) {
  const text = String(from === null || from === undefined ? '' : from);
  const bracketed = text.match(/<([^<>\s]+@[^<>\s]+)>\s*$/);
  const bare = text.match(/[^\s<>"]+@[^\s<>"]+/);
  return (bracketed ? bracketed[1] : bare ? bare[0] : '').toLowerCase();
}

// Same normalization as normalizeNrcText_ in automation/apps-script/AssignLeadId.gs.
function normalizeNrcMailText_(value) {
  return String(value === null || value === undefined ? '' : value)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
