const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

// Both files share one global scope in Apps Script, so the test loads them together.
const scriptSource = ['AssignLeadId.gs', 'WhatsAppSheetAdapter.gs']
  .map((name) => fs.readFileSync(path.join(__dirname, name), 'utf8'))
  .join('\n');

const TOKEN = 'synthetic-token-0123456789abcdef0123456789';
const headers = ['Marca temporal', '#', 'Tu Nombre y Apellido', 'Email', 'Teléfono', 'Nombre del Adulto Mayor', 'Estado', 'Comentario'];

// Synthetic rows only.
function responseRows() {
  const row = (id, contact, phone) =>
    [new Date('2026-10-08T12:00:00Z'), id, contact, 'contacto@example.test', phone, 'Persona de prueba', 'Sí', 'Nota privada'];
  return [
    headers.slice(),
    row(14, 'Luis Ejemplo', '+56 9 0000 0014'),
    row(22, 'Ana Prueba Ficticia', '900000022'),
    row(22, 'Ana Prueba Ficticia', '+56900000023'),
    row('', 'Sin ID Aún', '+56900000022'),
  ];
}

class FakeSheet {
  constructor(name, rows) { Object.assign(this, { name, rows }); }
  getName() { return this.name; }
  getLastColumn() { return this.rows[0] ? this.rows[0].length : 0; }
  getLastRow() { return this.rows.length; }
  appendRow(row) { this.rows.push(row); }
  getRange(row, column, rowCount = 1, columnCount = 1) {
    const read = () => Array.from({ length: rowCount }, (_, r) =>
      Array.from({ length: columnCount }, (_, c) => this.rows[row - 1 + r]?.[column - 1 + c] ?? ''));
    return {
      getValues: read,
      getDisplayValues: () => read().map((cells) => cells.map((value) => String(value))),
    };
  }
}

function createContext({ token = TOKEN, withEventsSheet = true } = {}) {
  const sheets = new Map([['Respuestas de formulario 1', new FakeSheet('Respuestas de formulario 1', responseRows())]]);
  if (withEventsSheet) sheets.set('WhatsApp', new FakeSheet('WhatsApp', [['Fecha y hora', '#', 'Tipo', 'Derivación']]));

  const spreadsheet = {
    getSheetByName: (name) => sheets.get(name) || null,
    insertSheet: (name) => { sheets.set(name, new FakeSheet(name, [])); return sheets.get(name); },
  };
  const context = {
    SpreadsheetApp: { getActiveSpreadsheet: () => spreadsheet, openById: () => spreadsheet, flush: () => {} },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => token }) },
    ContentService: {
      MimeType: { JSON: 'JSON' },
      createTextOutput: (text) => ({ text, setMimeType() { return this; } }),
    },
    ScriptApp: { EventType: {}, getProjectTriggers: () => [] },
    console: { warn: () => {}, error: () => {} },
  };
  vm.runInNewContext(scriptSource, context, { filename: 'WhatsAppSheetAdapter.gs' });

  const post = (body) => JSON.parse(context.doPost({ postData: { contents: JSON.stringify(body) } }).text);
  return { context, sheets, post, call: (body) => post(Object.assign({ token: TOKEN }, body)) };
}

test('findByPhone returns only ID and contact name for rows that have an ID', () => {
  const { call } = createContext();

  assert.deepEqual(call({ action: 'findByPhone', phone: '+56 9 0000 0022' }),
    { matches: [{ id: 22, contactName: 'Ana Prueba Ficticia' }] });
  assert.deepEqual(call({ action: 'findByPhone', phone: '56900000555' }), { matches: [] });
  assert.deepEqual(call({ action: 'findByPhone', phone: '' }), { matches: [] });
});

