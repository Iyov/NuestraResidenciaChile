const NRC_WHATSAPP_SHEET_CONFIG = Object.freeze({
  eventsSheetName: 'WhatsApp',
  eventHeaders: ['Fecha y hora', '#', 'Tipo', 'Derivación'],
  contactNameHeader: 'Tu Nombre y Apellido',
  tokenProperty: 'NRC_WHATSAPP_ADAPTER_TOKEN',
  minimumTokenLength: 32,
  lockTimeoutMs: 30000,
  eventTypePattern: /^(FAQ-\d+|MSG-\d+|derivado: [a-zñáéíóú ]{1,60}|formulario enviado|tomado por Francisco|pausado|reactivado)$/,
  derivationStates: ['', 'pendiente', 'resuelta'],
});

/**
 * Run once from the editor, signed in as the NRC account. Creates the events tab.
 * The shared token is set by hand in Project Settings > Script properties.
 */
function setupNrcWhatsAppSheet(spreadsheetId) {
  const spreadsheet = openNrcSpreadsheet_(spreadsheetId);
  if (!spreadsheet) throw new Error('Open this script from the NRC response spreadsheet.');

  let sheet = spreadsheet.getSheetByName(NRC_WHATSAPP_SHEET_CONFIG.eventsSheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(NRC_WHATSAPP_SHEET_CONFIG.eventsSheetName);
    sheet.appendRow(NRC_WHATSAPP_SHEET_CONFIG.eventHeaders);
  }
  getNrcWhatsAppColumns_(getNrcResponseSheet_(spreadsheet));
}

/**
 * Web app entry point for the WhatsApp front desk (SPEC-002). It exposes three
 * narrow operations instead of the sheet: callers never receive a full row, and
 * the only cells they can change are new rows in the events tab.
 */
function doPost(e) {
  let result;
  try {
    result = handleNrcWhatsAppRequest_(JSON.parse(e.postData.contents));
  } catch (error) {
    // Messages thrown here are fixed strings without sheet values.
    result = { error: String(error && error.message ? error.message : 'Request failed.') };
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function handleNrcWhatsAppRequest_(request) {
  if (!request || !isValidNrcWhatsAppToken_(request.token)) throw new Error('Unauthorized.');

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (request.action === 'findByPhone') return { matches: findNrcProspectsByPhone_(spreadsheet, request.phone) };
  if (request.action === 'findPhonesById') return { phones: findNrcPhonesById_(spreadsheet, request.id) };
  if (request.action === 'appendEvent') return appendNrcWhatsAppEvent_(spreadsheet, request);
  throw new Error('Unknown action.');
}

function findNrcProspectsByPhone_(spreadsheet, phone) {
  const phoneKey = normalizeNrcPhone_(phone);
  if (!phoneKey) return [];

  return readNrcWhatsAppRows_(spreadsheet)
    .filter(function (row) { return row.phone === phoneKey; })
    .map(function (row) { return { id: row.id, contactName: row.contactName }; });
}

function findNrcPhonesById_(spreadsheet, id) {
  const wanted = parseNrcId_(id);
  if (wanted === null) return [];

  return readNrcWhatsAppRows_(spreadsheet)
    .filter(function (row) { return row.id === wanted && row.phone; })
    .map(function (row) { return row.phone; });
}

/** Rows that already have an ID, reduced to the three fields the front desk may see. */
function readNrcWhatsAppRows_(spreadsheet) {
  const sheet = getNrcResponseSheet_(spreadsheet);
  const columns = getNrcWhatsAppColumns_(sheet);
  const dataRows = Math.max(0, sheet.getLastRow() - NRC_LEAD_ID_CONFIG.headerRow);
  if (!dataRows) return [];

  const firstRow = NRC_LEAD_ID_CONFIG.headerRow + 1;
  const read = function (column) {
    return sheet.getRange(firstRow, column + 1, dataRows, 1).getDisplayValues();
  };
  const ids = read(columns.id);
  const phones = read(columns.phone);
  const names = read(columns.contactName);

  const rows = [];
  for (let index = 0; index < dataRows; index += 1) {
    if (isBlankNrcValue_(ids[index][0])) continue;
    const id = parseNrcId_(ids[index][0]);
    if (id === null) continue;
    rows.push({
      id: id,
      phone: normalizeNrcPhone_(phones[index][0]),
      contactName: String(names[index][0]).trim(),
    });
  }
  return rows;
}

function appendNrcWhatsAppEvent_(spreadsheet, request) {
  const at = new Date(request.at);
  if (isNaN(at.getTime())) throw new Error('Invalid event time.');

  const hasId = !isBlankNrcValue_(request.prospectId);
  const prospectId = hasId ? parseNrcId_(request.prospectId) : '';
  if (hasId && prospectId === null) throw new Error('Invalid prospect ID.');

  const type = String(request.type === null || request.type === undefined ? '' : request.type);
  if (!NRC_WHATSAPP_SHEET_CONFIG.eventTypePattern.test(type)) throw new Error('Invalid event type.');

  const derivation = String(request.derivation === null || request.derivation === undefined ? '' : request.derivation);
  if (NRC_WHATSAPP_SHEET_CONFIG.derivationStates.indexOf(derivation) < 0) throw new Error('Invalid derivation state.');

  const sheet = spreadsheet.getSheetByName(NRC_WHATSAPP_SHEET_CONFIG.eventsSheetName);
  if (!sheet) throw new Error('The WhatsApp events sheet was not found.');

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(NRC_WHATSAPP_SHEET_CONFIG.lockTimeoutMs)) throw new Error('The sheet is busy.');
  try {
    sheet.appendRow([at, prospectId, type, derivation]);
  } finally {
    lock.releaseLock();
  }
  return { ok: true };
}

function getNrcResponseSheet_(spreadsheet) {
  const sheet = spreadsheet.getSheetByName(NRC_LEAD_ID_CONFIG.responseSheetName);
  if (!sheet) throw new Error('The configured form-response sheet was not found.');
  return sheet;
}

function getNrcWhatsAppColumns_(sheet) {
  const columns = getNrcLeadIdColumns_(sheet);
  const headers = sheet
    .getRange(NRC_LEAD_ID_CONFIG.headerRow, 1, 1, sheet.getLastColumn())
    .getDisplayValues()[0]
    .map(normalizeNrcHeader_);
  const contactName = headers.indexOf(normalizeNrcHeader_(NRC_WHATSAPP_SHEET_CONFIG.contactNameHeader));
  if (contactName < 0) throw new Error('The response sheet is missing a required header.');
  return { id: columns.id, phone: columns.phone, contactName: contactName };
}

function isValidNrcWhatsAppToken_(candidate) {
  const expected = PropertiesService.getScriptProperties().getProperty(NRC_WHATSAPP_SHEET_CONFIG.tokenProperty);
  // An unset or short token must never authorize a request.
  if (!expected || expected.length < NRC_WHATSAPP_SHEET_CONFIG.minimumTokenLength) return false;
  if (typeof candidate !== 'string' || candidate.length !== expected.length) return false;

  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected.charCodeAt(index) ^ candidate.charCodeAt(index);
  }
  return difference === 0;
}
