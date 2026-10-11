const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

// The three files share one global scope in Apps Script, so the test loads them together.
const scriptSource = ['AssignLeadId.gs', 'WhatsAppSheetAdapter.gs', 'Reactivation.gs']
  .map((name) => fs.readFileSync(path.join(__dirname, name), 'utf8'))
  .join('\n');

const RESPONSES = 'Respuestas de formulario 1';
const headers = ['Marca temporal', '#', 'Tu Nombre y Apellido', 'Teléfono', 'Nombre del Adulto Mayor',
  'Agendo Visita', 'Fecha Visita', 'Visita realizada', 'Seguimiento', 'WhatsApp', 'Estado', 'Ingresó?'];
const FOLLOW_UP = 8;
const STATUS = 10;
const ADMISSION = 11;
const NOW = new Date('2026-10-20T15:00:00Z');
const OLD = new Date('2026-08-01T15:00:00Z');

// Synthetic rows only.
const row = (id, name, phone, scheduled, visited, followUp, extra = {}) =>
  [extra.at || OLD, id, name, phone, 'Persona de prueba', scheduled, extra.visitDate || '', visited, followUp, '', extra.status || '', extra.admission ?? 'No Aún'];

class FakeSheet {
  constructor(name, rows, parent) { Object.assign(this, { name, rows, parent }); }
  getName() { return this.name; }
  getParent() { return this.parent; }
  getLastColumn() { return Math.max(0, ...this.rows.map((cells) => cells.length)); }
  getLastRow() { return this.rows.length; }
  appendRow(cells) { this.rows.push(cells); return this; }
  deleteRow(number) { this.rows.splice(number - 1, 1); }
  getRange(rowNumber, column, rowCount = 1, columnCount = 1) {
    const read = () => Array.from({ length: rowCount }, (_, r) =>
      Array.from({ length: columnCount }, (_, c) => this.rows[rowNumber - 1 + r]?.[column - 1 + c] ?? ''));
    return {
      getSheet: () => this,
      getRow: () => rowNumber,
      getColumn: () => column,
      getValue: () => read()[0][0],
      getValues: read,
      getDisplayValues: () => read().map((cells) => cells.map((value) => String(value))),
      insertCheckboxes: () => {},
      setDataValidation: () => {},
      setValue: (value) => { this.rows[rowNumber - 1][column - 1] = value; },
    };
  }
}

function createContext(responseRows, { withTab = true, now = NOW } = {}) {
  const sheets = new Map();
  const spreadsheet = {
    getSheetByName: (name) => sheets.get(name) || null,
    insertSheet: (name) => { sheets.set(name, new FakeSheet(name, [], spreadsheet)); return sheets.get(name); },
  };
  sheets.set(RESPONSES, new FakeSheet(RESPONSES, [headers].concat(responseRows), spreadsheet));
  if (withTab) spreadsheet.insertSheet('Recontacto').appendRow(['#']);

  const logs = [];
  class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : [now.getTime()])); }
  }
  const context = {
    Date: FixedDate,
    SpreadsheetApp: {
      getActiveSpreadsheet: () => spreadsheet,
      openById: () => spreadsheet,
      flush: () => {},
      newDataValidation: () => ({ requireValueInList() { return this; }, build: () => ({}) }),
    },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => '' }) },
    ScriptApp: { EventType: {}, getProjectTriggers: () => [] },
    // Santiago is UTC-3 on the dates used here.
    Utilities: {
      formatDate: (date, zone, pattern) => {
        const local = new Date(date.getTime() - 3 * 60 * 60 * 1000).toISOString();
        if (pattern === 'dd/MM') return `${local.slice(8, 10)}/${local.slice(5, 7)}`;
        return local.slice(0, pattern.length).replace('T', ' ');
      },
    },
    console: { log: (text) => logs.push(text), warn: () => {}, error: (text) => logs.push(text) },
  };
  vm.runInNewContext(scriptSource, context, { filename: 'Reactivation.gs' });
  return { context, sheets, logs, tab: () => sheets.get('Recontacto').rows.slice(1) };
}

const markSent = (cells, date) => { cells[6] = true; cells[7] = date; };

