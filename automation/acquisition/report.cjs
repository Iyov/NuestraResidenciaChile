const { assertNoPii } = require('./pii.cjs');

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const NO_DATA = 'sin dato';

/**
 * Monthly report for management (SPEC-005, AC-005) as Markdown. It takes
 * counts only: any name, phone, email or sheet row in the input stops it.
 * The text is a draft for Francisco to review; nothing here sends it.
 *
 * data: { funnel, previous, spend, costs, web, nextSteps }
 *   funnel, previous  monthlyFunnel() of the month and of the one before (or null)
 *   spend             checkSpend() of the month (or null)
 *   costs             blendedCosts() (or null)
 *   web               { visitors, paidShare, organicClicks } (or null)
 *   nextSteps         short sentences written by Francisco
 */
function renderMonthlyReport(data) {
  assertNoPii(data, 'Management report');
  const { funnel, previous } = data;
  const [year, month] = funnel.month.split('-').map(Number);
  const before = (pick) => (previous ? pick(previous) : undefined);

  const lines = [
    `# Informe Nuestra Residencia — ${MONTHS[month - 1]} ${year}`,
    '',
    '## Embudo de las consultas del mes',
    '',
    '| Etapa | Cantidad | De cada 100 consultas | Mes anterior |',
    '|---|---|---|---|',
    row('Consultas recibidas', funnel.inquiries, null, before((f) => f.inquiries)),
    row('Agendaron visita', funnel.cohort.visitScheduled, funnel.rates.visitScheduled, before((f) => f.cohort.visitScheduled)),
    row('Visita realizada', funnel.cohort.visitDone, funnel.rates.visitDone, before((f) => f.cohort.visitDone)),
    row('Ingreso firmado', funnel.cohort.signed, funnel.rates.signed, before((f) => f.cohort.signed)),
    row('Ingreso pagado', funnel.cohort.paid, funnel.rates.paid, before((f) => f.cohort.paid)),
    '',
    `Siguen en proceso: ${funnel.cohort.open}. Desistieron: ${funnel.cohort.lost}.`,
    '',
    '## Origen de las consultas',
    '',
    ...originLines(funnel.byOrigin),
    '',
    '## Ingresos y comisión',
    '',
    `- Ingresos firmados durante el mes: ${number(funnel.events.signed)}.`,
    `- Ingresos pagados durante el mes: ${number(funnel.events.paid)}.`,
    `- Comisión devengada en el mes (ingreso firmado y pagado): ${money(funnel.commission.accruedInMonth)}.`,
    `- Comisión de ingresos firmados aún sin pago registrado: ${money(funnel.commission.pendingToDate)}.`,
  ];

  if (data.spend) {
    const spend = data.spend;
    lines.push(
      '',
      '## Inversión en publicidad',
      '',
      `- Gastado: ${money(spend.spentClp)} de un tope de ${money(spend.capClp)} (${percent(spend.used)}).`,
      spend.over ? '- **El gasto superó el tope aprobado.**' : `- Disponible: ${money(spend.remainingClp)}.`,
    );
    if (spend.configuredOver) lines.push('- **El máximo mensual configurado en la campaña es mayor que el tope aprobado.**');
    if (data.costs) {
      lines.push(
        `- Costo por consulta: ${money(data.costs.perInquiry)}. Por visita agendada: ${money(data.costs.perVisit)}. Por ingreso firmado: ${money(data.costs.perSigned)}.`,
        '- Estos costos reparten todo el gasto entre todas las consultas, vengan o no de un anuncio.',
      );
    }
  }

  if (data.web) {
    lines.push(
      '',
      '## Sitio web',
      '',
      `- Visitantes: ${number(data.web.visitors)}.`,
      `- Visitantes que llegaron por anuncios: ${percent(data.web.paidShare)}.`,
      `- Clics desde la búsqueda de Google sin anuncio: ${number(data.web.organicClicks)}.`,
    );
  }

  const steps = (data.nextSteps || []).filter((step) => String(step).trim());
  if (steps.length) lines.push('', '## Próximos pasos', '', ...steps.map((step) => `- ${step}`));

  return `${lines.join('\n')}\n`;
}

function row(label, count, rate, previous) {
  const per100 = rate === null ? (count === null ? NO_DATA : '') : String(Math.round(rate * 100));
  return `| ${label} | ${number(count)} | ${per100} | ${previous === undefined ? '' : number(previous)} |`;
}

function originLines(byOrigin) {
  const entries = Object.entries(byOrigin).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return entries.length ? entries.map(([origin, count]) => `- ${origin}: ${count}`) : ['- Sin consultas en el mes.'];
}

function number(value) {
  if (value === null || value === undefined) return NO_DATA;
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function money(value) {
  return value === null || value === undefined ? NO_DATA : `$${number(value)}`;
}

function percent(value) {
  return value === null || value === undefined ? NO_DATA : `${Math.round(value * 100)}%`;
}

module.exports = { renderMonthlyReport };
