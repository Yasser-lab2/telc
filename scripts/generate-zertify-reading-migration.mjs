import fs from 'node:fs';
import path from 'node:path';

const sourceDirectory = path.resolve('opencode-work/zertify');
const outputPath = path.resolve('backend/src/db/migrations/0029_zertify_lesen_free_catalog.sql');
const categories = ['prufungen', 'teil1', 'teil2', 'teil3', 'sprach1', 'sprach2'];

const categoryToSection = {
  teil1: 'teil1',
  teil2: 'teil2',
  teil3: 'teil3',
  sprach1: 'sprach1',
  sprach2: 'sprach2',
};

function sectionCodeForPartType(type) {
  if (type === 'lesen1') return 'teil1';
  if (type === 'lesen2') return 'teil2';
  if (type === 'lesen3') return 'teil3';
  if (type === 'sb1') return 'sprach1';
  if (type === 'sb2') return 'sprach2';
  throw new Error(`Unsupported part type: ${type}`);
}

const sectionLabels = {
  teil1: 'Lesen Teil 1',
  teil2: 'Lesen Teil 2',
  teil3: 'Lesen Teil 3',
  sprach1: 'Sprachbausteine 1',
  sprach2: 'Sprachbausteine 2',
};

function readCategory(category) {
  const filePath = path.join(sourceDirectory, `${category}.json`);
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
}

function sql(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  if (typeof value === 'boolean') return value ? '1' : '0';
  return `'${String(value).replaceAll("'", "''")}'`;
}

const rawSql = (value) => ({ kind: 'raw-sql', value });

function sqlValue(value) {
  return value && typeof value === 'object' && value.kind === 'raw-sql' ? value.value : sql(value);
}

function jsonSql(value) {
  return rawSql(sql(JSON.stringify(value)));
}

const now = rawSql('unixepoch()');

const INSERT_BATCH_SIZE = 100;
const INSERT_MAX_CHARS = 80_000;
const OPTION_INSERT_BATCH_SIZE = 250;

function appendInsertBatches(lines, table, columns, rows) {
  if (rows.length === 0) return;

  const prefix = `INSERT OR IGNORE INTO ${table} (${columns.join(',')}) VALUES`;
  let batch = [];
  let batchChars = prefix.length;

  const flush = () => {
    if (batch.length === 0) return;
    lines.push(`${prefix}\n${batch.join(',\n')};`);
    batch = [];
    batchChars = prefix.length;
  };

  for (const values of rows) {
    const rendered = `(${values.map(sqlValue).join(',')})`;
    const nextChars = batchChars + rendered.length + (batch.length > 0 ? 2 : 1);
    if (batch.length >= INSERT_BATCH_SIZE || (batch.length > 0 && nextChars > INSERT_MAX_CHARS)) {
      flush();
    }
    batch.push(rendered);
    batchChars += rendered.length + (batch.length > 1 ? 2 : 1);
  }

  flush();
}

function appendOptionBatches(lines, rows) {
  if (rows.length === 0) return;

  const sourceColumns = ['id', 'question_id', 'code', 'text_id', 'is_correct', 'explanation', 'order_index'];
  const prefix = `WITH imported(${sourceColumns.join(',')}) AS (\nVALUES`;
  const suffix = `)\nINSERT OR IGNORE INTO reading_options (id,question_id,code,text,is_correct,explanation,order_index)\nSELECT imported.id,imported.question_id,imported.code,option_text.text,imported.is_correct,imported.explanation,imported.order_index\nFROM imported\nJOIN zertify_import_option_text AS option_text ON option_text.id = imported.text_id;`;
  let batch = [];
  let batchChars = prefix.length + suffix.length;

  const flush = () => {
    if (batch.length === 0) return;
    lines.push(`${prefix}\n${batch.join(',\n')}\n${suffix}`);
    batch = [];
    batchChars = prefix.length + suffix.length;
  };

  for (const values of rows) {
    const rendered = `(${values.map(sqlValue).join(',')})`;
    const nextChars = batchChars + rendered.length + (batch.length > 0 ? 2 : 1);
    if (batch.length >= OPTION_INSERT_BATCH_SIZE || (batch.length > 0 && nextChars > INSERT_MAX_CHARS)) {
      flush();
    }
    batch.push(rendered);
    batchChars += rendered.length + (batch.length > 1 ? 2 : 1);
  }

  flush();
}

function normalizeCode(value) {
  return String(value ?? '').trim().toUpperCase();
}

function normalizeText(value) {
  return String(value ?? '').trim();
}

