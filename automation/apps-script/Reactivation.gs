const NRC_REACTIVATION_CONFIG = Object.freeze({
  sheetName: 'Recontacto',
  headers: ['#', 'Segmento', 'Toque', 'Mensaje', 'Texto', 'Enlace', 'Enviado', 'Fecha de envío', 'Respondió'],
  sentColumn: 7,
  sentAtColumn: 8,
  followUpHeader: 'Seguimiento',
  scheduledHeader: 'Agendo Visita',
  visitDateHeader: 'Fecha Visita',
  visitedHeader: 'Visita realizada',
  timeZone: 'America/Santiago',
  secondTouchDays: 4,
  thirdTouchDays: 10,
  // A form received this recently gets the first-contact text instead of a re-contact one.
  freshLeadDays: 3,
  // Compared after normalizeNrcText_. Any other value is left for manual review.
  yesValues: ['si', 's', 'x', 'true', '1'],
  noValues: ['', 'no', 'false', '0'],
  lockTimeoutMs: 30000,
  // Approved texts of specs/007-prospect-reactivation.md and PC-01 of specs/014-form-to-visit.md.
  // Reactivation.test.cjs fails when they differ from those tables.
  messages: {
    'PC-01': 'Hola {nombre}, ¿cómo estás? Te escribe Francisco Barrientos, de Nuestra Residencia Chile. Recibí tu solicitud y con gusto te ayudo. ¿Te gustaría agendar una visita para conocer la residencia? Recibimos de lunes a viernes, de 10:00 a 11:30 o de 14:00 a 16:00. ¿Qué día te acomoda?',
    'RC-01': 'Hola {nombre}, ¿cómo estás? Te escribe Francisco Barrientos, de Nuestra Residencia Chile. Hace un tiempo nos dejaste tus datos para conocer la residencia y me gustaría invitarte a visitarla. Recibimos visitas de lunes a viernes, de 10:00 a 11:30 o de 14:00 a 16:00. ¿Te acomoda algún día de esta semana o de la próxima?',
    'RC-02': 'Hola {nombre}, ¿cómo estás? Te escribe Francisco Barrientos, de Nuestra Residencia Chile. Quedó pendiente la visita que habíamos conversado y me gustaría retomarla. Recibimos visitas de lunes a viernes, de 10:00 a 11:30 o de 14:00 a 16:00. ¿Qué día te acomoda?',
    'RC-03': 'Hola {nombre}, ¿cómo estás? Te escribe Francisco Barrientos, de Nuestra Residencia Chile. Quería saber cómo han seguido pensando la decisión después de la visita y si quedó alguna duda que pueda resolver. Si quieren volver a recorrer la residencia con calma, coordinamos el día que les acomode.',
    'RC-04': 'Hola {nombre}, te escribo de nuevo por si no viste mi mensaje. Sigo disponible para coordinar una visita o resolver cualquier duda.',
    'RC-05': 'Hola {nombre}, no quiero molestarte: este es mi último mensaje. Si más adelante quieres conocer la residencia, escríbeme a este número y lo coordinamos. Y si prefieres que no te contacte más, dímelo con confianza.',
  },
});

/**
 * Run from the editor, signed in as the NRC account (SPEC-007, stage 1). Creates
 * the `Recontacto` tab when missing and adds one row per active prospect whose
 * next message is due, with the approved text and a wa.me link. Nothing is sent:
 * Francisco opens each link, sends, and ticks `Enviado`. Logs and returns counts
 * and row numbers only.
 */
function buildNrcReactivationDrafts(spreadsheetId) {
  const spreadsheet = openNrcSpreadsheet_(spreadsheetId);
  if (!spreadsheet) throw new Error('Open this script from the NRC response spreadsheet.');

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(NRC_REACTIVATION_CONFIG.lockTimeoutMs)) throw new Error('The sheet is busy.');
  let result;
  try {
    if (!spreadsheet.getSheetByName(NRC_REACTIVATION_CONFIG.sheetName)) {
      spreadsheet.insertSheet(NRC_REACTIVATION_CONFIG.sheetName).appendRow(NRC_REACTIVATION_CONFIG.headers);
    }
    result = queueNrcReactivation_(spreadsheet, { now: new Date() });
  } finally {
    lock.releaseLock();
  }
  console.log(JSON.stringify(result));
  return result;
}

