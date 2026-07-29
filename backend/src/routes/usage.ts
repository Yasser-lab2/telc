import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { getDb } from '../db';
import { usageLimits } from '../db/schema';
import { todayKey } from '../lib/time';
import { getCurrentPlan } from '../lib/subscriptions';
import { authMiddleware } from '../middleware/auth';
import type { Env } from '../types';

const app = new Hono<Env>();

app.get('/', authMiddleware, async (c) => {
  const user = c.get('user');
  const planRow = await getCurrentPlan(c.env.DB, user.id);
  const limit = planRow?.plan.aiCreditsPerDay ?? 1;
  const today = todayKey();
  const [usage] = await getDb(c.env.DB)
    .select()
    .from(usageLimits)
    .where(and(eq(usageLimits.userId, user.id), eq(usageLimits.date, today)))
    .limit(1);

  const used = usage?.aiCreditsUsed ?? 0;
  return c.json({ limit, used, remaining: Math.max(0, limit - used), date: today });
});

export default app;
