// Small WordPress REST helper. Reads credentials from the project's .env and never prints them.
const fs = require('node:fs');

function env(file) {
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = /^([A-Za-z_0-9]+)=(.*)$/.exec(line.trim());
    if (match) out[match[1]] = match[2].replace(/^["']|["']$/g, '').trim();
  }
  return out;
}

async function wp(envFile, method, route, body) {
  const vars = env(envFile);
  const site = (vars.NRC_SITE_URL || 'https://nuestraresidenciachile.cl').replace(/\/+$/, '');
  if (!vars.NRC_WP_USER || !vars.NRC_WP_APP_PASSWORD) throw new Error('NRC_WP_USER or NRC_WP_APP_PASSWORD is empty.');
  const auth = Buffer.from(`${vars.NRC_WP_USER}:${vars.NRC_WP_APP_PASSWORD}`).toString('base64');
  const response = await fetch(`${site}/wp-json${route}`, {
    method,
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json', 'User-Agent': 'NRC-asistente' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 300) }; }
  return { status: response.status, data };
}

module.exports = { wp };

if (require.main === module) {
  const [envFile, method, route] = process.argv.slice(2);
  wp(envFile, method || 'GET', route).then(({ status, data }) => {
    console.log(status, JSON.stringify(data, null, 1).slice(0, 2500));
  }).catch((error) => { console.log('ERROR', error.message); });
}