test('the embedded texts are the approved ones in the specs', () => {
  const { context } = createContext([]);
  const messages = vm.runInContext('NRC_REACTIVATION_CONFIG.messages', context);
  const approved = {};
  ['007-prospect-reactivation.md', '014-form-to-visit.md'].forEach((name) => {
    const spec = fs.readFileSync(path.join(__dirname, '..', '..', 'specs', name), 'utf8');
    for (const line of spec.split(/\r?\n/)) {
      const cells = line.split('|').map((cell) => cell.trim());
      if (/^(RC|PC)-\d+$/.test(cells[1] || '') && /^aprobada/.test(cells[4] || '')) approved[cells[1]] = cells[3];
    }
  });

  assert.deepEqual(Object.keys(messages).sort(), ['PC-01', 'RC-01', 'RC-02', 'RC-03', 'RC-04', 'RC-05']);
  for (const id of Object.keys(messages)) assert.equal(messages[id], approved[id], id);
});

test('each active prospect gets one draft with the text of its segment', () => {
  const { context, tab, logs } = createContext([
    row(1, 'ana prueba', '+56 9 0000 0001', 'No', 'No', 'activo'),
    row(2, 'Luis Ejemplo', '900000002', 'Sí', 'No', 'Activo'),
    row(3, 'Eva Ficticia', '56900000003', 'Sí', 'Sí', 'activo'),
    row(4, 'Sin Seguimiento', '56900000004', 'No', 'No', ''),
    row(5, 'Ya Desistio', '56900000005', 'No', 'No', 'desistió'),
    row(6, 'Ya Ingreso', '56900000006', 'Sí', 'Sí', 'residente'),
    row(7, 'Sin Telefono', '', 'No', 'No', 'activo'),
    row('', 'Sin ID', '56900000008', 'No', 'No', 'activo'),
  ]);

  const result = context.buildNrcReactivationDrafts();
  const rows = tab();

  assert.deepEqual(rows.map((cells) => [cells[0], cells[1], cells[2], cells[3]]),
    [[1, 'A', 1, 'RC-01'], [2, 'B', 1, 'RC-02'], [3, 'C', 1, 'RC-03']]);
  assert.match(rows[0][4], /^Hola Ana, ¿cómo estás\? Te escribe Francisco Barrientos/);
  assert.equal(rows[0][5], 'https://wa.me/56900000001?text=' + encodeURIComponent(rows[0][4]));
  assert.deepEqual([rows[0][6], rows[0][7], rows[0][8]], [false, '', false]);
  assert.equal(result.queued, 3);
  assert.equal(result.notActive, 3);
  assert.equal(result.noPhone, 1);
  // The log carries counts only.
  assert.doesNotMatch(logs.join(' '), /Ana|Luis|5690000/);
});

test('running again does not duplicate a draft that is still pending', () => {
  const { context, tab } = createContext([row(1, 'Ana Prueba', '56900000001', 'No', 'No', 'activo')]);

  context.buildNrcReactivationDrafts();
  const second = context.buildNrcReactivationDrafts();

  assert.equal(tab().length, 1);
  assert.equal(second.alreadyQueued, 1);
});

test('the second and third messages wait 4 and 10 days and nobody gets a fourth', () => {
  const day = (number) => new Date(`2026-10-${String(number).padStart(2, '0')}T15:00:00Z`);
  const responses = [row(1, 'Ana Prueba', '56900000001', 'No', 'No', 'activo')];
  const at = (now, prepare) => {
    const run = createContext(responses, { now });
    run.sheets.get('Recontacto').rows.push(...prepare());
    return { result: run.context.buildNrcReactivationDrafts(), rows: run.tab() };
  };
  const sent = (touch, message, date) => {
    const cells = [1, 'A', touch, message, 'texto', 'enlace', false, '', false];
    markSent(cells, date);
    return cells;
  };

  assert.equal(at(day(13), () => [sent(1, 'RC-01', day(10))]).result.waiting, 1);
  assert.deepEqual([...at(day(14), () => [sent(1, 'RC-01', day(10))]).rows[1].slice(0, 4)], [1, 'A', 2, 'RC-04']);
  assert.equal(at(day(19), () => [sent(1, 'RC-01', day(10)), sent(2, 'RC-04', day(14))]).result.waiting, 1);
  assert.deepEqual([...at(day(20), () => [sent(1, 'RC-01', day(10)), sent(2, 'RC-04', day(14))]).rows[2].slice(0, 4)],
    [1, 'A', 3, 'RC-05']);
  // A late second message pushes the third one, so two messages are never less than 4 days apart.
  assert.equal(at(day(20), () => [sent(1, 'RC-01', day(10)), sent(2, 'RC-04', day(18))]).result.waiting, 1);

  const done = at(day(30), () => [sent(1, 'RC-01', day(10)), sent(2, 'RC-04', day(14)), sent(3, 'RC-05', day(20))]);
  assert.equal(done.rows.length, 3);
  assert.equal(done.result.finished, 1);
});

