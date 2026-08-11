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
import { authMiddleware } from './middleware/auth';
import type { Env } from './types';

const app = new Hono<Env>();

app.use(
  '*',
  cors({
    origin: (origin, c) => origin || c.env.APP_URL,
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
  }),
);

app.get('/api/health', (c) => c.json({ ok: true }));

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

app.notFound((c) => c.json({ error: 'Not found', code: 'NOT_FOUND' }, 404));

export default app;
