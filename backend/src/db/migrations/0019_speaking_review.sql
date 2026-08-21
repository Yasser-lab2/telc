ALTER TABLE speaking_submissions ADD COLUMN attempt_id TEXT REFERENCES attempts(id) ON DELETE SET NULL;
ALTER TABLE speaking_submissions ADD COLUMN reviewer_user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS speaking_submissions_attempt_idx ON speaking_submissions(attempt_id);
