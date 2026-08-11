import { asc, eq, inArray } from 'drizzle-orm';
import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { getDb } from '../db';
import {
  readingExamSections,
  readingExams,
  readingOptions,
  readingQuestions,
} from '../db/schema';
import { apiError } from '../lib/http';
import {
  examImportSchema,
  sectionCodes,
  sectionPointsMax,
  validateReadingExamImport,
  type ReadingExamImport,
} from '../lib/reading-validation';
import { adminMiddleware, requirePermission } from '../middleware/admin';
import { authMiddleware } from '../middleware/auth';
import { loadExamDetail } from './reading';
import type { Env } from '../types';
import { archiveReadingCatalogItem, ensureReadingCatalogItem } from '../lib/reading-catalog';

const app = new Hono<Env>();
app.use('*', authMiddleware, adminMiddleware, requirePermission('content.manage'));

const metadataSchema = z.object({
  title: z.string().min(1),
  level: z.enum(['B1', 'B2']).default('B1'),
  durationMinutes: z.number().int().positive().default(90),
  scoreMax: z.number().positive().default(105),
  accessStatus: z.enum(['free', 'premium']).default('premium'),
});

app.get('/exams', async (c) => {
  const exams = await getDb(c.env.DB).select().from(readingExams).orderBy(asc(readingExams.createdAt));
  return c.json({ exams });
});

app.post('/exams', async (c) => {
  const body = metadataSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return apiError(c, 400, 'Invalid exam metadata', 'BAD_REQUEST');

  const now = new Date();
  const exam = {
    id: nanoid(),
    title: body.data.title,
    level: body.data.level,
    durationMinutes: body.data.durationMinutes,
    scoreMax: body.data.scoreMax,
    accessStatus: body.data.accessStatus,
    status: 'draft' as const,
    createdAt: now,
    updatedAt: now,
  };
  await getDb(c.env.DB).insert(readingExams).values(exam);
  await ensureReadingCatalogItem(c.env.DB, exam);
  return c.json({ exam }, 201);
});

app.put('/exams/:id', async (c) => {
  const body = metadataSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return apiError(c, 400, 'Invalid exam metadata', 'BAD_REQUEST');

  await getDb(c.env.DB)
    .update(readingExams)
    .set({ ...body.data, updatedAt: new Date() })
    .where(eq(readingExams.id, c.req.param('id')));
  await syncCatalog(c.env.DB, c.req.param('id'));
  return c.json({ ok: true });
});

app.delete('/exams/:id', async (c) => {
  await archiveReadingCatalogItem(c.env.DB, c.req.param('id'));
  await getDb(c.env.DB).delete(readingExams).where(eq(readingExams.id, c.req.param('id')));
  return c.json({ ok: true });
});

app.post('/exams/:id/publish', async (c) => {
  const detail = await loadExamDetail(c.env.DB, c.req.param('id'), true);
  if (!detail?.id) return apiError(c, 404, 'Reading exam not found', 'NOT_FOUND');

  const validation = validateReadingExamImport(detailToImport(detail), 'publish');
  if (!validation.ok) {
    return c.json({ error: 'Published exam validation failed', code: 'VALIDATION_ERROR', details: validation.errors }, 400);
  }

  await getDb(c.env.DB).update(readingExams).set({ status: 'published', updatedAt: new Date() }).where(eq(readingExams.id, c.req.param('id')));
  await syncCatalog(c.env.DB, c.req.param('id'));
  return c.json({ ok: true });
});

app.post('/exams/:id/unpublish', async (c) => {
  await getDb(c.env.DB).update(readingExams).set({ status: 'draft', updatedAt: new Date() }).where(eq(readingExams.id, c.req.param('id')));
  await syncCatalog(c.env.DB, c.req.param('id'));
  return c.json({ ok: true });
});

