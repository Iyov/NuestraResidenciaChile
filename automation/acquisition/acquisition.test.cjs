const assert = require('node:assert/strict');
const test = require('node:test');

const { MONTHLY_CAP_CLP, NEEDS_APPROVAL, checkSpend, reviewChange } = require('./budget.cjs');
const { MISSING, mayPublish } = require('./content.cjs');
const { OUTCOMES, blendedCosts, monthlyFunnel, readSheetRow } = require('./funnel.cjs');
const { findPii } = require('./pii.cjs');
const { renderMonthlyReport } = require('./report.cjs');
const { CHANNELS, EVIDENCE, attribute, campaignUrl, safeEventParams } = require('./tracking.cjs');

// Synthetic fixtures only: invented people, numbers and dates.
const HEADERS = [
  'Marca temporal', '#', 'Tu Nombre y Apellido', 'Email', 'Teléfono', 'Nombre del Adulto Mayor',
  'Origen del Contacto', 'Agendo Visita', 'Fecha Visita', 'Ingresó?', 'Comentario', 'Fecha Ingreso', 'Comisión',
];
const TRACKED_HEADERS = HEADERS.concat(['Visita realizada', 'Fecha Pago']);

function sheetRow(overrides) {
  const values = Object.assign({
    'Marca temporal': new Date('2027-03-10T15:00:00Z'),
    '#': 101,
    'Tu Nombre y Apellido': 'Persona Ficticia',
    Email: 'ficticia@example.com',
    'Teléfono': '+56 9 0000 0000',
    'Nombre del Adulto Mayor': 'Mayor Ficticio',
    'Origen del Contacto': 'Sitio Web',
    'Agendo Visita': 'No',
    'Fecha Visita': '-',
    'Ingresó?': 'No Aún',
    Comentario: 'Texto libre inventado',
    'Fecha Ingreso': '',
    'Comisión': 0,
    'Visita realizada': '',
    'Fecha Pago': '',
  }, overrides);
  return TRACKED_HEADERS.map((header) => values[header]);
}

function lead(overrides, headers = TRACKED_HEADERS) {
  return readSheetRow(headers, sheetRow(overrides));
}

const MARCH = [
  lead({}),
  lead({ 'Origen del Contacto': 'WhatsApp', 'Agendo Visita': 'Si', 'Fecha Visita': '2027-03-15', 'Visita realizada': 'Si', 'Ingresó?': 'Desistió' }),
  lead({ 'Agendo Visita': 'Si', 'Fecha Visita': '2027-03-18', 'Visita realizada': 'Si', 'Ingresó?': 'Ingresó', 'Fecha Ingreso': '2027-04-02', 'Comisión': 500000 }),
  lead({ 'Agendo Visita': 'Si', 'Fecha Visita': '2027-03-22', 'Visita realizada': 'Si', 'Ingresó?': 'Ingresó', 'Fecha Ingreso': '2027-03-30', 'Fecha Pago': '2027-04-05', 'Comisión': 480000 }),
];

test('a sheet row is reduced to the funnel fields and carries no identifiable data', () => {
  const reduced = lead({});
  assert.deepEqual(Object.keys(reduced).sort(), [
    'commission', 'entryDate', 'origin', 'outcome', 'paid', 'paidAt',
    'submittedAt', 'visitDate', 'visitDone', 'visitScheduled',
  ]);
  assert.deepEqual(findPii(reduced), []);
  assert.equal(reduced.visitDate, null);
  assert.equal(reduced.outcome, OUTCOMES.open);
});

test('an unknown admission value is counted for review, not guessed', () => {
  assert.equal(lead({ 'Ingresó?': 'Quizás' }).outcome, OUTCOMES.review);
  assert.equal(lead({ 'Ingresó?': 'No seguir' }).outcome, OUTCOMES.lost);
});

test('a sheet without the required columns is rejected', () => {
  assert.throws(() => readSheetRow(['Marca temporal', '#'], [new Date(), 1]), /Missing sheet columns/);
});

test('AC-002: the funnel separates inquiry, visit, signed admission and paid admission', () => {
  const funnel = monthlyFunnel(MARCH, '2027-03');
  assert.equal(funnel.inquiries, 4);
  assert.deepEqual(funnel.byOrigin, { 'Sitio Web': 3, WhatsApp: 1 });
  assert.deepEqual(funnel.cohort, { visitScheduled: 3, visitDone: 3, signed: 2, paid: 1, lost: 1, open: 1, review: 0 });
  assert.equal(funnel.rates.signed, 0.5);
  assert.equal(funnel.rates.paid, 0.25);
});

