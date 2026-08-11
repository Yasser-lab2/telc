import { and, asc, desc, eq, gt, inArray } from 'drizzle-orm';
import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { getDb } from '../db';
import { attempts, contentItems, simulationBlueprints, simulationModuleResults, simulationModules, simulationSessions } from '../db/schema';
import { apiError } from '../lib/http';
import { syncProgressAfterCompletion } from '../lib/progress';
import { weightedSimulationPercentage } from '../lib/simulation';
import { authMiddleware } from '../middleware/auth';
import { subscriptionMiddleware } from '../middleware/subscription';
import type { Env } from '../types';

const app = new Hono<Env>();
app.use('*', authMiddleware, subscriptionMiddleware);

app.get('/', async (c) => {
  const simulations = await getDb(c.env.DB).select().from(simulationBlueprints).where(eq(simulationBlueprints.status, 'published')).orderBy(asc(simulationBlueprints.createdAt));
  return c.json({ simulations });
});

app.get('/sessions/active', async (c) => {
  const [session] = await getDb(c.env.DB).select().from(simulationSessions).where(and(eq(simulationSessions.userId, c.get('user').id), eq(simulationSessions.status, 'in_progress'))).orderBy(desc(simulationSessions.startedAt)).limit(1);
  if (!session) return c.json({ session: null });
  const loaded = await loadSession(c.env.DB, session.id, c.get('user').id);
  if (await expireIfNeeded(c.env.DB, loaded)) return c.json({ session: null });
  return c.json({ session: loaded });
});

app.get('/sessions/:id', async (c) => {
  const session = await loadSession(c.env.DB, c.req.param('id'), c.get('user').id);
  if (!session) return apiError(c, 404, 'Simulation session not found', 'NOT_FOUND');
  await expireIfNeeded(c.env.DB, session);
  return c.json({ session: await loadSession(c.env.DB, session.id, c.get('user').id), serverTime: new Date() });
});

app.get('/history/my', async (c) => {
  const rows = await getDb(c.env.DB).select({ id: simulationSessions.id, status: simulationSessions.status, startedAt: simulationSessions.startedAt, finishedAt: simulationSessions.finishedAt, percentage: simulationSessions.percentage, title: simulationBlueprints.title, level: simulationBlueprints.level }).from(simulationSessions).innerJoin(simulationBlueprints, eq(simulationSessions.simulationId, simulationBlueprints.id)).where(eq(simulationSessions.userId, c.get('user').id)).orderBy(desc(simulationSessions.startedAt)).limit(20);
  return c.json({ history: rows });
});

app.post('/:id/start', async (c) => {
  const user = c.get('user'); const db = getDb(c.env.DB);
  const [blueprint] = await db.select().from(simulationBlueprints).where(and(eq(simulationBlueprints.id, c.req.param('id')), eq(simulationBlueprints.status, 'published'))).limit(1);
  if (!blueprint) return apiError(c, 404, 'Simulation not found', 'NOT_FOUND');
  const [existing] = await db.select().from(simulationSessions).where(and(eq(simulationSessions.userId, user.id), eq(simulationSessions.status, 'in_progress'))).orderBy(desc(simulationSessions.startedAt)).limit(1);
  if (existing) return c.json({ session: await loadSession(c.env.DB, existing.id, user.id), resumed: true });
  const modules = await db.select().from(simulationModules).where(eq(simulationModules.simulationId, blueprint.id)).orderBy(asc(simulationModules.orderIndex));
  if (!modules.length) return apiError(c, 400, 'Simulation has no modules', 'BAD_REQUEST');
  const now = new Date(); const attemptId = nanoid(); const sessionId = nanoid();
  await db.insert(attempts).values({ id: attemptId, userId: user.id, contentItemId: `simulation:${blueprint.id}`, skill: 'simulation', mode: 'exam', status: 'in_progress', startedAt: now, lastSavedAt: now, elapsedSeconds: 0, stateVersion: 1 });
  await db.insert(simulationSessions).values({ id: sessionId, simulationId: blueprint.id, userId: user.id, attemptId, status: 'in_progress', startedAt: now, expiresAt: new Date(now.getTime() + blueprint.durationMinutes * 60_000) });
  await db.insert(simulationModuleResults).values(modules.map((module, index) => ({ id: nanoid(), sessionId, moduleId: module.id, status: (index === 0 ? 'available' : 'locked') as 'available' | 'locked' })));
  return c.json({ session: await loadSession(c.env.DB, sessionId, user.id), resumed: false }, 201);
});

app.post('/sessions/:id/modules/:moduleId/start', async (c) => {
  const user = c.get('user'); const session = await loadSession(c.env.DB, c.req.param('id'), user.id);
  if (!session) return apiError(c, 404, 'Simulation session not found', 'NOT_FOUND');
  if (await expireIfNeeded(c.env.DB, session)) return apiError(c, 400, 'Simulation time has expired', 'BAD_REQUEST');
  const target = session.modules.find((module) => module.id === c.req.param('moduleId'));
  if (!target) return apiError(c, 404, 'Simulation module not found', 'NOT_FOUND');
  if (!['available', 'in_progress'].includes(target.resultStatus)) return apiError(c, 400, 'Complete the preceding module first', 'BAD_REQUEST');
  if (target.resultStatus === 'available') await getDb(c.env.DB).update(simulationModuleResults).set({ status: 'in_progress', startedAt: new Date() }).where(eq(simulationModuleResults.id, target.resultId));
  return c.json({ launchPath: launchPath(target.skill, target.contentItemId, target.metadata), sessionId: session.id, moduleId: target.id });
});

