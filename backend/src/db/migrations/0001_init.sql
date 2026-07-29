CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  niveau TEXT DEFAULT 'B1',
  role TEXT DEFAULT 'student',
  created_at INTEGER,
  last_seen_at INTEGER
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER,
  user_agent TEXT,
  ip TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  duration_days INTEGER NOT NULL,
  price_mad REAL NOT NULL,
  ai_credits_per_day INTEGER NOT NULL,
  is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS manual_payments (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  amount_mad REAL NOT NULL,
  status TEXT DEFAULT 'pending',
  whatsapp_sent_at INTEGER,
  approved_at INTEGER,
  approved_by_admin TEXT,
  proof_image_url TEXT,
  note TEXT,
  created_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (plan_id) REFERENCES plans(id)
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  payment_id TEXT,
  status TEXT DEFAULT 'trial',
  starts_at INTEGER,
  expires_at INTEGER NOT NULL,
  created_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES plans(id),
  FOREIGN KEY (payment_id) REFERENCES manual_payments(id)
);

CREATE TABLE IF NOT EXISTS usage_limits (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  ai_credits_used INTEGER DEFAULT 0,
  updated_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS usage_limits_user_date_idx ON usage_limits(user_id, date);

CREATE TABLE IF NOT EXISTS ai_submissions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  thema_type TEXT NOT NULL,
  niveau TEXT NOT NULL,
  user_text TEXT NOT NULL,
  score_total INTEGER,
  score_inhalt INTEGER,
  score_redemittel INTEGER,
  score_korrektheit INTEGER,
  niveau_vocab TEXT,
  ai_feedback TEXT,
  improved_text TEXT,
  feedback_ar TEXT,
  latency_ms INTEGER,
  submitted_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