test('a signed admission is not an accrued commission until the payment is recorded', () => {
  const march = monthlyFunnel(MARCH, '2027-03');
  assert.deepEqual(march.events, { signed: 1, paid: 0 });
  assert.deepEqual(march.commission, { accruedInMonth: 0, pendingToDate: 500000 });

  const april = monthlyFunnel(MARCH, '2027-04');
  assert.equal(april.inquiries, 0);
  assert.deepEqual(april.events, { signed: 1, paid: 1 });
  assert.equal(april.commission.accruedInMonth, 480000);
  assert.equal(april.rates.signed, null);
});

test('without visit and payment columns those stages are unknown, never zero', () => {
  const leads = [lead({ 'Agendo Visita': 'Si', 'Ingresó?': 'Ingresó', 'Comisión': 500000 }, HEADERS)];
  const funnel = monthlyFunnel(leads, '2027-03');
  assert.equal(funnel.cohort.visitDone, null);
  assert.equal(funnel.cohort.paid, null);
  assert.equal(funnel.events.paid, null);
  assert.deepEqual(funnel.commission, { accruedInMonth: null, pendingToDate: 500000 });
});

test('months follow Chilean time', () => {
  // 02:00 UTC on April 1st is still March 31st in Santiago.
  const late = lead({ 'Marca temporal': new Date('2027-04-01T02:00:00Z') });
  assert.equal(monthlyFunnel([late], '2027-03').inquiries, 1);
  assert.equal(monthlyFunnel([late], '2027-04').inquiries, 0);
});

test('costs are unknown when there is nothing to divide by', () => {
  const costs = blendedCosts(monthlyFunnel(MARCH, '2027-03'), 72000);
  assert.deepEqual(costs, { perInquiry: 18000, perVisit: 24000, perSigned: 36000 });
  assert.equal(blendedCosts(monthlyFunnel([], '2027-03'), 72000).perInquiry, null);
});

test('AC-001: an inquiry is attributed from the ad click, the UTM labels or the form answer', () => {
  const paid = attribute({ landingUrl: 'https://example.cl/contact/?gclid=FAKE-CLICK-ID&utm_campaign=visitas', declaredOrigin: 'Sitio Web' });
  assert.deepEqual(paid, { channel: CHANNELS.paidSearch, evidence: EVIDENCE.adClick, source: null, medium: null, campaign: 'visitas' });
  assert.equal(JSON.stringify(paid).includes('FAKE-CLICK-ID'), false);

  const social = attribute({ landingUrl: campaignUrl('https://example.cl/contact/', { source: 'instagram', medium: 'social', campaign: 'blog-marzo' }) });
  assert.equal(social.channel, CHANNELS.social);
  assert.equal(social.evidence, EVIDENCE.utm);

  assert.equal(attribute({ declaredOrigin: 'WhatsApp' }).channel, CHANNELS.whatsapp);
  assert.equal(attribute({ declaredOrigin: 'Sitio Web' }).channel, CHANNELS.site);
  assert.deepEqual(attribute({}), { channel: CHANNELS.other, evidence: EVIDENCE.none, source: null, medium: null, campaign: null });
});

test('AC-001: identifiable data cannot travel in a campaign link or an analytics event', () => {
  assert.throws(() => campaignUrl('https://example.cl/', { source: 'google', medium: 'cpc', campaign: 'ficticia@example.com' }));
  assert.equal(attribute({ landingUrl: 'https://example.cl/?utm_source=ficticia@example.com' }).source, null);

  assert.deepEqual(safeEventParams({ form: 'contacto', channel: CHANNELS.site }), { form: 'contacto', channel: CHANNELS.site });
  assert.throws(() => safeEventParams({ form: 'contacto', email: 'x' }), /email/);
  assert.throws(() => safeEventParams({ label: 'llamar al +56 9 0000 0000' }), /label/);
  assert.throws(() => safeEventParams({ label: '11.111.111-1' }));
});

