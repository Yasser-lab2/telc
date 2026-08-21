import { and, desc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { getDb } from '../db';
import { contentItems, speakingSubmissions } from '../db/schema';
import { apiError } from '../lib/http';
import { addDays } from '../lib/time';
import { authMiddleware } from '../middleware/auth';
import { subscriptionMiddleware } from '../middleware/subscription';
import type { Env } from '../types';

const app = new Hono<Env>();
app.use('*', authMiddleware, subscriptionMiddleware);

app.get('/', async (c) => {
  const prompts = await getDb(c.env.DB).select({ id: contentItems.id, title: contentItems.title, level: contentItems.level, description: contentItems.description, instructions: contentItems.instructions, durationMinutes: contentItems.durationMinutes }).from(contentItems).where(and(eq(contentItems.skill, 'speaking'), eq(contentItems.status, 'published')));
  return c.json({ prompts, retentionDays: 30 });
});

app.get('/history/my', async (c) => {
  const rows = await getDb(c.env.DB).select({ submission: speakingSubmissions, title: contentItems.title }).from(speakingSubmissions).innerJoin(contentItems, eq(speakingSubmissions.contentItemId, contentItems.id)).where(eq(speakingSubmissions.userId, c.get('user').id)).orderBy(desc(speakingSubmissions.createdAt)).limit(20);
  return c.json({ submissions: rows.map((row) => ({ ...row.submission, title: row.title, feedback: parseFeedback(row.submission.feedbackJson) })) });
});

app.post('/recordings', async (c) => {
  const user = c.get('user'); const form = await c.req.parseBody();
  const recording = form.recording; const contentItemId = typeof form.contentItemId === 'string' ? form.contentItemId : '';
  if (form.consent !== 'true') return apiError(c, 400, 'Recording consent is required', 'BAD_REQUEST');
  if (!(recording instanceof File)) return apiError(c, 400, 'Audio recording is required', 'BAD_REQUEST');
  const allowed = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg'];
  if (!allowed.includes(recording.type)) return apiError(c, 400, 'Unsupported audio format', 'BAD_REQUEST');
  if (recording.size <= 0 || recording.size > 15 * 1024 * 1024) return apiError(c, 400, 'Recording must be smaller than 15 MB', 'BAD_REQUEST');
  const db = getDb(c.env.DB); const [prompt] = await db.select().from(contentItems).where(and(eq(contentItems.id, contentItemId), eq(contentItems.skill, 'speaking'), eq(contentItems.status, 'published'))).limit(1);
  if (!prompt) return apiError(c, 404, 'Speaking prompt not found', 'NOT_FOUND');
  const id = nanoid(); const now = new Date(); const extension = recording.type.includes('ogg') ? 'ogg' : recording.type.includes('mp4') ? 'm4a' : recording.type.includes('mpeg') ? 'mp3' : 'webm'; const objectKey = `speaking/${user.id}/${id}.${extension}`;
  await c.env.SPEAKING_RECORDINGS.put(objectKey, recording.stream(), { httpMetadata: { contentType: recording.type }, customMetadata: { userId: user.id, submissionId: id } });
  await db.insert(speakingSubmissions).values({ id, userId: user.id, contentItemId, objectKey, fileName: recording.name.slice(0, 200), mimeType: recording.type, sizeBytes: recording.size, durationSeconds: Number(form.durationSeconds) || null, consentedAt: now, createdAt: now, deleteAfter: addDays(now, 30) });
  return c.json({ submissionId: id, deleteAfter: addDays(now, 30) }, 201);
});

app.get('/recordings/:id', async (c) => {
  const [row] = await getDb(c.env.DB).select().from(speakingSubmissions).where(and(eq(speakingSubmissions.id, c.req.param('id')), eq(speakingSubmissions.userId, c.get('user').id))).limit(1);
  if (!row) return apiError(c, 404, 'Recording not found', 'NOT_FOUND');
  const object = await c.env.SPEAKING_RECORDINGS.get(row.objectKey); if (!object) return apiError(c, 404, 'Recording object not found', 'NOT_FOUND');
  return new Response(object.body, { headers: { 'Content-Type': row.mimeType, 'Cache-Control': 'private, no-store' } });
});

app.delete('/recordings/:id', async (c) => {
  const db = getDb(c.env.DB); const [row] = await db.select().from(speakingSubmissions).where(and(eq(speakingSubmissions.id, c.req.param('id')), eq(speakingSubmissions.userId, c.get('user').id))).limit(1);
  if (!row) return apiError(c, 404, 'Recording not found', 'NOT_FOUND');
  await c.env.SPEAKING_RECORDINGS.delete(row.objectKey); await db.delete(speakingSubmissions).where(eq(speakingSubmissions.id, row.id));
  return c.json({ ok: true });
});

export default app;

function parseFeedback(value: string | null) { try { return value ? JSON.parse(value) : null; } catch { return null; } }
