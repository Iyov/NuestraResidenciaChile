const NRC_LEAD_ID_CONFIG = Object.freeze({
  responseSheetName: 'Respuestas de formulario 1',
  headerRow: 1,
  idHeader: '#',
  timestampHeader: 'Marca temporal',
  phoneHeader: 'Teléfono',
  prospectNameHeader: 'Nombre del Adulto Mayor',
  lockTimeoutMs: 30000,
});

/**
 * Run once from the spreadsheet-bound Apps Script project, while signed in
 * as the NRC-owned Google account that should own this trigger.
 */
function installNrcLeadIdTrigger(spreadsheetId) {
  const spreadsheet = openNrcSpreadsheet_(spreadsheetId);
  if (!spreadsheet) {
    throw new Error('Open this script from the NRC response spreadsheet.');
  }

  const sheet = spreadsheet.getSheetByName(NRC_LEAD_ID_CONFIG.responseSheetName);
  if (!sheet) {
    throw new Error('The configured form-response sheet was not found.');
  }

  getNrcLeadIdColumns_(sheet);

  const alreadyInstalled = ScriptApp.getProjectTriggers().some(function (trigger) {
    return trigger.getHandlerFunction() === 'assignNrcLeadIdOnFormSubmit' &&
      trigger.getEventType() === ScriptApp.EventType.ON_FORM_SUBMIT &&
      trigger.getTriggerSourceId() === spreadsheet.getId();
  });

  if (!alreadyInstalled) {
    ScriptApp.newTrigger('assignNrcLeadIdOnFormSubmit')
      .forSpreadsheet(spreadsheet)
      .onFormSubmit()
      .create();
  }
}

/** Read-only check. Returns counts and headers only, never prospect values. */
function inspectNrcLeadIdReadiness(spreadsheetId) {
  const spreadsheet = openNrcSpreadsheet_(spreadsheetId);
  if (!spreadsheet) throw new Error('The response spreadsheet could not be opened.');

  const sheet = spreadsheet.getSheetByName(NRC_LEAD_ID_CONFIG.responseSheetName);
  if (!sheet) throw new Error('The configured form-response sheet was not found.');
  const columns = getNrcLeadIdColumns_(sheet);
  const dataRows = Math.max(0, sheet.getLastRow() - NRC_LEAD_ID_CONFIG.headerRow);
  const idValues = dataRows
    ? sheet.getRange(NRC_LEAD_ID_CONFIG.headerRow + 1, columns.id + 1, dataRows, 1).getValues()
    : [];

  let assignedIdRows = 0;
  let blankIdRows = 0;
  let maximumId = 0;
  idValues.forEach(function (cell) {
    if (isBlankNrcValue_(cell[0])) {
      blankIdRows += 1;
      return;
    }
    const id = parseNrcId_(cell[0]);
    if (id === null) throw new Error('The # column contains a non-integer value; review it manually.');
    assignedIdRows += 1;
    maximumId = Math.max(maximumId, id);
  });

  return {
    spreadsheetTitle: spreadsheet.getName(),
    sheetName: sheet.getName(),
    dataRows: dataRows,
    assignedIdRows: assignedIdRows,
    blankIdRows: blankIdRows,
    maximumId: maximumId,
    nextId: maximumId + 1,
  };
}

/**
 * Installable spreadsheet "On form submit" trigger.
 * Writes only the # cell in the row submitted by Google Forms.
 */
function assignNrcLeadIdOnFormSubmit(event) {
  if (!event || !event.range || typeof event.range.getSheet !== 'function') {
    throw new Error('Use an installable spreadsheet form-submit trigger.');
  }

  const sheet = event.range.getSheet();
  if (sheet.getName() !== NRC_LEAD_ID_CONFIG.responseSheetName) return;

  const rowNumber = event.range.getRow();
  if (rowNumber <= NRC_LEAD_ID_CONFIG.headerRow) return;

  const columns = getNrcLeadIdColumns_(sheet);
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(NRC_LEAD_ID_CONFIG.lockTimeoutMs)) {
    throw new Error('Could not reserve the ID sequence; review Apps Script Executions.');
  }

  try {
    const idCell = sheet.getRange(rowNumber, columns.id + 1);
    const currentId = idCell.getValue();

    // A retried trigger must not allocate another ID or overwrite a manual ID.
    if (!isBlankNrcValue_(currentId)) {
      if (parseNrcId_(currentId) === null) {
        throw new Error('The target ID cell is non-empty but is not a positive integer.');
      }
      return;
    }

    const timestamp = sheet.getRange(rowNumber, columns.timestamp + 1).getValue();
    if (isBlankNrcValue_(timestamp)) return; // Ignore blank/spacer rows.

    const phone = sheet.getRange(rowNumber, columns.phone + 1).getValue();
    const prospectName = sheet.getRange(rowNumber, columns.prospectName + 1).getValue();
    if (isBlankNrcValue_(phone) || isBlankNrcValue_(prospectName)) {
      throw new Error('A submitted row is missing required prospect identity fields.');
    }

    const lastRow = sheet.getLastRow();
    const numberOfRows = Math.max(0, lastRow - NRC_LEAD_ID_CONFIG.headerRow);
    const idValues = numberOfRows
      ? sheet.getRange(NRC_LEAD_ID_CONFIG.headerRow + 1, columns.id + 1, numberOfRows, 1).getValues()
      : [];
    const phoneValues = numberOfRows
      ? sheet.getRange(NRC_LEAD_ID_CONFIG.headerRow + 1, columns.phone + 1, numberOfRows, 1).getValues()
      : [];
    const nameValues = numberOfRows
      ? sheet.getRange(NRC_LEAD_ID_CONFIG.headerRow + 1, columns.prospectName + 1, numberOfRows, 1).getValues()
      : [];

    const matchingId = findExistingNrcProspectId_(
      rowNumber,
      phone,
      prospectName,
      idValues,
      phoneValues,
      nameValues
    );

    const idToWrite = matchingId === null
      ? getNextNrcLeadId_(idValues)
      : matchingId;

    idCell.setValue(idToWrite);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
}

