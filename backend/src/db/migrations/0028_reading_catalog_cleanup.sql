-- Keep only the practice exams and exercises supplied in the original JSON pack.
-- This intentionally scopes the cleanup to reading content and leaves other skills untouched.
-- A legacy reading content item referenced by a simulation is retained so that
-- the unrelated simulation module remains valid.

DELETE FROM reading_exam_sessions
WHERE exam_id NOT IN (
  'pruefung-01',
  'pruefung-02',
  'teil1-01',
  'teil1-02',
  'teil2-01',
  'teil2-02',
  'teil3-01',
  'teil3-02',
  'sprach1-01',
  'sprach1-02',
  'sprach2-01',
  'sprach2-02'
);

DELETE FROM attempts
WHERE skill = 'reading'
  AND content_item_id NOT IN (
    'legacy-reading:pruefung-01',
    'legacy-reading:pruefung-02',
    'legacy-reading:teil1-01',
    'legacy-reading:teil1-02',
    'legacy-reading:teil2-01',
    'legacy-reading:teil2-02',
    'legacy-reading:teil3-01',
    'legacy-reading:teil3-02',
    'legacy-reading:sprach1-01',
    'legacy-reading:sprach1-02',
    'legacy-reading:sprach2-01',
    'legacy-reading:sprach2-02'
  );

DELETE FROM content_items
WHERE skill = 'reading'
  AND id NOT IN (
    'legacy-reading:pruefung-01',
    'legacy-reading:pruefung-02',
    'legacy-reading:teil1-01',
    'legacy-reading:teil1-02',
    'legacy-reading:teil2-01',
    'legacy-reading:teil2-02',
    'legacy-reading:teil3-01',
    'legacy-reading:teil3-02',
    'legacy-reading:sprach1-01',
    'legacy-reading:sprach1-02',
    'legacy-reading:sprach2-01',
    'legacy-reading:sprach2-02'
  )
  AND id NOT IN (SELECT content_item_id FROM simulation_modules)
  AND id NOT IN (SELECT content_item_id FROM writing_drafts)
  AND id NOT IN (SELECT content_item_id FROM speaking_submissions);

DELETE FROM reading_exams
WHERE id NOT IN (
  'pruefung-01',
  'pruefung-02',
  'teil1-01',
  'teil1-02',
  'teil2-01',
  'teil2-02',
  'teil3-01',
  'teil3-02',
  'sprach1-01',
  'sprach1-02',
  'sprach2-01',
  'sprach2-02'
);
