-- App accounts, emailed OTP challenges, and Bearer sessions.
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL COLLATE NOCASE,
  display_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (email);

CREATE TABLE IF NOT EXISTS otp_challenges (
  email TEXT PRIMARY KEY COLLATE NOCASE,
  code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_sent_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS otp_sends (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL COLLATE NOCASE,
  ip TEXT,
  sent_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS otp_sends_email_sent ON otp_sends (email, sent_at);
CREATE INDEX IF NOT EXISTS otp_sends_ip_sent ON otp_sends (ip, sent_at);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS sessions_user ON sessions (user_id);

CREATE TABLE IF NOT EXISTS auth_attempts (
  key TEXT PRIMARY KEY,
  fails INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  updated_at TEXT NOT NULL
);
