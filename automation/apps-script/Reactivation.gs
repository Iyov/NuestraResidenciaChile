const NRC_REACTIVATION_CONFIG = Object.freeze({
  sheetName: 'Recontacto',
  headers: ['#', 'Segmento', 'Toque', 'Mensaje', 'Texto', 'Enlace', 'Enviado', 'Fecha de envío', 'Respondió', 'Resultado'],
  sentColumn: 7,
  sentAtColumn: 8,
  repliedColumn: 9,
  outcomeColumn: 10,
  statusHeader: 'Estado',
  admissionHeader: 'Ingresó?',
  // `Estado` holds Francisco's running notes ("Visitó. Le gustó."), so the script adds a
  // dated note at the end instead of replacing the cell.
  outcomeNotes: { 'quiere visita': 'Quiere visita', 'sigue pensando': 'Sigue pensando', 'desistió': 'Desistió' },
  outcomeOptions: ['quiere visita', 'sigue pensando', 'desistió'],
  withdrawnOutcome: 'desistió',
  // Written to `Seguimiento` and `Ingresó?` with the spelling Francisco uses.
  withdrawnValue: 'Desistió',
  // Values of `Ingresó?` that a withdrawal may replace, after normalizeNrcText_.
  openAdmissionValues: ['', 'no aun'],
  sentNote: 'Recontactado',
  repliedNote: 'Respondió',
  firstContactNote: 'Contactado',
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
    const config = NRC_REACTIVATION_CONFIG;
    let tab = spreadsheet.getSheetByName(config.sheetName);
    if (!tab) {
      tab = spreadsheet.insertSheet(config.sheetName);
      tab.appendRow(config.headers);
    }
    // A tab created before `Resultado` existed gets the new header.
    tab.getRange(1, config.outcomeColumn).setValue(config.headers[config.outcomeColumn - 1]);
    result = queueNrcReactivation_(spreadsheet, { now: new Date() });

    const dataRows = tab.getLastRow() - 1;
    if (dataRows > 0) {
      tab.getRange(2, config.outcomeColumn, dataRows, 1).setDataValidation(
        SpreadsheetApp.newDataValidation().requireValueInList(config.outcomeOptions, true).build()
      );
    }
  } finally {
    lock.releaseLock();
  }
  console.log(JSON.stringify(result));
  return result;
}

/**
 * Simple trigger: opening the spreadsheet refreshes the drafts, so nobody has to
 * run the function by hand. Does nothing until the `Recontacto` tab exists.
 */
function onOpen() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (!spreadsheet || !spreadsheet.getSheetByName(NRC_REACTIVATION_CONFIG.sheetName)) return;
    buildNrcReactivationDrafts();
  } catch (error) {
    console.error('The Recontacto tab was not refreshed.');
  }
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

/**
 * Simple trigger, limited to the `Recontacto` tab. Ticking `Enviado` stamps the
 * send date and adds a dated note to the prospect's `Estado`; picking a
 * `Resultado` ticks `Respondió` and adds its note, and a withdrawal also closes
 * `Seguimiento` and `Ingresó?`. Nothing else is written in the response sheet.
 */
function onEdit(e) {
  if (!e || !e.range) return;
  const config = NRC_REACTIVATION_CONFIG;
  const sheet = e.range.getSheet();
  if (sheet.getName() !== config.sheetName) return;
  const row = e.range.getRow();
  if (row <= 1) return;

  const column = e.range.getColumn();
  const id = parseNrcId_(sheet.getRange(row, 1).getValue());

  if (column === config.sentColumn && isNrcYes_(e.range.getValue())) {
    const sentAt = sheet.getRange(row, config.sentAtColumn);
    if (isBlankNrcValue_(sentAt.getValue())) sentAt.setValue(new Date());
    const date = nrcDateFromCell_(sentAt.getValue());
    if (id !== null && date) {
      addNrcProspectNote_(sheet.getParent(), id, nrcSentNote_(sheet.getRange(row, 4).getValue(), date), false);
    }
    return;
  }

  if (column === config.outcomeColumn && id !== null) {
    const outcome = String(e.range.getValue()).trim().toLowerCase();
    const note = config.outcomeNotes[outcome];
    if (!note) return;
    sheet.getRange(row, config.repliedColumn).setValue(true);
    addNrcProspectNote_(sheet.getParent(), id, note + ' ' + nrcShortDay_(new Date()), outcome === config.withdrawnOutcome);
  }
}

/**
 * Records a reply that Francisco reported instead of picking `Resultado` himself
 * (SPEC-009, stage 1). Ticks `Respondió` on the prospect's latest row of the tab,
 * writes the result there and adds the same dated note to `Estado`. `outcome` may
 * be empty for a reply that fits none of the options; `detail` is a short remark
 * without personal data. Returns false when the tab has no row for the ID.
 */
