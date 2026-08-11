-- Development-only showcase data. Safe to rerun on the same local database.
-- Demo login: demo@telcprep.ma / Demo12345!

INSERT INTO plans (id, name, duration_days, price_mad, ai_credits_per_day, is_active)
VALUES ('demo-plan', 'Plan Démonstration', 30, 99, 10, 1)
ON CONFLICT(id) DO UPDATE SET name=excluded.name, duration_days=excluded.duration_days, price_mad=excluded.price_mad, ai_credits_per_day=excluded.ai_credits_per_day, is_active=1;

INSERT INTO users (id, email, password_hash, display_name, niveau, role, created_at, last_seen_at)
VALUES ('demo-user', 'demo@telcprep.ma', '$2a$10$BwsLQGeAYmS8fma5iKkuhe1HjmeLreCV2IljhylVZTsttVQEDVinm', 'Yasmine Demo', 'B1', 'student', unixepoch('now', '-14 days'), unixepoch())
ON CONFLICT(id) DO UPDATE SET password_hash=excluded.password_hash, display_name=excluded.display_name, niveau='B1', role='student', last_seen_at=unixepoch();

INSERT INTO subscriptions (id, user_id, plan_id, status, starts_at, expires_at, created_at)
VALUES ('demo-subscription', 'demo-user', 'demo-plan', 'active', unixepoch('now', '-7 days'), unixepoch('now', '+30 days'), unixepoch('now', '-7 days'))
ON CONFLICT(id) DO UPDATE SET status='active', starts_at=excluded.starts_at, expires_at=excluded.expires_at;

INSERT INTO usage_limits (id, user_id, date, ai_credits_used, updated_at)
VALUES ('demo-usage', 'demo-user', date('now'), 2, unixepoch())
ON CONFLICT(user_id, date) DO UPDATE SET ai_credits_used=2, updated_at=unixepoch();

-- A compact published reading exam that remains editable through the existing JSON workflow.
INSERT INTO reading_exams (id, title, level, duration_minutes, score_max, access_status, status, created_at, updated_at)
VALUES ('demo-reading', 'Alltag in Berlin', 'B1', 20, 10, 'free', 'published', unixepoch('now', '-10 days'), unixepoch('now', '-2 days'))
ON CONFLICT(id) DO UPDATE SET title=excluded.title, level='B1', duration_minutes=20, score_max=10, access_status='free', status='published', updated_at=excluded.updated_at;

INSERT OR IGNORE INTO reading_exam_sections (id, exam_id, section_code, title, instructions, main_text, exercise_type, order_index, points_max)
VALUES ('demo-reading-section', 'demo-reading', 'teil1', 'Leseverstehen Teil 1', 'Lesen Sie den Text und wählen Sie die richtige Antwort.', 'Mara wohnt seit zwei Jahren in Berlin. Jeden Morgen fährt sie mit der Straßenbahn zur Arbeit. Am Wochenende besucht sie oft den Markt am Maybachufer, weil sie dort frisches Gemüse und Gewürze findet.', 'multiple_choice', 0, 10);

INSERT OR IGNORE INTO reading_questions (id, section_id, question_number, question_text, points, answer_type, order_index) VALUES
  ('demo-reading-q1', 'demo-reading-section', 1, 'Wie fährt Mara zur Arbeit?', 5, 'single_choice', 0),
  ('demo-reading-q2', 'demo-reading-section', 2, 'Warum besucht sie den Markt?', 5, 'single_choice', 1);

