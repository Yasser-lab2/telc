-- Published B1 simulation built around the PDF reading model test.
INSERT OR IGNORE INTO simulation_blueprints
  (id, title, level, status, access_status, duration_minutes, instructions, created_at, updated_at, published_at)
VALUES
  ('pdf-b1-simulation-01', 'Simulation TELC B1 – Modelltest 01', 'B1', 'published', 'free', 125,
   'Bearbeiten Sie die Module in der vorgegebenen Reihenfolge: Lesen, Hören und Schreiben. Planen Sie Ihre Zeit sorgfältig und reichen Sie jedes Modul ein, bevor Sie mit dem nächsten beginnen.',
   unixepoch(), unixepoch(), unixepoch());

INSERT OR IGNORE INTO simulation_modules
  (id, simulation_id, content_item_id, skill, order_index, duration_minutes, weight)
VALUES
  ('pdf-b1-sim-01-reading', 'pdf-b1-simulation-01', 'legacy-reading:pdf-b1-modelltest-01', 'reading', 0, 90, 1),
  ('pdf-b1-sim-01-listening', 'pdf-b1-simulation-01', 'arzt', 'listening', 1, 5, 1),
  ('pdf-b1-sim-01-writing', 'pdf-b1-simulation-01', 'pdf-writing-schwarzwald', 'writing', 2, 30, 1);

INSERT OR IGNORE INTO content_items
  (id, slug, skill, kind, level, title, description, status, access_status, difficulty, duration_minutes, metadata_json, published_at, created_at, updated_at)
VALUES
  ('simulation:pdf-b1-simulation-01', 'simulation-pdf-b1-modelltest-01', 'simulation', 'simulation', 'B1',
   'Simulation TELC B1 – Modelltest 01',
   'Simulation complète avec le nouvel examen Lesen, un exercice Hören et le sujet Schreiben « Ferienhaus im Schwarzwald ».',
   'published', 'free', 'advanced', 125, '{"simulationId":"pdf-b1-simulation-01","source":"PDF exam library"}',
   unixepoch(), unixepoch(), unixepoch());