/**
 * Called by the form-submit trigger after it assigns a new ID (SPEC-014, stage 1).
 * Does nothing until the `Recontacto` tab exists, and never lets a failure here
 * undo or block the ID assignment.
 */
function queueNrcFirstContactSafely_(sheet, id) {
  try {
    const spreadsheet = sheet.getParent();
    if (!spreadsheet.getSheetByName(NRC_REACTIVATION_CONFIG.sheetName)) return;
    // A row that has just arrived has no `Seguimiento` yet; the person asked to be contacted minutes ago.
    queueNrcReactivation_(spreadsheet, { now: new Date(), onlyId: id, allowBlankFollowUp: true });
  } catch (error) {
    console.error('The first-contact draft was not queued.');
  }
}

/** Simple trigger: stamps the send date when `Enviado` is ticked in the `Recontacto` tab. */
function onEdit(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  if (sheet.getName() !== NRC_REACTIVATION_CONFIG.sheetName) return;
  const row = e.range.getRow();
  if (row <= 1 || e.range.getColumn() !== NRC_REACTIVATION_CONFIG.sentColumn) return;
  if (!isNrcYes_(e.range.getValue())) return;

  const sentAt = sheet.getRange(row, NRC_REACTIVATION_CONFIG.sentAtColumn);
  if (isBlankNrcValue_(sentAt.getValue())) sentAt.setValue(new Date());
}

function queueNrcReactivation_(spreadsheet, options) {
  const config = NRC_REACTIVATION_CONFIG;
  const tab = spreadsheet.getSheetByName(config.sheetName);
  if (!tab) throw new Error('The Recontacto sheet was not found.');

  const result = {
    prospects: 0, queued: 0, alreadyQueued: 0, waiting: 0, finished: 0, replied: 0,
    notActive: 0, noPhone: 0, upcomingVisit: 0, removed: 0, reviewRows: [],
  };
  const prospects = readNrcReactivationProspects_(getNrcResponseSheet_(spreadsheet));
  const state = readNrcReactivationState_(tab);
  const stalePendingRows = [];

  Object.keys(prospects).forEach(function (key) {
    const prospect = prospects[key];
    if (options.onlyId !== undefined && prospect.id !== options.onlyId) return;
    result.prospects += 1;

    const history = state[key] || { sent: [], pendingRows: [], replied: false, undated: false };
    const next = chooseNrcNextTouch_(prospect, history, options, result);
    if (!next) {
      if (options.onlyId === undefined) Array.prototype.push.apply(stalePendingRows, history.pendingRows);
      return;
    }
    if (next === 'keep') return;

    const text = fillNrcReactivationText_(config.messages[next.message], prospect.firstName);
    tab.appendRow([
      prospect.id, next.segment, next.touch, next.message, text,
      'https://wa.me/' + prospect.phone + '?text=' + encodeURIComponent(text),
      false, '', false,
    ]);
    const row = tab.getLastRow();
    tab.getRange(row, config.sentColumn).insertCheckboxes();
    tab.getRange(row, config.headers.length).insertCheckboxes();
    result.queued += 1;
  });

  // Unsent drafts of prospects who stopped being eligible are withdrawn; sent rows stay as history.
  stalePendingRows.sort(function (a, b) { return b - a; }).forEach(function (row) {
    tab.deleteRow(row);
    result.removed += 1;
  });
  return result;
}

