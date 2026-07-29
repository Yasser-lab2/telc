import { and, count, eq, gt, sql, sum } from 'drizzle-orm';
import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { getDb } from '../db';
import { aiSubmissions, manualPayments, plans, subscriptions, usageLimits, users } from '../db/schema';
import { apiError } from '../lib/http';
import { addDays, todayKey } from '../lib/time';
import { adminMiddleware } from '../middleware/admin';
import { authMiddleware } from '../middleware/auth';
import type { Env } from '../types';

const app = new Hono<Env>();

app.use('*', authMiddleware, adminMiddleware);

app.get('/payments/pending', async (c) => {
  const db = getDb(c.env.DB);
  const rows = await db
    .select({
      payment: manualPayments,
      plan: plans,
      user: {
        id: users.id,
        email: users.email,
        displayName: users.displayName,
      },
    })
    .from(manualPayments)
    .innerJoin(plans, eq(manualPayments.planId, plans.id))
    .innerJoin(users, eq(manualPayments.userId, users.id))
    .where(eq(manualPayments.status, 'pending'));

  return c.json({ payments: rows });
});

app.post('/payments/:id/approve', async (c) => {
  const admin = c.get('user');
  const db = getDb(c.env.DB);
  const paymentId = c.req.param('id');
  const [row] = await db
    .select({ payment: manualPayments, plan: plans })
    .from(manualPayments)
    .innerJoin(plans, eq(manualPayments.planId, plans.id))
    .where(and(eq(manualPayments.id, paymentId), eq(manualPayments.status, 'pending')))
    .limit(1);

  if (!row) return apiError(c, 404, 'Pending payment not found', 'NOT_FOUND');

  const now = new Date();
  const expiresAt = addDays(now, row.plan.durationDays);
  await db.update(manualPayments).set({
    status: 'approved',
    approvedAt: now,
    approvedByAdmin: admin.id,
  }).where(eq(manualPayments.id, paymentId));

  await db.insert(subscriptions).values({
    id: nanoid(),
    userId: row.payment.userId,
    planId: row.plan.id,
    paymentId,
    status: 'active',
    startsAt: now,
    expiresAt,
    createdAt: now,
  });

  await db.insert(usageLimits).values({
    id: nanoid(),
    userId: row.payment.userId,
    date: todayKey(now),
    aiCreditsUsed: 0,
    updatedAt: now,
  }).onConflictDoUpdate({
    target: [usageLimits.userId, usageLimits.date],
    set: { aiCreditsUsed: 0, updatedAt: now },
  });

  return c.json({ ok: true, expiresAt });
});

app.post('/payments/:id/reject', async (c) => {
  const db = getDb(c.env.DB);
  const result = await db.update(manualPayments).set({ status: 'rejected' }).where(eq(manualPayments.id, c.req.param('id')));
  return c.json({ ok: true, result });
});

app.get('/stats', async (c) => {
  const db = getDb(c.env.DB);
  const now = new Date();
  const [[totalUsers], [activeSubs], [expiredSubs], [trialSubs], [aiToday]] = await Promise.all([
    db.select({ value: count() }).from(users),
    db.select({ value: count() }).from(subscriptions).where(and(eq(subscriptions.status, 'active'), gt(subscriptions.expiresAt, now))),
    db.select({ value: count() }).from(subscriptions).where(sql`${subscriptions.expiresAt} <= ${now}`),
    db.select({ value: count() }).from(subscriptions).where(and(eq(subscriptions.status, 'trial'), gt(subscriptions.expiresAt, now))),
    db.select({ value: sum(usageLimits.aiCreditsUsed) }).from(usageLimits).where(eq(usageLimits.date, todayKey(now))),
  ]);

  return c.json({
    totalUsers: totalUsers.value,
    activeSubscriptions: activeSubs.value,
    expiredSubscriptions: expiredSubs.value,
    trialSubscriptions: trialSubs.value,
    aiUsageToday: Number(aiToday.value ?? 0),
  });
});

export default app;
