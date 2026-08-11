ALTER TABLE manual_payments ADD COLUMN proof_object_key TEXT;
ALTER TABLE manual_payments ADD COLUMN proof_file_name TEXT;
ALTER TABLE manual_payments ADD COLUMN proof_mime_type TEXT;
ALTER TABLE manual_payments ADD COLUMN rejection_reason TEXT;
ALTER TABLE manual_payments ADD COLUMN reviewed_at INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_payment_id_idx ON subscriptions(payment_id) WHERE payment_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS payment_status_events (
  id TEXT PRIMARY KEY NOT NULL,
  payment_id TEXT NOT NULL,
  status TEXT NOT NULL,
  note TEXT,
  actor_user_id TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (payment_id) REFERENCES manual_payments(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS payment_status_events_payment_created_idx ON payment_status_events(payment_id, created_at);

INSERT OR IGNORE INTO payment_status_events (id, payment_id, status, note, actor_user_id, created_at)
SELECT 'legacy-payment-created:' || id, id, status, 'Imported existing payment state', approved_by_admin, COALESCE(approved_at, created_at, unixepoch())
FROM manual_payments;
