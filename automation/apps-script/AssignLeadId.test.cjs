const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const scriptSource = fs.readFileSync(path.join(__dirname, 'AssignLeadId.gs'), 'utf8');
const headers = [
  'Marca temporal',
  '#',
  'Tu Nombre y Apellido',
  'Email',
  'Teléfono',
  'Nombre del Adulto Mayor',
  '¿Es Autovalente?',
  'Origen del Contacto',
];

class FakeRange {
  constructor(sheet, row, column, rowCount = 1, columnCount = 1) {
    Object.assign(this, { sheet, row, column, rowCount, columnCount });
  }

  getSheet() { return this.sheet; }
  getRow() { return this.row; }

  getValues() {
    return Array.from({ length: this.rowCount }, (_, rowOffset) =>
      Array.from({ length: this.columnCount }, (_, columnOffset) =>
        this.sheet.valueAt(this.row + rowOffset, this.column + columnOffset)));
  }

  getDisplayValues() {
    return this.getValues().map((row) => row.map((value) =>
      value === null || value === undefined ? '' : String(value)));
  }

  getValue() { return this.sheet.valueAt(this.row, this.column); }

  setValue(value) {
    this.sheet.setValue(this.row, this.column, value);
    return this;
  }
}

class FakeSheet {
  constructor(rows, name = 'Respuestas de formulario 1') {
    this.rows = rows;
    this.name = name;
  }

  getName() { return this.name; }
  getLastColumn() { return this.rows[0].length; }

  getLastRow() {
    for (let index = this.rows.length - 1; index >= 0; index -= 1) {
      if (this.rows[index].some((value) => value !== '' && value !== null && value !== undefined)) {
        return index + 1;
      }
    }
    return 0;
  }

  getRange(row, column, rowCount = 1, columnCount = 1) {
    return new FakeRange(this, row, column, rowCount, columnCount);
  }

  valueAt(row, column) {
    return this.rows[row - 1]?.[column - 1] ?? '';
  }

  setValue(row, column, value) {
    while (this.rows.length < row) this.rows.push(Array(this.getLastColumn()).fill(''));
    while (this.rows[row - 1].length < column) this.rows[row - 1].push('');
    this.rows[row - 1][column - 1] = value;
  }
}

function createContext(sheet = null) {
  const lock = {
    tryLock: () => true,
    releaseLock: () => {},
  };
  const triggers = [];
  const spreadsheet = {
    getName: () => 'NRC test copy',
    getId: () => 'synthetic-spreadsheet-id',
    getSheetByName: (name) => sheet && sheet.getName() === name ? sheet : null,
  };
  const context = {
    SpreadsheetApp: {
      flush: () => {},
      getActiveSpreadsheet: () => spreadsheet,
      openById: () => spreadsheet,
    },
    LockService: { getScriptLock: () => lock },
    ScriptApp: {
      EventType: { ON_FORM_SUBMIT: 'ON_FORM_SUBMIT' },
      getProjectTriggers: () => triggers,
      newTrigger: (handler) => {
        const trigger = { handler, eventType: null, sourceId: null };
        const builder = {
          forSpreadsheet: (source) => { trigger.sourceId = source.getId(); return builder; },
          onFormSubmit: () => { trigger.eventType = 'ON_FORM_SUBMIT'; return builder; },
          create: () => {
            triggers.push({
              getHandlerFunction: () => trigger.handler,
              getEventType: () => trigger.eventType,
              getTriggerSourceId: () => trigger.sourceId,
            });
          },
        };
        return builder;
      },
    },
    console: { warn: () => {}, error: () => {} },
  };
  vm.runInNewContext(scriptSource, context, { filename: 'AssignLeadId.gs' });
  context.fakeTriggers = triggers;
  return context;
}

function makeResponse({ id, phone, prospectName, timestamp = new Date('2026-10-08T12:00:00Z') }) {
  const row = Array(headers.length).fill('');
  row[0] = timestamp;
  row[1] = id ?? '';
  row[2] = 'Contacto de prueba';
  row[3] = 'contacto@example.test';
  row[4] = phone ?? '+56 9 8765 4321';
  row[5] = prospectName ?? 'Persona de prueba';
  row[6] = 'Sí';
  row[7] = 'Sitio Web';
  return row;
}

function makeSheetWithIds(count = 21) {
  const rows = [headers];
  for (let id = 1; id <= count; id += 1) {
    rows.push(makeResponse({
      id,
      phone: '+56 9 8000 ' + String(id).padStart(4, '0'),
      prospectName: 'Persona ' + id,
    }));
  }
  return new FakeSheet(rows);
}

function submit(context, sheet, rowNumber) {
  context.assignNrcLeadIdOnFormSubmit({ range: sheet.getRange(rowNumber, 1, 1, headers.length) });
}

