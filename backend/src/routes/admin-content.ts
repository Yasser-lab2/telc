import { count, eq, inArray } from 'drizzle-orm';
import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { getDb } from '../db';
import { attempts, contentItemMedia, contentItems, contentOptions, contentQuestions, contentSections, mediaAssets } from '../db/schema';
import { loadContentDetail } from '../lib/content';
import { apiError } from '../lib/http';
import { adminMiddleware, requirePermission } from '../middleware/admin';
import { authMiddleware } from '../middleware/auth';
import type { Env } from '../types';

const app = new Hono<Env>();
app.use('*', authMiddleware, adminMiddleware, requirePermission('content.manage'));

const base = z.object({
  title: z.string().min(2).max(160), level: z.enum(['B1', 'B2']),
  status: z.enum(['draft', 'published']), accessStatus: z.enum(['free', 'premium']),
  difficulty: z.enum(['introductory', 'standard', 'advanced']).default('standard'),
  durationMinutes: z.number().int().positive().max(240).optional(),
});
const option = z.object({ code: z.string().min(1).max(8), label: z.string().min(1).max(500) });
const listeningSchema = base.extend({
  skill: z.literal('listening'), audioUrl: z.string().url(), transcript: z.string().min(1).max(10000),
  maxPlays: z.number().int().min(1).max(10).default(2),
  questions: z.array(z.object({ prompt: z.string().min(1).max(1000), explanation: z.string().max(2000).optional(), options: z.array(option).min(2).max(8), correctCode: z.string().min(1).max(8) })).min(1).max(50),
});
const writingSchema = base.extend({ skill: z.literal('writing'), context: z.string().min(10).max(5000) });
const payloadSchema = z.discriminatedUnion('skill', [listeningSchema, writingSchema]);

app.get('/', async (c) => {
  const rows = await getDb(c.env.DB).select().from(contentItems).where(inArray(contentItems.skill, ['listening', 'writing']));
  return c.json({ items: rows });
});

app.get('/:id', async (c) => {
  const item = await loadContentDetail(c.env.DB, c.req.param('id'));
  if (!item || !['listening', 'writing'].includes(item.skill)) return apiError(c, 404, 'Content not found', 'NOT_FOUND');
  return c.json({ item });
});

app.post('/', async (c) => {
  const parsed = payloadSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Invalid content', code: 'BAD_REQUEST', details: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`) }, 400);
  const answerError = validateCorrectOptions(parsed.data);
  if (answerError) return apiError(c, 400, answerError, 'BAD_REQUEST');
  const id = nanoid();
  await saveContent(c.env.DB, id, parsed.data, c.get('user').id, true);
  return c.json({ item: await loadContentDetail(c.env.DB, id) }, 201);
});

app.put('/:id', async (c) => {
  const parsed = payloadSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Invalid content', code: 'BAD_REQUEST', details: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`) }, 400);
  const answerError = validateCorrectOptions(parsed.data);
  if (answerError) return apiError(c, 400, answerError, 'BAD_REQUEST');
  const db = getDb(c.env.DB);
  const [existing] = await db.select().from(contentItems).where(eq(contentItems.id, c.req.param('id'))).limit(1);
  if (!existing || !['listening', 'writing'].includes(existing.skill)) return apiError(c, 404, 'Content not found', 'NOT_FOUND');
  const [usage] = await db.select({ value: count() }).from(attempts).where(eq(attempts.contentItemId, existing.id));
  if (usage.value > 0) return apiError(c, 400, 'Content with learner attempts cannot be rewritten; archive it and create a new version', 'BAD_REQUEST');
  await saveContent(c.env.DB, existing.id, parsed.data, c.get('user').id, false);
  return c.json({ item: await loadContentDetail(c.env.DB, existing.id) });
});

app.post('/:id/archive', async (c) => {
  await getDb(c.env.DB).update(contentItems).set({ status: 'archived', updatedAt: new Date() }).where(eq(contentItems.id, c.req.param('id')));
  return c.json({ ok: true });
});

