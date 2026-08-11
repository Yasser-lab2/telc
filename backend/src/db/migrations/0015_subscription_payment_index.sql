DROP INDEX IF EXISTS subscriptions_payment_id_idx;

-- SQLite permits multiple NULL values in a unique index. Keeping this index
-- non-partial lets INSERT ... ON CONFLICT(payment_id) work as intended.
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_payment_id_idx
  ON subscriptions(payment_id);

-- Repair payments that were marked approved before subscription creation
-- failed because of the former partial index.
INSERT OR IGNORE INTO subscriptions (
  id,
  user_id,
  plan_id,
  payment_id,
  status,
  starts_at,
  expires_at,
  created_at
)
SELECT
  'recovered-' || payment.id,
  payment.user_id,
  payment.plan_id,
  payment.id,
  'active',
  COALESCE(payment.approved_at, payment.reviewed_at, unixepoch()),
  COALESCE(payment.approved_at, payment.reviewed_at, unixepoch()) + (plan.duration_days * 86400),
  unixepoch()
FROM manual_payments AS payment
INNER JOIN plans AS plan ON plan.id = payment.plan_id
WHERE payment.status = 'approved'
  AND NOT EXISTS (
    SELECT 1 FROM subscriptions AS subscription
    WHERE subscription.payment_id = payment.id
  );