test('assigns 22 after existing IDs 1–21', () => {
  const context = createContext();
  const sheet = makeSheetWithIds(21);
  sheet.rows.push(makeResponse({ phone: '+56 9 8123 4567', prospectName: 'Nuevo prospecto' }));

  submit(context, sheet, 23);

  assert.equal(sheet.getRange(23, 2).getValue(), 22);
});

test('allocates consecutive IDs to distinct new prospects', () => {
  const context = createContext();
  const sheet = makeSheetWithIds(21);
  sheet.rows.push(makeResponse({ phone: '+56 9 8123 4567', prospectName: 'Nuevo prospecto A' }));
  sheet.rows.push(makeResponse({ phone: '+56 9 8123 4568', prospectName: 'Nuevo prospecto B' }));

  submit(context, sheet, 23);
  submit(context, sheet, 24);

  assert.equal(sheet.getRange(23, 2).getValue(), 22);
  assert.equal(sheet.getRange(24, 2).getValue(), 23);
});

test('ignores a blank/spacer row', () => {
  const context = createContext();
  const sheet = makeSheetWithIds(21);
  sheet.rows.push(Array(headers.length).fill(''));

  submit(context, sheet, 23);

  assert.equal(sheet.getRange(23, 2).getValue(), '');
});

test('is idempotent when the same form event is replayed', () => {
  const context = createContext();
  const sheet = makeSheetWithIds(21);
  sheet.rows.push(makeResponse({ phone: '+56 9 8123 4567', prospectName: 'Nuevo prospecto' }));

  submit(context, sheet, 23);
  submit(context, sheet, 23);

  assert.equal(sheet.getRange(23, 2).getValue(), 22);
});

test('reuses the ID for the same adult and normalized phone', () => {
  const context = createContext();
  const sheet = makeSheetWithIds(21);
  sheet.rows[21][4] = '+56 9 8765 4321';
  sheet.rows[21][5] = 'José Pérez';
  sheet.rows.push(makeResponse({ phone: '9 8765 4321', prospectName: 'Jose Perez' }));

  submit(context, sheet, 23);

  assert.equal(sheet.getRange(23, 2).getValue(), 21);
});

test('assigns a new ID when the same contact submits for a different adult', () => {
  const context = createContext();
  const sheet = makeSheetWithIds(21);
  sheet.rows.push(makeResponse({ phone: '+56 9 8000 0021', prospectName: 'Otra Persona' }));

  submit(context, sheet, 23);

  assert.equal(sheet.getRange(23, 2).getValue(), 22);
});

test('does not overwrite an existing ID', () => {
  const context = createContext();
  const sheet = makeSheetWithIds(21);
  sheet.rows.push(makeResponse({ id: 77, phone: '+56 9 8123 4567', prospectName: 'Prospecto nuevo' }));

  submit(context, sheet, 23);

  assert.equal(sheet.getRange(23, 2).getValue(), 77);
});

test('stops for conflicting existing IDs rather than merging automatically', () => {
  const context = createContext();
  const sheet = makeSheetWithIds(2);
  sheet.rows[1][4] = '+56 9 1234 5678';
  sheet.rows[1][5] = 'Persona repetida';
  sheet.rows[2][4] = '+56 9 1234 5678';
  sheet.rows[2][5] = 'Persona repetida';
  sheet.rows.push(makeResponse({ phone: '+56 9 1234 5678', prospectName: 'Persona repetida' }));

  assert.throws(() => submit(context, sheet, 4), /conflicting existing IDs/);
  assert.equal(sheet.getRange(4, 2).getValue(), '');
});

test('does nothing for a different sheet', () => {
  const context = createContext();
  const sheet = new FakeSheet([headers, makeResponse({ phone: '+56 9 8123 4567', prospectName: 'Otro' })], 'Otra hoja');

  submit(context, sheet, 2);

  assert.equal(sheet.getRange(2, 2).getValue(), '');
});

test('readiness check returns counts only and the next ID', () => {
  const sheet = makeSheetWithIds(21);
  const context = createContext(sheet);

  const readiness = context.inspectNrcLeadIdReadiness('synthetic-spreadsheet-id');

  assert.deepEqual(JSON.parse(JSON.stringify(readiness)), {
    spreadsheetTitle: 'NRC test copy',
    sheetName: 'Respuestas de formulario 1',
    dataRows: 21,
    assignedIdRows: 21,
    blankIdRows: 0,
    maximumId: 21,
    nextId: 22,
  });
  assert.equal(JSON.stringify(readiness).includes('Persona'), false);
});

test('trigger installer is idempotent', () => {
  const sheet = makeSheetWithIds(21);
  const context = createContext(sheet);

  context.installNrcLeadIdTrigger('synthetic-spreadsheet-id');
  context.installNrcLeadIdTrigger('synthetic-spreadsheet-id');

  assert.equal(context.fakeTriggers.length, 1);
});
