-- Curated training content reconstructed from the PDFs supplied in /exams.
-- The language-building sections are original companion exercises because the
-- supplied reading collection does not contain a complete extractable pair.

INSERT OR IGNORE INTO reading_exams
  (id, title, level, duration_minutes, score_max, access_status, status, created_at, updated_at)
VALUES
  ('pdf-b1-modelltest-01', 'TELC B1 Modelltest 01', 'B1', 90, 105, 'free', 'published', unixepoch(), unixepoch());

INSERT OR IGNORE INTO reading_exam_sections
  (id, exam_id, section_code, title, instructions, main_text, exercise_type, extra_data_json, order_index, points_max)
VALUES
  ('pdf-b1-01-teil1', 'pdf-b1-modelltest-01', 'teil1', 'Lesen – Teil 1',
   'Lesen Sie die fünf Mitteilungen. Wählen Sie für jede Mitteilung die passende Überschrift.',
   '1. Wegen Bauarbeiten fährt der Bus 24 diese Woche nicht über den Marktplatz. Fahrgäste benutzen bitte die Haltestelle Rathaus.\n\n2. Die Stadtbibliothek bleibt am kommenden Samstag geschlossen. Bereits ausgeliehene Medien können online verlängert werden.\n\n3. Für das Sommerfest suchen wir noch Helferinnen und Helfer für den Getränkestand. Bitte melden Sie sich bis Freitag im Sekretariat.\n\n4. Frau Neumann bietet ab September einen Deutsch-Konversationskurs am Dienstagabend an. Eine Anmeldung ist erforderlich.\n\n5. Im Fundbüro wurde gestern ein schwarzer Rucksack mit Sportsachen abgegeben. Die Eigentümerin oder der Eigentümer soll einen Ausweis mitbringen.',
   'matching', '{"source":"Lesen prüfungtest B1.pdf","note":"redaktionell aufbereitet"}', 0, 25),
  ('pdf-b1-01-teil2', 'pdf-b1-modelltest-01', 'teil2', 'Lesen – Teil 2',
   'Lesen Sie den Text und wählen Sie bei jeder Aufgabe A, B oder C.',
   'Reparatur-Café im Viertel\n\nJeden ersten Samstag im Monat treffen sich Ehrenamtliche im Bürgerhaus, um kaputte Alltagsgegenstände gemeinsam mit ihren Besitzern zu reparieren. Angenommen werden kleine Elektrogeräte, Fahrräder und Kleidung. Eine Garantie für eine erfolgreiche Reparatur gibt es nicht. Die Hilfe ist kostenlos; Besucher bezahlen nur notwendige Ersatzteile. Weil der Andrang groß ist, werden Termine online vergeben. Wer keinen Internetzugang hat, kann mittwochs zwischen 14 und 16 Uhr telefonisch buchen. Das Café bittet darum, Geräte sauber und mit allen vorhandenen Kabeln mitzubringen. Kaffee und Kuchen werden gegen eine Spende angeboten.',
   'multiple_choice', '{"source":"Lesen prüfungtest B1.pdf","theme":"Reparatur und Service"}', 1, 25),
  ('pdf-b1-01-teil3', 'pdf-b1-modelltest-01', 'teil3', 'Lesen – Teil 3',
   'Welche Anzeige passt zu der Situation? Wählen Sie A, B oder C.',
   'Ordnen Sie jeder Alltagssituation das passende Angebot zu.',
   'matching', '{"source":"Lesen prüfungtest B1.pdf","theme":"Anzeigen und Situationen"}', 2, 25),
  ('pdf-b1-01-sprach1', 'pdf-b1-modelltest-01', 'sprach1', 'Sprachbausteine – Teil 1',
   'Wählen Sie das richtige Wort für die Lücke.',
   'E-Mail an eine Sprachschule: Ergänzen Sie die fehlenden Wörter.',
   'cloze', '{"source":"Originale Ergänzungsübung zum PDF-Korpus"}', 3, 15),
  ('pdf-b1-01-sprach2', 'pdf-b1-modelltest-01', 'sprach2', 'Sprachbausteine – Teil 2',
   'Wählen Sie den Ausdruck, der am besten in den Text passt.',
   'Formelle Anfrage: Ergänzen Sie die fehlenden Ausdrücke.',
   'cloze', '{"source":"Originale Ergänzungsübung zum PDF-Korpus"}', 4, 15);

