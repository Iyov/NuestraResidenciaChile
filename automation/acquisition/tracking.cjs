const { assertNoPii } = require('./pii.cjs');

const CHANNELS = Object.freeze({
  paidSearch: 'google ads',
  organicSearch: 'búsqueda orgánica',
  social: 'redes sociales',
  whatsapp: 'whatsapp',
  site: 'sitio web sin campaña',
  other: 'otro / sin dato',
});

const EVIDENCE = Object.freeze({
  adClick: 'clic de anuncio',
  utm: 'utm',
  declared: 'declarado en el formulario',
  none: 'ninguna',
});

const CLICK_IDS = ['gclid', 'gbraid', 'wbraid'];
const SEARCH_SOURCES = ['google', 'bing', 'duckduckgo', 'yahoo'];
const SOCIAL_SOURCES = ['instagram', 'facebook', 'threads', 'tiktok', 'meta'];
const LABEL = /^[a-z0-9][a-z0-9_-]{0,49}$/;

/**
 * Link for an ad, a post or a brochure. Labels are short lowercase slugs, so
 * a name, a phone or an email cannot travel in a campaign link.
 * utm: { source, medium, campaign, content }, content being optional.
 */
function campaignUrl(baseUrl, utm) {
  const url = new URL(baseUrl);
  for (const key of ['source', 'medium', 'campaign', 'content']) {
    const value = utm[key];
    if (value === undefined && key === 'content') continue;
    if (!LABEL.test(String(value || ''))) throw new Error(`utm ${key} must be a short lowercase label.`);
    url.searchParams.set(`utm_${key}`, value);
  }
  return url.toString();
}

/**
 * Origin of one inquiry from what is known about it.
 * inquiry: { landingUrl, declaredOrigin }
 *   landingUrl      the address the person arrived at, when something recorded it
 *   declaredOrigin  the "Origen del Contacto" answer of the form
 * The click identifier of an ad only proves that there was one: it is never
 * returned, stored or logged from here.
 */
function attribute(inquiry) {
  const params = readParams(inquiry && inquiry.landingUrl);
  const utm = {
    source: label(params.get('utm_source')),
    medium: label(params.get('utm_medium')),
    campaign: label(params.get('utm_campaign')),
  };

  if (CLICK_IDS.some((id) => params.get(id))) {
    return result(CHANNELS.paidSearch, EVIDENCE.adClick, utm);
  }
  if (utm.source) {
    if (['cpc', 'ppc', 'paid'].includes(utm.medium) && utm.source === 'google') {
      return result(CHANNELS.paidSearch, EVIDENCE.utm, utm);
    }
    if (SOCIAL_SOURCES.includes(utm.source)) return result(CHANNELS.social, EVIDENCE.utm, utm);
    if (utm.source === 'whatsapp') return result(CHANNELS.whatsapp, EVIDENCE.utm, utm);
    if (utm.medium === 'organic' && SEARCH_SOURCES.includes(utm.source)) {
      return result(CHANNELS.organicSearch, EVIDENCE.utm, utm);
    }
    return result(CHANNELS.other, EVIDENCE.utm, utm);
  }

  const declared = String((inquiry && inquiry.declaredOrigin) || '').trim().toLowerCase();
  if (declared === 'sitio web') return result(CHANNELS.site, EVIDENCE.declared, utm);
  if (declared === 'whatsapp') return result(CHANNELS.whatsapp, EVIDENCE.declared, utm);
  return result(CHANNELS.other, declared ? EVIDENCE.declared : EVIDENCE.none, utm);
}

/**
 * Parameters of an analytics event. Throws when one of them carries
 * identifiable data, so the event is not sent at all.
 */
function safeEventParams(params) {
  assertNoPii(params, 'Analytics event');
  return Object.assign({}, params);
}

function result(channel, evidence, utm) {
  return { channel, evidence, source: utm.source, medium: utm.medium, campaign: utm.campaign };
}

function readParams(landingUrl) {
  try {
    return new URL(landingUrl).searchParams;
  } catch (error) {
    return new URLSearchParams();
  }
}

// A label that does not look like one (an email typed into a link) is dropped.
function label(value) {
  const text = String(value || '').trim().toLowerCase();
  return LABEL.test(text) ? text : null;
}

module.exports = { CHANNELS, EVIDENCE, attribute, campaignUrl, safeEventParams };