INSERT OR IGNORE INTO reading_options (id, question_id, code, text, is_correct, explanation, order_index) VALUES
  ('demo-rq1-a', 'demo-reading-q1', 'A', 'Mit dem Bus', 0, NULL, 0),
  ('demo-rq1-b', 'demo-reading-q1', 'B', 'Mit der Straßenbahn', 1, 'Im Text steht: Jeden Morgen fährt sie mit der Straßenbahn.', 1),
  ('demo-rq1-c', 'demo-reading-q1', 'C', 'Mit dem Fahrrad', 0, NULL, 2),
  ('demo-rq2-a', 'demo-reading-q2', 'A', 'Sie trifft Kollegen.', 0, NULL, 0),
  ('demo-rq2-b', 'demo-reading-q2', 'B', 'Sie kauft Kleidung.', 0, NULL, 1),
  ('demo-rq2-c', 'demo-reading-q2', 'C', 'Sie findet frisches Gemüse und Gewürze.', 1, 'Diese beiden Produkte werden ausdrücklich genannt.', 2);

INSERT INTO content_items (id, slug, skill, kind, level, title, status, access_status, difficulty, duration_minutes, score_max, published_at, created_at, updated_at, metadata_json)
VALUES ('legacy-reading:demo-reading', 'reading-demo-reading', 'reading', 'exam', 'B1', 'Alltag in Berlin', 'published', 'free', 'introductory', 20, 10, unixepoch('now', '-2 days'), unixepoch('now', '-10 days'), unixepoch('now', '-2 days'), '{"legacyReadingExamId":"demo-reading"}')
ON CONFLICT(id) DO UPDATE SET title=excluded.title, status='published', access_status='free', updated_at=excluded.updated_at;

-- Three completed attempts create honest dashboard progress for all current skills.
INSERT OR IGNORE INTO attempts (id, user_id, content_item_id, skill, mode, status, started_at, last_saved_at, submitted_at, elapsed_seconds, score_obtained, score_max, percentage, state_version) VALUES
  ('demo-attempt-reading', 'demo-user', 'legacy-reading:demo-reading', 'reading', 'practice', 'completed', unixepoch('now', '-3 days', '-25 minutes'), unixepoch('now', '-3 days'), unixepoch('now', '-3 days'), 1180, 10, 10, 100, 2),
  ('demo-attempt-listening', 'demo-user', 'bahnhof', 'listening', 'practice', 'completed', unixepoch('now', '-2 days', '-7 minutes'), unixepoch('now', '-2 days'), unixepoch('now', '-2 days'), 310, 1, 1, 100, 2),
  ('demo-attempt-writing', 'demo-user', 'beschwerde', 'writing', 'practice', 'completed', unixepoch('now', '-1 day', '-35 minutes'), unixepoch('now', '-1 day'), unixepoch('now', '-1 day'), 1900, 82, 100, 82, 3);

INSERT OR IGNORE INTO reading_exam_sessions (id, user_id, exam_id, shared_attempt_id, started_at, finished_at, status, score_obtained, score_max, percentage)
VALUES ('demo-reading-session', 'demo-user', 'demo-reading', 'demo-attempt-reading', unixepoch('now', '-3 days', '-25 minutes'), unixepoch('now', '-3 days'), 'completed', 10, 10, 100);
INSERT OR IGNORE INTO reading_user_answers (id, session_id, question_id, selected_option_code, is_correct, time_spent_seconds, answered_at) VALUES
  ('demo-reading-answer-1', 'demo-reading-session', 'demo-reading-q1', 'B', 1, 45, unixepoch('now', '-3 days')),
  ('demo-reading-answer-2', 'demo-reading-session', 'demo-reading-q2', 'C', 1, 52, unixepoch('now', '-3 days'));

INSERT OR IGNORE INTO attempt_answers (id, attempt_id, question_id, selected_option_code, is_correct, points_awarded, time_spent_seconds, answered_at)
SELECT 'demo-listening-answer', 'demo-attempt-listening', 'bahnhof-q1', 'B', 1, 1, 38, unixepoch('now', '-2 days')
WHERE EXISTS (SELECT 1 FROM content_questions WHERE id='bahnhof-q1');