app.put('/exams/:id/content', async (c) => {
  const raw = await c.req.json().catch(() => null);
  const parsed = examImportSchema.safeParse(raw);
  if (!parsed.success) {
    return c.json(
      {
        error: 'Invalid exam JSON',
        code: 'VALIDATION_ERROR',
        details: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
      },
      400,
    );
  }

  const examId = c.req.param('id');
  const db = getDb(c.env.DB);
  const [existing] = await db.select().from(readingExams).where(eq(readingExams.id, examId)).limit(1);
  if (!existing) return apiError(c, 404, 'Reading exam not found', 'NOT_FOUND');

  const desiredStatus = parsed.data.exam.status ?? existing.status;
  const validation = validateReadingExamImport(parsed.data, desiredStatus === 'published' ? 'publish' : 'draft');
  if (!validation.ok) {
    return c.json({ error: 'Reading exam validation failed', code: 'VALIDATION_ERROR', details: validation.errors }, 400);
  }

  await saveFullExam(c.env.DB, examId, validation.data, existing.status);
  await syncCatalog(c.env.DB, examId);
  return c.json({ ok: true, validation: { ok: true } });
});

async function saveFullExam(dbBinding: D1Database, examId: string, data: ReadingExamImport, currentStatus: 'draft' | 'published') {
  const db = getDb(dbBinding);
  const now = new Date();
  await db
    .update(readingExams)
    .set({
      title: data.exam.title,
      level: data.exam.level,
      durationMinutes: data.exam.durationMinutes,
      scoreMax: data.exam.scoreMax,
      accessStatus: data.exam.accessStatus,
      status: data.exam.status ?? currentStatus,
      updatedAt: now,
    })
    .where(eq(readingExams.id, examId));

  const oldSections = await db.select({ id: readingExamSections.id }).from(readingExamSections).where(eq(readingExamSections.examId, examId));
  if (oldSections.length > 0) {
    const oldQuestions = await db
      .select({ id: readingQuestions.id })
      .from(readingQuestions)
      .where(inArray(readingQuestions.sectionId, oldSections.map((section) => section.id)));
    if (oldQuestions.length > 0) {
      await db.delete(readingOptions).where(inArray(readingOptions.questionId, oldQuestions.map((question) => question.id)));
    }
    await db.delete(readingQuestions).where(inArray(readingQuestions.sectionId, oldSections.map((section) => section.id)));
    await db.delete(readingExamSections).where(eq(readingExamSections.examId, examId));
  }

  for (const section of data.sections) {
    const sectionId = nanoid();
    await db.insert(readingExamSections).values({
      id: sectionId,
      examId,
      sectionCode: section.code,
      title: section.title,
      instructions: section.instructions,
      mainText: section.mainText,
      exerciseType: section.exerciseType,
      extraDataJson: section.extraData ? JSON.stringify(section.extraData) : null,
      orderIndex: sectionCodes.indexOf(section.code),
      pointsMax: sectionPointsMax(section),
    });

    for (const [questionIndex, question] of section.questions.entries()) {
      const questionId = nanoid();
      await db.insert(readingQuestions).values({
        id: questionId,
        sectionId,
        questionNumber: question.number,
        questionText: question.text,
        points: question.points,
        answerType: question.answerType,
        orderIndex: questionIndex,
      });

      for (const [optionIndex, option] of question.options.entries()) {
        await db.insert(readingOptions).values({
          id: nanoid(),
          questionId,
          code: option.code,
          text: option.text,
          isCorrect: option.isCorrect,
          explanation: option.explanation ?? null,
          orderIndex: optionIndex,
        });
      }
    }
  }
}

async function syncCatalog(dbBinding: D1Database, examId: string) {
  const [exam] = await getDb(dbBinding).select().from(readingExams).where(eq(readingExams.id, examId)).limit(1);
  if (exam) await ensureReadingCatalogItem(dbBinding, exam);
}

function detailToImport(detail: Awaited<ReturnType<typeof loadExamDetail>>): ReadingExamImport {
  return {
    exam: {
      title: detail.title,
      level: detail.level,
      durationMinutes: detail.durationMinutes,
      scoreMax: detail.scoreMax,
      accessStatus: detail.accessStatus,
      status: detail.status,
    },
    sections: detail.sections.map((section) => ({
      code: section.sectionCode,
      title: section.title,
      instructions: section.instructions ?? '',
      mainText: section.mainText ?? '',
      exerciseType: section.exerciseType,
      extraData: section.extraData,
      questions: section.questions.map((question) => ({
        number: question.questionNumber,
        text: question.questionText,
        points: question.points,
        answerType: question.answerType,
        options: question.options.map((option) => ({
          code: option.code,
          text: option.text,
          isCorrect: Boolean('isCorrect' in option && option.isCorrect),
          explanation: 'explanation' in option ? option.explanation ?? undefined : undefined,
        })),
      })),
    })),
  };
}

export default app;
