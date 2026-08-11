import { Hono } from 'hono';
import { and, desc, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { getDb } from '../db';
import { aiSubmissions, attempts, contentItems, writingDrafts } from '../db/schema';
import { apiError } from '../lib/http';
import { listPublishedContent, loadPublishedContent } from '../lib/content';
import { authMiddleware } from '../middleware/auth';
import { subscriptionMiddleware } from '../middleware/subscription';
import type { Env } from '../types';

const app = new Hono<Env>();

app.use('*', authMiddleware, subscriptionMiddleware);

app.get('/', async (c) => {
  const items = await listPublishedContent(c.env.DB, 'writing');
  return c.json({ types: items.map(toWritingType) });
});

app.get('/:typeId', async (c) => {
  const item = await loadPublishedContent(c.env.DB, c.req.param('typeId'));
  if (!item || item.skill !== 'writing') return apiError(c, 404, 'Schreiben type not found', 'NOT_FOUND');
  return c.json({ type: toWritingType(item) });
});

app.post('/:typeId/draft', async (c) => {
  const user = c.get('user');
  const item = await loadPublishedContent(c.env.DB, c.req.param('typeId'));
  if (!item || item.skill !== 'writing') return apiError(c, 404, 'Schreiben type not found', 'NOT_FOUND');
  const db = getDb(c.env.DB);
  let [attempt] = await db.select().from(attempts).where(and(
    eq(attempts.userId, user.id), eq(attempts.contentItemId, item.id), eq(attempts.status, 'in_progress'),
  )).orderBy(desc(attempts.lastSavedAt)).limit(1);
  const now = new Date();
  if (!attempt) {
    attempt = {
      id: nanoid(), userId: user.id, contentItemId: item.id, skill: 'writing', mode: 'practice',
      status: 'in_progress', startedAt: now, lastSavedAt: now, submittedAt: null,
      elapsedSeconds: 0, scoreObtained: null, scoreMax: null, percentage: null, stateVersion: 1, metadataJson: null,
    };
    await db.insert(attempts).values(attempt);
  }
  let [draft] = await db.select().from(writingDrafts).where(eq(writingDrafts.attemptId, attempt.id)).limit(1);
  if (!draft) {
    draft = { id: nanoid(), attemptId: attempt.id, userId: user.id, contentItemId: item.id, text: '', wordCount: 0, createdAt: now, updatedAt: now };
    await db.insert(writingDrafts).values(draft);
  }
  return c.json({ attempt: { id: attempt.id, status: attempt.status }, draft });
});

const draftSchema = z.object({ text: z.string().max(5000) });

app.put('/drafts/:attemptId', async (c) => {
  const user = c.get('user');
  const body = draftSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return apiError(c, 400, 'Invalid writing draft', 'BAD_REQUEST');
  const db = getDb(c.env.DB);
  const [attempt] = await db.select().from(attempts).where(and(eq(attempts.id, c.req.param('attemptId')), eq(attempts.userId, user.id))).limit(1);
  if (!attempt || attempt.skill !== 'writing') return apiError(c, 404, 'Writing draft not found', 'NOT_FOUND');
  if (attempt.status !== 'in_progress') return apiError(c, 400, 'Writing attempt is already completed', 'BAD_REQUEST');
  const now = new Date();
  const wordCount = countWords(body.data.text);
  await db.update(writingDrafts).set({ text: body.data.text, wordCount, updatedAt: now }).where(eq(writingDrafts.attemptId, attempt.id));
  await db.update(attempts).set({ lastSavedAt: now, stateVersion: attempt.stateVersion + 1 }).where(eq(attempts.id, attempt.id));
  return c.json({ ok: true, savedAt: now, wordCount });
});

app.get('/history/my', async (c) => {
  const user = c.get('user');
  const rows = await getDb(c.env.DB)
    .select({
      attemptId: attempts.id, contentItemId: contentItems.id, title: contentItems.title, level: contentItems.level,
      submittedAt: attempts.submittedAt, percentage: attempts.percentage, userText: aiSubmissions.userText,
      feedback: aiSubmissions.aiFeedback,
    })
    .from(attempts)
    .innerJoin(contentItems, eq(attempts.contentItemId, contentItems.id))
    .leftJoin(aiSubmissions, eq(aiSubmissions.attemptId, attempts.id))
    .where(and(eq(attempts.userId, user.id), eq(attempts.skill, 'writing'), eq(attempts.status, 'completed')))
    .orderBy(desc(attempts.submittedAt))
    .limit(20);
  return c.json({ submissions: rows.map((row) => ({ ...row, feedback: row.feedback ? JSON.parse(row.feedback) : null })) });
});

function toWritingType(item: { id: string; title: string; level: 'B1' | 'B2'; instructions: string | null }) {
  return { id: item.id, title: item.title, niveau: item.level, context: item.instructions ?? '' };
}

function countWords(text: string) {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export default app;
