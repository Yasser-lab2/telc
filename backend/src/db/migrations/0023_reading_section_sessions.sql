-- Keep the selected practice scope with the session so timers and scoring can
-- distinguish a full 90-minute exam from a single-section exercise.
ALTER TABLE reading_exam_sessions ADD COLUMN practice_scope TEXT NOT NULL DEFAULT 'all'
  CHECK (practice_scope IN ('all', 'teil1', 'teil2', 'teil3', 'sprach1', 'sprach2'));