/** Returns the touch to queue, 'keep' when nothing changes, or null when the prospect must not be contacted. */
function chooseNrcNextTouch_(prospect, history, options, result) {
  const config = NRC_REACTIVATION_CONFIG;

  if (prospect.reviewRows.length) {
    Array.prototype.push.apply(result.reviewRows, prospect.reviewRows);
    return null;
  }
  const allowed = prospect.followUps.every(function (value) {
    return value === 'activo' || (options.allowBlankFollowUp && value === '');
  });
  if (!allowed) { result.notActive += 1; return null; }
  if (!prospect.phone) { result.noPhone += 1; return null; }
  if (history.replied) { result.replied += 1; return null; }
  if (prospect.visitDay && !prospect.visited && prospect.visitDay >= nrcSantiagoDay_(options.now)) {
    result.upcomingVisit += 1;
    return null;
  }
  if (history.pendingRows.length) { result.alreadyQueued += 1; return 'keep'; }
  if (history.sent.length >= 3) { result.finished += 1; return 'keep'; }
  // A ticked row without a date cannot be scheduled from; leave it for review.
  if (history.undated) { result.waiting += 1; return 'keep'; }

  const segment = prospect.visited ? 'C' : (prospect.scheduled ? 'B' : 'A');
  if (!history.sent.length) {
    const fresh = segment === 'A' && prospect.submittedAt
      && nrcDaysBetween_(prospect.submittedAt, options.now) <= config.freshLeadDays;
    if (fresh) return { touch: 1, segment: 'nuevo', message: 'PC-01' };
    return { touch: 1, segment: segment, message: { A: 'RC-01', B: 'RC-02', C: 'RC-03' }[segment] };
  }

  const sinceFirst = nrcDaysBetween_(history.sent[0], options.now);
  const sinceLast = nrcDaysBetween_(history.sent[history.sent.length - 1], options.now);
  if (history.sent.length === 1 && sinceFirst >= config.secondTouchDays) {
    return { touch: 2, segment: segment, message: 'RC-04' };
  }
  if (history.sent.length === 2 && sinceFirst >= config.thirdTouchDays && sinceLast >= config.secondTouchDays) {
    return { touch: 3, segment: segment, message: 'RC-05' };
  }
  result.waiting += 1;
  return 'keep';
}

/** Prospects with an ID, grouped by ID and reduced to what the cadence needs. */
function readNrcReactivationProspects_(sheet) {
  const config = NRC_REACTIVATION_CONFIG;
  const base = getNrcWhatsAppColumns_(sheet);
  const columns = {
    followUp: findNrcHeaderColumn_(sheet, config.followUpHeader),
    scheduled: findNrcHeaderColumn_(sheet, config.scheduledHeader),
    visited: findNrcHeaderColumn_(sheet, config.visitedHeader),
    visitDate: findNrcHeaderColumn_(sheet, config.visitDateHeader),
    timestamp: getNrcLeadIdColumns_(sheet).timestamp,
  };
  if (columns.followUp < 0 || columns.scheduled < 0 || columns.visited < 0) {
    throw new Error('The response sheet is missing a required header.');
  }

  const dataRows = Math.max(0, sheet.getLastRow() - NRC_LEAD_ID_CONFIG.headerRow);
  const prospects = {};
  if (!dataRows) return prospects;

  const firstRow = NRC_LEAD_ID_CONFIG.headerRow + 1;
  const read = function (column) {
    return column < 0 ? null : sheet.getRange(firstRow, column + 1, dataRows, 1).getValues();
  };
  const ids = read(base.id);
  const phones = read(base.phone);
  const names = read(base.contactName);
  const followUps = read(columns.followUp);
  const scheduled = read(columns.scheduled);
  const visited = read(columns.visited);
  const visitDates = read(columns.visitDate);
  const timestamps = read(columns.timestamp);

  for (let index = 0; index < dataRows; index += 1) {
    const id = parseNrcId_(ids[index][0]);
    if (id === null) continue;

    const prospect = prospects[id] || (prospects[id] = {
      id: id, phone: '', firstName: '', followUps: [], scheduled: false, visited: false,
      visitDay: '', submittedAt: null, reviewRows: [],
    });
    const phone = normalizeNrcPhone_(phones[index][0]);
    if (!prospect.phone && phone.length >= 10 && phone.length <= 15) prospect.phone = phone;
    if (!prospect.firstName) prospect.firstName = nrcFirstName_(names[index][0]);
    prospect.followUps.push(normalizeNrcText_(followUps[index][0]));

    [[scheduled, 'scheduled'], [visited, 'visited']].forEach(function (pair) {
      const value = normalizeNrcText_(pair[0][index][0]);
      if (config.yesValues.indexOf(value) >= 0) prospect[pair[1]] = true;
      else if (config.noValues.indexOf(value) < 0) prospect.reviewRows.push(firstRow + index);
    });

    const visitDate = visitDates ? nrcDateFromCell_(visitDates[index][0]) : null;
    if (visitDate) {
      const day = nrcSantiagoDay_(visitDate);
      if (day > prospect.visitDay) prospect.visitDay = day;
    }
    const submittedAt = nrcDateFromCell_(timestamps[index][0]);
    if (submittedAt && (!prospect.submittedAt || submittedAt.getTime() > prospect.submittedAt.getTime())) {
      prospect.submittedAt = submittedAt;
    }
  }
  return prospects;
}