test('a reply, an upcoming visit or a sent row without date stops the sequence', () => {
  const sentAt = new Date('2026-10-01T15:00:00Z');
  const { context, sheets, tab } = createContext([
    row(1, 'Ana Prueba', '56900000001', 'No', 'No', 'activo'),
    row(2, 'Luis Ejemplo', '56900000002', 'Sí', 'No', 'activo', { visitDate: new Date('2026-10-22T15:00:00Z') }),
    row(3, 'Eva Ficticia', '56900000003', 'No', 'No', 'activo'),
    row(4, 'Leo Inventado', '56900000004', 'Sí', 'No', 'activo', { visitDate: '05/10/2026' }),
  ]);
  sheets.get('Recontacto').rows.push(
    [1, 'A', 1, 'RC-01', 'texto', 'enlace', true, sentAt, true],
    [3, 'A', 1, 'RC-01', 'texto', 'enlace', true, '', false],
  );

  const result = context.buildNrcReactivationDrafts();

  assert.equal(result.replied, 1);
  assert.equal(result.upcomingVisit, 1);
  assert.equal(result.waiting, 1);
  // Only the prospect whose visit date already passed gets a draft.
  assert.deepEqual(tab().slice(2).map((cells) => [cells[0], cells[3]]), [[4, 'RC-02']]);
});

test('an unsent draft is withdrawn when the prospect stops being active', () => {
  const { context, sheets, tab } = createContext([row(1, 'Ana Prueba', '56900000001', 'No', 'No', 'activo')]);
  context.buildNrcReactivationDrafts();
  sheets.get(RESPONSES).rows[1][8] = 'desistió';

  const result = context.buildNrcReactivationDrafts();

  assert.equal(tab().length, 0);
  assert.equal(result.removed, 1);
});

test('a value the script does not recognize is reported by row and gets no draft', () => {
  const { context, tab } = createContext([
    row(1, 'Ana Prueba', '56900000001', 'Quizás', 'No', 'activo'),
    row(2, 'Luis Ejemplo', '56900000002', 'No', 'No', 'activo'),
  ]);

  const result = context.buildNrcReactivationDrafts();

  assert.equal(JSON.stringify(result.reviewRows), '[2]');
  assert.deepEqual(tab().map((cells) => cells[0]), [2]);
});

test('rows that share an ID give one draft, and one inactive row blocks the ID', () => {
  const { context, tab } = createContext([
    row(1, 'Ana Prueba', '56900000001', 'No', 'No', 'activo'),
    row(1, 'Ana Prueba', '56900000009', 'Sí', 'No', 'activo'),
    row(2, 'Luis Ejemplo', '56900000002', 'No', 'No', 'activo'),
    row(2, 'Luis Ejemplo', '56900000002', 'No', 'No', 'desistió'),
  ]);

  context.buildNrcReactivationDrafts();

  assert.deepEqual(tab().map((cells) => [cells[0], cells[1], cells[3]]), [[1, 'B', 'RC-02']]);
});

test('a name that does not look like one is left out of the greeting', () => {
  const { context, tab } = createContext([row(1, '123 ???', '56900000001', 'No', 'No', 'activo')]);

  context.buildNrcReactivationDrafts();

  assert.match(tab()[0][4], /^Hola, ¿cómo estás\?/);
});

test('the first run creates the tab with its headers', () => {
  const { context, sheets } = createContext([row(1, 'Ana Prueba', '56900000001', 'No', 'No', 'activo')], { withTab: false });

  context.buildNrcReactivationDrafts();

  assert.equal(sheets.get('Recontacto').rows[0].length, 10);
  assert.equal(sheets.get('Recontacto').rows[0][9], 'Resultado');
  assert.equal(sheets.get('Recontacto').rows[0][6], 'Enviado');
  assert.equal(sheets.get('Recontacto').rows.length, 2);
});

function submit(run, rowNumber) {
  const sheet = run.sheets.get(RESPONSES);
  run.context.assignNrcLeadIdOnFormSubmit({ range: { getSheet: () => sheet, getRow: () => rowNumber } });
  return sheet.rows[rowNumber - 1][1];
}

test('a new form gets its ID and a first-contact draft, even before Seguimiento is filled', () => {
  const run = createContext([
    row(21, 'Luis Ejemplo', '56900000021', 'No', 'No', 'activo'),
    row('', 'Ana Prueba', '56900000022', '', '', '', { at: NOW }),
  ]);

  assert.equal(submit(run, 3), 22);
  // Only the new prospect is queued; the older one waits for a manual run.
  assert.deepEqual(run.tab().map((cells) => [...cells.slice(0, 4)]), [[22, 'nuevo', 1, 'PC-01']]);
  assert.match(run.tab()[0][4], /^Hola Ana, ¿cómo estás\? .*Recibí tu solicitud/);
});

