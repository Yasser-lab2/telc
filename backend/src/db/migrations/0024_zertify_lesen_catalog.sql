-- Sample Lesen catalog based on the public Zertify structure: two linked full exams.
-- Each exam keeps the TELC relation exam -> section -> question -> option and exposes
-- all five practice scopes (Teil 1-3 and Sprachbausteine 1-2).

INSERT OR IGNORE INTO reading_exams
  (id, title, level, duration_minutes, score_max, access_status, status, created_at, updated_at)
VALUES
  ('zertify-b2-sport-01', 'Sport ist gesund – Version 1', 'B2', 90, 105, 'free', 'published', unixepoch(), unixepoch());

INSERT OR IGNORE INTO reading_exam_sections
  (id, exam_id, section_code, title, instructions, main_text, exercise_type, extra_data_json, order_index, points_max)
VALUES
  ('zertify-b2-sport-01-teil1', 'zertify-b2-sport-01', 'teil1', 'Lesen – Teil 1',
   'Lesen Sie die fünf kurzen Mitteilungen. Wählen Sie für jede Mitteilung die passende Überschrift.',
   '1. Wegen Bauarbeiten fährt der Bus 24 diese Woche nicht über den Marktplatz. Bitte benutzen Sie die Haltestelle Rathaus.\n\n2. Das Stadtbad bleibt am Montag wegen Wartungsarbeiten geschlossen. Ab Dienstag gelten die normalen Öffnungszeiten.\n\n3. Für das Sommerfest des Sportvereins suchen wir Helferinnen und Helfer für den Getränkestand.\n\n4. Das Bewegungszentrum bietet ab September einen Rückenkurs am Dienstagabend an. Eine Anmeldung ist erforderlich.\n\n5. Im Fundbüro wurden schwarze Fahrradhandschuhe gefunden. Die Eigentümerin oder der Eigentümer soll einen Ausweis mitbringen.',
   'matching_titles', '{"source":"Zertify Lesen sample","format":"headlines"}', 0, 25),
  ('zertify-b2-sport-01-teil2', 'zertify-b2-sport-01', 'teil2', 'Lesen – Teil 2',
   'Lesen Sie den Text und wählen Sie bei jeder Aufgabe A, B oder C.',
   'Viele Menschen beginnen mit dem Sport, weil sie sich im Alltag mehr bewegen möchten. Der Verein Aktiv am Park bietet deshalb jeden Mittwoch einen offenen Trainingstreff an. Neue Teilnehmer können zuerst eine kostenlose Probestunde besuchen. Sie brauchen nur bequeme Sportschuhe und eine Trinkflasche. Da die Gruppen klein bleiben sollen, muss man sich vorher online anmelden. Bei schlechtem Wetter findet das Training in der Sporthalle neben dem Park statt. Nach dem Training können die Teilnehmer gemeinsam einen Tee trinken und Erfahrungen austauschen.',
   'multiple_choice', '{"source":"Zertify Lesen sample","theme":"Sport und Gesundheit"}', 1, 25),
  ('zertify-b2-sport-01-teil3', 'zertify-b2-sport-01', 'teil3', 'Lesen – Teil 3',
   'Welche Anzeige passt zu der Situation? Wählen Sie A, B oder C.',
   'Ordnen Sie jeder Alltagssituation das passende Angebot zu. Lesen Sie die drei Anzeigen sorgfältig.',
   'matching_ads', '{"source":"Zertify Lesen sample","format":"situation-to-ad"}', 2, 25),
  ('zertify-b2-sport-01-sprach1', 'zertify-b2-sport-01', 'sprach1', 'Sprachbausteine – Teil 1',
   'Wählen Sie das richtige Wort für jede Lücke.',
   'E-Mail an ein Bewegungszentrum: Ergänzen Sie die fehlenden Wörter.',
   'gap_three_options', '{"source":"Zertify Lesen sample","theme":"Kursanmeldung"}', 3, 15),
  ('zertify-b2-sport-01-sprach2', 'zertify-b2-sport-01', 'sprach2', 'Sprachbausteine – Teil 2',
   'Wählen Sie den Ausdruck, der am besten in den Text passt.',
   'Anfrage zu einem Gesundheitskurs: Ergänzen Sie die fehlenden Ausdrücke.',
   'gap_word_bank', '{"source":"Zertify Lesen sample","theme":"Formelle Anfrage"}', 4, 15);

