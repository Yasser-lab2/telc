ALTER TABLE ai_submissions ADD COLUMN attempt_id TEXT REFERENCES attempts(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ai_submissions_attempt_idx ON ai_submissions(attempt_id);

CREATE TABLE IF NOT EXISTS writing_drafts (
  id TEXT PRIMARY KEY NOT NULL,
  attempt_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  content_item_id TEXT NOT NULL,
  text TEXT DEFAULT '' NOT NULL,
  word_count INTEGER DEFAULT 0 NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (attempt_id) REFERENCES attempts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (content_item_id) REFERENCES content_items(id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX IF NOT EXISTS writing_drafts_attempt_idx ON writing_drafts(attempt_id);
CREATE INDEX IF NOT EXISTS writing_drafts_user_updated_idx ON writing_drafts(user_id, updated_at);
