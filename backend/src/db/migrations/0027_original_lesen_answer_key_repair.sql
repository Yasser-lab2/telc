-- Repair imported Teil 2 answer keys after normalizing source answers to uppercase option codes.
UPDATE reading_options SET is_correct = CASE code
  WHEN 'B' THEN 1 ELSE 0 END, explanation = CASE WHEN code = 'B' THEN 'Richtige Antwort.' ELSE NULL END
WHERE question_id IN ('teil2-01-teil2-q-1','teil2-01-teil2-q-2','teil2-01-teil2-q-3','teil2-01-teil2-q-4','teil2-01-teil2-q-5','pruefung-01-teil2-q-1','pruefung-01-teil2-q-2','pruefung-01-teil2-q-3','pruefung-01-teil2-q-4','pruefung-01-teil2-q-5');
UPDATE reading_options SET is_correct = CASE code
  WHEN 'C' THEN 1 ELSE 0 END, explanation = CASE WHEN code = 'C' THEN 'Richtige Antwort.' ELSE NULL END
WHERE question_id IN ('teil2-01-teil2-q-3','teil2-01-teil2-q-5','pruefung-01-teil2-q-3','pruefung-01-teil2-q-5');
UPDATE reading_options SET is_correct = CASE code
  WHEN 'A' THEN 1 ELSE 0 END, explanation = CASE WHEN code = 'A' THEN 'Richtige Antwort.' ELSE NULL END
WHERE question_id IN ('teil2-01-teil2-q-4','pruefung-01-teil2-q-4');
UPDATE reading_options SET is_correct = CASE code
  WHEN 'B' THEN 1 ELSE 0 END, explanation = CASE WHEN code = 'B' THEN 'Richtige Antwort.' ELSE NULL END
WHERE question_id IN ('teil2-02-teil2-q-1','teil2-02-teil2-q-5','pruefung-02-teil2-q-1','pruefung-02-teil2-q-5');
UPDATE reading_options SET is_correct = CASE code
  WHEN 'A' THEN 1 ELSE 0 END, explanation = CASE WHEN code = 'A' THEN 'Richtige Antwort.' ELSE NULL END
WHERE question_id IN ('teil2-02-teil2-q-2','teil2-02-teil2-q-4','pruefung-02-teil2-q-2','pruefung-02-teil2-q-4');
UPDATE reading_options SET is_correct = CASE code
  WHEN 'C' THEN 1 ELSE 0 END, explanation = CASE WHEN code = 'C' THEN 'Richtige Antwort.' ELSE NULL END
WHERE question_id IN ('teil2-02-teil2-q-3','pruefung-02-teil2-q-3');