test('AC-003: spend is compared with the approved monthly cap', () => {
  assert.equal(MONTHLY_CAP_CLP, 80000);
  const within = checkSpend({ spentClp: 60000 });
  assert.deepEqual(within, { capClp: 80000, spentClp: 60000, used: 0.75, over: false, remainingClp: 20000, configuredOver: null });

  const over = checkSpend({ spentClp: 90000, configuredMonthlyMaxClp: 150000 });
  assert.equal(over.over, true);
  assert.equal(over.remainingClp, 0);
  assert.equal(over.configuredOver, true);

  assert.equal(checkSpend({ spentClp: 0, configuredMonthlyMaxClp: 80000 }).configuredOver, false);
  assert.throws(() => checkSpend({}), /spentClp/);
});

test('AC-003: a budget or campaign change waits for a named person', () => {
  const change = { description: 'Subir el presupuesto diario' };
  assert.deepEqual(reviewChange(change), { ok: false, reason: NEEDS_APPROVAL });
  assert.deepEqual(reviewChange(change, { by: '', at: '2027-03-01T12:00:00Z' }), { ok: false, reason: NEEDS_APPROVAL });
  assert.deepEqual(reviewChange(change, { by: 'Persona Ficticia', at: '2027-03-01T12:00:00Z' }), {
    ok: true, approvedBy: 'Persona Ficticia', approvedAt: '2027-03-01T12:00:00.000Z',
  });
});

test('AC-004: nothing is published without sources, permissions and a human approval', () => {
  const approval = { by: 'Persona Ficticia', at: '2027-03-01T12:00:00Z' };
  const bare = mayPublish({
    claims: [{ text: 'Dato con respaldo', source: 'brochure' }, { text: 'Dato sin respaldo' }],
    images: [{ file: 'jardin.jpg', showsPeople: false }, { file: 'taller.jpg' }],
    testimonial: {},
  });
  assert.equal(bare.ok, false);
  assert.deepEqual(bare.missing, [
    `${MISSING.claimSource} (2)`,
    `${MISSING.imagePermission} (taller.jpg)`,
    MISSING.testimonial,
    MISSING.approval,
  ]);

  assert.deepEqual(mayPublish({
    claims: [{ text: 'Dato con respaldo', source: 'brochure' }],
    images: [{ file: 'taller.jpg', showsPeople: true, permission: 'autorización firmada' }],
    approval,
  }), { ok: true, missing: [] });
  assert.equal(mayPublish({ approval: { by: 'Persona Ficticia' } }).ok, false);
});

test('AC-005: the management report shows counts, the cap and unknown stages', () => {
  const funnel = monthlyFunnel(MARCH, '2027-03');
  const report = renderMonthlyReport({
    funnel,
    previous: monthlyFunnel(MARCH, '2027-02'),
    spend: checkSpend({ spentClp: 72000, configuredMonthlyMaxClp: 150000 }),
    costs: blendedCosts(funnel, 72000),
    web: { visitors: 1380, paidShare: 0.5, organicClicks: null },
    nextSteps: ['Revisar el máximo mensual de la campaña.'],
  });

  assert.match(report, /^# Informe Nuestra Residencia — marzo 2027\n/);
  assert.match(report, /\| Consultas recibidas \| 4 \|  \| 0 \|/);
  assert.match(report, /\| Ingreso firmado \| 2 \| 50 \| 0 \|/);
  assert.match(report, /Comisión devengada en el mes \(ingreso firmado y pagado\): \$0\./);
  assert.match(report, /sin pago registrado: \$500\.000\./);
  assert.match(report, /Gastado: \$72\.000 de un tope de \$80\.000 \(90%\)/);
  assert.match(report, /máximo mensual configurado en la campaña es mayor/);
  assert.match(report, /Visitantes: 1\.380\./);
  assert.match(report, /sin anuncio: sin dato\./);
  assert.match(report, /- Revisar el máximo mensual de la campaña\./);

  const untracked = renderMonthlyReport({ funnel: monthlyFunnel([lead({}, HEADERS)], '2027-03') });
  assert.match(untracked, /\| Visita realizada \| sin dato \| sin dato \|  \|/);
  assert.match(untracked, /Comisión devengada en el mes \(ingreso firmado y pagado\): sin dato\./);
});

test('AC-005: the management report refuses identifiable data', () => {
  const funnel = monthlyFunnel(MARCH, '2027-03');
  assert.throws(() => renderMonthlyReport({ funnel, nextSteps: ['Llamar al 9 0000 0000'] }), /nextSteps/);
  assert.throws(() => renderMonthlyReport({ funnel, leads: [{ nombre: 'Persona Ficticia' }] }), /leads\.0\.nombre/);
});
