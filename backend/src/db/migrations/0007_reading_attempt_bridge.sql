ALTER TABLE reading_exam_sessions ADD COLUMN shared_attempt_id TEXT REFERENCES attempts(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS reading_exam_sessions_shared_attempt_idx ON reading_exam_sessions(shared_attempt_id);

-- Mirror existing reading exam metadata into the shared catalog without moving JSON-managed content yet.
INSERT OR IGNORE INTO content_items (
  id, slug, skill, kind, level, title, status, access_status, difficulty,
  duration_minutes, score_max, published_at, created_at, updated_at, metadata_json
)
SELECT
  'legacy-reading:' || id,
  'reading-' || id,
  'reading',
  'exam',
  level,
  title,
  CASE WHEN status = 'published' THEN 'published' ELSE 'draft' END,
  access_status,
  'standard',
  duration_minutes,
  score_max,
  CASE WHEN status = 'published' THEN COALESCE(updated_at, created_at, unixepoch()) ELSE NULL END,
  COALESCE(created_at, unixepoch()),
  COALESCE(updated_at, created_at, unixepoch()),
  json_object('legacyReadingExamId', id)
FROM reading_exams;
