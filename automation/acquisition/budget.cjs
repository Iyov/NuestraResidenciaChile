// Monthly advertising cap of SPEC-005, set by Francisco on 2026-10-09. It is
// in pesos because that is how the Google Ads account is billed.
const MONTHLY_CAP_CLP = 80000;

const NEEDS_APPROVAL = 'falta confirmación humana';

/**
 * spend: { spentClp, configuredMonthlyMaxClp, capClp }
 *   configuredMonthlyMaxClp  the monthly maximum set in the campaign, if known
 * Returns { capClp, spentClp, used, over, remainingClp, configuredOver }.
 * configuredOver is null when the campaign maximum was not given.
 */
function checkSpend(spend) {
  const capClp = spend.capClp === undefined ? MONTHLY_CAP_CLP : spend.capClp;
  if (!(typeof capClp === 'number' && capClp > 0)) throw new Error('capClp must be a positive number.');
  if (!(typeof spend.spentClp === 'number' && spend.spentClp >= 0)) throw new Error('spentClp must be a number.');

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

module.exports = { MONTHLY_CAP_CLP, NEEDS_APPROVAL, checkSpend, reviewChange };
