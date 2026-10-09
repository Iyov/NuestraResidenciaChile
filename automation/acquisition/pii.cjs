const PII_KEYS = new Set([
  'nombre', 'name', 'email', 'correo', 'telefono', 'phone', 'rut', 'direccion', 'address',
  'ip', 'gclid', 'gbraid', 'wbraid', 'comentario', 'comment', 'user-agent', 'useragent',
]);

const PII_PATTERNS = [
  /[^\s@]+@[^\s@]+\.[a-z]{2,}/i, // email
  /(?<!\d)(?:\+?56[\s-]?)?9[\s-]?\d{4}[\s-]?\d{4}(?!\d)/, // Chilean mobile
  /(?<!\d)\d{1,2}\.?\d{3}\.?\d{3}-[\dk](?!\d)/i, // RUT
];

/**
 * Looks for identifiable data in anything that leaves the restricted sheet: an
 * analytics event or a report for management. Returns the paths where it was
 * found, never the values. A person's name inside free text cannot be detected
 * here; the callers only accept counts and short labels for that reason.
 */
function findPii(value, path = '') {
  if (value === null || value === undefined) return [];
  if (typeof value === 'string') return PII_PATTERNS.some((pattern) => pattern.test(value)) ? [path || '(valor)'] : [];
  if (typeof value !== 'object') return [];
  if (value instanceof Date) return [];

  const found = [];
  for (const [key, inner] of Object.entries(value)) {
    const here = path ? `${path}.${key}` : key;
    if (!Array.isArray(value) && PII_KEYS.has(normalizeKey(key))) found.push(here);
    else found.push(...findPii(inner, here));
  }
  return found;
}

function assertNoPii(value, what) {
  const found = findPii(value);
  if (found.length) throw new Error(`${what} contains identifiable data at: ${found.join(', ')}`);
}

function normalizeKey(key) {
  return String(key).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

module.exports = { assertNoPii, findPii };
