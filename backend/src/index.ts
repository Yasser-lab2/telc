import { and, eq, gt, inArray } from 'drizzle-orm';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getDb } from './db';
import { plans, subscriptions } from './db/schema';
import { publicUser } from './lib/http';
import adminReadingRoutes from './routes/admin-reading';
import adminRoutes from './routes/admin';
import aiRoutes from './routes/ai';
import authRoutes from './routes/auth';
import horenRoutes from './routes/horen';
import lesenRoutes from './routes/lesen';
import paymentsRoutes from './routes/payments';
import plansRoutes from './routes/plans';
import readingRoutes from './routes/reading';
import schreibenRoutes from './routes/schreiben';
import usageRoutes from './routes/usage';
import contentRoutes from './routes/content';
import progressRoutes from './routes/progress';
import adminContentRoutes from './routes/admin-content';
import adminSimulationRoutes from './routes/admin-simulations';
import simulationRoutes from './routes/simulations';
import speakingRoutes from './routes/speaking';
import adminSpeakingRoutes from './routes/admin-speaking';
import growthRoutes from './routes/growth';
import { sendDueSimulationReminders } from './lib/reminders';
import { authMiddleware } from './middleware/auth';
import type { Env } from './types';
import { purgeExpiredSpeakingRecordings } from './lib/speaking-retention';

export const app = new Hono<Env>();

app.use('*', async (c, next) => {
  const incomingId = c.req.header('X-Request-ID');
  const requestId = incomingId && /^[a-zA-Z0-9._-]{8,100}$/.test(incomingId) ? incomingId : crypto.randomUUID();
  const startedAt = Date.now();
  c.set('requestId', requestId);
  c.header('X-Request-ID', requestId);
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Permissions-Policy', 'camera=(), geolocation=(), microphone=(self)');
  try {
    await next();
  } finally {
    console.log(JSON.stringify({ event: 'http_request', requestId, method: c.req.method, path: new URL(c.req.url).pathname, status: c.res.status, durationMs: Date.now() - startedAt }));
  }
});

app.use(
  '*',
  cors({
    origin: (origin, c) => origin || c.env.APP_URL,
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
    exposeHeaders: ['X-Request-ID'],
  }),
);

app.get('/api/health/live', (c) => c.json({ ok: true, status: 'alive', checkedAt: new Date().toISOString() }));
app.get('/api/health', async (c) => {
  try {
    await c.env.DB.prepare('SELECT 1 AS ready').first();
    return c.json({ ok: true, status: 'ready', dependencies: { database: 'ready' }, checkedAt: new Date().toISOString() });
  } catch (error) {
    console.error(JSON.stringify({ event: 'health_dependency_failed', requestId: c.get('requestId'), dependency: 'database', message: error instanceof Error ? error.message : 'Unknown error' }));
    return c.json({ ok: false, status: 'degraded', dependencies: { database: 'unavailable' }, requestId: c.get('requestId'), checkedAt: new Date().toISOString() }, 503);
  }
});

app.get('/api/me', authMiddleware, async (c) => {
  const user = c.get('user');
  const db = getDb(c.env.DB);
  const [sub] = await db
    .select({ subscription: subscriptions, plan: plans })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .where(
      and(
        eq(subscriptions.userId, user.id),
        inArray(subscriptions.status, ['trial', 'active']),
        gt(subscriptions.expiresAt, new Date()),
      ),
    )
    .limit(1);

  return c.json({
    user: publicUser(user),
    subscription: sub
      ? {
          isActive: true,
          status: sub.subscription.status,
          planId: sub.plan.id,
          planName: sub.plan.name,
          expiresAt: sub.subscription.expiresAt,
          aiCreditsPerDay: sub.plan.aiCreditsPerDay,
        }
      : { isActive: false },
  });
});

app.route('/api/auth', authRoutes);
app.route('/api/plans', plansRoutes);
app.route('/api/payments', paymentsRoutes);
app.route('/api/admin/reading', adminReadingRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/usage', usageRoutes);
app.route('/api/ai', aiRoutes);
app.route('/api/reading', readingRoutes);
app.route('/api/lesen', lesenRoutes);
app.route('/api/horen', horenRoutes);
app.route('/api/schreiben', schreibenRoutes);
app.route('/api/content', contentRoutes);
app.route('/api/progress', progressRoutes);
app.route('/api/admin/content', adminContentRoutes);
app.route('/api/admin/simulations', adminSimulationRoutes);
app.route('/api/simulations', simulationRoutes);
app.route('/api/speaking', speakingRoutes);
app.route('/api/admin/speaking', adminSpeakingRoutes);
app.route('/api/growth', growthRoutes);

app.notFound((c) => c.json({ error: 'Not found', code: 'NOT_FOUND', requestId: c.get('requestId') }, 404));

app.onError((error, c) => {
  const requestId = c.get('requestId') || crypto.randomUUID();
  console.error(JSON.stringify({ event: 'unhandled_error', requestId, method: c.req.method, path: new URL(c.req.url).pathname, errorName: error.name, message: error.message, stack: error.stack }));
  return c.json({ error: 'An unexpected error occurred', code: 'INTERNAL_ERROR', requestId }, 500);
});

const worker: ExportedHandler<Env['Bindings']> = {
  fetch: (request, env, context) => app.fetch(request, env, context),
  scheduled: (_controller, env, context) => {
    context.waitUntil(Promise.all([purgeExpiredSpeakingRecordings(env), sendDueSimulationReminders(env)]).then(([retention, reminders]) => console.log(JSON.stringify({ event: 'scheduled_maintenance_completed', retention, reminders }))).catch((error) => console.error(JSON.stringify({ event: 'scheduled_maintenance_failed', message: error instanceof Error ? error.message : 'Unknown error' }))));
  },
};

export default worker;
