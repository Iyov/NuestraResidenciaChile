const MISSING = Object.freeze({
  claimSource: 'afirmación sin fuente',
  imagePermission: 'imagen con personas sin autorización',
  testimonial: 'testimonio sin autorización',
  approval: 'sin aprobación humana',
});

/**
 * The question to ask before an article, a social post, an ad or a page goes
 * out (SPEC-005, AC-004). Nothing here publishes.
 *
 * item: { claims, images, testimonial, approval }
 *   claims       [{ text, source }]  each commercial or health statement and where it comes from
 *   images       [{ file, showsPeople, permission }]
 *   testimonial  { authorization } when the piece quotes a resident or a family
 *   approval     { by, at }  the person who reviewed this exact piece
 * Returns { ok, missing }, with every reason and not only the first one.
 */
function mayPublish(item) {
  const missing = [];
  const filled = (value) => String(value || '').trim() !== '';

  (item.claims || []).forEach((claim, position) => {
    if (!filled(claim.source)) missing.push(`${MISSING.claimSource} (${position + 1})`);
  });
  (item.images || []).forEach((image) => {
    if (image.showsPeople !== false && !filled(image.permission)) {
      missing.push(`${MISSING.imagePermission} (${image.file})`);
    }
  });
  if (item.testimonial && !filled(item.testimonial.authorization)) missing.push(MISSING.testimonial);

  const approval = item.approval || {};
  if (!filled(approval.by) || !approval.at || isNaN(new Date(approval.at).getTime())) {
    missing.push(MISSING.approval);
  }

  return { ok: missing.length === 0, missing };
}

module.exports = { MISSING, mayPublish };
