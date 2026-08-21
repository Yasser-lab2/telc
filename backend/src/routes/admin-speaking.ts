import { desc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { getDb } from '../db';
import { adminAuditLogs, attempts, contentItems, speakingSubmissions, users } from '../db/schema';
import { apiError } from '../lib/http';
import { adminMiddleware, requirePermission } from '../middleware/admin';
import { authMiddleware } from '../middleware/auth';
import type { Env } from '../types';
import { syncProgressAfterCompletion } from '../lib/progress';

const app = new Hono<Env>();
app.use('*', authMiddleware, adminMiddleware, requirePermission('content.manage'));

const schema = z.object({ title: z.string().min(3).max(160), level: z.enum(['B1', 'B2']), description: z.string().max(500).optional(), instructions: z.string().min(10).max(5000), durationMinutes: z.number().int().min(1).max(30), status: z.enum(['draft', 'published']) });

app.get('/', async (c) => c.json({ prompts: await getDb(c.env.DB).select().from(contentItems).where(eq(contentItems.skill, 'speaking')).orderBy(desc(contentItems.updatedAt)) }));

app.post('/', async (c) => {
  const parsed = schema.safeParse(await c.req.json().catch(() => null)); if (!parsed.success) return apiError(c, 400, 'Invalid speaking prompt', 'BAD_REQUEST');
  const id = nanoid(); const now = new Date(); const actor = c.get('user');
  await getDb(c.env.DB).insert(contentItems).values({ id, slug: `speaking-${nanoid(10)}`, skill: 'speaking', kind: 'prompt', level: parsed.data.level, title: parsed.data.title, description: parsed.data.description, instructions: parsed.data.instructions, status: parsed.data.status, accessStatus: 'premium', difficulty: 'standard', durationMinutes: parsed.data.durationMinutes, publishedAt: parsed.data.status === 'published' ? now : null, createdBy: actor.id, createdAt: now, updatedAt: now });
  await audit(c.env.DB, actor.id, 'speaking_prompt.created', 'content', id, { status: parsed.data.status, level: parsed.data.level });
  return c.json({ id }, 201);
});

app.get('/reviews', requirePermission('speaking.review'), async (c) => {
  const rows = await getDb(c.env.DB).select({ submission: speakingSubmissions, title: contentItems.title, level: contentItems.level, learnerName: users.displayName }).from(speakingSubmissions).innerJoin(contentItems, eq(speakingSubmissions.contentItemId, contentItems.id)).innerJoin(users, eq(speakingSubmissions.userId, users.id)).orderBy(desc(speakingSubmissions.createdAt)).limit(50);
  return c.json({ submissions: rows.map((row) => ({ ...row.submission, title: row.title, level: row.level, learnerName: row.learnerName, feedback: parseFeedback(row.submission.feedbackJson) })) });
});

app.get('/reviews/:id/audio', requirePermission('speaking.review'), async (c) => {
  const [row] = await getDb(c.env.DB).select().from(speakingSubmissions).where(eq(speakingSubmissions.id, c.req.param('id'))).limit(1); if (!row) return apiError(c, 404, 'Speaking submission not found', 'NOT_FOUND'); const object = await c.env.SPEAKING_RECORDINGS.get(row.objectKey); if (!object) return apiError(c, 404, 'Recording object not found', 'NOT_FOUND'); return new Response(object.body, { headers: { 'Content-Type': row.mimeType, 'Cache-Control': 'private, no-store' } });
});

const reviewSchema = z.object({ pronunciation: z.number().min(0).max(5), fluency: z.number().min(0).max(5), vocabulary: z.number().min(0).max(5), taskAchievement: z.number().min(0).max(5), feedback: z.string().min(10).max(3000) });
app.post('/reviews/:id', requirePermission('speaking.review'), async (c) => {
  const parsed = reviewSchema.safeParse(await c.req.json().catch(() => null)); if (!parsed.success) return apiError(c, 400, 'Invalid speaking review', 'BAD_REQUEST'); const db = getDb(c.env.DB); const [row] = await db.select({ submission: speakingSubmissions, level: contentItems.level }).from(speakingSubmissions).innerJoin(contentItems, eq(speakingSubmissions.contentItemId, contentItems.id)).where(eq(speakingSubmissions.id, c.req.param('id'))).limit(1); if (!row) return apiError(c, 404, 'Speaking submission not found', 'NOT_FOUND'); if (row.submission.status === 'reviewed') return c.json({ ok: true, alreadyReviewed: true });
  const total = parsed.data.pronunciation + parsed.data.fluency + parsed.data.vocabulary + parsed.data.taskAchievement; const percentage = Math.round(total / 20 * 1000) / 10; const now = new Date(); const attemptId = nanoid(); const actor = c.get('user'); const feedbackJson = JSON.stringify({ ...parsed.data, scoreTotal: total, scoreMax: 20, percentage });
  await db.batch([
    db.insert(attempts).values({ id: attemptId, userId: row.submission.userId, contentItemId: row.submission.contentItemId, skill: 'speaking', mode: 'practice', status: 'completed', startedAt: row.submission.createdAt, lastSavedAt: now, submittedAt: now, elapsedSeconds: row.submission.durationSeconds ?? 0, scoreObtained: total, scoreMax: 20, percentage }),
    db.update(speakingSubmissions).set({ status: 'reviewed', reviewedAt: now, reviewerUserId: actor.id, attemptId, feedbackJson }).where(eq(speakingSubmissions.id, row.submission.id)),
  ]);
  await syncProgressAfterCompletion(c.env.DB, { userId: row.submission.userId, attemptId, skill: 'speaking', level: row.level }); await audit(c.env.DB, actor.id, 'speaking_submission.reviewed', 'speaking_submission', row.submission.id, { percentage }); return c.json({ ok: true, alreadyReviewed: false, percentage });
});

app.put('/:id', async (c) => {
  const parsed = schema.safeParse(await c.req.json().catch(() => null)); if (!parsed.success) return apiError(c, 400, 'Invalid speaking prompt', 'BAD_REQUEST');
  const db = getDb(c.env.DB); const [existing] = await db.select().from(contentItems).where(eq(contentItems.id, c.req.param('id'))).limit(1); if (!existing || existing.skill !== 'speaking') return apiError(c, 404, 'Speaking prompt not found', 'NOT_FOUND');
  const now = new Date(); await db.update(contentItems).set({ title: parsed.data.title, level: parsed.data.level, description: parsed.data.description, instructions: parsed.data.instructions, durationMinutes: parsed.data.durationMinutes, status: parsed.data.status, publishedAt: parsed.data.status === 'published' ? existing.publishedAt ?? now : null, updatedAt: now }).where(eq(contentItems.id, existing.id));
  await audit(c.env.DB, c.get('user').id, 'speaking_prompt.updated', 'content', existing.id, { status: parsed.data.status, level: parsed.data.level }); return c.json({ ok: true });
});

app.post('/:id/archive', async (c) => { const db = getDb(c.env.DB); const [existing] = await db.select().from(contentItems).where(eq(contentItems.id, c.req.param('id'))).limit(1); if (!existing || existing.skill !== 'speaking') return apiError(c, 404, 'Speaking prompt not found', 'NOT_FOUND'); await db.update(contentItems).set({ status: 'archived', updatedAt: new Date() }).where(eq(contentItems.id, existing.id)); await audit(c.env.DB, c.get('user').id, 'speaking_prompt.archived', 'content', existing.id, {}); return c.json({ ok: true }); });

export default app;

async function audit(dbBinding: D1Database, actorUserId: string, action: string, targetType: string, targetId: string, metadata: unknown) {
  await getDb(dbBinding).insert(adminAuditLogs).values({ id: nanoid(), actorUserId, action, targetType, targetId, metadataJson: JSON.stringify(metadata), createdAt: new Date() });
}
function parseFeedback(value: string | null) { try { return value ? JSON.parse(value) : null; } catch { return null; } }
