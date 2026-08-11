import { and, count, desc, eq, gt, inArray, like, lte, or, sql, sum } from 'drizzle-orm';
import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { getDb } from '../db';
import { activityEvents, adminAuditLogs, aiSubmissions, attempts, contentItems, learnerProgress, manualPayments, paymentStatusEvents, plans, subscriptions, usageLimits, users } from '../db/schema';
import { apiError } from '../lib/http';
import { addDays, todayKey } from '../lib/time';
import { adminMiddleware, requirePermission } from '../middleware/admin';
import { authMiddleware } from '../middleware/auth';
import type { Env } from '../types';

const app = new Hono<Env>();

app.use('*', authMiddleware, adminMiddleware);

app.get('/payments/pending', requirePermission('payments.review'), async (c) => {
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

app.post('/payments/:id/approve', requirePermission('payments.review'), async (c) => {
  const admin = c.get('user');
  const db = getDb(c.env.DB);
  const paymentId = c.req.param('id');
  const [row] = await db
    .select({ payment: manualPayments, plan: plans })
    .from(manualPayments)
    .innerJoin(plans, eq(manualPayments.planId, plans.id))
    .where(eq(manualPayments.id, paymentId))
    .limit(1);

  if (!row) return apiError(c, 404, 'Payment not found', 'NOT_FOUND');
  if (row.payment.status === 'approved') {
    const [existingSubscription] = await db.select().from(subscriptions).where(eq(subscriptions.paymentId, paymentId)).limit(1);
    if (existingSubscription) {
      return c.json({ ok: true, expiresAt: existingSubscription.expiresAt, alreadyProcessed: true });
    }

    // Recover approvals that were interrupted after the payment update but
    // before the subscription was created.
    const startsAt = row.payment.approvedAt ?? row.payment.reviewedAt ?? new Date();
    const expiresAt = addDays(startsAt, row.plan.durationDays);
    await db.insert(subscriptions).values({
      id: nanoid(),
      userId: row.payment.userId,
      planId: row.plan.id,
      paymentId,
      status: 'active',
      startsAt,
      expiresAt,
      createdAt: new Date(),
    }).onConflictDoNothing({ target: subscriptions.paymentId });
    await audit(c.env.DB, admin.id, 'payment.approval_recovered', 'payment', paymentId, {
      userId: row.payment.userId,
      planId: row.plan.id,
      expiresAt,
    });

    return c.json({ ok: true, expiresAt, alreadyProcessed: true, recovered: true });
  }
  if (row.payment.status !== 'pending') return apiError(c, 400, 'Only pending payments can be approved', 'BAD_REQUEST');
  if (!row.payment.proofObjectKey) return apiError(c, 400, 'Payment proof is required before approval', 'BAD_REQUEST');

  const now = new Date();
  const expiresAt = addDays(now, row.plan.durationDays);
  await db.update(manualPayments).set({
    status: 'approved',
    approvedAt: now,
    reviewedAt: now,
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
  }).onConflictDoNothing({ target: subscriptions.paymentId });
  await db.insert(paymentStatusEvents).values({ id: nanoid(), paymentId, status: 'approved', note: 'Payment approved', actorUserId: admin.id, createdAt: now });
  await audit(c.env.DB, admin.id, 'payment.approved', 'payment', paymentId, { userId: row.payment.userId, planId: row.plan.id, expiresAt });

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

  return c.json({ ok: true, expiresAt, alreadyProcessed: false });
});

const rejectionSchema = z.object({ reason: z.string().min(3).max(500) });
app.post('/payments/:id/reject', requirePermission('payments.review'), async (c) => {
  const admin = c.get('user');
  const body = rejectionSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return apiError(c, 400, 'A rejection reason is required', 'BAD_REQUEST');
  const db = getDb(c.env.DB);
  const paymentId = c.req.param('id');
  const [payment] = await db.select().from(manualPayments).where(eq(manualPayments.id, paymentId)).limit(1);
  if (!payment) return apiError(c, 404, 'Payment not found', 'NOT_FOUND');
  if (payment.status === 'rejected') return c.json({ ok: true, alreadyProcessed: true });
  if (payment.status !== 'pending') return apiError(c, 400, 'Only pending payments can be rejected', 'BAD_REQUEST');
  const now = new Date();
  await db.update(manualPayments).set({ status: 'rejected', rejectionReason: body.data.reason, reviewedAt: now, approvedByAdmin: admin.id }).where(and(eq(manualPayments.id, paymentId), eq(manualPayments.status, 'pending')));
  await db.insert(paymentStatusEvents).values({ id: nanoid(), paymentId, status: 'rejected', note: body.data.reason, actorUserId: admin.id, createdAt: now });
  await audit(c.env.DB, admin.id, 'payment.rejected', 'payment', paymentId, { userId: payment.userId, reason: body.data.reason });
  return c.json({ ok: true, alreadyProcessed: false });
});

app.get('/payments/:id/proof', requirePermission('payments.review'), async (c) => {
  const [payment] = await getDb(c.env.DB).select().from(manualPayments).where(eq(manualPayments.id, c.req.param('id'))).limit(1);
  if (!payment?.proofObjectKey) return apiError(c, 404, 'Payment proof not found', 'NOT_FOUND');
  const object = await c.env.PAYMENT_PROOFS.get(payment.proofObjectKey);
  if (!object) return apiError(c, 404, 'Payment proof object not found', 'NOT_FOUND');
  return new Response(object.body, { headers: { 'Content-Type': payment.proofMimeType ?? 'application/octet-stream', 'Content-Disposition': `inline; filename="${(payment.proofFileName ?? 'proof').replace(/["\r\n]/g, '')}"`, 'Cache-Control': 'private, no-store' } });
});

app.get('/stats', requirePermission('analytics.view'), async (c) => {
  const db = getDb(c.env.DB);
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);
  const startOfToday = new Date(now); startOfToday.setUTCHours(0, 0, 0, 0);
  const [
    [totalUsers], [newUsers7d], [activeLearners7d], [attemptsStarted7d], [attemptsCompleted7d], [averageScore7d],
    [activeSubs], [trialSubs], [expiredUsers], [pendingPayments], [approvedPayments30d], [rejectedPayments30d],
    [revenue30d], [averageReviewHours], [aiToday], [aiLatency7d], [publishedContent], [draftContent],
  ] = await Promise.all([
    db.select({ value: count() }).from(users),
    db.select({ value: count() }).from(users).where(gt(users.createdAt, sevenDaysAgo)),
    db.select({ value: sql<number>`count(distinct ${activityEvents.userId})` }).from(activityEvents).where(gt(activityEvents.occurredAt, sevenDaysAgo)),
    db.select({ value: count() }).from(attempts).where(gt(attempts.startedAt, sevenDaysAgo)),
    db.select({ value: count() }).from(attempts).where(and(eq(attempts.status, 'completed'), gt(attempts.startedAt, sevenDaysAgo))),
    db.select({ value: sql<number | null>`avg(${attempts.percentage})` }).from(attempts).where(and(eq(attempts.status, 'completed'), gt(attempts.startedAt, sevenDaysAgo))),
    db.select({ value: count() }).from(subscriptions).where(and(eq(subscriptions.status, 'active'), gt(subscriptions.expiresAt, now))),
    db.select({ value: count() }).from(subscriptions).where(and(eq(subscriptions.status, 'trial'), gt(subscriptions.expiresAt, now))),
    db.select({ value: sql<number>`count(distinct ${subscriptions.userId})` }).from(subscriptions).where(lte(subscriptions.expiresAt, now)),
    db.select({ value: count() }).from(manualPayments).where(eq(manualPayments.status, 'pending')),
    db.select({ value: count() }).from(manualPayments).where(and(eq(manualPayments.status, 'approved'), gt(manualPayments.reviewedAt, thirtyDaysAgo))),
    db.select({ value: count() }).from(manualPayments).where(and(eq(manualPayments.status, 'rejected'), gt(manualPayments.reviewedAt, thirtyDaysAgo))),
    db.select({ value: sum(manualPayments.amountMad) }).from(manualPayments).where(and(eq(manualPayments.status, 'approved'), gt(manualPayments.reviewedAt, thirtyDaysAgo))),
    db.select({ value: sql<number | null>`avg((${manualPayments.reviewedAt} - ${manualPayments.createdAt}) / 3600.0)` }).from(manualPayments).where(and(inArray(manualPayments.status, ['approved', 'rejected']), gt(manualPayments.reviewedAt, thirtyDaysAgo))),
    db.select({ value: count() }).from(aiSubmissions).where(gt(aiSubmissions.submittedAt, startOfToday)),
    db.select({ value: sql<number | null>`avg(${aiSubmissions.latencyMs})` }).from(aiSubmissions).where(gt(aiSubmissions.submittedAt, sevenDaysAgo)),
    db.select({ value: count() }).from(contentItems).where(eq(contentItems.status, 'published')),
    db.select({ value: count() }).from(contentItems).where(eq(contentItems.status, 'draft')),
  ]);

  return c.json({
    generatedAt: now.toISOString(),
    overview: { totalUsers: totalUsers.value, newUsers7d: newUsers7d.value, activeLearners7d: activeLearners7d.value },
    learning: {
      attemptsStarted7d: attemptsStarted7d.value,
      attemptsCompleted7d: attemptsCompleted7d.value,
      completionRate7d: attemptsStarted7d.value ? Math.round((attemptsCompleted7d.value / attemptsStarted7d.value) * 1000) / 10 : 0,
      averageScore7d: Math.round(Number(averageScore7d.value ?? 0) * 10) / 10,
    },
    subscriptions: { active: activeSubs.value, trial: trialSubs.value, usersWithExpiredHistory: expiredUsers.value },
    payments: { pending: pendingPayments.value, approved30d: approvedPayments30d.value, rejected30d: rejectedPayments30d.value, revenueMad30d: Number(revenue30d.value ?? 0), averageReviewHours30d: Math.round(Number(averageReviewHours.value ?? 0) * 10) / 10 },
    ai: { submissionsToday: aiToday.value, averageLatencyMs7d: Math.round(Number(aiLatency7d.value ?? 0)) },
    content: { published: publishedContent.value, drafts: draftContent.value },
  });
});

app.get('/users', requirePermission('users.view'), async (c) => {
  const query = (c.req.query('q') ?? '').trim().slice(0, 100);
  const db = getDb(c.env.DB);
  const rows = await db.select({
    id: users.id, email: users.email, displayName: users.displayName, niveau: users.niveau, role: users.role,
    createdAt: users.createdAt, lastSeenAt: users.lastSeenAt,
    completedAttempts: sql<number>`(SELECT COUNT(*) FROM attempts WHERE attempts.user_id = ${users.id} AND attempts.status = 'completed')`,
  }).from(users).where(query ? or(like(users.email, `%${query}%`), like(users.displayName, `%${query}%`)) : undefined).orderBy(desc(users.createdAt)).limit(50);
  const enriched = await Promise.all(rows.map(async (user) => {
    const current = await getCurrentAdminSubscription(c.env.DB, user.id);
    return { ...user, subscription: current };
  }));
  return c.json({ users: enriched });
});

app.get('/users/:id', requirePermission('users.view'), async (c) => {
  const db = getDb(c.env.DB);
  const [user] = await db.select({ id: users.id, email: users.email, displayName: users.displayName, niveau: users.niveau, role: users.role, createdAt: users.createdAt, lastSeenAt: users.lastSeenAt }).from(users).where(eq(users.id, c.req.param('id'))).limit(1);
  if (!user) return apiError(c, 404, 'User not found', 'NOT_FOUND');
  const [subscriptionRows, paymentRows, progressRows, recentActivity] = await Promise.all([
    db.select({ subscription: subscriptions, plan: plans }).from(subscriptions).innerJoin(plans, eq(subscriptions.planId, plans.id)).where(eq(subscriptions.userId, user.id)).orderBy(desc(subscriptions.createdAt)),
    db.select({ payment: manualPayments, plan: plans }).from(manualPayments).innerJoin(plans, eq(manualPayments.planId, plans.id)).where(eq(manualPayments.userId, user.id)).orderBy(desc(manualPayments.createdAt)).limit(20),
    db.select().from(learnerProgress).where(eq(learnerProgress.userId, user.id)),
    db.select({ id: activityEvents.id, occurredAt: activityEvents.occurredAt, eventType: activityEvents.eventType, skill: attempts.skill, title: contentItems.title, percentage: attempts.percentage }).from(activityEvents).innerJoin(attempts, eq(activityEvents.entityId, attempts.id)).innerJoin(contentItems, eq(attempts.contentItemId, contentItems.id)).where(eq(activityEvents.userId, user.id)).orderBy(desc(activityEvents.occurredAt)).limit(10),
  ]);
  return c.json({ user, subscriptions: subscriptionRows, payments: paymentRows, progress: progressRows, recentActivity });
});

const updateUserSchema = z.object({ displayName: z.string().min(2).max(80).optional(), niveau: z.enum(['B1', 'B2', 'B1_B2']).optional(), role: z.enum(['student', 'support', 'content_editor', 'admin']).optional() }).refine((value) => Object.keys(value).length > 0);
app.patch('/users/:id', requirePermission('users.manage'), async (c) => {
  const actor = c.get('user');
  const body = updateUserSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return apiError(c, 400, 'Invalid user update', 'BAD_REQUEST');
  const db = getDb(c.env.DB);
  const [target] = await db.select().from(users).where(eq(users.id, c.req.param('id'))).limit(1);
  if (!target) return apiError(c, 404, 'User not found', 'NOT_FOUND');
  if (body.data.role && body.data.role !== target.role) {
    if (actor.email.toLowerCase() !== c.env.ADMIN_EMAIL.toLowerCase()) return apiError(c, 403, 'Only the configured owner admin can change roles', 'FORBIDDEN');
    if (actor.id === target.id) return apiError(c, 400, 'You cannot change your own admin role', 'BAD_REQUEST');
  }
  await db.update(users).set(body.data).where(eq(users.id, target.id));
  await audit(c.env.DB, actor.id, 'user.updated', 'user', target.id, body.data);
  return c.json({ ok: true });
});

const extensionSchema = z.object({ days: z.number().int().min(1).max(365), planId: z.string().min(1).optional() });
app.post('/users/:id/subscription/extend', requirePermission('subscriptions.manage'), async (c) => {
  const actor = c.get('user');
  const body = extensionSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return apiError(c, 400, 'Invalid subscription extension', 'BAD_REQUEST');
  const db = getDb(c.env.DB);
  const [target] = await db.select({ id: users.id }).from(users).where(eq(users.id, c.req.param('id'))).limit(1);
  if (!target) return apiError(c, 404, 'User not found', 'NOT_FOUND');
  const [current] = await db.select().from(subscriptions).where(and(eq(subscriptions.userId, target.id), inArray(subscriptions.status, ['trial', 'active']))).orderBy(desc(subscriptions.expiresAt)).limit(1);
  const now = new Date();
  if (current) {
    const base = current.expiresAt > now ? current.expiresAt : now;
    const expiresAt = addDays(base, body.data.days);
    await db.update(subscriptions).set({ status: 'active', expiresAt }).where(eq(subscriptions.id, current.id));
    await audit(c.env.DB, actor.id, 'subscription.extended', 'user', target.id, { subscriptionId: current.id, days: body.data.days, expiresAt });
    return c.json({ ok: true, expiresAt });
  }
  if (!body.data.planId) return apiError(c, 400, 'planId is required when the user has no subscription', 'BAD_REQUEST');
  const [plan] = await db.select().from(plans).where(and(eq(plans.id, body.data.planId), eq(plans.isActive, true))).limit(1);
  if (!plan) return apiError(c, 404, 'Plan not found', 'NOT_FOUND');
  const expiresAt = addDays(now, body.data.days);
  const subscriptionId = nanoid();
  await db.insert(subscriptions).values({ id: subscriptionId, userId: target.id, planId: plan.id, status: 'active', startsAt: now, expiresAt, createdAt: now });
  await audit(c.env.DB, actor.id, 'subscription.created', 'user', target.id, { subscriptionId, planId: plan.id, days: body.data.days, expiresAt });
  return c.json({ ok: true, expiresAt });
});

app.post('/users/:id/subscription/cancel', requirePermission('subscriptions.manage'), async (c) => {
  const actor = c.get('user');
  const db = getDb(c.env.DB);
  const [target] = await db.select({ id: users.id }).from(users).where(eq(users.id, c.req.param('id'))).limit(1);
  if (!target) return apiError(c, 404, 'User not found', 'NOT_FOUND');
  await db.update(subscriptions).set({ status: 'cancelled' }).where(and(eq(subscriptions.userId, c.req.param('id')), inArray(subscriptions.status, ['trial', 'active'])));
  await audit(c.env.DB, actor.id, 'subscription.cancelled', 'user', c.req.param('id'), {});
  return c.json({ ok: true });
});

async function getCurrentAdminSubscription(dbBinding: D1Database, userId: string) {
  const [row] = await getDb(dbBinding).select({ id: subscriptions.id, status: subscriptions.status, expiresAt: subscriptions.expiresAt, planName: plans.name }).from(subscriptions).innerJoin(plans, eq(subscriptions.planId, plans.id)).where(eq(subscriptions.userId, userId)).orderBy(desc(subscriptions.expiresAt)).limit(1);
  return row ?? null;
}

async function audit(dbBinding: D1Database, actorUserId: string, action: string, targetType: string, targetId: string, metadata: unknown) {
  await getDb(dbBinding).insert(adminAuditLogs).values({ id: nanoid(), actorUserId, action, targetType, targetId, metadataJson: JSON.stringify(metadata), createdAt: new Date() });
}

export default app;
