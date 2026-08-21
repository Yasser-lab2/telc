CREATE TABLE IF NOT EXISTS speaking_submissions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_item_id TEXT NOT NULL REFERENCES content_items(id) ON DELETE RESTRICT,
  object_key TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  duration_seconds INTEGER,
  status TEXT NOT NULL DEFAULT 'recorded' CHECK (status IN ('recorded', 'reviewed')),
  consented_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  delete_after INTEGER NOT NULL,
  reviewed_at INTEGER,
  feedback_json TEXT
);
CREATE INDEX IF NOT EXISTS speaking_submissions_user_created_idx ON speaking_submissions(user_id, created_at);
CREATE INDEX IF NOT EXISTS speaking_submissions_retention_idx ON speaking_submissions(delete_after);
