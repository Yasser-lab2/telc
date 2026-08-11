-- Additive learning-core schema. Legacy reading tables remain in use until their route migration.

CREATE TABLE IF NOT EXISTS content_items (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  skill TEXT NOT NULL CHECK (skill IN ('reading', 'listening', 'writing', 'speaking', 'simulation')),
  kind TEXT NOT NULL CHECK (kind IN ('exercise', 'exam', 'prompt', 'simulation')),
  level TEXT NOT NULL CHECK (level IN ('B1', 'B2')),
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  status TEXT DEFAULT 'draft' NOT NULL CHECK (status IN ('draft', 'published', 'archived')),
  access_status TEXT DEFAULT 'premium' NOT NULL CHECK (access_status IN ('free', 'premium')),
  difficulty TEXT DEFAULT 'standard' NOT NULL CHECK (difficulty IN ('introductory', 'standard', 'advanced')),
  duration_minutes INTEGER,
  score_max REAL,
  tags_json TEXT,
  metadata_json TEXT,
  published_at INTEGER,
  created_by TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS content_items_catalog_idx ON content_items(status, skill, level);

CREATE TABLE IF NOT EXISTS content_sections (
  id TEXT PRIMARY KEY NOT NULL,
  content_item_id TEXT NOT NULL,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  instructions TEXT,
  body TEXT,
  exercise_type TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  points_max REAL,
  settings_json TEXT,
  FOREIGN KEY (content_item_id) REFERENCES content_items(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS content_sections_item_order_idx ON content_sections(content_item_id, order_index);
CREATE UNIQUE INDEX IF NOT EXISTS content_sections_item_code_idx ON content_sections(content_item_id, code);

CREATE TABLE IF NOT EXISTS content_questions (
  id TEXT PRIMARY KEY NOT NULL,
  section_id TEXT NOT NULL,
  number INTEGER NOT NULL,
  prompt TEXT NOT NULL,
  answer_type TEXT NOT NULL,
  points REAL DEFAULT 1 NOT NULL,
  explanation TEXT,
  order_index INTEGER NOT NULL,
  settings_json TEXT,
  FOREIGN KEY (section_id) REFERENCES content_sections(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS content_questions_section_order_idx ON content_questions(section_id, order_index);

CREATE TABLE IF NOT EXISTS content_options (
  id TEXT PRIMARY KEY NOT NULL,
  question_id TEXT NOT NULL,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  is_correct INTEGER DEFAULT 0 NOT NULL,
  explanation TEXT,
  order_index INTEGER NOT NULL,
  FOREIGN KEY (question_id) REFERENCES content_questions(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS content_options_question_code_idx ON content_options(question_id, code);
CREATE UNIQUE INDEX IF NOT EXISTS content_options_question_order_idx ON content_options(question_id, order_index);

CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('audio', 'image', 'document')),
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  duration_seconds INTEGER,
  alt_text TEXT,
  created_by TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS media_assets_kind_idx ON media_assets(kind);

CREATE TABLE IF NOT EXISTS content_item_media (
  id TEXT PRIMARY KEY NOT NULL,
  content_item_id TEXT NOT NULL,
  media_asset_id TEXT NOT NULL,
  role TEXT NOT NULL,
  order_index INTEGER DEFAULT 0 NOT NULL,
  settings_json TEXT,
  FOREIGN KEY (content_item_id) REFERENCES content_items(id) ON DELETE CASCADE,
  FOREIGN KEY (media_asset_id) REFERENCES media_assets(id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX IF NOT EXISTS content_item_media_role_order_idx ON content_item_media(content_item_id, role, order_index);

CREATE TABLE IF NOT EXISTS attempts (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  content_item_id TEXT NOT NULL,
  skill TEXT NOT NULL CHECK (skill IN ('reading', 'listening', 'writing', 'speaking', 'simulation')),
  mode TEXT DEFAULT 'practice' NOT NULL CHECK (mode IN ('practice', 'exam')),
  status TEXT DEFAULT 'in_progress' NOT NULL CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  started_at INTEGER NOT NULL,
  last_saved_at INTEGER NOT NULL,
  submitted_at INTEGER,
  elapsed_seconds INTEGER DEFAULT 0 NOT NULL,
  score_obtained REAL,
  score_max REAL,
  percentage REAL,
  state_version INTEGER DEFAULT 1 NOT NULL,
  metadata_json TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (content_item_id) REFERENCES content_items(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS attempts_user_status_idx ON attempts(user_id, status, last_saved_at);
CREATE INDEX IF NOT EXISTS attempts_content_idx ON attempts(content_item_id, status);

CREATE TABLE IF NOT EXISTS attempt_answers (
  id TEXT PRIMARY KEY NOT NULL,
  attempt_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  selected_option_code TEXT,
  text_answer TEXT,
  answer_json TEXT,
  is_correct INTEGER,
  points_awarded REAL,
  time_spent_seconds INTEGER,
  answered_at INTEGER NOT NULL,
  FOREIGN KEY (attempt_id) REFERENCES attempts(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES content_questions(id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX IF NOT EXISTS attempt_answers_attempt_question_idx ON attempt_answers(attempt_id, question_id);

CREATE TABLE IF NOT EXISTS learner_progress (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  skill TEXT NOT NULL CHECK (skill IN ('reading', 'listening', 'writing', 'speaking', 'simulation')),
  level TEXT NOT NULL CHECK (level IN ('B1', 'B2')),
  completed_attempts INTEGER DEFAULT 0 NOT NULL,
  average_percentage REAL,
  best_percentage REAL,
  last_practiced_at INTEGER,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS learner_progress_user_skill_level_idx ON learner_progress(user_id, skill, level);

CREATE TABLE IF NOT EXISTS activity_events (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  occurred_at INTEGER NOT NULL,
  metadata_json TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS activity_events_user_occurred_idx ON activity_events(user_id, occurred_at);