function getNrcLeadIdColumns_(sheet) {
  const lastColumn = sheet.getLastColumn();
  if (lastColumn < 1) throw new Error('The response sheet has no header row.');

  const headers = sheet
    .getRange(NRC_LEAD_ID_CONFIG.headerRow, 1, 1, lastColumn)
    .getDisplayValues()[0]
    .map(normalizeNrcHeader_);

  const columns = {
    id: headers.indexOf(normalizeNrcHeader_(NRC_LEAD_ID_CONFIG.idHeader)),
    timestamp: headers.indexOf(normalizeNrcHeader_(NRC_LEAD_ID_CONFIG.timestampHeader)),
    phone: headers.indexOf(normalizeNrcHeader_(NRC_LEAD_ID_CONFIG.phoneHeader)),
    prospectName: headers.indexOf(normalizeNrcHeader_(NRC_LEAD_ID_CONFIG.prospectNameHeader)),
  };

  if (columns.id < 0 || columns.timestamp < 0 || columns.phone < 0 || columns.prospectName < 0) {
    throw new Error('The response sheet is missing a required header.');
  }
  return columns;
}

function openNrcSpreadsheet_(spreadsheetId) {
  if (!isBlankNrcValue_(spreadsheetId)) {
    return SpreadsheetApp.openById(String(spreadsheetId).trim());
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

function findExistingNrcProspectId_(
  currentRowNumber,
  phone,
  prospectName,
  idValues,
  phoneValues,
  nameValues
) {
  const phoneKey = normalizeNrcPhone_(phone);
  const nameKey = normalizeNrcText_(prospectName);
  const matches = new Set();

  for (let index = 0; index < idValues.length; index += 1) {
    const existingRowNumber = NRC_LEAD_ID_CONFIG.headerRow + 1 + index;
    if (existingRowNumber === currentRowNumber) continue;
    if (normalizeNrcPhone_(phoneValues[index][0]) !== phoneKey) continue;
    if (normalizeNrcText_(nameValues[index][0]) !== nameKey) continue;

    const existingId = parseNrcId_(idValues[index][0]);
    if (existingId !== null) matches.add(existingId);
  }

  if (matches.size > 1) {
    throw new Error('Matching prospect details have conflicting existing IDs; review manually.');
  }

  return matches.size === 1 ? Array.from(matches)[0] : null;
}

function getNextNrcLeadId_(idValues) {
  let maximumId = 0;

  idValues.forEach(function (cell) {
    if (isBlankNrcValue_(cell[0])) return;

    const id = parseNrcId_(cell[0]);
    if (id === null) {
      throw new Error('The # column contains a non-integer value; review it before allocating IDs.');
    }
    maximumId = Math.max(maximumId, id);
  });

  return maximumId + 1;
}

function parseNrcId_(value) {
  if (isBlankNrcValue_(value)) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function normalizeNrcHeader_(value) {
  const text = String(value === null || value === undefined ? '' : value).trim();
  return text === '#' ? '#' : normalizeNrcText_(text);
}

function normalizeNrcText_(value) {
  return String(value === null || value === undefined ? '' : value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeNrcPhone_(value) {
  let digits = String(value === null || value === undefined ? '' : value).replace(/\D/g, '');
  if (digits.indexOf('00') === 0) digits = digits.substring(2);
  if (!digits) return '';
  if (digits.indexOf('56') === 0) return digits;
  if (digits.indexOf('0') === 0) digits = digits.substring(1);

  // Form numbers are Chilean. Normalize local 8–9 digit numbers to country code 56.
  if (digits.length === 8 || digits.length === 9) return '56' + digits;
  return digits;
}

function isBlankNrcValue_(value) {
  return value === null || value === undefined || String(value).trim() === '';
}