INSERT OR IGNORE INTO reading_questions
  (id, section_id, question_number, question_text, points, answer_type, order_index)
VALUES
  ('zertify-b2-q01','zertify-b2-sport-01-teil1',1,'Welche Überschrift passt zu Mitteilung 1?',5,'single_choice',0),
  ('zertify-b2-q02','zertify-b2-sport-01-teil1',2,'Welche Überschrift passt zu Mitteilung 2?',5,'single_choice',1),
  ('zertify-b2-q03','zertify-b2-sport-01-teil1',3,'Welche Überschrift passt zu Mitteilung 3?',5,'single_choice',2),
  ('zertify-b2-q04','zertify-b2-sport-01-teil1',4,'Welche Überschrift passt zu Mitteilung 4?',5,'single_choice',3),
  ('zertify-b2-q05','zertify-b2-sport-01-teil1',5,'Welche Überschrift passt zu Mitteilung 5?',5,'single_choice',4),
  ('zertify-b2-q06','zertify-b2-sport-01-teil2',6,'Wann findet der offene Trainingstreff statt?',5,'single_choice',0),
  ('zertify-b2-q07','zertify-b2-sport-01-teil2',7,'Was ist für neue Teilnehmer kostenlos?',5,'single_choice',1),
  ('zertify-b2-q08','zertify-b2-sport-01-teil2',8,'Was sollen die Teilnehmer mitbringen?',5,'single_choice',2),
  ('zertify-b2-q09','zertify-b2-sport-01-teil2',9,'Warum muss man sich online anmelden?',5,'single_choice',3),
  ('zertify-b2-q10','zertify-b2-sport-01-teil2',10,'Wo trainiert die Gruppe bei schlechtem Wetter?',5,'single_choice',4),
  ('zertify-b2-q11','zertify-b2-sport-01-teil3',11,'Sie suchen einen Kurs für einen gesunden Rücken.',2.5,'single_choice',0),
  ('zertify-b2-q12','zertify-b2-sport-01-teil3',12,'Sie möchten am Wochenende Fahrräder reparieren.',2.5,'single_choice',1),
  ('zertify-b2-q13','zertify-b2-sport-01-teil3',13,'Sie wollen nach der Arbeit Yoga machen.',2.5,'single_choice',2),
  ('zertify-b2-q14','zertify-b2-sport-01-teil3',14,'Sie brauchen einen Kinderkurs im Schwimmen.',2.5,'single_choice',3),
  ('zertify-b2-q15','zertify-b2-sport-01-teil3',15,'Sie möchten gebrauchte Sportkleidung kaufen.',2.5,'single_choice',4),
  ('zertify-b2-q16','zertify-b2-sport-01-teil3',16,'Sie suchen eine Laufgruppe für Anfänger.',2.5,'single_choice',5),
  ('zertify-b2-q17','zertify-b2-sport-01-teil3',17,'Sie brauchen eine Beratung zu einem Trainingsplan.',2.5,'single_choice',6),
  ('zertify-b2-q18','zertify-b2-sport-01-teil3',18,'Sie möchten im Urlaub wandern und benötigen Ausrüstung.',2.5,'single_choice',7),
  ('zertify-b2-q19','zertify-b2-sport-01-teil3',19,'Sie möchten mit anderen Menschen Volleyball spielen.',2.5,'single_choice',8),
  ('zertify-b2-q20','zertify-b2-sport-01-teil3',20,'Sie suchen einen Erste-Hilfe-Kurs für Sportler.',2.5,'single_choice',9),
  ('zertify-b2-q21','zertify-b2-sport-01-sprach1',21,'Ich interessiere mich ___ Ihren Rückenkurs.',1.5,'single_choice',0),
  ('zertify-b2-q22','zertify-b2-sport-01-sprach1',22,'Könnten Sie mir bitte ___, wann der Kurs beginnt?',1.5,'single_choice',1),
  ('zertify-b2-q23','zertify-b2-sport-01-sprach1',23,'Ich arbeite tagsüber, ___ kann ich nur abends kommen.',1.5,'single_choice',2),
  ('zertify-b2-q24','zertify-b2-sport-01-sprach1',24,'Der Kurs, ___ auf Ihrer Webseite steht, passt gut zu mir.',1.5,'single_choice',3),
  ('zertify-b2-q25','zertify-b2-sport-01-sprach1',25,'Wie viel ___ die Teilnahme insgesamt?',1.5,'single_choice',4),
  ('zertify-b2-q26','zertify-b2-sport-01-sprach1',26,'Ich möchte teilnehmen, ___ ich meine Haltung verbessern will.',1.5,'single_choice',5),
  ('zertify-b2-q27','zertify-b2-sport-01-sprach1',27,'Gibt es noch einen Platz ___ mich?',1.5,'single_choice',6),
  ('zertify-b2-q28','zertify-b2-sport-01-sprach1',28,'Bitte schicken Sie mir die Informationen ___ E-Mail.',1.5,'single_choice',7),
  ('zertify-b2-q29','zertify-b2-sport-01-sprach1',29,'Ich freue mich ___ Ihre Antwort.',1.5,'single_choice',8),
  ('zertify-b2-q30','zertify-b2-sport-01-sprach1',30,'Mit freundlichen ___.',1.5,'single_choice',9),
  ('zertify-b2-q31','zertify-b2-sport-01-sprach2',31,'___ Damen und Herren,',1.5,'single_choice',0),
  ('zertify-b2-q32','zertify-b2-sport-01-sprach2',32,'Ich habe Ihre Kursbeschreibung im Internet ___.',1.5,'single_choice',1),
  ('zertify-b2-q33','zertify-b2-sport-01-sprach2',33,'___ hätte ich einige Fragen.',1.5,'single_choice',2),
  ('zertify-b2-q34','zertify-b2-sport-01-sprach2',34,'Findet der Kurs auch ___ der Ferien statt?',1.5,'single_choice',3),
  ('zertify-b2-q35','zertify-b2-sport-01-sprach2',35,'Außerdem möchte ich wissen, ___ die Monatsgebühr beträgt.',1.5,'single_choice',4),
  ('zertify-b2-q36','zertify-b2-sport-01-sprach2',36,'Ich trainiere ___ zwei Jahren regelmäßig.',1.5,'single_choice',5),
  ('zertify-b2-q37','zertify-b2-sport-01-sprach2',37,'___ muss ich mich für den Kurs anmelden?',1.5,'single_choice',6),
  ('zertify-b2-q38','zertify-b2-sport-01-sprach2',38,'Wäre eine Anmeldung bis Freitag ___?',1.5,'single_choice',7),
  ('zertify-b2-q39','zertify-b2-sport-01-sprach2',39,'Für eine schnelle Antwort wäre ich Ihnen sehr ___.',1.5,'single_choice',8),
  ('zertify-b2-q40','zertify-b2-sport-01-sprach2',40,'Mit freundlichen Grüßen, Samira ___.',1.5,'single_choice',9);

