/**
 * Client for automation/apps-script/WhatsAppSheetAdapter.gs. Provides the
 * `prospects` and `events` ports of `frontdesk.cjs`.
 */
function createSheetPorts(options) {
  const { url, token } = options;
  const fetchImpl = options.fetch || globalThis.fetch;
  if (!url || !token) throw new Error('The sheet adapter URL and token are required.');

  async function call(action, fields) {
    // Apps Script answers a POST with a redirect to the result; `follow` fetches it.
    const response = await fetchImpl(url, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ token, action }, fields)),
    });
    if (!response.ok) throw new Error('The sheet adapter answered HTTP ' + response.status + '.');

    let result;
    try {
      result = await response.json();
    } catch (error) {
      // A login or error page instead of JSON means the web app is not deployed for anonymous access.
      throw new Error('The sheet adapter did not answer with JSON.');
    }
    if (!result || result.error) throw new Error('The sheet adapter refused "' + action + '".');
    return result;
  }

  return {
    prospects: {
      findByPhone: async (phone) => (await call('findByPhone', { phone })).matches || [],
      findPhonesById: async (id) => (await call('findPhonesById', { id })).phones || [],
    },
    events: {
      append: async (row) => {
        await call('appendEvent', {
          at: row.at instanceof Date ? row.at.toISOString() : row.at,
          prospectId: row.prospectId,
          type: row.type,
          derivation: row.derivation,
        });
      },
    },
  };
}

module.exports = { createSheetPorts };
