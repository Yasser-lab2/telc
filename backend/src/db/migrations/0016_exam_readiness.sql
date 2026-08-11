CREATE TABLE IF NOT EXISTS study_goals (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weekly_target INTEGER NOT NULL DEFAULT 3 CHECK (weekly_target BETWEEN 1 AND 14),
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS mistake_items (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attempt_id TEXT REFERENCES attempts(id) ON DELETE SET NULL,
  content_item_id TEXT NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  source_question_id TEXT NOT NULL,
  skill TEXT NOT NULL,
  prompt TEXT NOT NULL,
  selected_answer TEXT,
  correct_answer TEXT,
  explanation TEXT,
  occurrence_count INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed')),
  first_seen_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  reviewed_at INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS mistake_items_user_question_idx ON mistake_items(user_id, content_item_id, source_question_id);
CREATE INDEX IF NOT EXISTS mistake_items_user_status_idx ON mistake_items(user_id, status, last_seen_at);

CREATE TABLE IF NOT EXISTS dismissed_recommendations (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_item_id TEXT NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  dismissed_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, content_item_id)
);
