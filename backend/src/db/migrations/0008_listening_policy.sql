UPDATE content_items
SET metadata_json = json_set(COALESCE(metadata_json, '{}'), '$.maxPlays', 2), updated_at = unixepoch()
WHERE skill = 'listening';

UPDATE content_options SET explanation = 'Die Ansage nennt Gleis 8.' WHERE id = 'bahnhof-q1-b';
UPDATE content_options SET explanation = 'Die Praxis ist heute bis 16 Uhr geöffnet.' WHERE id = 'arzt-q1-b';