function variantCount(exam) {
  const partAlternates = exam.parts.flatMap((part) => part.alternate_versions ?? []).length;
  const fullVariants = exam.variants?.length ?? 0;
  const largestPartVariantSet = Math.max(0, ...exam.parts.map((part) => part.alternate_versions?.length ?? 0));
  return Math.max(1, fullVariants + 1, largestPartVariantSet + 1, Math.min(9, partAlternates + 1));
}

function commonMetadata(exam, sourceFile, sourceCategory, sections) {
  return {
    source: 'zertify-free-json',
    sourceFile,
    sourceCategory,
    sourceExamId: exam.id,
    titleAr: exam.title_ar ?? null,
    originalTitle: exam.title,
    variantCount: variantCount(exam),
    sectionCodes: sections.map((section) => section.code),
    officialStatus: 'Imported reference practice content; verify licensing before production use',
  };
}

function buildSection(part, sectionCode, sourceExamId) {
  const title = part.title || sectionLabels[sectionCode];
  const instructions = part.subtitle || '';
  const points = Number(part.max_points ?? 0);
  const extraData = {
    source: 'zertify-free-json',
    sourceExamId,
    titleAr: null,
    textTitle: part.text_title ?? part.text?.title ?? null,
    translationAr: part.translation_ar ?? null,
    variantCount: 1 + (part.alternate_versions?.length ?? 0),
    slides: [],
  };
  let mainText = '';
  let questions = [];
  let exerciseType = 'multiple_choice';

  if (part.type === 'lesen1') {
    exerciseType = 'matching_titles';
    mainText = (part.texts ?? []).map((text, index) => `${index + 1}. ${normalizeText(text.content)}`).join('\n\n');
    extraData.slides = [
      { id: 'texte', label: 'Texte', type: 'texts', description: 'Lesen Sie die fünf kurzen Texte.' },
      { id: 'ueberschriften', label: 'Überschriften', type: 'headlines', description: 'Ordnen Sie jedem Text die passende Überschrift zu.' },
    ];
    extraData.titles = (part.headlines ?? []).map((headline) => ({
      code: normalizeCode(headline.id),
      text: normalizeText(headline.text),
      textAr: normalizeText(headline.translation),
    }));
    questions = (part.texts ?? []).map((text, index) => {
      const correctCode = normalizeCode(part.answers?.[String(text.id)]);
      return {
        number: index + 1,
        text: `Welche Überschrift passt zu Text ${index + 1}?`,
        points: points / Math.max(1, part.texts.length),
        answerType: 'matching_title',
        options: extraData.titles.map((headline) => ({
          code: headline.code,
          text: headline.text,
          isCorrect: headline.code === correctCode,
        })),
      };
    });
  } else if (part.type === 'lesen2') {
    exerciseType = 'multiple_choice';
    mainText = normalizeText(part.text?.content);
    extraData.textTitle = part.text?.title ?? null;
    extraData.slides = [
      { id: 'text', label: 'Text', type: 'text', description: 'Lesen Sie den Text aufmerksam.' },
      { id: 'fragen', label: 'Fragen', type: 'questions', description: 'Wählen Sie bei jeder Aufgabe A, B oder C.' },
    ];
    questions = (part.questions ?? []).map((question) => ({
      number: Number(question.id),
      text: normalizeText(question.text),
      points: points / Math.max(1, part.questions.length),
      answerType: 'single_choice',
      options: question.options.map((option, index) => ({
        code: String.fromCharCode(65 + index),
        text: normalizeText(option),
        isCorrect: index === question.correct_index,
      })),
    }));
  } else if (part.type === 'lesen3') {
    exerciseType = 'matching_ads';
    mainText = (part.situations ?? []).map((situation, index) => `${index + 1}. ${normalizeText(situation.text)}`).join('\n\n');
    extraData.slides = [
      { id: 'situationen', label: 'Situationen', type: 'situations', description: 'Lesen Sie die zehn Situationen.' },
      { id: 'anzeigen', label: 'Anzeigen', type: 'ads', description: 'Wählen Sie für jede Situation die passende Anzeige.' },
    ];
    extraData.situations = (part.situations ?? []).map((situation, index) => ({
      number: index + 1,
      text: normalizeText(situation.text),
      textAr: normalizeText(situation.translation),
    }));
    extraData.ads = (part.ads ?? []).map((ad) => ({ code: normalizeCode(ad.id), text: normalizeText(ad.text) }));
    extraData.ads.push({ code: 'X', text: 'Keine passende Anzeige' });
    questions = (part.situations ?? []).map((situation, index) => {
      const correctCode = normalizeCode(part.answers?.[String(11 + index)] || 'X');
      return {
        number: 11 + index,
        text: normalizeText(situation.text),
        points: points / Math.max(1, part.situations.length),
        answerType: 'matching_ad',
        options: extraData.ads.map((ad) => ({ ...ad, isCorrect: ad.code === correctCode })),
      };
    });
  } else if (part.type === 'sb1') {
    exerciseType = 'gap_three_options';
    mainText = normalizeText(part.text_with_gaps);
    extraData.slides = [
      { id: 'text', label: 'Text', type: 'text', description: 'Lesen Sie den Text aufmerksam.' },
      { id: 'luecken', label: 'Lücken', type: 'gaps', description: 'Wählen Sie das passende Wort für jede Lücke.' },
    ];
    questions = (part.gaps ?? []).map((gap) => {
      const correctText = normalizeText(gap.correct);
      const correctIndex = gap.options.findIndex((option) => normalizeText(option).toLocaleLowerCase() === correctText.toLocaleLowerCase());
      return {
        number: Number(gap.id),
        text: `Lücke ${gap.id}`,
        points: points / Math.max(1, part.gaps.length),
        answerType: 'single_choice',
        options: gap.options.map((option, index) => ({
          code: String.fromCharCode(65 + index),
          text: normalizeText(option),
          isCorrect: index === correctIndex,
          explanation: index === correctIndex ? normalizeText(gap.explanation) : undefined,
        })),
      };
    });
  } else if (part.type === 'sb2') {
    exerciseType = 'gap_word_bank';
    mainText = normalizeText(part.text_with_gaps);
    extraData.slides = [
      { id: 'text', label: 'Text', type: 'text', description: 'Lesen Sie den Text aufmerksam.' },
      { id: 'luecken', label: 'Lücken', type: 'gaps', description: 'Wählen Sie den passenden Ausdruck aus der Wortbank.' },
    ];
    extraData.wordBank = (part.word_pool ?? []).map((word) => ({ code: normalizeCode(word.id), text: normalizeText(word.word) }));
    questions = (part.gaps ?? []).map((gap) => {
      const correctCode = normalizeCode(gap.correct);
      return {
        number: Number(gap.id),
        text: `Lücke ${gap.id}`,
        points: points / Math.max(1, part.gaps.length),
        answerType: 'single_choice',
        options: extraData.wordBank.map((word) => ({
          code: word.code,
          text: word.text,
          isCorrect: word.code === correctCode,
          explanation: word.code === correctCode ? normalizeText(gap.explanation) : undefined,
        })),
      };
    });
  } else {
    throw new Error(`Unsupported part type: ${part.type}`);
  }

  return {
    code: sectionCode,
    title,
    instructions,
    mainText,
    exerciseType,
    pointsMax: points,
    extraData,
    questions,
  };
}

