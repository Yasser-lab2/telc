ALTER TABLE users ADD COLUMN email_verified_at INTEGER;

CREATE TABLE IF NOT EXISTS account_tokens (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('email_verification', 'password_reset')),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS account_tokens_user_type_idx ON account_tokens(user_id, type, created_at);

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY NOT NULL,
  count INTEGER DEFAULT 0 NOT NULL,
  window_expires_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Existing accounts predate verification and remain usable after migration.
UPDATE users SET email_verified_at = COALESCE(email_verified_at, created_at, unixepoch());