WITH option_data(question_number, a, b, c, correct_code) AS (VALUES
 (1,'Neue Haltestelle während der Bauarbeiten','Stadtbad sucht Personal','Sporthandschuhe zu verkaufen','A'),
 (2,'Stadtbad am Montag geschlossen','Neue Schwimmkurse am Montag','Stadtbad sucht Trainer','A'),
 (3,'Helfer für ein Vereinsfest gesucht','Getränke im Verein kostenlos','Sommerfest fällt aus','A'),
 (4,'Rückenkurs am Dienstagabend','Kurs ohne Anmeldung','Sportprüfung am Samstag','A'),
 (5,'Fahrradhandschuhe im Fundbüro','Handschuhe im Sportgeschäft','Ausweis verloren','A'),
 (6,'Jeden Montag','Jeden Mittwoch','Nur am Wochenende','B'),
 (7,'Die Probestunde','Die Trinkflasche','Der Tee nach dem Training','A'),
 (8,'Sportschuhe und Trinkflasche','Ein Fahrrad und einen Helm','Einen Ausweis und ein Foto','A'),
 (9,'Weil die Gruppen klein bleiben','Weil der Kurs nur im Winter stattfindet','Weil die Halle geschlossen ist','A'),
 (10,'Im Stadtbad','In der Sporthalle','Im Vereinsbüro','B'),
 (11,'Bewegungszentrum Rückenfit: Rückenkurs am Dienstagabend','RadWerk: Fahrradservice am Samstag','YogaZeit: Abendkurs für Anfänger','A'),
 (12,'YogaZeit: Abendkurs für Anfänger','RadWerk: Werkstattkurs am Wochenende','Schwimmclub Nord: Kindertraining','B'),
 (13,'Bewegungszentrum Rückenfit: Rückenkurs am Dienstagabend','YogaZeit: Abendkurs für Anfänger','LaufTreff: Morgenrunde für Anfänger','B'),
 (14,'RadWerk: Werkstattkurs am Wochenende','Schwimmclub Nord: Kindertraining','Sportbörse: gebrauchte Kleidung','B'),
 (15,'LaufTreff: Morgenrunde für Anfänger','Sportbörse: gebrauchte Kleidung','PlanFit: individuelle Trainingsberatung','B'),
 (16,'LaufTreff: Morgenrunde für Anfänger','WanderPlus: Ausrüstung für die Ferien','Volleyball am Donnerstag','A'),
 (17,'PlanFit: individuelle Trainingsberatung','Erste Hilfe Sport: Abendseminar','Bewegungszentrum Rückenfit','A'),
 (18,'Volleyball am Donnerstag','WanderPlus: Ausrüstung für die Ferien','Sportbörse: gebrauchte Kleidung','B'),
 (19,'Erste Hilfe Sport: Abendseminar','Volleyball am Donnerstag','LaufTreff: Morgenrunde für Anfänger','B'),
 (20,'Erste Hilfe Sport: Abendseminar','PlanFit: individuelle Trainingsberatung','Schwimmclub Nord: Kindertraining','A'),
 (21,'für','an','über','A'), (22,'sagen','mitteilen','erzählen','B'),
 (23,'denn','deshalb','trotzdem','B'), (24,'der','den','das','A'),
 (25,'kostet','kosten','gekostet','A'), (26,'weil','obwohl','damit','A'),
 (27,'für','gegen','bei','A'), (28,'von','mit','per','C'),
 (29,'auf','über','für','A'), (30,'Grüßen','Gruß','Grüße','A'),
 (31,'Liebe','Sehr geehrte','Guten','B'), (32,'gesehen','ansehen','sah','A'),
 (33,'Dazu','Darum','Trotzdem','A'), (34,'zwischen','während','seit','B'),
 (35,'wie viel','wie lange','wie oft','A'), (36,'seit','vor','gegen','A'),
 (37,'Wann','Woher','Womit','A'), (38,'möglich','fertig','richtig','A'),
 (39,'dankbar','zufrieden','bekannt','A'), (40,'Bichri','Sehr','Danke','A')
)
INSERT OR IGNORE INTO reading_options (id, question_id, code, text, is_correct, explanation, order_index)
SELECT 'zertify-b2-o' || printf('%02d', question_number) || '-A', 'zertify-b2-q' || printf('%02d', question_number), 'A', a,
       CASE WHEN correct_code = 'A' THEN 1 ELSE 0 END, CASE WHEN correct_code = 'A' THEN 'Richtige Antwort.' END, 0