test('findPhonesById returns normalized phones', () => {
  const { call } = createContext();

  assert.deepEqual(call({ action: 'findPhonesById', id: 22 }), { phones: ['56900000022', '56900000023'] });
  assert.deepEqual(call({ action: 'findPhonesById', id: 999 }), { phones: [] });
  assert.deepEqual(call({ action: 'findPhonesById', id: 'x' }), { phones: [] });
});

test('appendEvent writes one validated row to the events tab only', () => {
  const { call, sheets } = createContext();
  const before = JSON.stringify(sheets.get('Respuestas de formulario 1').rows);

  assert.deepEqual(call({ action: 'appendEvent', at: '2026-10-09T18:00:00Z', prospectId: 22, type: 'FAQ-08', derivation: '' }), { ok: true });
  assert.deepEqual(call({ action: 'appendEvent', at: '2026-10-09T18:01:00Z', prospectId: null, type: 'derivado: número desconocido', derivation: 'pendiente' }), { ok: true });

  const rows = sheets.get('WhatsApp').rows;
  assert.equal(rows.length, 3);
  // Rows are created inside the script's own realm, so compare by value.
  assert.equal(JSON.stringify(rows[1]), JSON.stringify(['2026-10-09T18:00:00.000Z', 22, 'FAQ-08', '']));
  assert.equal(typeof rows[1][0].getTime, 'function');
  assert.equal(JSON.stringify(rows[2].slice(1)), JSON.stringify(['', 'derivado: número desconocido', 'pendiente']));
  assert.equal(JSON.stringify(sheets.get('Respuestas de formulario 1').rows), before);
});

test('appendEvent rejects free text and malformed values', () => {
  const { call, sheets } = createContext();
  const base = { action: 'appendEvent', at: '2026-10-09T18:00:00Z', prospectId: 22, type: 'FAQ-08', derivation: '' };

  assert.match(call({ ...base, type: 'Texto libre de un mensaje' }).error, /event type/);
  assert.match(call({ ...base, type: '=IMPORTXML("x")' }).error, /event type/);
  assert.match(call({ ...base, derivation: 'otra' }).error, /derivation/);
  assert.match(call({ ...base, prospectId: 'abc' }).error, /prospect ID/);
  assert.match(call({ ...base, at: 'ayer' }).error, /event time/);
  assert.equal(sheets.get('WhatsApp').rows.length, 1);
});

test('requests without the exact token are refused', () => {
  const { post } = createContext();
  const request = { action: 'findByPhone', phone: '56900000022' };

  assert.deepEqual(post(request), { error: 'Unauthorized.' });
  assert.deepEqual(post({ ...request, token: TOKEN.slice(0, -1) + 'x' }), { error: 'Unauthorized.' });
  assert.deepEqual(post({ ...request, token: TOKEN + 'x' }), { error: 'Unauthorized.' });
  assert.deepEqual(createContext({ token: null }).post({ ...request, token: '' }), { error: 'Unauthorized.' });
  assert.deepEqual(createContext({ token: 'short' }).post({ ...request, token: 'short' }), { error: 'Unauthorized.' });
});

test('errors never include sheet values', () => {
  const { context, call } = createContext({ withEventsSheet: false });

  const failed = call({ action: 'appendEvent', at: '2026-10-09T18:00:00Z', prospectId: 22, type: 'FAQ-08', derivation: '' });
  assert.deepEqual(failed, { error: 'The WhatsApp events sheet was not found.' });
  assert.deepEqual(call({ action: 'leerTodo' }), { error: 'Unknown action.' });
  assert.match(JSON.parse(context.doPost({ postData: { contents: 'not json' } }).text).error, /./);
});

test('setup creates the events tab once', () => {
  const { context, sheets } = createContext({ withEventsSheet: false });

  context.setupNrcWhatsAppSheet();
  context.setupNrcWhatsAppSheet();

  assert.equal(JSON.stringify(sheets.get('WhatsApp').rows), JSON.stringify([['Fecha y hora', '#', 'Tipo', 'Derivación']]));
});
