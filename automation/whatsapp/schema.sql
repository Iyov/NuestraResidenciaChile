-- State of the WhatsApp front desk (SPEC-002). No message text, names or phone numbers.
CREATE TABLE IF NOT EXISTS processed_events (
  id TEXT PRIMARY KEY,
  seen_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chats (
  key_hash TEXT PRIMARY KEY,
  state TEXT NOT NULL
);