function recordNrcReply_(spreadsheet, id, outcome, detail, date) {
  const config = NRC_REACTIVATION_CONFIG;
  const tab = spreadsheet.getSheetByName(config.sheetName);
  if (!tab) throw new Error('The Recontacto sheet was not found.');
  const result = String(outcome || '').trim().toLowerCase();
  if (result && !config.outcomeNotes[result]) throw new Error('Unknown result.');

  const dataRows = Math.max(0, tab.getLastRow() - 1);
  const ids = dataRows ? tab.getRange(2, 1, dataRows, 1).getValues() : [];
  let row = 0;
  ids.forEach(function (cells, index) {
    if (parseNrcId_(cells[0]) === id) row = index + 2;
  });
  if (!row) return false;

  tab.getRange(row, config.repliedColumn).setValue(true);
  if (result) tab.getRange(row, config.outcomeColumn).setValue(result);
  const note = (result ? config.outcomeNotes[result] : config.repliedNote) + ' ' + nrcShortDay_(date || new Date());
  addNrcProspectNote_(spreadsheet, id, note, result === config.withdrawnOutcome);
  if (!isBlankNrcValue_(detail)) addNrcProspectNote_(spreadsheet, id, String(detail).trim().replace(/\.+$/, ''), false);
  return true;
}

function nrcSentNote_(message, date) {
  const config = NRC_REACTIVATION_CONFIG;
  return (/^PC-/.test(String(message)) ? config.firstContactNote : config.sentNote) + ' ' + nrcShortDay_(date);
}

function nrcShortDay_(date) {
  return Utilities.formatDate(date, NRC_REACTIVATION_CONFIG.timeZone, 'dd/MM');
}

/**
 * Adds a note at the end of `Estado` in every row that carries the ID, once: a
 * note that is already there is not repeated and what Francisco wrote is kept.
 * A withdrawal also sets `Seguimiento`, which blocks every later draft, and
 * `Ingresó?` when it was still open.
 */
function addNrcProspectNote_(spreadsheet, id, note, withdrawn) {
  const config = NRC_REACTIVATION_CONFIG;
  const sheet = getNrcResponseSheet_(spreadsheet);
  const statusColumn = findNrcHeaderColumn_(sheet, config.statusHeader);
  const followUpColumn = findNrcHeaderColumn_(sheet, config.followUpHeader);
  const admissionColumn = findNrcHeaderColumn_(sheet, config.admissionHeader);
  const dataRows = Math.max(0, sheet.getLastRow() - NRC_LEAD_ID_CONFIG.headerRow);
  if (!dataRows) return;

  const firstRow = NRC_LEAD_ID_CONFIG.headerRow + 1;
  const ids = sheet.getRange(firstRow, getNrcLeadIdColumns_(sheet).id + 1, dataRows, 1).getValues();

  for (let index = 0; index < dataRows; index += 1) {
    if (parseNrcId_(ids[index][0]) !== id) continue;

    if (statusColumn >= 0) {
      const cell = sheet.getRange(firstRow + index, statusColumn + 1);
      const current = String(cell.getValue()).trim();
      if (normalizeNrcText_(current).indexOf(normalizeNrcText_(note)) < 0) {
        const separator = !current ? '' : (/[.!?]$/.test(current) ? ' ' : '. ');
        cell.setValue(current + separator + note + '.');
      }
    }
    if (!withdrawn) continue;

    if (followUpColumn >= 0) {
      const cell = sheet.getRange(firstRow + index, followUpColumn + 1);
      // `residente` is Francisco's to change.
      if (normalizeNrcText_(cell.getValue()) !== 'residente') cell.setValue(config.withdrawnValue);
    }
    if (admissionColumn >= 0) {
      const cell = sheet.getRange(firstRow + index, admissionColumn + 1);
      if (config.openAdmissionValues.indexOf(normalizeNrcText_(cell.getValue())) >= 0) cell.setValue(config.withdrawnValue);
    }
  }
}

