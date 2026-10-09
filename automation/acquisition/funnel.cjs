const OUTCOMES = Object.freeze({
  open: 'en proceso',
  signed: 'ingresó',
  lost: 'desistió',
  review: 'revisar',
});

const TIME_ZONE = 'America/Santiago';

// Headers of `Respuestas de formulario 1`, compared after normalizeHeader. The
// last two do not exist in the sheet yet: without them the visit that took
// place and the payment are reported as unknown, never as zero.
const HEADERS = Object.freeze({
  submittedAt: 'marca temporal',
  origin: 'origen del contacto',
  visitScheduled: 'agendo visita',
  visitDate: 'fecha visita',
  outcome: 'ingreso?',
  entryDate: 'fecha ingreso',
  commission: 'comision',
  visitDone: 'visita realizada',
  paidAt: 'fecha pago',
});
const REQUIRED = ['submittedAt', 'origin', 'visitScheduled', 'outcome'];

const SIGNED_VALUES = ['ingreso'];
const LOST_VALUES = ['desistio', 'no seguir'];
const OPEN_VALUES = ['no aun', ''];

/**
 * Funnel of SPEC-005 as pure functions: nothing here reads the sheet or sends
 * anything. readSheetRow keeps only the columns the funnel needs, so names,
 * phones, emails and comments never reach a report.
 *
 * Returns { submittedAt, origin, visitScheduled, visitDate, visitDone, outcome,
 * entryDate, paid, paidAt, commission }. visitDone and paid are null when the
 * sheet has no column for them.
 */
function readSheetRow(headers, row) {
  const index = {};
  headers.forEach((header, position) => {
    index[normalizeHeader(header)] = position;
  });
  const missing = REQUIRED.filter((field) => index[HEADERS[field]] === undefined);
  if (missing.length) throw new Error(`Missing sheet columns: ${missing.map((field) => HEADERS[field]).join(', ')}`);

  const has = (field) => index[HEADERS[field]] !== undefined;
  const cell = (field) => (has(field) ? row[index[HEADERS[field]]] : undefined);
  const paidAt = toDate(cell('paidAt'));

  return {
    submittedAt: toDate(cell('submittedAt')),
    origin: String(cell('origin') || '').trim() || 'sin dato',
    visitScheduled: isYes(cell('visitScheduled')),
    visitDate: toDate(cell('visitDate')),
    visitDone: has('visitDone') ? isYes(cell('visitDone')) : null,
    outcome: readOutcome(cell('outcome')),
    entryDate: toDate(cell('entryDate')),
    paid: has('paidAt') ? paidAt !== null : null,
    paidAt,
    commission: Number(cell('commission')) || 0,
  };
}

/**
 * month: 'YYYY-MM' in Chilean time.
 * `cohort` follows the inquiries of that month up to today, so a visit or an
 * admission of a later month still counts for the month the family wrote.
 * `events` counts what happened during the month, whenever the family wrote.
 * A signed admission is not a commission: it accrues only once the residence
 * was paid, and without a payment column the accrued amount is unknown.
 */
function monthlyFunnel(leads, month) {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('Month must be YYYY-MM.');
  const cohort = leads.filter((lead) => monthOf(lead.submittedAt) === month);
  const count = (list, test) => list.filter(test).length;
  const signed = (lead) => lead.outcome === OUTCOMES.signed;
  const knows = (field) => leads.some((lead) => lead[field] !== null);

  const byOrigin = {};
  for (const lead of cohort) byOrigin[lead.origin] = (byOrigin[lead.origin] || 0) + 1;

  const stages = {
    visitScheduled: count(cohort, (lead) => lead.visitScheduled),
    visitDone: knows('visitDone') ? count(cohort, (lead) => lead.visitDone === true) : null,
    signed: count(cohort, signed),
    paid: knows('paid') ? count(cohort, (lead) => signed(lead) && lead.paid === true) : null,
  };

  return {
    month,
    inquiries: cohort.length,
    byOrigin,
    cohort: Object.assign({}, stages, {
      lost: count(cohort, (lead) => lead.outcome === OUTCOMES.lost),
      open: count(cohort, (lead) => lead.outcome === OUTCOMES.open),
      review: count(cohort, (lead) => lead.outcome === OUTCOMES.review),
    }),
    rates: {
      visitScheduled: ratio(stages.visitScheduled, cohort.length),
      visitDone: ratio(stages.visitDone, cohort.length),
      signed: ratio(stages.signed, cohort.length),
      paid: ratio(stages.paid, cohort.length),
    },
    events: {
      signed: count(leads, (lead) => signed(lead) && monthOf(lead.entryDate) === month),
      paid: knows('paid') ? count(leads, (lead) => signed(lead) && monthOf(lead.paidAt) === month) : null,
    },
    commission: {
      accruedInMonth: knows('paid')
        ? sum(leads.filter((lead) => signed(lead) && monthOf(lead.paidAt) === month))
        : null,
      pendingToDate: sum(leads.filter((lead) => signed(lead) && lead.paid !== true)),
    },
  };
}

/**
 * Spend of the month divided by what the whole funnel produced, all origins
 * together: the sheet does not say which inquiry came from an ad.
 */
function blendedCosts(funnel, spentClp) {
  return {
    perInquiry: ratio(spentClp, funnel.inquiries),
    perVisit: ratio(spentClp, funnel.cohort.visitScheduled),
    perSigned: ratio(spentClp, funnel.cohort.signed),
  };
}

function readOutcome(cell) {
  const value = normalizeHeader(cell);
  if (SIGNED_VALUES.includes(value)) return OUTCOMES.signed;
  if (LOST_VALUES.includes(value)) return OUTCOMES.lost;
  if (OPEN_VALUES.includes(value)) return OUTCOMES.open;
  return OUTCOMES.review;
}

function isYes(cell) {
  return normalizeHeader(cell) === 'si';
}

// A date-only text stays as written: parsing it would move it to the previous
// day in Chile. Anything that is not a date ("-", "por definir") is no date.
function toDate(cell) {
  if (cell instanceof Date) return isNaN(cell.getTime()) ? null : cell;
  if (typeof cell !== 'string') return null;
  const text = cell.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  if (/^\d{4}-\d{2}-\d{2}T/.test(text) && !isNaN(new Date(text).getTime())) return new Date(text);
  return null;
}

function monthOf(date) {
  if (!date) return null;
  if (typeof date === 'string') return date.slice(0, 7);
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit' })
    .formatToParts(date);
  const part = (type) => parts.find((entry) => entry.type === type).value;
  return `${part('year')}-${part('month')}`;
}

function ratio(part, whole) {
  if (part === null || part === undefined || !whole) return null;
  return part / whole;
}

function sum(leads) {
  return leads.reduce((total, lead) => total + lead.commission, 0);
}

function normalizeHeader(value) {
  return String(value === null || value === undefined ? '' : value)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[¿¡]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

module.exports = { HEADERS, OUTCOMES, blendedCosts, monthlyFunnel, readSheetRow };
