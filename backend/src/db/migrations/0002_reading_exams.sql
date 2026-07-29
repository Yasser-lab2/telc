CREATE TABLE IF NOT EXISTS reading_exams (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  level TEXT DEFAULT 'B1' NOT NULL,
  duration_minutes INTEGER DEFAULT 90 NOT NULL,
  score_max REAL DEFAULT 105 NOT NULL,
  access_status TEXT DEFAULT 'premium' NOT NULL,
  status TEXT DEFAULT 'draft' NOT NULL,
  created_at INTEGER,
  updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS reading_exam_sections (
  id TEXT PRIMARY KEY NOT NULL,
  exam_id TEXT NOT NULL,
  section_code TEXT NOT NULL,
  title TEXT NOT NULL,
  instructions TEXT,
  main_text TEXT,
  exercise_type TEXT NOT NULL,
  extra_data_json TEXT,
  order_index INTEGER NOT NULL,
  points_max REAL NOT NULL,
  FOREIGN KEY (exam_id) REFERENCES reading_exams(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reading_questions (
  id TEXT PRIMARY KEY NOT NULL,
  section_id TEXT NOT NULL,
  question_number INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  points REAL NOT NULL,
  answer_type TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  FOREIGN KEY (section_id) REFERENCES reading_exam_sections(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reading_options (
  id TEXT PRIMARY KEY NOT NULL,
  question_id TEXT NOT NULL,
  code TEXT NOT NULL,
  text TEXT NOT NULL,
  is_correct INTEGER DEFAULT 0 NOT NULL,
  explanation TEXT,
  order_index INTEGER NOT NULL,
  FOREIGN KEY (question_id) REFERENCES reading_questions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reading_exam_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  exam_id TEXT NOT NULL,
  started_at INTEGER,
  finished_at INTEGER,
  status TEXT DEFAULT 'in_progress' NOT NULL,
  score_obtained REAL,
  score_max REAL,
  percentage REAL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (exam_id) REFERENCES reading_exams(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reading_user_answers (
  id TEXT PRIMARY KEY NOT NULL,
  session_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  selected_option_code TEXT NOT NULL,
  is_correct INTEGER DEFAULT 0,
  time_spent_seconds INTEGER,
  answered_at INTEGER,
  FOREIGN KEY (session_id) REFERENCES reading_exam_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES reading_questions(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS reading_user_answers_session_question_idx
ON reading_user_answers(session_id, question_id);
