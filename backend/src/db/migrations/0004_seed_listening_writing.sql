ALTER TABLE media_assets ADD COLUMN source_url TEXT;

-- Imported demo audio assets. These external URLs can later be replaced by R2 object keys.
INSERT OR IGNORE INTO media_assets (id, object_key, source_url, kind, file_name, mime_type, size_bytes, created_at) VALUES
  ('media-bahnhof', 'external/soundhelix-song-1', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', 'audio', 'bahnhof.mp3', 'audio/mpeg', 0, unixepoch()),
  ('media-arzt', 'external/soundhelix-song-2', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', 'audio', 'arzt.mp3', 'audio/mpeg', 0, unixepoch());

INSERT OR IGNORE INTO content_items
  (id, slug, skill, kind, level, title, description, instructions, status, access_status, difficulty, duration_minutes, score_max, published_at, created_at, updated_at)
VALUES
  ('bahnhof', 'bahnhof', 'listening', 'exercise', 'B1', 'Ansage am Bahnhof', 'Kurze Bahnhofsdurchsage', 'Hören Sie die Ansage und beantworten Sie die Frage.', 'published', 'premium', 'introductory', 5, 1, unixepoch(), unixepoch(), unixepoch()),
  ('arzt', 'arzt', 'listening', 'exercise', 'B1', 'Telefonat mit der Praxis', 'Kurze telefonische Information', 'Hören Sie die Ansage und beantworten Sie die Frage.', 'published', 'premium', 'introductory', 5, 1, unixepoch(), unixepoch(), unixepoch()),
  ('beschwerde', 'beschwerde', 'writing', 'prompt', 'B1', 'Beschwerde schreiben', NULL, 'Sie haben online einen Sprachkurs gebucht. Der Kursraum war zu klein und der Lehrer kam oft zu spät. Schreiben Sie eine Beschwerde an die Sprachschule.', 'published', 'premium', 'standard', 30, NULL, unixepoch(), unixepoch(), unixepoch()),
  ('bitte', 'bitte', 'writing', 'prompt', 'B1', 'Bitte um Informationen', NULL, 'Sie möchten an einem Deutschkurs teilnehmen. Schreiben Sie eine E-Mail und fragen Sie nach Preis, Zeiten und Prüfungsvorbereitung.', 'published', 'premium', 'standard', 30, NULL, unixepoch(), unixepoch(), unixepoch()),
  ('absage', 'absage', 'writing', 'prompt', 'B2', 'Termin absagen', NULL, 'Sie können an einem wichtigen Termin nicht teilnehmen. Schreiben Sie eine höfliche Absage mit Begründung und schlagen Sie einen neuen Termin vor.', 'published', 'premium', 'standard', 30, NULL, unixepoch(), unixepoch(), unixepoch());

INSERT OR IGNORE INTO content_item_media (id, content_item_id, media_asset_id, role, order_index) VALUES
  ('attachment-bahnhof-audio', 'bahnhof', 'media-bahnhof', 'primary_audio', 0),
  ('attachment-arzt-audio', 'arzt', 'media-arzt', 'primary_audio', 0);

INSERT OR IGNORE INTO content_sections
  (id, content_item_id, code, title, instructions, body, exercise_type, order_index, points_max)
VALUES
  ('section-bahnhof', 'bahnhof', 'teil1', 'Ansage am Bahnhof', 'Hören Sie die Ansage.', 'Der Zug nach Hamburg fährt heute von Gleis 8 ab. Die Abfahrt verzögert sich um zehn Minuten.', 'multiple_choice', 0, 1),
  ('section-arzt', 'arzt', 'teil1', 'Telefonat mit der Praxis', 'Hören Sie die Ansage.', 'Die Praxis ist heute bis 16 Uhr geöffnet. Für neue Termine rufen Sie bitte morgen früh wieder an.', 'multiple_choice', 0, 1);

INSERT OR IGNORE INTO content_questions
  (id, section_id, number, prompt, answer_type, points, order_index)
VALUES
  ('bahnhof-q1', 'section-bahnhof', 1, 'Von welchem Gleis fährt der Zug ab?', 'single_choice', 1, 0),
  ('arzt-q1', 'section-arzt', 1, 'Bis wann ist die Praxis heute geöffnet?', 'single_choice', 1, 0);

INSERT OR IGNORE INTO content_options
  (id, question_id, code, label, is_correct, order_index)
VALUES
  ('bahnhof-q1-a', 'bahnhof-q1', 'A', 'Gleis 6', 0, 0),
  ('bahnhof-q1-b', 'bahnhof-q1', 'B', 'Gleis 8', 1, 1),
  ('bahnhof-q1-c', 'bahnhof-q1', 'C', 'Gleis 10', 0, 2),
  ('arzt-q1-a', 'arzt-q1', 'A', '14 Uhr', 0, 0),
  ('arzt-q1-b', 'arzt-q1', 'B', '16 Uhr', 1, 1),
  ('arzt-q1-c', 'arzt-q1', 'C', '18 Uhr', 0, 2);