test('a repeated form reuses the ID and does not queue another first contact', () => {
  const run = createContext([
    row(21, 'Luis Ejemplo', '56900000021', 'No', 'No', 'activo'),
    row('', 'Luis Ejemplo', '56900000021', '', '', '', { at: NOW }),
  ]);

  assert.equal(submit(run, 3), 21);
  assert.equal(run.tab().length, 0);
});

test('the ID is assigned when the Recontacto tab does not exist or the draft step fails', () => {
  const rows = () => [row('', 'Ana Prueba', '56900000022', '', '', '', { at: NOW })];

  const withoutTab = createContext(rows(), { withTab: false });
  assert.equal(submit(withoutTab, 2), 1);
  assert.equal(withoutTab.sheets.has('Recontacto'), false);

  const broken = createContext(rows());
  broken.sheets.get('Recontacto').appendRow = () => { throw new Error('synthetic failure'); };
  assert.equal(submit(broken, 2), 1);
  assert.deepEqual(broken.logs, ['The first-contact draft was not queued.']);
});

test('ticking Enviado stamps the date once, and only in the Recontacto tab', () => {
  const run = createContext([row(1, 'Ana Prueba', '56900000001', 'No', 'No', 'activo')]);
  run.context.buildNrcReactivationDrafts();
  const tabSheet = run.sheets.get('Recontacto');
  const edit = (sheet, rowNumber, column, value) => {
    sheet.rows[rowNumber - 1][column - 1] = value;
    run.context.onEdit({ range: sheet.getRange(rowNumber, column) });
  };

  edit(tabSheet, 2, 9, true);
  assert.equal(tabSheet.rows[1][7], '');
  edit(tabSheet, 2, 7, true);
  assert.equal(tabSheet.rows[1][7].getTime(), NOW.getTime());

  const first = tabSheet.rows[1][7];
  edit(tabSheet, 2, 7, true);
  assert.equal(tabSheet.rows[1][7], first);

  const responses = run.sheets.get(RESPONSES);
  const before = JSON.stringify(responses.rows);
  edit(responses, 2, 7, true);
  responses.rows[1][6] = '';
  assert.equal(JSON.stringify(responses.rows), before);
});

function withDrafts(responseRows) {
  const run = createContext(responseRows);
  run.context.buildNrcReactivationDrafts();
  const tabSheet = run.sheets.get('Recontacto');
  run.edit = (rowNumber, column, value) => {
    tabSheet.rows[rowNumber - 1][column - 1] = value;
    run.context.onEdit({ range: tabSheet.getRange(rowNumber, column) });
  };
  run.responses = run.sheets.get(RESPONSES).rows;
  return run;
}

test('ticking Enviado adds a dated note after what Francisco wrote in Estado', () => {
  const run = withDrafts([
    row(1, 'Ana Prueba', '56900000001', 'Sí', 'Sí', 'Activo', { status: 'Visitó. Le Gustó' }),
    row(2, 'Luis Ejemplo', '56900000002', 'No', 'No', 'activo'),
  ]);

  run.edit(2, 7, true);
  run.edit(2, 7, true);

  assert.equal(run.responses[1][STATUS], 'Visitó. Le Gustó. Recontactado 20/10.');
  assert.equal(run.responses[2][STATUS], '');
});

test('choosing desistió closes the prospect and no later draft is prepared', () => {
  const run = withDrafts([
    row(1, 'Ana Prueba', '56900000001', 'Sí', 'Sí', 'Activo', { status: 'Visitó.' }),
    row(1, 'Ana Prueba', '56900000009', 'Sí', 'Sí', 'Activo'),
    row(2, 'Luis Ejemplo', '56900000002', 'No', 'No', 'Activo'),
  ]);

  run.edit(2, 10, 'desistió');

  assert.equal(run.tab()[0][8], true);
  // Both rows of the ID change; the other prospect is untouched.
  assert.deepEqual(run.responses.slice(1).map((cells) => [cells[FOLLOW_UP], cells[STATUS], cells[ADMISSION]]), [
    ['Desistió', 'Visitó. Desistió 20/10.', 'Desistió'],
    ['Desistió', 'Desistió 20/10.', 'Desistió'],
    ['Activo', '', 'No Aún'],
  ]);
  assert.equal(run.context.buildNrcReactivationDrafts().queued, 0);
});