const sourceByCategory = Object.fromEntries(categories.map((category) => [category, readCategory(category)]));
const completeExams = new Map(sourceByCategory.prufungen.exams.map((exam) => [exam.id, { ...exam, sourceCategory: 'prufungen', sourceFile: 'prufungen.json' }]));
const exams = new Map(completeExams);

for (const category of categories.slice(1)) {
  for (const sourceExam of sourceByCategory[category].exams) {
    if (exams.has(sourceExam.id)) continue;
    const partType = category === 'teil1' ? 'lesen1' : category === 'teil2' ? 'lesen2' : category === 'teil3' ? 'lesen3' : category;
    const part = sourceExam.parts.find((item) => item.type === partType);
    exams.set(sourceExam.id, {
      ...sourceExam,
      parts: part ? [part] : sourceExam.parts,
      sourceCategory: category,
      sourceFile: `${category}.json`,
    });
  }
}

const sqlLines = [
  '-- Generated from opencode-work/zertify/*.json.',
  '-- Source scope: free Zertify practice records (pro: false), imported as TELC Prep content.',
  '-- Regenerate with: node scripts/generate-zertify-reading-migration.mjs',
];

const examRows = [];
const contentItemRows = [];
const sectionRows = [];
const questionRows = [];
const optionRows = [];

