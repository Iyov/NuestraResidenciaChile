const PURPOSES = Object.freeze({
  request: 'solicitud',
  news: 'novedades',
});

const CHANNELS = Object.freeze({
  phone: 'teléfono',
  whatsapp: 'whatsapp',
  email: 'correo',
});

// Channels named by each checkbox of the draft notice in specs/004-form-privacy-and-consent.md.
const FORM_CHANNELS = Object.freeze({
  [PURPOSES.request]: [CHANNELS.phone, CHANNELS.whatsapp, CHANNELS.email],
  [PURPOSES.news]: [CHANNELS.whatsapp, CHANNELS.email],
});

const REFUSALS = Object.freeze({
  unknown: 'finalidad o canal desconocido',
  desisted: 'prospecto desistió',
  noRecord: 'sin registro de permiso',
  withdrawn: 'autorización retirada',
  notGranted: 'sin autorización para esa finalidad',
  channel: 'canal no autorizado',
});

const FORM_SOURCE = 'formulario';

/**
 * Permission record of SPEC-004 as pure functions: nothing here reads the
 * sheet, sends a message or stores anything.
 *
 * versions: [{ version, from }], `from` being the instant that text went live
 * on the form. The form does not store which notice a person saw, so the
 * version is the one in force when they submitted. The list is empty until a
 * notice is published: every row is then a row without a record.
 */
function createNoticeHistory(versions) {
  const sorted = (versions || [])
    .map((entry) => ({ version: String(entry.version || ''), from: toMillis(entry.from) }))
    .sort((a, b) => a.from - b.from);
  if (sorted.some((entry) => !entry.version || isNaN(entry.from))) {
    throw new Error('Each notice version needs a name and the instant it went live.');
  }

  function versionAt(at) {
    const instant = toMillis(at);
    let found = null;
    for (const entry of sorted) {
      if (entry.from <= instant) found = entry.version;
    }
    return found;
  }

  return { versionAt };
}

/**
 * row: { submittedAt, requestAnswer, newsAnswer }, the two checkbox cells as
 * the form wrote them: the option text when ticked, empty when not.
 * Returns null for a row sent before any notice was live or without the
 * mandatory box, so that row never counts as a permission.
 */
function readFormConsent(history, row) {
  const noticeVersion = history.versionAt(row.submittedAt);
  if (!noticeVersion || !isTicked(row.requestAnswer)) return null;

  const grants = { [PURPOSES.request]: newGrant(PURPOSES.request) };
  if (isTicked(row.newsAnswer)) grants[PURPOSES.news] = newGrant(PURPOSES.news);

  return {
    source: FORM_SOURCE,
    at: new Date(toMillis(row.submittedAt)).toISOString(),
    noticeVersion,
    grants,
    optOut: null,
  };
}

/**
 * withdrawal: { purpose, at, source }. Without a purpose the person asked not
 * to be contacted at all, which also holds for a prospect that has no record.
 * The first withdrawal stays; a later one does not move its date.
 */
function withdraw(record, withdrawal) {
  const at = toMillis(withdrawal.at);
  if (isNaN(at)) throw new Error('Invalid withdrawal time.');
  const mark = { at: new Date(at).toISOString(), source: String(withdrawal.source || '') };
  const base = record || { source: null, at: null, noticeVersion: null, grants: {}, optOut: null };

  if (withdrawal.purpose === undefined || withdrawal.purpose === null) {
    return base.optOut ? base : Object.assign({}, base, { optOut: mark });
  }
  if (!Object.values(PURPOSES).includes(withdrawal.purpose)) throw new Error('Unknown purpose.');

  const grant = base.grants[withdrawal.purpose];
  if (!grant || grant.withdrawn) return base;
  return Object.assign({}, base, {
    grants: Object.assign({}, base.grants, {
      [withdrawal.purpose]: Object.assign({}, grant, { withdrawn: mark }),
    }),
  });
}

/**
 * The one question every outbound flow has to ask before writing to a prospect.
 * contact: { purpose, channel, desisted, inbound }
 *   desisted  the row is red in the sheet
 *   inbound   the person just wrote and this is the answer to that message
 * Returns { ok: true } or { ok: false, reason }. Answering an incoming message
 * is always allowed and changes nothing in the record: it does not bring back
 * follow-ups or news.
 */
function mayContact(record, contact) {
  const purpose = contact && contact.purpose;
  const channel = contact && contact.channel;
  if (!Object.values(PURPOSES).includes(purpose) || !Object.values(CHANNELS).includes(channel)) {
    return refuse(REFUSALS.unknown);
  }

  if (contact.inbound === true && purpose === PURPOSES.request) return { ok: true };
  if (contact.desisted !== false) return refuse(REFUSALS.desisted);
  if (!record) return refuse(REFUSALS.noRecord);
  if (record.optOut) return refuse(REFUSALS.withdrawn);

  const grant = record.grants[purpose];
  if (!grant) return refuse(record.noticeVersion ? REFUSALS.notGranted : REFUSALS.noRecord);
  if (grant.withdrawn) return refuse(REFUSALS.withdrawn);
  if (!grant.channels.includes(channel)) return refuse(REFUSALS.channel);
  return { ok: true };
}

function newGrant(purpose) {
  return { channels: FORM_CHANNELS[purpose].slice(), withdrawn: null };
}

function isTicked(cell) {
  return String(cell === null || cell === undefined ? '' : cell).trim() !== '';
}

function refuse(reason) {
  return { ok: false, reason };
}

function toMillis(at) {
  if (at === null || at === undefined || at === '') return NaN;
  return at instanceof Date ? at.getTime() : new Date(at).getTime();
}

module.exports = {
  CHANNELS,
  FORM_SOURCE,
  PURPOSES,
  REFUSALS,
  createNoticeHistory,
  mayContact,
  readFormConsent,
  withdraw,
};