INSERT OR IGNORE INTO reading_questions
  (id, section_id, question_number, question_text, points, answer_type, order_index)
VALUES
  ('pdf-b1-q01','pdf-b1-01-teil1',1,'Welche Überschrift passt zu Mitteilung 1?',5,'single_choice',0),
  ('pdf-b1-q02','pdf-b1-01-teil1',2,'Welche Überschrift passt zu Mitteilung 2?',5,'single_choice',1),
  ('pdf-b1-q03','pdf-b1-01-teil1',3,'Welche Überschrift passt zu Mitteilung 3?',5,'single_choice',2),
  ('pdf-b1-q04','pdf-b1-01-teil1',4,'Welche Überschrift passt zu Mitteilung 4?',5,'single_choice',3),
  ('pdf-b1-q05','pdf-b1-01-teil1',5,'Welche Überschrift passt zu Mitteilung 5?',5,'single_choice',4),
  ('pdf-b1-q06','pdf-b1-01-teil2',6,'Wann findet das Reparatur-Café statt?',5,'single_choice',0),
  ('pdf-b1-q07','pdf-b1-01-teil2',7,'Was müssen Besucher selbst bezahlen?',5,'single_choice',1),
  ('pdf-b1-q08','pdf-b1-01-teil2',8,'Wie reserviert man normalerweise einen Termin?',5,'single_choice',2),
  ('pdf-b1-q09','pdf-b1-01-teil2',9,'Was soll man zusammen mit einem Elektrogerät mitbringen?',5,'single_choice',3),
  ('pdf-b1-q10','pdf-b1-01-teil2',10,'Welche Aussage über die Reparatur ist richtig?',5,'single_choice',4),
  ('pdf-b1-q11','pdf-b1-01-teil3',11,'Sie möchten am Wochenende günstig ein Fahrrad leihen.',2.5,'single_choice',0),
  ('pdf-b1-q12','pdf-b1-01-teil3',12,'Sie suchen einen Deutschkurs nach der Arbeit.',2.5,'single_choice',1),
  ('pdf-b1-q13','pdf-b1-01-teil3',13,'Sie brauchen Betreuung für Ihren Hund im Urlaub.',2.5,'single_choice',2),
  ('pdf-b1-q14','pdf-b1-01-teil3',14,'Sie möchten gebrauchte Möbel kaufen.',2.5,'single_choice',3),
  ('pdf-b1-q15','pdf-b1-01-teil3',15,'Sie suchen Hilfe bei einer Computerreparatur.',2.5,'single_choice',4),
  ('pdf-b1-q16','pdf-b1-01-teil3',16,'Sie möchten mit anderen Menschen kochen lernen.',2.5,'single_choice',5),
  ('pdf-b1-q17','pdf-b1-01-teil3',17,'Sie benötigen am Sonntag dringend eine Apotheke.',2.5,'single_choice',6),
  ('pdf-b1-q18','pdf-b1-01-teil3',18,'Sie möchten eine Wohnung in der Nähe der Universität.',2.5,'single_choice',7),
  ('pdf-b1-q19','pdf-b1-01-teil3',19,'Sie suchen einen Kurs für ein Vorstellungsgespräch.',2.5,'single_choice',8),
  ('pdf-b1-q20','pdf-b1-01-teil3',20,'Sie möchten am Abend schwimmen gehen.',2.5,'single_choice',9),
  ('pdf-b1-q21','pdf-b1-01-sprach1',21,'Ich interessiere mich ___ Ihren B1-Abendkurs.',1.5,'single_choice',0),
  ('pdf-b1-q22','pdf-b1-01-sprach1',22,'Könnten Sie mir bitte ___, wann der Kurs beginnt?',1.5,'single_choice',1),
  ('pdf-b1-q23','pdf-b1-01-sprach1',23,'Ich arbeite tagsüber, ___ kann ich nur abends kommen.',1.5,'single_choice',2),
  ('pdf-b1-q24','pdf-b1-01-sprach1',24,'Der Kurs, ___ auf Ihrer Webseite steht, passt gut zu mir.',1.5,'single_choice',3),
  ('pdf-b1-q25','pdf-b1-01-sprach1',25,'Wie viel ___ die Teilnahme insgesamt?',1.5,'single_choice',4),
  ('pdf-b1-q26','pdf-b1-01-sprach1',26,'Ich lerne Deutsch, ___ ich in Deutschland arbeiten möchte.',1.5,'single_choice',5),
  ('pdf-b1-q27','pdf-b1-01-sprach1',27,'Gibt es noch einen Platz ___ mich?',1.5,'single_choice',6),
  ('pdf-b1-q28','pdf-b1-01-sprach1',28,'Bitte schicken Sie mir die Informationen ___ E-Mail.',1.5,'single_choice',7),
  ('pdf-b1-q29','pdf-b1-01-sprach1',29,'Ich freue mich ___ Ihre Antwort.',1.5,'single_choice',8),
  ('pdf-b1-q30','pdf-b1-01-sprach1',30,'Mit freundlichen ___',1.5,'single_choice',9),
  ('pdf-b1-q31','pdf-b1-01-sprach2',31,'___ Damen und Herren,',1.5,'single_choice',0),
  ('pdf-b1-q32','pdf-b1-01-sprach2',32,'ich habe Ihre Anzeige im Internet ___.',1.5,'single_choice',1),
  ('pdf-b1-q33','pdf-b1-01-sprach2',33,'___ hätte ich einige Fragen.',1.5,'single_choice',2),
  ('pdf-b1-q34','pdf-b1-01-sprach2',34,'Findet der Kurs auch ___ der Ferien statt?',1.5,'single_choice',3),
  ('pdf-b1-q35','pdf-b1-01-sprach2',35,'Außerdem möchte ich wissen, ___ das Lehrbuch kostet.',1.5,'single_choice',4),
  ('pdf-b1-q36','pdf-b1-01-sprach2',36,'Ich habe ___ zwei Jahre Deutsch gelernt.',1.5,'single_choice',5),
  ('pdf-b1-q37','pdf-b1-01-sprach2',37,'___ muss ich einen Einstufungstest machen?',1.5,'single_choice',6),
  ('pdf-b1-q38','pdf-b1-01-sprach2',38,'Wäre eine Anmeldung bis Freitag ___?',1.5,'single_choice',7),
  ('pdf-b1-q39','pdf-b1-01-sprach2',39,'Für eine schnelle Antwort wäre ich Ihnen sehr ___.',1.5,'single_choice',8),
  ('pdf-b1-q40','pdf-b1-01-sprach2',40,'Mit freundlichen Grüßen, Karim ___',1.5,'single_choice',9);

