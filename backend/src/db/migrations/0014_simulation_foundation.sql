CREATE TABLE IF NOT EXISTS simulation_blueprints (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('B1', 'B2')),
  status TEXT DEFAULT 'draft' NOT NULL CHECK (status IN ('draft', 'published', 'archived')),
  access_status TEXT DEFAULT 'premium' NOT NULL CHECK (access_status IN ('free', 'premium')),
  duration_minutes INTEGER NOT NULL,
  instructions TEXT,
  created_by TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  published_at INTEGER,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS simulation_modules (
  id TEXT PRIMARY KEY NOT NULL,
  simulation_id TEXT NOT NULL,
  content_item_id TEXT NOT NULL,
  skill TEXT NOT NULL CHECK (skill IN ('reading', 'listening', 'writing')),
  order_index INTEGER NOT NULL,
  duration_minutes INTEGER NOT NULL,
  weight REAL DEFAULT 1 NOT NULL,
  FOREIGN KEY (simulation_id) REFERENCES simulation_blueprints(id) ON DELETE CASCADE,
  FOREIGN KEY (content_item_id) REFERENCES content_items(id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX IF NOT EXISTS simulation_modules_simulation_order_idx ON simulation_modules(simulation_id, order_index);

CREATE TABLE IF NOT EXISTS simulation_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  simulation_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  attempt_id TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'in_progress' NOT NULL CHECK (status IN ('in_progress', 'completed', 'expired', 'abandoned')),
  started_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  finished_at INTEGER,
  percentage REAL,
  FOREIGN KEY (simulation_id) REFERENCES simulation_blueprints(id) ON DELETE RESTRICT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (attempt_id) REFERENCES attempts(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS simulation_sessions_user_status_idx ON simulation_sessions(user_id, status, started_at);

CREATE TABLE IF NOT EXISTS simulation_module_results (
  id TEXT PRIMARY KEY NOT NULL,
  session_id TEXT NOT NULL,
  module_id TEXT NOT NULL,
  child_attempt_id TEXT,
  status TEXT DEFAULT 'locked' NOT NULL CHECK (status IN ('locked', 'available', 'in_progress', 'completed')),
  started_at INTEGER,
  completed_at INTEGER,
  percentage REAL,
  FOREIGN KEY (session_id) REFERENCES simulation_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (module_id) REFERENCES simulation_modules(id) ON DELETE RESTRICT,
  FOREIGN KEY (child_attempt_id) REFERENCES attempts(id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS simulation_module_results_session_module_idx ON simulation_module_results(session_id, module_id);
