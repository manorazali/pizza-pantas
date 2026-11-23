-- Pizza Pantas: D1 schema. Run once (Cloudflare dashboard -> D1 -> your database -> Console).
-- Privacy by design: no email, no real name, no IP stored. Only a username, a password hash and game results.

CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  username   TEXT    NOT NULL UNIQUE,          -- stored lowercase
  display    TEXT    NOT NULL,                 -- name shown in the game
  pw_hash    TEXT    NOT NULL,                 -- PBKDF2-SHA256, base64
  pw_salt    TEXT    NOT NULL,                 -- random 16 bytes, base64
  iter       INTEGER NOT NULL,                 -- PBKDF2 iterations used for this user
  created_at INTEGER NOT NULL                  -- unix seconds
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT    PRIMARY KEY,              -- SHA-256 of the bearer token (the raw token is never stored)
  user_id    INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS runs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL,
  ch         INTEGER NOT NULL,                 -- syllabus chapter 1..13
  money      REAL    NOT NULL,
  goal       REAL    NOT NULL,
  stars      INTEGER NOT NULL,
  served     INTEGER NOT NULL,
  ok         INTEGER NOT NULL,                 -- tasks right on the first try
  bad        INTEGER NOT NULL,                 -- tasks that needed more than one try
  topics     TEXT    NOT NULL,                 -- JSON: {"FSTB":{"ok":2,"bad":1}, ...}
  created_at INTEGER NOT NULL                  -- unix seconds
);
CREATE INDEX IF NOT EXISTS idx_runs_user ON runs(user_id, id DESC);

-- login / register throttling (key -> failed count + blocked-until)
CREATE TABLE IF NOT EXISTS attempts (
  k     TEXT    PRIMARY KEY,
  n     INTEGER NOT NULL,
  until INTEGER NOT NULL
);
