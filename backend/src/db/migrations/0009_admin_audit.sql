CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id TEXT PRIMARY KEY NOT NULL,
  actor_user_id TEXT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  metadata_json TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS admin_audit_logs_target_idx ON admin_audit_logs(target_type, target_id, created_at);
CREATE INDEX IF NOT EXISTS admin_audit_logs_actor_idx ON admin_audit_logs(actor_user_id, created_at);
