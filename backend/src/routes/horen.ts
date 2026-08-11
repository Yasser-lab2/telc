import { Hono } from 'hono';
import { and, desc, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { getDb } from '../db';
import { attemptAnswers, attempts } from '../db/schema';
import { apiError } from '../lib/http';
import { listPublishedContent, loadPublishedContent } from '../lib/content';
import { syncProgressAfterCompletion } from '../lib/progress';
import { authMiddleware } from '../middleware/auth';
import { subscriptionMiddleware } from '../middleware/subscription';
import type { Env } from '../types';

const app = new Hono<Env>();

app.use('*', authMiddleware, subscriptionMiddleware);

app.get('/', async (c) => {
  const items = await listPublishedContent(c.env.DB, 'listening');
  return c.json({
    audios: items.map((item) => ({
      id: item.id,
      title: item.title,
      niveau: item.level,
      audioUrl: '',
    })),
  });
});

app.get('/:audioId', async (c) => {
  const item = await loadPublishedContent(c.env.DB, c.req.param('audioId'));
  if (!item || item.skill !== 'listening') return apiError(c, 404, 'Horen audio not found', 'NOT_FOUND');
  const section = item.sections[0];
  const audioAsset = item.media.find((media) => media.role === 'primary_audio')?.asset;
  if (!section || !audioAsset?.sourceUrl) return apiError(c, 500, 'Horen content is incomplete', 'INTERNAL_ERROR');

  return c.json({
    audio: {
      id: item.id,
      title: item.title,
      niveau: item.level,
      audioUrl: audioAsset.sourceUrl,
      maxPlays: getMaxPlays(item.metadata),
      questions: section.questions.map((question) => ({
        id: question.id,
        prompt: question.prompt,
        options: question.options.map((option) => ({ code: option.code, label: option.label })),
      })),
    },
  });
});

app.get('/:audioId/session', async (c) => {
  const user = c.get('user');
  const item = await loadPublishedContent(c.env.DB, c.req.param('audioId'));
  if (!item || item.skill !== 'listening') return apiError(c, 404, 'Horen audio not found', 'NOT_FOUND');
  const db = getDb(c.env.DB);
  const [attempt] = await db.select().from(attempts).where(and(
    eq(attempts.userId, user.id), eq(attempts.contentItemId, item.id), eq(attempts.status, 'in_progress'),
  )).orderBy(desc(attempts.lastSavedAt)).limit(1);
  if (!attempt) return c.json({ attempt: null, answers: [], playCount: 0, maxPlays: getMaxPlays(item.metadata) });
  const answers = await db.select({ questionId: attemptAnswers.questionId, selectedOptionCode: attemptAnswers.selectedOptionCode })
    .from(attemptAnswers).where(eq(attemptAnswers.attemptId, attempt.id));
  return c.json({ attempt, answers, playCount: getPlayCount(attempt.metadataJson), maxPlays: getMaxPlays(item.metadata) });
});

app.post('/:audioId/start', async (c) => {
  const user = c.get('user');
  const item = await loadPublishedContent(c.env.DB, c.req.param('audioId'));
  if (!item || item.skill !== 'listening') return apiError(c, 404, 'Horen audio not found', 'NOT_FOUND');
  const db = getDb(c.env.DB);
  const [existing] = await db.select().from(attempts).where(and(
    eq(attempts.userId, user.id), eq(attempts.contentItemId, item.id), eq(attempts.status, 'in_progress'),
  )).limit(1);
  if (existing) return c.json({ attempt: existing });

  const now = new Date();
  const attempt = {
    id: nanoid(), userId: user.id, contentItemId: item.id, skill: 'listening' as const,
    mode: 'practice' as const, status: 'in_progress' as const, startedAt: now, lastSavedAt: now,
    elapsedSeconds: 0, stateVersion: 1,
  };
  await db.insert(attempts).values(attempt);
  return c.json({ attempt }, 201);
});

app.post('/sessions/:sessionId/play', async (c) => {
  const user = c.get('user');
  const db = getDb(c.env.DB);
  const [attempt] = await db.select().from(attempts).where(and(eq(attempts.id, c.req.param('sessionId')), eq(attempts.userId, user.id))).limit(1);
  if (!attempt || attempt.skill !== 'listening') return apiError(c, 404, 'Listening attempt not found', 'NOT_FOUND');
  if (attempt.status !== 'in_progress') return apiError(c, 400, 'Attempt is not in progress', 'BAD_REQUEST');
  const item = await loadPublishedContent(c.env.DB, attempt.contentItemId);
  if (!item) return apiError(c, 404, 'Listening content not found', 'NOT_FOUND');
  const maxPlays = getMaxPlays(item.metadata);
  const playCount = getPlayCount(attempt.metadataJson);
  if (playCount >= maxPlays) return apiError(c, 429, 'Audio playback limit reached', 'LIMIT_EXCEEDED');
  const nextCount = playCount + 1;
  const metadata = { ...parseObject(attempt.metadataJson), playCount: nextCount };
  await db.update(attempts).set({ metadataJson: JSON.stringify(metadata), lastSavedAt: new Date(), stateVersion: attempt.stateVersion + 1 }).where(eq(attempts.id, attempt.id));
  return c.json({ playCount: nextCount, maxPlays, remaining: maxPlays - nextCount });
});

app.get('/:audioId/history', async (c) => {
  const user = c.get('user');
  const item = await loadPublishedContent(c.env.DB, c.req.param('audioId'));
  if (!item || item.skill !== 'listening') return apiError(c, 404, 'Horen audio not found', 'NOT_FOUND');
  const history = await getDb(c.env.DB).select({
    id: attempts.id, submittedAt: attempts.submittedAt, score: attempts.scoreObtained,
    scoreMax: attempts.scoreMax, percentage: attempts.percentage,
  }).from(attempts).where(and(
    eq(attempts.userId, user.id), eq(attempts.contentItemId, item.id), eq(attempts.status, 'completed'),
  )).orderBy(desc(attempts.submittedAt)).limit(20);
  return c.json({ history });
});

const answersSchema = z.object({
  answers: z.array(z.object({
    questionId: z.string().min(1), selectedOptionCode: z.string().min(1),
    timeSpentSeconds: z.number().int().nonnegative().optional(),
  })).min(1),
});

app.post('/sessions/:sessionId/answers', async (c) => {
  const user = c.get('user');
  const body = answersSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return apiError(c, 400, 'Invalid answers', 'BAD_REQUEST');
  const db = getDb(c.env.DB);
  const [attempt] = await db.select().from(attempts).where(and(eq(attempts.id, c.req.param('sessionId')), eq(attempts.userId, user.id))).limit(1);
  if (!attempt || attempt.skill !== 'listening') return apiError(c, 404, 'Listening attempt not found', 'NOT_FOUND');
  if (attempt.status !== 'in_progress') return apiError(c, 400, 'Attempt is not in progress', 'BAD_REQUEST');
  const item = await loadPublishedContent(c.env.DB, attempt.contentItemId);
  if (!item) return apiError(c, 404, 'Listening content not found', 'NOT_FOUND');
  const validQuestions = new Map(item.sections.flatMap((section) => section.questions).map((question) => [question.id, question]));
  const now = new Date();
  for (const answer of body.data.answers) {
    const question = validQuestions.get(answer.questionId);
    if (!question || !question.options.some((option) => option.code === answer.selectedOptionCode)) {
      return apiError(c, 400, 'Answer does not belong to this exercise', 'BAD_REQUEST');
    }
    await db.insert(attemptAnswers).values({
      id: nanoid(), attemptId: attempt.id, questionId: answer.questionId,
      selectedOptionCode: answer.selectedOptionCode, timeSpentSeconds: answer.timeSpentSeconds,
      answeredAt: now,
    }).onConflictDoUpdate({
      target: [attemptAnswers.attemptId, attemptAnswers.questionId],
      set: { selectedOptionCode: answer.selectedOptionCode, timeSpentSeconds: answer.timeSpentSeconds, answeredAt: now },
    });
  }
  await db.update(attempts).set({ lastSavedAt: now, stateVersion: attempt.stateVersion + 1 }).where(eq(attempts.id, attempt.id));
  return c.json({ ok: true });
});

app.post('/sessions/:sessionId/submit', async (c) => {
  const user = c.get('user');
  const db = getDb(c.env.DB);
  const [attempt] = await db.select().from(attempts).where(and(eq(attempts.id, c.req.param('sessionId')), eq(attempts.userId, user.id))).limit(1);
  if (!attempt || attempt.skill !== 'listening') return apiError(c, 404, 'Listening attempt not found', 'NOT_FOUND');
  if (attempt.status === 'abandoned') return apiError(c, 400, 'Attempt was abandoned', 'BAD_REQUEST');
  const item = await loadPublishedContent(c.env.DB, attempt.contentItemId);
  if (!item || item.skill !== 'listening') return apiError(c, 404, 'Listening content not found', 'NOT_FOUND');
  const saved = await db.select().from(attemptAnswers).where(eq(attemptAnswers.attemptId, attempt.id));
  const savedByQuestion = new Map(saved.map((answer) => [answer.questionId, answer]));
  const questions = item.sections.flatMap((section) => section.questions);
  let score = 0;
  const corrections = questions.map((question) => {
    const answer = savedByQuestion.get(question.id);
    const correct = question.options.find((option) => option.isCorrect);
    const isCorrect = Boolean(answer?.selectedOptionCode && correct?.code === answer.selectedOptionCode);
    if (isCorrect) score += question.points;
    return {
      questionId: question.id, questionText: question.prompt,
      selectedOptionCode: answer?.selectedOptionCode ?? null, correctOptionCode: correct?.code ?? null,
      explanation: correct?.explanation ?? null, isCorrect, points: question.points,
    };
  });
  const scoreMax = item.scoreMax ?? questions.reduce((total, question) => total + question.points, 0);
  const percentage = scoreMax > 0 ? Math.round((score / scoreMax) * 100) : 0;

  if (attempt.status === 'in_progress') {
    const now = new Date();
    await db.update(attempts).set({ status: 'completed', submittedAt: now, lastSavedAt: now, scoreObtained: score, scoreMax, percentage }).where(and(eq(attempts.id, attempt.id), eq(attempts.status, 'in_progress')));
    for (const correction of corrections) {
      const answer = savedByQuestion.get(correction.questionId);
      if (answer) await db.update(attemptAnswers).set({ isCorrect: correction.isCorrect, pointsAwarded: correction.isCorrect ? correction.points : 0 }).where(eq(attemptAnswers.id, answer.id));
    }
    await syncProgressAfterCompletion(c.env.DB, { userId: user.id, attemptId: attempt.id, skill: 'listening', level: item.level });
  }
  return c.json({ score, scoreMax, percentage, transcript: item.sections[0]?.body ?? '', corrections });
});

function parseObject(value: string | null): Record<string, unknown> {
  if (!value) return {};
  try { const parsed = JSON.parse(value) as unknown; return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}; } catch { return {}; }
}

function getPlayCount(metadataJson: string | null) {
  const value = parseObject(metadataJson).playCount;
  return typeof value === 'number' && value >= 0 ? value : 0;
}

function getMaxPlays(metadata: unknown) {
  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
    const value = (metadata as Record<string, unknown>).maxPlays;
    if (typeof value === 'number' && value > 0) return value;
  }
  return 2;
}

export default app;
