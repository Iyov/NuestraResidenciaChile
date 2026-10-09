// Monthly advertising cap of SPEC-005, confirmed by Francisco on 2026-10-08.
const MONTHLY_CAP_USD = 80;

const NEEDS_APPROVAL = 'falta confirmación humana';

/**
 * The account is billed in pesos and the cap is in dollars, so the caller
 * gives the exchange rate it wants to use: there is no default rate here.
 *
 * spend: { spentClp, clpPerUsd, configuredMonthlyMaxClp, capUsd }
 *   configuredMonthlyMaxClp  the monthly maximum set in the campaign, if known
 * Returns { capClp, spentClp, used, over, remainingClp, configuredOver }.
 * configuredOver is null when the campaign maximum was not given.
 */
function checkSpend(spend) {
  const capUsd = spend.capUsd === undefined ? MONTHLY_CAP_USD : spend.capUsd;
  for (const [name, value] of [['capUsd', capUsd], ['clpPerUsd', spend.clpPerUsd]]) {
    if (!(typeof value === 'number' && value > 0)) throw new Error(`${name} must be a positive number.`);
  }
  if (!(typeof spend.spentClp === 'number' && spend.spentClp >= 0)) throw new Error('spentClp must be a number.');

  const capClp = Math.round(capUsd * spend.clpPerUsd);
  const configured = spend.configuredMonthlyMaxClp;
  return {
    capClp,
    spentClp: spend.spentClp,
    used: spend.spentClp / capClp,
    over: spend.spentClp > capClp,
    remainingClp: Math.max(0, capClp - spend.spentClp),
    configuredOver: typeof configured === 'number' ? configured > capClp : null,
  };
}

/**
 * Every budget or campaign change waits for a person: approval is
 * { by, at }, the name of who confirmed and when. Nothing here talks to
 * Google Ads; this is the question to ask before anyone does.
 */
function reviewChange(change, approval) {
  if (!change || !String(change.description || '').trim()) throw new Error('The change needs a description.');
  const by = approval && String(approval.by || '').trim();
  const at = approval && approval.at ? new Date(approval.at).getTime() : NaN;
  if (!by || isNaN(at)) return { ok: false, reason: NEEDS_APPROVAL };
  return { ok: true, approvedBy: by, approvedAt: new Date(at).toISOString() };
}

module.exports = { MONTHLY_CAP_USD, NEEDS_APPROVAL, checkSpend, reviewChange };