type Payload = z.infer<typeof payloadSchema>;
function validateCorrectOptions(data: Payload) {
  if (data.skill !== 'listening') return null;
  const invalidIndex = data.questions.findIndex((question) => !question.options.some((item) => item.code === question.correctCode));
  return invalidIndex >= 0 ? `Question ${invalidIndex + 1} has no matching correct option` : null;
}

async function saveContent(dbBinding: D1Database, id: string, data: Payload, adminId: string, create: boolean) {
  const db = getDb(dbBinding);
  const now = new Date();
  const values = {
    slug: create ? `${data.skill}-${nanoid(10)}` : undefined,
    skill: data.skill, kind: data.skill === 'writing' ? 'prompt' as const : 'exercise' as const,
    level: data.level, title: data.title, instructions: data.skill === 'writing' ? data.context : 'Hören Sie den Text und beantworten Sie die Fragen.',
    status: data.status, accessStatus: data.accessStatus, difficulty: data.difficulty,
    durationMinutes: data.durationMinutes ?? (data.skill === 'writing' ? 30 : 10),
    scoreMax: data.skill === 'listening' ? data.questions.length : null,
    metadataJson: data.skill === 'listening' ? JSON.stringify({ maxPlays: data.maxPlays }) : null,
    publishedAt: data.status === 'published' ? now : null, updatedAt: now,
  };
  if (create) await db.insert(contentItems).values({ id, ...values, slug: values.slug!, createdBy: adminId, createdAt: now });
  else await db.update(contentItems).set(values).where(eq(contentItems.id, id));

  const oldSections = await db.select({ id: contentSections.id }).from(contentSections).where(eq(contentSections.contentItemId, id));
  if (oldSections.length) {
    const oldQuestions = await db.select({ id: contentQuestions.id }).from(contentQuestions).where(inArray(contentQuestions.sectionId, oldSections.map((row) => row.id)));
    if (oldQuestions.length) await db.delete(contentOptions).where(inArray(contentOptions.questionId, oldQuestions.map((row) => row.id)));
    await db.delete(contentQuestions).where(inArray(contentQuestions.sectionId, oldSections.map((row) => row.id)));
    await db.delete(contentSections).where(eq(contentSections.contentItemId, id));
  }
  await db.delete(contentItemMedia).where(eq(contentItemMedia.contentItemId, id));
  if (data.skill === 'listening') {
    const sectionId = nanoid();
    await db.insert(contentSections).values({ id: sectionId, contentItemId: id, code: 'teil1', title: data.title, instructions: 'Hören Sie den Text und beantworten Sie die Fragen.', body: data.transcript, exerciseType: 'multiple_choice', orderIndex: 0, pointsMax: data.questions.length });
    for (const [questionIndex, question] of data.questions.entries()) {
      const questionId = nanoid();
      await db.insert(contentQuestions).values({ id: questionId, sectionId, number: questionIndex + 1, prompt: question.prompt, answerType: 'single_choice', points: 1, explanation: question.explanation, orderIndex: questionIndex });
      for (const [optionIndex, item] of question.options.entries()) await db.insert(contentOptions).values({ id: nanoid(), questionId, code: item.code, label: item.label, isCorrect: item.code === question.correctCode, explanation: item.code === question.correctCode ? question.explanation : null, orderIndex: optionIndex });
    }
    const mediaId = nanoid();
    await db.insert(mediaAssets).values({ id: mediaId, objectKey: `external/${nanoid()}`, sourceUrl: data.audioUrl, kind: 'audio', fileName: `${id}.mp3`, mimeType: 'audio/mpeg', sizeBytes: 0, createdBy: adminId, createdAt: now });
    await db.insert(contentItemMedia).values({ id: nanoid(), contentItemId: id, mediaAssetId: mediaId, role: 'primary_audio', orderIndex: 0 });
  }
}

export default app;