function queueNrcReactivation_(spreadsheet, options) {
  const config = NRC_REACTIVATION_CONFIG;
  const tab = spreadsheet.getSheetByName(config.sheetName);
  if (!tab) throw new Error('The Recontacto sheet was not found.');

  const result = {
    prospects: 0, queued: 0, alreadyQueued: 0, waiting: 0, finished: 0, replied: 0,
    notActive: 0, noPhone: 0, upcomingVisit: 0, removed: 0, refreshed: 0, reviewRows: [],
  };
  const prospects = readNrcReactivationProspects_(getNrcResponseSheet_(spreadsheet));
  const state = readNrcReactivationState_(tab);
  const stalePendingRows = [];

  Object.keys(prospects).forEach(function (key) {
    const prospect = prospects[key];
    if (options.onlyId !== undefined && prospect.id !== options.onlyId) return;
    result.prospects += 1;

    const history = state[key] || { sent: [], pending: [], replied: false, undated: false };
    const next = chooseNrcNextTouch_(prospect, history, options, result);
    if (!next) {
      if (options.onlyId === undefined) {
        history.pending.forEach(function (draft) { stalePendingRows.push(draft.row); });
      }
      return;
    }
    if (next === 'keep') return;

    const text = fillNrcReactivationText_(config.messages[next.message], prospect.firstName);
    const link = 'https://wa.me/' + prospect.phone + '?text=' + encodeURIComponent(text);
    if (next.row) {
      // An unsent draft whose prospect changed segment gets the text that now applies.
      tab.getRange(next.row, 2).setValue(next.segment);
      tab.getRange(next.row, 4).setValue(next.message);
      tab.getRange(next.row, 5).setValue(text);
      tab.getRange(next.row, 6).setValue(link);
      result.refreshed += 1;
      return;
    }
    tab.appendRow([prospect.id, next.segment, next.touch, next.message, text, link, false, '', false, '']);
    const row = tab.getLastRow();
    tab.getRange(row, config.sentColumn).insertCheckboxes();
    tab.getRange(row, config.repliedColumn).insertCheckboxes();
    result.queued += 1;
  });

  // Unsent drafts of prospects who stopped being eligible are withdrawn; sent rows stay as history.
  stalePendingRows.sort(function (a, b) { return b - a; }).forEach(function (row) {
    tab.deleteRow(row);
    result.removed += 1;
  });

  // `Estado` gets the note of every message already sent; a note that is there is not repeated.
  if (options.onlyId === undefined) {
    Object.keys(state).forEach(function (key) {
      state[key].sent.forEach(function (entry) {
        addNrcProspectNote_(spreadsheet, Number(key), nrcSentNote_(entry.message, entry.date), false);
      });
    });
  }
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
  // Kept, not withdrawn: a draft Francisco marked as answered must not be queued again.
  if (history.replied) { result.replied += 1; return 'keep'; }
  if (prospect.visitDay && !prospect.visited && prospect.visitDay >= nrcSantiagoDay_(options.now)) {
    result.upcomingVisit += 1;
    return null;
  }
  const segment = prospect.visited ? 'C' : (prospect.scheduled ? 'B' : 'A');
  const fresh = segment === 'A' && prospect.submittedAt
    && nrcDaysBetween_(prospect.submittedAt, options.now) <= config.freshLeadDays;
  const first = fresh
    ? { touch: 1, segment: 'nuevo', message: 'PC-01' }
    : { touch: 1, segment: segment, message: { A: 'RC-01', B: 'RC-02', C: 'RC-03' }[segment] };

  if (history.pending.length) {
    result.alreadyQueued += 1;
    const draft = history.pending[0];
    // Only a first message depends on the segment; a first-contact draft is kept as it is.
    const outdated = !history.sent.length && history.pending.length === 1
      && /^RC-/.test(draft.message) && /^RC-/.test(first.message) && draft.message !== first.message;
    if (!outdated) return 'keep';
    first.row = draft.row;
    return first;
  }
  if (history.sent.length >= 3) { result.finished += 1; return 'keep'; }
  // A ticked row without a date cannot be scheduled from; leave it for review.
  if (history.undated) { result.waiting += 1; return 'keep'; }
  if (!history.sent.length) return first;

  const sinceFirst = nrcDaysBetween_(history.sent[0].date, options.now);
  const sinceLast = nrcDaysBetween_(history.sent[history.sent.length - 1].date, options.now);
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

    const entry = state[id] || (state[id] = { sent: [], pending: [], replied: false, undated: false });
    if (isNrcYes_(cells[config.repliedColumn - 1])) entry.replied = true;
    if (!isNrcYes_(cells[config.sentColumn - 1])) {
      entry.pending.push({ row: index + 2, message: String(cells[3]) });
      return;
    }
    const sentAt = nrcDateFromCell_(cells[config.sentAtColumn - 1]);
    if (sentAt) entry.sent.push({ date: sentAt, message: String(cells[3]) });
    else entry.undated = true;
  });
  Object.keys(state).forEach(function (key) {
    state[key].sent.sort(function (a, b) { return a.date.getTime() - b.date.getTime(); });
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