/** What the `Recontacto` tab already holds for each ID. */
function readNrcReactivationState_(tab) {
  const config = NRC_REACTIVATION_CONFIG;
  const state = {};
  const dataRows = Math.max(0, tab.getLastRow() - 1);
  if (!dataRows) return state;

  const values = tab.getRange(2, 1, dataRows, config.headers.length).getValues();
  values.forEach(function (cells, index) {
    const id = parseNrcId_(cells[0]);
    if (id === null) return;

    const entry = state[id] || (state[id] = { sent: [], pendingRows: [], replied: false, undated: false });
    if (isNrcYes_(cells[config.headers.length - 1])) entry.replied = true;
    if (!isNrcYes_(cells[config.sentColumn - 1])) {
      entry.pendingRows.push(index + 2);
      return;
    }
    const sentAt = nrcDateFromCell_(cells[config.sentAtColumn - 1]);
    if (sentAt) entry.sent.push(sentAt);
    else entry.undated = true;
  });
  Object.keys(state).forEach(function (key) {
    state[key].sent.sort(function (a, b) { return a.getTime() - b.getTime(); });
  });
  return state;
}

function fillNrcReactivationText_(template, firstName) {
  return firstName ? template.replace('{nombre}', firstName) : template.replace(' {nombre}', '');
}

/** First word of the contact name when it looks like a name; otherwise the greeting goes without one. */
function nrcFirstName_(value) {
  const first = String(value === null || value === undefined ? '' : value).trim().split(/\s+/)[0];
  if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{2,20}$/.test(first)) return '';
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

function isNrcYes_(value) {
  return NRC_REACTIVATION_CONFIG.yesValues.indexOf(normalizeNrcText_(value)) >= 0;
}

/** Accepts a date cell or a day/month/year text; anything else is no date. */
function nrcDateFromCell_(value) {
  if (value && typeof value.getTime === 'function') return isNaN(value.getTime()) ? null : value;
  const match = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/.exec(String(value === null || value === undefined ? '' : value).trim());
  if (!match) return null;
  // Noon UTC keeps the same calendar day in Santiago.
  const date = new Date(Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1]), 12));
  return isNaN(date.getTime()) ? null : date;
}

function nrcSantiagoDay_(date) {
  return Utilities.formatDate(date, NRC_REACTIVATION_CONFIG.timeZone, 'yyyy-MM-dd');
}

/** Whole calendar days in Santiago between two moments. */
function nrcDaysBetween_(from, to) {
  const day = function (date) { return Date.parse(nrcSantiagoDay_(date) + 'T00:00:00Z'); };
  return Math.round((day(to) - day(from)) / 86400000);
}