FROM option_data
UNION ALL
SELECT 'zertify-b2-o' || printf('%02d', question_number) || '-B', 'zertify-b2-q' || printf('%02d', question_number), 'B', b,
       CASE WHEN correct_code = 'B' THEN 1 ELSE 0 END, CASE WHEN correct_code = 'B' THEN 'Richtige Antwort.' END, 1
FROM option_data
UNION ALL
SELECT 'zertify-b2-o' || printf('%02d', question_number) || '-C', 'zertify-b2-q' || printf('%02d', question_number), 'C', c,
       CASE WHEN correct_code = 'C' THEN 1 ELSE 0 END, CASE WHEN correct_code = 'C' THEN 'Richtige Antwort.' END, 2
FROM option_data;

INSERT OR IGNORE INTO content_items
  (id, slug, skill, kind, level, title, description, instructions, status, access_status, difficulty, duration_minutes, score_max, tags_json, metadata_json, published_at, created_at, updated_at)
VALUES
 ('legacy-reading:zertify-b2-sport-01','reading-zertify-b2-sport-01','reading','exam','B2','Sport ist gesund – Version 1','B2-Leseprüfung mit den fünf TELC-Lesen-Bausteinen.','Bearbeiten Sie alle fünf Teile.','published','free','standard',90,105,'["zertify","lesen","b2","sport"]','{"legacyReadingExamId":"zertify-b2-sport-01","source":"Zertify public Lesen structure"}',unixepoch(),unixepoch(),unixepoch());
