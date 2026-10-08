const crypto = require('node:crypto');

/**
 * `store` port of `frontdesk.cjs` on a Cloudflare D1 database (see schema.sql).
 * Chat keys are phone numbers, so they are stored as keyed hashes: the database
 * can match a chat but never holds a phone.
 */
function createD1Store(db, options) {
  const keySecret = options && options.keySecret;
  if (!keySecret || keySecret.length < 32) throw new Error('A state key secret of at least 32 characters is required.');

  const hashKey = (key) => crypto.createHmac('sha256', keySecret).update(String(key)).digest('hex');

  return {
    // INSERT OR IGNORE makes "first time seen" a single atomic statement.
    async markProcessed(eventId) {
      const result = await db
        .prepare('INSERT OR IGNORE INTO processed_events (id, seen_at) VALUES (?, ?)')
        .bind(String(eventId), new Date().toISOString())
        .run();
      return result.meta.changes === 1;
    },

    async getChat(key) {
      const row = await db.prepare('SELECT state FROM chats WHERE key_hash = ?').bind(hashKey(key)).first();
      return row ? JSON.parse(row.state) : null;
    },

    async putChat(key, chat) {
      await db
        .prepare('INSERT INTO chats (key_hash, state) VALUES (?, ?) ON CONFLICT(key_hash) DO UPDATE SET state = excluded.state')
        .bind(storedKey(key, hashKey), JSON.stringify(chat))
        .run();
    },

    // Keys returned here are already hashed; putChat accepts them back unchanged.
    async listChats() {
      const result = await db.prepare('SELECT key_hash, state FROM chats').all();
      return result.results.map((row) => [HASHED_PREFIX + row.key_hash, JSON.parse(row.state)]);
    },
  };
}

const HASHED_PREFIX = 'h:';

function storedKey(key, hashKey) {
  const text = String(key);
  return text.indexOf(HASHED_PREFIX) === 0 ? text.slice(HASHED_PREFIX.length) : hashKey(text);
}

module.exports = { createD1Store };