test('the other results tick Respondió and add their note without touching Seguimiento', () => {
  const run = withDrafts([
    row(1, 'Ana Prueba', '56900000001', 'No', 'No', 'activo'),
    row(2, 'Luis Ejemplo', '56900000002', 'No', 'No', 'activo'),
  ]);

  run.edit(2, 10, 'quiere visita');
  run.edit(3, 10, 'Sigue pensando');
  run.edit(3, 10, 'otra cosa');

  assert.deepEqual(run.responses.slice(1).map((cells) => [cells[FOLLOW_UP], cells[STATUS], cells[ADMISSION]]),
    [['activo', 'Quiere visita 20/10.', 'No Aún'], ['activo', 'Sigue pensando 20/10.', 'No Aún']]);
  assert.deepEqual(run.tab().map((cells) => cells[8]), [true, true]);
});

test('a withdrawal never changes a resident or an admission that is already decided', () => {
  const run = withDrafts([
    row(1, 'Ana Prueba', '56900000001', 'Sí', 'Sí', 'activo', { admission: 'Ingresó' }),
    row(2, 'Luis Ejemplo', '56900000002', 'No', 'No', 'activo'),
  ]);
  run.responses[2][FOLLOW_UP] = 'Residente';

  run.edit(2, 10, 'desistió');
  run.edit(3, 10, 'desistió');

  assert.equal(run.responses[1][ADMISSION], 'Ingresó');
  assert.equal(run.responses[2][FOLLOW_UP], 'Residente');
});

test('a draft marked as answered without being sent stays and is not queued again', () => {
  const run = withDrafts([row(1, 'Ana Prueba', '56900000001', 'No', 'No', 'activo')]);
  run.edit(2, 9, true);

  const second = run.context.buildNrcReactivationDrafts();
  const third = run.context.buildNrcReactivationDrafts();

  assert.equal(run.tab().length, 1);
  assert.deepEqual([second.replied, second.removed, third.queued], [1, 0, 0]);
});

test('a tab created before Resultado existed gets the header on the next run', () => {
  const run = createContext([row(1, 'Ana Prueba', '56900000001', 'No', 'No', 'activo')]);
  run.sheets.get('Recontacto').rows[0] = ['#', 'Segmento', 'Toque', 'Mensaje', 'Texto', 'Enlace', 'Enviado', 'Fecha de envío', 'Respondió'];

  run.context.buildNrcReactivationDrafts();

  assert.equal(run.sheets.get('Recontacto').rows[0][9], 'Resultado');
});

test('an unsent draft follows the prospect when the visit is recorded later', () => {
  const run = withDrafts([
    row(1, 'Ana Prueba', '56900000001', 'Sí', 'No', 'activo'),
    row(2, 'Luis Ejemplo', '56900000002', 'Sí', 'No', 'activo'),
  ]);
  run.edit(3, 7, true);
  run.responses[1][7] = 'Sí';
  run.responses[2][7] = 'Sí';

  const result = run.context.buildNrcReactivationDrafts();

  assert.equal(result.refreshed, 1);
  assert.deepEqual(run.tab().map((cells) => [cells[0], cells[1], cells[3]]), [[1, 'C', 'RC-03'], [2, 'B', 'RC-02']]);
  assert.match(run.tab()[0][4], /después de la visita/);
  assert.equal(run.tab()[0][5], 'https://wa.me/56900000001?text=' + encodeURIComponent(run.tab()[0][4]));
  // The message that was already sent is history and keeps its text.
  assert.equal(run.tab()[1][6], true);
});

test('a run adds the note of messages sent before the notes existed, once', () => {
  const run = withDrafts([row(1, 'Ana Prueba', '56900000001', 'Sí', 'Sí', 'activo', { status: 'Visitó.' })]);
  const cells = run.sheets.get('Recontacto').rows[1];
  cells[6] = true;
  cells[7] = new Date('2026-10-11T15:00:00Z');

  run.context.buildNrcReactivationDrafts();
  run.context.buildNrcReactivationDrafts();

  assert.equal(run.responses[1][STATUS], 'Visitó. Recontactado 11/10.');
});

test('opening the spreadsheet refreshes the drafts only when the tab exists', () => {
  const withTab = createContext([row(1, 'Ana Prueba', '56900000001', 'No', 'No', 'activo')]);
  withTab.context.onOpen();
  assert.equal(withTab.tab().length, 1);

  const withoutTab = createContext([row(1, 'Ana Prueba', '56900000001', 'No', 'No', 'activo')], { withTab: false });
  withoutTab.context.onOpen();
  assert.equal(withoutTab.sheets.has('Recontacto'), false);
});
