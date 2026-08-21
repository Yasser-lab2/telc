import { and, count, desc, eq, gte, inArray, isNull } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { getDb } from '../db';
import { activityEvents, attempts, contentItems, dismissedRecommendations, learnerProgress, mistakeItems, studyGoals, userPreferences } from '../db/schema';
import { authMiddleware } from '../middleware/auth';
import { subscriptionMiddleware } from '../middleware/subscription';
import type { Env } from '../types';
import { calculateReadiness } from '../lib/readiness';

const app = new Hono<Env>();
app.use('*', authMiddleware, subscriptionMiddleware);

app.get('/', async (c) => {
  const user = c.get('user');
  const db = getDb(c.env.DB);
  const progress = await db.select().from(learnerProgress).where(eq(learnerProgress.userId, user.id));
  const startOfWeek = new Date();
  startOfWeek.setUTCHours(0, 0, 0, 0);
  startOfWeek.setUTCDate(startOfWeek.getUTCDate() - ((startOfWeek.getUTCDay() + 6) % 7));
  const [[storedGoal], [weeklyCompleted], mistakes, trends, [preferences]] = await Promise.all([
    db.select().from(studyGoals).where(eq(studyGoals.userId, user.id)).limit(1),
    db.select({ value: count() }).from(activityEvents).where(and(eq(activityEvents.userId, user.id), eq(activityEvents.eventType, 'attempt_completed'), gte(activityEvents.occurredAt, startOfWeek))),
    db.select({ mistake: mistakeItems, title: contentItems.title }).from(mistakeItems).innerJoin(contentItems, eq(mistakeItems.contentItemId, contentItems.id)).where(eq(mistakeItems.userId, user.id)).orderBy(desc(mistakeItems.lastSeenAt)).limit(20),
    db.select({ id: attempts.id, skill: attempts.skill, percentage: attempts.percentage, submittedAt: attempts.submittedAt, title: contentItems.title }).from(attempts).innerJoin(contentItems, eq(attempts.contentItemId, contentItems.id)).where(and(eq(attempts.userId, user.id), eq(attempts.status, 'completed'))).orderBy(desc(attempts.submittedAt)).limit(20),
    db.select().from(userPreferences).where(eq(userPreferences.userId, user.id)).limit(1),
  ]);
  const weakest = [...progress].filter((item) => item.skill !== 'simulation').sort((a, b) => Number(a.averagePercentage ?? 0) - Number(b.averagePercentage ?? 0))[0];
  const levels: Array<'B1' | 'B2'> = user.niveau === 'B1_B2' ? ['B1', 'B2'] : [user.niveau === 'B2' ? 'B2' : 'B1'];
  const recommendations = preferences?.personalizedRecommendations === false ? [] : await db.select({ id: contentItems.id, title: contentItems.title, skill: contentItems.skill, level: contentItems.level, difficulty: contentItems.difficulty, metadataJson: contentItems.metadataJson })
    .from(contentItems).leftJoin(dismissedRecommendations, and(eq(dismissedRecommendations.userId, user.id), eq(dismissedRecommendations.contentItemId, contentItems.id)))
    .where(and(eq(contentItems.status, 'published'), inArray(contentItems.level, levels), weakest ? eq(contentItems.skill, weakest.skill) : inArray(contentItems.skill, ['reading', 'listening', 'writing']), isNull(dismissedRecommendations.contentItemId))).limit(3);
  const recentActivity = await db
    .select({
      id: activityEvents.id, eventType: activityEvents.eventType, occurredAt: activityEvents.occurredAt,
      skill: attempts.skill, score: attempts.percentage, title: contentItems.title, contentItemId: contentItems.id,
    })
    .from(activityEvents)
    .innerJoin(attempts, eq(activityEvents.entityId, attempts.id))
    .innerJoin(contentItems, eq(attempts.contentItemId, contentItems.id))
    .where(eq(activityEvents.userId, user.id))
    .orderBy(desc(activityEvents.occurredAt))
    .limit(5);
  return c.json({
    progress, recentActivity, readiness: calculateReadiness(progress), trends,
    studyGoal: { weeklyTarget: storedGoal?.weeklyTarget ?? 3, completed: weeklyCompleted.value, weekStartsAt: startOfWeek },
    mistakes: mistakes.map((row) => ({ ...row.mistake, contentTitle: row.title })),
    recommendations: recommendations.map((item) => ({ ...item, route: contentRoute(item.skill, item.id, item.metadataJson), reason: weakest ? `Votre moyenne en ${weakest.skill} est la plus faible (${Math.round(Number(weakest.averagePercentage ?? 0))} %).` : 'Commencez cette compétence pour construire votre diagnostic.' })),
  });
});

app.patch('/study-goal', async (c) => {
  const parsed = z.object({ weeklyTarget: z.number().int().min(1).max(14) }).safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Weekly target must be between 1 and 14', code: 'BAD_REQUEST' }, 400);
  const now = new Date(); const userId = c.get('user').id;
  await getDb(c.env.DB).insert(studyGoals).values({ userId, weeklyTarget: parsed.data.weeklyTarget, updatedAt: now }).onConflictDoUpdate({ target: studyGoals.userId, set: { weeklyTarget: parsed.data.weeklyTarget, updatedAt: now } });
  return c.json({ ok: true });
});

app.patch('/mistakes/:id', async (c) => {
  const parsed = z.object({ reviewed: z.boolean() }).safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Invalid review state', code: 'BAD_REQUEST' }, 400);
  await getDb(c.env.DB).update(mistakeItems).set({ status: parsed.data.reviewed ? 'reviewed' : 'open', reviewedAt: parsed.data.reviewed ? new Date() : null }).where(and(eq(mistakeItems.id, c.req.param('id')), eq(mistakeItems.userId, c.get('user').id)));
  return c.json({ ok: true });
});

app.post('/recommendations/:contentId/dismiss', async (c) => {
  const userId = c.get('user').id; const contentItemId = c.req.param('contentId');
  await getDb(c.env.DB).insert(dismissedRecommendations).values({ userId, contentItemId, dismissedAt: new Date() }).onConflictDoNothing({ target: [dismissedRecommendations.userId, dismissedRecommendations.contentItemId] });
  return c.json({ ok: true });
});

function contentRoute(skill: string, id: string, metadataJson: string | null) {
  if (skill === 'reading') { try { const legacy = JSON.parse(metadataJson ?? '{}').legacyReadingExamId; return `/dashboard/lesen/${legacy ?? id.replace('legacy-reading:', '')}`; } catch { return '/dashboard/lesen'; } }
  if (skill === 'listening') return `/dashboard/horen/${id}`;
  if (skill === 'writing') return `/dashboard/schreiben/${id}`;
  return '/dashboard/simulation';
}

export default app;