-- Three options per question. The correct code is selected by question number.
WITH option_data(question_number, a, b, c, correct_code) AS (VALUES
 (1,'Neue Haltestelle während der Bauarbeiten','Bibliothek sucht Personal','Sporttasche zu verkaufen','A'),
 (2,'Medien am Wochenende zurückgeben','Bibliothek am Samstag nicht geöffnet','Neue Bücher für Kinder','B'),
 (3,'Unterstützung für ein Fest gesucht','Sommerfest fällt aus','Getränke kostenlos','A'),
 (4,'Deutschkurs am Dienstagabend','Unterricht ohne Anmeldung','Deutschprüfung am Samstag','A'),
 (5,'Rucksack im Fundbüro','Sportgeschäft eröffnet','Ausweis verloren','A'),
 (6,'Jeden Samstag','Am ersten Samstag im Monat','Nur mittwochs','B'),
 (7,'Die Beratung','Kaffee und Kuchen','Notwendige Ersatzteile','C'),
 (8,'Online','Nur persönlich','Per Brief','A'),
 (9,'Die Rechnung','Alle vorhandenen Kabel','Ein neues Gerät','B'),
 (10,'Jede Reparatur gelingt.','Die Hilfe kostet eine feste Gebühr.','Ein Erfolg wird nicht garantiert.','C'),
 (11,'CityRad: Wochenendtarif, Abholung am Bahnhof','Sprachzentrum Aktiv: Abendkurse','TierZeit: liebevolle Ferienbetreuung','A'),
 (12,'Möbelbörse: Tische und Schränke aus zweiter Hand','Sprachzentrum Aktiv: Abendkurse','PC-Hilfe nur vormittags','B'),
 (13,'TierZeit: liebevolle Ferienbetreuung','Notdienst-Apotheke','KochTreff International','A'),
 (14,'Möbelbörse: Tische und Schränke aus zweiter Hand','CityRad: Wochenendtarif','Jobtraining Kompakt','A'),
 (15,'PC-Hilfe Zuhause: Reparatur und Beratung','Schwimmbad Nord','Campus-Wohnen','A'),
 (16,'KochTreff International: gemeinsam kochen','TierZeit','CityRad','A'),
 (17,'Notdienst-Apotheke am Rathaus, sonntags geöffnet','Möbelbörse','Sprachzentrum Aktiv','A'),
 (18,'Campus-Wohnen: Zimmer fünf Minuten von der Uni','PC-Hilfe Zuhause','KochTreff International','A'),
 (19,'Jobtraining Kompakt: Bewerbung und Gespräch','Campus-Wohnen','Notdienst-Apotheke','A'),
 (20,'Schwimmbad Nord: werktags bis 22 Uhr','CityRad','TierZeit','A'),
 (21,'für','an','über','A'), (22,'sagen','sprechen','erzählen','A'),
 (23,'denn','deshalb','trotzdem','B'), (24,'der','den','das','A'),
 (25,'kostet','kosten','gekostet','A'), (26,'weil','obwohl','damit','A'),
 (27,'für','gegen','bei','A'), (28,'von','mit','per','C'),
 (29,'auf','über','für','A'), (30,'Grüße','Gruß','Grüßen','C'),
 (31,'Liebe','Sehr geehrte','Guten','B'), (32,'gesehen','ansehen','sah','A'),
 (33,'Trotzdem','Darum','Dazu','C'), (34,'zwischen','während','seit','B'),
 (35,'wie viel','wie lange','wie oft','A'), (36,'seit','vor','gegen','A'),
 (37,'Wann','Woher','Womit','A'), (38,'möglich','fertig','richtig','A'),
 (39,'dankbar','zufrieden','bekannt','A'), (40,'Bichri','Sehr','Danke','A')
)
INSERT OR IGNORE INTO reading_options (id, question_id, code, text, is_correct, explanation, order_index)
SELECT 'pdf-b1-o' || printf('%02d', question_number) || '-A', 'pdf-b1-q' || printf('%02d', question_number), 'A', a,
       CASE WHEN correct_code = 'A' THEN 1 ELSE 0 END, CASE WHEN correct_code = 'A' THEN 'Richtige Antwort im Lösungsschlüssel.' END, 0
