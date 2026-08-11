CREATE TABLE IF NOT EXISTS user_consents (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('terms', 'privacy')),
  document_version TEXT NOT NULL,
  accepted_at INTEGER NOT NULL,
  ip TEXT,
  user_agent TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS user_consents_user_document_version_idx
  ON user_consents(user_id, document_type, document_version);