app.post('/sessions/:id/modules/:moduleId/complete', async (c) => {
  const user = c.get('user'); const db = getDb(c.env.DB); const session = await loadSession(c.env.DB, c.req.param('id'), user.id);
  if (!session) return apiError(c, 404, 'Simulation session not found', 'NOT_FOUND');
  if (await expireIfNeeded(c.env.DB, session)) return apiError(c, 400, 'Simulation time has expired', 'BAD_REQUEST');
  const target = session.modules.find((module) => module.id === c.req.param('moduleId'));
  if (!target || target.resultStatus !== 'in_progress' || !target.moduleStartedAt) return apiError(c, 400, 'Start this module before completing it', 'BAD_REQUEST');
  const [child] = await db.select().from(attempts).where(and(eq(attempts.userId, user.id), eq(attempts.contentItemId, target.contentItemId), eq(attempts.status, 'completed'), gt(attempts.submittedAt, target.moduleStartedAt))).orderBy(desc(attempts.submittedAt)).limit(1);
  if (!child || child.percentage == null) return apiError(c, 400, 'Complete and submit the linked exercise first', 'BAD_REQUEST');
  const now = new Date();
  await db.update(simulationModuleResults).set({ status: 'completed', childAttemptId: child.id, completedAt: now, percentage: child.percentage }).where(eq(simulationModuleResults.id, target.resultId));
  const next = session.modules.find((module) => module.orderIndex === target.orderIndex + 1);
  if (next) {
    await db.update(simulationModuleResults).set({ status: 'available' }).where(eq(simulationModuleResults.id, next.resultId));
    return c.json({ completed: false, nextModuleId: next.id });
  }
  const completedResults = [...session.modules.filter((module) => module.resultStatus === 'completed'), { ...target, percentage: child.percentage }];
  const percentage = weightedSimulationPercentage(completedResults.map((module) => ({ percentage: Number(module.percentage ?? 0), weight: module.weight })));
  await db.update(simulationSessions).set({ status: 'completed', finishedAt: now, percentage }).where(eq(simulationSessions.id, session.id));
  await db.update(attempts).set({ status: 'completed', submittedAt: now, lastSavedAt: now, scoreObtained: percentage, scoreMax: 100, percentage, elapsedSeconds: Math.max(0, Math.round((now.getTime() - session.startedAt.getTime()) / 1000)) }).where(eq(attempts.id, session.attemptId));
  await syncProgressAfterCompletion(c.env.DB, { userId: user.id, attemptId: session.attemptId, skill: 'simulation', level: session.level });
  return c.json({ completed: true, percentage });
});

async function expireIfNeeded(dbBinding: D1Database, session: Awaited<ReturnType<typeof loadSession>>) {
  if (!session || session.status !== 'in_progress' || session.expiresAt > new Date()) return false;
  const db = getDb(dbBinding); await db.update(simulationSessions).set({ status: 'expired', finishedAt: new Date() }).where(eq(simulationSessions.id, session.id)); await db.update(attempts).set({ status: 'abandoned', lastSavedAt: new Date() }).where(eq(attempts.id, session.attemptId)); return true;
}

async function loadSession(dbBinding: D1Database, id: string, userId: string) {
  const db = getDb(dbBinding);
  const [session] = await db.select({ session: simulationSessions, title: simulationBlueprints.title, level: simulationBlueprints.level, durationMinutes: simulationBlueprints.durationMinutes }).from(simulationSessions).innerJoin(simulationBlueprints, eq(simulationSessions.simulationId, simulationBlueprints.id)).where(and(eq(simulationSessions.id, id), eq(simulationSessions.userId, userId))).limit(1);
  if (!session) return null;
  const rows = await db.select({ module: simulationModules, result: simulationModuleResults, content: { title: contentItems.title, metadataJson: contentItems.metadataJson } }).from(simulationModuleResults).innerJoin(simulationModules, eq(simulationModuleResults.moduleId, simulationModules.id)).innerJoin(contentItems, eq(simulationModules.contentItemId, contentItems.id)).where(eq(simulationModuleResults.sessionId, id)).orderBy(asc(simulationModules.orderIndex));
  return { ...session.session, title: session.title, level: session.level, durationMinutes: session.durationMinutes, modules: rows.map((row) => ({ ...row.module, title: row.content.title, metadata: parseObject(row.content.metadataJson), resultId: row.result.id, resultStatus: row.result.status, moduleStartedAt: row.result.startedAt, percentage: row.result.percentage })) };
}

function launchPath(skill: string, contentItemId: string, metadata: Record<string, unknown>) { if (skill === 'reading') return `/dashboard/lesen/${String(metadata.legacyReadingExamId ?? contentItemId.replace('legacy-reading:', ''))}`; if (skill === 'listening') return `/dashboard/horen/${contentItemId}`; return `/dashboard/schreiben/${contentItemId}`; }
function parseObject(value: string | null): Record<string, unknown> { try { const parsed = value ? JSON.parse(value) : {}; return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}; } catch { return {}; } }

export default app;
