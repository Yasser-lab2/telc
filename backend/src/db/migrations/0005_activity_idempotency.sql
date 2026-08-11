ALTER TABLE activity_events ADD COLUMN dedupe_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS activity_events_dedupe_key_idx ON activity_events(dedupe_key);