for (const exam of exams.values()) {
  const sections = exam.parts.map((part) => buildSection(part, sectionCodeForPartType(part.type), exam.id));
  const complete = sections.length === 5;
  const examId = `zertify-${exam.id}`;
  const metadata = commonMetadata(exam, exam.sourceFile, exam.sourceCategory, sections);
  const scoreMax = complete ? 105 : sections[0]?.pointsMax ?? 0;
  examRows.push([
    examId,
    normalizeText(exam.title),
    exam.level,
    Number(exam.minutes ?? 90),
    scoreMax,
    'free',
    'published',
    now,
    now,
  ]);
  contentItemRows.push([
    `legacy-reading:${examId}`,
    `lesen-zertify-${exam.id}`,
    'reading',
    complete ? 'exam' : 'exercise',
    exam.level,
    normalizeText(exam.title),
    `Zertify-style ${complete ? 'complete exam' : 'part practice'} imported from the free JSON export.`,
    'Practise mit deutscher Originalaufgabe und Darija-Hinweisen.',
    'published',
    'free',
    'standard',
    Number(exam.minutes ?? 90),
    scoreMax,
    jsonSql(['zertify', 'lesen', exam.level.toLowerCase(), exam.sourceCategory]),
    jsonSql(metadata),
    now,
    now,
    now,
  ]);

  for (const section of sections) {
    const sectionId = `${examId}-${section.code}`;
    sectionRows.push([
      sectionId,
      examId,
      section.code,
      section.title,
      section.instructions,
      section.mainText,
      section.exerciseType,
      jsonSql({ ...section.extraData, titleAr: exam.title_ar ?? null }),
      ['teil1', 'teil2', 'teil3', 'sprach1', 'sprach2'].indexOf(section.code),
      section.pointsMax,
    ]);
    for (const [questionIndex, question] of section.questions.entries()) {
      const questionId = `${sectionId}-q-${question.number}`;
      questionRows.push([
        questionId,
        sectionId,
        question.number,
        question.text,
        question.points,
        question.answerType,
        questionIndex,
      ]);
      for (const [optionIndex, option] of question.options.entries()) {
        const optionId = `${questionId}-o-${option.code}`;
        optionRows.push([
          optionId,
          questionId,
          option.code,
          option.text,
          option.isCorrect ? 1 : 0,
          option.explanation ? option.explanation : null,
          optionIndex,
        ]);
      }
    }
  }
}

appendInsertBatches(sqlLines, 'reading_exams', ['id', 'title', 'level', 'duration_minutes', 'score_max', 'access_status', 'status', 'created_at', 'updated_at'], examRows);
appendInsertBatches(sqlLines, 'content_items', ['id', 'slug', 'skill', 'kind', 'level', 'title', 'description', 'instructions', 'status', 'access_status', 'difficulty', 'duration_minutes', 'score_max', 'tags_json', 'metadata_json', 'published_at', 'created_at', 'updated_at'], contentItemRows);
appendInsertBatches(sqlLines, 'reading_exam_sections', ['id', 'exam_id', 'section_code', 'title', 'instructions', 'main_text', 'exercise_type', 'extra_data_json', 'order_index', 'points_max'], sectionRows);
appendInsertBatches(sqlLines, 'reading_questions', ['id', 'section_id', 'question_number', 'question_text', 'points', 'answer_type', 'order_index'], questionRows);
const uniqueOptionRows = [...new Map(optionRows.map((row) => [row[0], row])).values()];
const optionTextIds = new Map();
const optionTextRows = [];
const optionRowsWithTextRefs = uniqueOptionRows.map((row) => {
  let textId = optionTextIds.get(row[3]);
  if (!textId) {
    textId = `text-${String(optionTextRows.length + 1).padStart(4, '0')}`;
    optionTextIds.set(row[3], textId);
    optionTextRows.push([textId, row[3]]);
  }
  return [row[0], row[1], row[2], textId, row[4], row[5], row[6]];
});
sqlLines.push('CREATE TABLE IF NOT EXISTS zertify_import_option_text (id TEXT PRIMARY KEY NOT NULL, text TEXT NOT NULL);');
appendInsertBatches(sqlLines, 'zertify_import_option_text', ['id', 'text'], optionTextRows);
appendOptionBatches(sqlLines, optionRowsWithTextRefs);
sqlLines.push('DROP TABLE IF EXISTS zertify_import_option_text;');

fs.writeFileSync(outputPath, `${sqlLines.join('\n')}\n`);

console.log(`Generated ${outputPath}`);
console.log(`Imported ${exams.size} unique models (${[...exams.values()].filter((exam) => exam.parts.length === 5).length} complete).`);
console.log(`Batched ${examRows.length} exams, ${sectionRows.length} sections, ${questionRows.length} questions, and ${uniqueOptionRows.length} options (${optionTextRows.length} unique option texts) into ${sqlLines.length - 3} SQL statements.`);