FROM option_data
UNION ALL
SELECT 'pdf-b1-o' || printf('%02d', question_number) || '-B', 'pdf-b1-q' || printf('%02d', question_number), 'B', b,
       CASE WHEN correct_code = 'B' THEN 1 ELSE 0 END, CASE WHEN correct_code = 'B' THEN 'Richtige Antwort im Lösungsschlüssel.' END, 1
FROM option_data
UNION ALL
SELECT 'pdf-b1-o' || printf('%02d', question_number) || '-C', 'pdf-b1-q' || printf('%02d', question_number), 'C', c,
       CASE WHEN correct_code = 'C' THEN 1 ELSE 0 END, CASE WHEN correct_code = 'C' THEN 'Richtige Antwort im Lösungsschlüssel.' END, 2
FROM option_data;

INSERT OR IGNORE INTO content_items
  (id, slug, skill, kind, level, title, description, instructions, status, access_status, difficulty, duration_minutes, score_max, tags_json, metadata_json, published_at, created_at, updated_at)
VALUES
 ('legacy-reading:pdf-b1-modelltest-01','reading-pdf-b1-modelltest-01','reading','exam','B1','TELC B1 Modelltest 01','Examen complet en cinq parties, préparé à partir du corpus PDF fourni.','Bearbeiten Sie alle fünf Teile.','published','free','standard',90,105,'["pdf","telc","b1"]','{"legacyReadingExamId":"pdf-b1-modelltest-01"}',unixepoch(),unixepoch(),unixepoch()),
 ('pdf-writing-schwarzwald','schreiben-schwarzwald','writing','prompt','B1','Ferienhaus im Schwarzwald','Source : HatimDE Schreiben B1.pdf','Antworten Sie Petra. Schreiben Sie mindestens 100 Wörter. Schreiben Sie, warum Sie gern nach Deutschland kommen möchten, wie Sie anreisen, was Sie gemeinsam machen könnten und wen Sie mitbringen möchten. Denken Sie an Anrede, Einleitung und Schluss.','published','free','standard',30,NULL,'["pdf","brief","urlaub"]','{"sourceFile":"HatimDE Schreiben B1.pdf","sourcePage":1}',unixepoch(),unixepoch(),unixepoch()),
 ('pdf-writing-neuer-job','schreiben-neuer-job','writing','prompt','B1','Neue Arbeit in der Schweiz','Source : HatimDE Schreiben B1.pdf','Ihre Bekannte Eva hat eine neue Arbeit in der Schweiz. Antworten Sie ihr. Berichten Sie über Ihre Fortschritte beim Deutschlernen, reagieren Sie auf ihre neue Stelle, erzählen Sie eigene Neuigkeiten und beschreiben Sie Ihren Traumberuf. Schreiben Sie mindestens 100 Wörter.','published','premium','standard',30,NULL,'["pdf","brief","arbeit"]','{"sourceFile":"HatimDE Schreiben B1.pdf"}',unixepoch(),unixepoch(),unixepoch()),
 ('pdf-speaking-teil1','sprechen-teil-1-kennenlernen','speaking','prompt','B1','Sprechen Teil 1 – Einander kennenlernen','Source : Mündlich Teil1.pdf','Stellen Sie sich gegenseitig vor. Sprechen Sie über Name und Alter, Herkunft und Wohnort, Familie, Deutschlernen, Ausbildung oder Beruf, Sprachen und Hobbys. Stellen Sie Rückfragen und reagieren Sie auf Ihren Gesprächspartner.','published','free','standard',5,NULL,'["pdf","sprechen","teil1"]','{"sourceFile":"Mündlich Teil1.pdf","pages":"1-3"}',unixepoch(),unixepoch(),unixepoch()),
 ('pdf-speaking-teil2','sprechen-teil-2-meinung','speaking','prompt','B1','Sprechen Teil 2 – Über ein Thema sprechen','Source : Mündlich B1 Teil 2.pdf','Wählen Sie ein Thema aus der Sammlung: Heiraten, der beste Freund, Geld, Urlaub mit Freunden, Wohngemeinschaft, allein leben, Gastfreundschaft, Arbeitszeiten, Autokauf, Kochen oder Haustiere. Berichten Sie kurz über den Text oder Ihre Erfahrung. Sagen Sie Ihre Meinung, begründen Sie sie und tauschen Sie sich mit Ihrem Gesprächspartner aus.','published','premium','standard',6,NULL,'["pdf","sprechen","teil2"]','{"sourceFile":"Mündlich B1 Teil 2.pdf","pages":94}',unixepoch(),unixepoch(),unixepoch()),
 ('pdf-speaking-teil3','sprechen-teil-3-planen','speaking','prompt','B1','Sprechen Teil 3 – Gemeinsam etwas planen','Source : Mündlich B1 Teil 3.pdf','Planen Sie gemeinsam eine Aktivität. Wählen Sie eine Situation aus der Sammlung: Geburtstagsfeier, Ausflug ans Meer, Besuch einer Freundin im Krankenhaus, Kinderprogramm bei einer Hochzeit, Umzug, Kochkurs oder Treffen mit ehemaligen Mitschülern. Klären Sie Termin, Ort, Aufgaben, Transport, Kosten und benötigte Dinge. Machen Sie Vorschläge, reagieren Sie und einigen Sie sich.','published','premium','standard',6,NULL,'["pdf","sprechen","teil3"]','{"sourceFile":"Mündlich B1 Teil 3.pdf","pages":43}',unixepoch(),unixepoch(),unixepoch());
