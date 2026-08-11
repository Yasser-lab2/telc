CREATE TABLE IF NOT EXISTS user_preferences (
  user_id TEXT PRIMARY KEY NOT NULL,
  locale TEXT DEFAULT 'fr' NOT NULL CHECK (locale IN ('fr', 'de')),
  email_study_reminders INTEGER DEFAULT 1 NOT NULL,
  email_product_updates INTEGER DEFAULT 0 NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