INSERT OR IGNORE INTO writing_drafts (id, attempt_id, user_id, content_item_id, text, word_count, created_at, updated_at)
VALUES ('demo-writing-draft', 'demo-attempt-writing', 'demo-user', 'beschwerde', 'Sehr geehrte Damen und Herren, ich möchte mich über meinen Sprachkurs beschweren. Der Kursraum war zu klein und der Lehrer kam mehrmals zu spät. Ich bitte Sie um eine angemessene Lösung. Mit freundlichen Grüßen, Yasmine', 33, unixepoch('now', '-1 day', '-35 minutes'), unixepoch('now', '-1 day'));

INSERT OR IGNORE INTO ai_submissions (id, user_id, attempt_id, thema_type, niveau, user_text, score_total, score_inhalt, score_redemittel, score_korrektheit, niveau_vocab, ai_feedback, improved_text, feedback_ar, latency_ms, submitted_at)
VALUES ('demo-ai-submission', 'demo-user', 'demo-attempt-writing', 'beschwerde', 'B1', 'Sehr geehrte Damen und Herren, ich möchte mich über meinen Sprachkurs beschweren. Der Kursraum war zu klein und der Lehrer kam mehrmals zu spät. Ich bitte Sie um eine angemessene Lösung. Mit freundlichen Grüßen, Yasmine', 82, 4, 4, 4, 'B1', '{"score_inhalt":4,"score_redemittel":4,"score_korrektheit":4,"score_total":82,"niveau_vocab":"B1","errors":[],"suggestions":["Erklären Sie genauer, welche Lösung Sie erwarten."],"improved_text":"Sehr geehrte Damen und Herren, ich möchte mich über den gebuchten Sprachkurs beschweren. Der Raum war zu klein und der Lehrer kam wiederholt zu spät. Daher bitte ich Sie um eine teilweise Rückerstattung. Mit freundlichen Grüßen, Yasmine","feedback_ar":"النص منظم وواضح. أضيفي طلباً أكثر تحديداً في النهاية."}', 'Sehr geehrte Damen und Herren, ich möchte mich über den gebuchten Sprachkurs beschweren. Der Raum war zu klein und der Lehrer kam wiederholt zu spät. Daher bitte ich Sie um eine teilweise Rückerstattung. Mit freundlichen Grüßen, Yasmine', 'النص منظم وواضح. أضيفي طلباً أكثر تحديداً في النهاية.', 940, unixepoch('now', '-1 day'));

INSERT INTO learner_progress (id, user_id, skill, level, completed_attempts, average_percentage, best_percentage, last_practiced_at, updated_at) VALUES
  ('demo-progress-reading', 'demo-user', 'reading', 'B1', 1, 100, 100, unixepoch('now', '-3 days'), unixepoch()),
  ('demo-progress-listening', 'demo-user', 'listening', 'B1', 1, 100, 100, unixepoch('now', '-2 days'), unixepoch()),
  ('demo-progress-writing', 'demo-user', 'writing', 'B1', 1, 82, 82, unixepoch('now', '-1 day'), unixepoch())
ON CONFLICT(user_id, skill, level) DO UPDATE SET completed_attempts=excluded.completed_attempts, average_percentage=excluded.average_percentage, best_percentage=excluded.best_percentage, last_practiced_at=excluded.last_practiced_at, updated_at=excluded.updated_at;

INSERT OR IGNORE INTO activity_events (id, user_id, event_type, entity_type, entity_id, dedupe_key, occurred_at, metadata_json) VALUES
  ('demo-activity-reading', 'demo-user', 'attempt_completed', 'attempt', 'demo-attempt-reading', 'attempt_completed:demo-attempt-reading', unixepoch('now', '-3 days'), '{"skill":"reading","level":"B1"}'),
  ('demo-activity-listening', 'demo-user', 'attempt_completed', 'attempt', 'demo-attempt-listening', 'attempt_completed:demo-attempt-listening', unixepoch('now', '-2 days'), '{"skill":"listening","level":"B1"}'),
  ('demo-activity-writing', 'demo-user', 'attempt_completed', 'attempt', 'demo-attempt-writing', 'attempt_completed:demo-attempt-writing', unixepoch('now', '-1 day'), '{"skill":"writing","level":"B1"}');
