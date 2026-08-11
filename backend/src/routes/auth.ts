import bcrypt from 'bcryptjs';
import { and, desc, eq, gt, inArray } from 'drizzle-orm';
import type { Context } from 'hono';
import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { getDb } from '../db';
import {
  activityEvents,
  aiSubmissions,
  attemptAnswers,
  attempts,
  learnerProgress,
  manualPayments,
  plans,
  readingExamSessions,
  readingUserAnswers,
  sessions,
  subscriptions,
  usageLimits,
  userConsents,
  userPreferences,
  users,
  writingDrafts,
} from '../db/schema';
import { authMiddleware } from '../middleware/auth';
import { addDays } from '../lib/time';
import { apiError, publicUser } from '../lib/http';
import { secureCookieOptions, SESSION_COOKIE, sessionExpiry } from '../lib/session';
import type { Env } from '../types';
import { checkRateLimit, consumeAccountToken, createAccountToken, rateLimitKey, sendAccountEmail } from '../lib/account-security';

const app = new Hono<Env>();
const LEGAL_VERSION = '2026-08-10';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(2).max(80),
  niveau: z.enum(['B1', 'B2', 'B1_B2']).default('B1'),
  acceptTerms: z.literal(true),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

app.post('/register', async (c) => {
  const body = registerSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return apiError(c, 400, 'Invalid registration payload', 'BAD_REQUEST');

  const db = getDb(c.env.DB);
  const email = body.data.email.toLowerCase();
  const registerKey = await rateLimitKey('register', c.req.header('CF-Connecting-IP') ?? c.req.header('X-Forwarded-For') ?? 'local');
  if (!await checkRateLimit(c.env.DB, registerKey, 5, 3600)) return apiError(c, 429, 'Too many registration attempts', 'LIMIT_EXCEEDED');
  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing) return apiError(c, 400, 'Email already registered', 'BAD_REQUEST');

  const now = new Date();
  const userId = nanoid();
  const passwordHash = await bcrypt.hash(body.data.password, 10);
  const role = email === c.env.ADMIN_EMAIL.toLowerCase() ? 'admin' : 'student';

  await db.insert(users).values({
    id: userId,
    email,
    passwordHash,
    displayName: body.data.displayName,
    niveau: body.data.niveau,
    role,
    createdAt: now,
    lastSeenAt: now,
  });

  const consentContext = { ip: c.req.header('CF-Connecting-IP') ?? null, userAgent: c.req.header('User-Agent') ?? null };
  await db.insert(userConsents).values([
    { id: nanoid(), userId, documentType: 'terms', documentVersion: LEGAL_VERSION, acceptedAt: now, ...consentContext },
    { id: nanoid(), userId, documentType: 'privacy', documentVersion: LEGAL_VERSION, acceptedAt: now, ...consentContext },
  ]);

  const [trialPlan] = await db.select().from(plans).where(eq(plans.id, 'trial')).limit(1);
  if (trialPlan) {
    await db.insert(subscriptions).values({
      id: nanoid(),
      userId,
      planId: trialPlan.id,
      status: 'trial',
      startsAt: now,
      expiresAt: addDays(now, trialPlan.durationDays),
      createdAt: now,
    });
  }

  const sessionId = await createSession(c, userId);
  setCookie(c, SESSION_COOKIE, sessionId, { ...secureCookieOptions(c.env.APP_URL), expires: sessionExpiry() });
  const [created] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const token = await createAccountToken(c.env.DB, userId, 'email_verification', 24 * 60);
  const delivery = await sendAccountEmail(c.env, { to: email, subject: 'Verify your TELC Prep email', path: `/verify-email?token=${encodeURIComponent(token)}`, action: 'Verify email' }).catch((error) => { console.error(error); return { delivered: false, devUrl: null }; });
  return c.json({ user: publicUser(created), verificationRequired: true, devVerificationUrl: delivery.devUrl }, 201);
});

app.post('/login', async (c) => {
  const body = loginSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return apiError(c, 400, 'Invalid login payload', 'BAD_REQUEST');

  const loginKey = await rateLimitKey('login', `${c.req.header('CF-Connecting-IP') ?? c.req.header('X-Forwarded-For') ?? 'local'}:${body.data.email}`);
  if (!await checkRateLimit(c.env.DB, loginKey, 10, 15 * 60)) return apiError(c, 429, 'Too many login attempts. Try again later.', 'LIMIT_EXCEEDED');
  const db = getDb(c.env.DB);
  const [user] = await db.select().from(users).where(eq(users.email, body.data.email.toLowerCase())).limit(1);
  if (!user) return apiError(c, 401, 'Invalid email or password', 'UNAUTHORIZED');

  const ok = await bcrypt.compare(body.data.password, user.passwordHash);
  if (!ok) return apiError(c, 401, 'Invalid email or password', 'UNAUTHORIZED');

  const sessionId = await createSession(c, user.id);
  setCookie(c, SESSION_COOKIE, sessionId, { ...secureCookieOptions(c.env.APP_URL), expires: sessionExpiry() });
  return c.json({ user: publicUser(user) });
});

app.post('/logout', authMiddleware, async (c) => {
  const sessionId = getCookie(c, SESSION_COOKIE);
  if (sessionId) await getDb(c.env.DB).delete(sessions).where(eq(sessions.id, sessionId));
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
  return c.json({ ok: true });
});

app.get('/me', authMiddleware, async (c) => {
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

app.patch('/profile', authMiddleware, async (c) => {
  const body = z.object({
    displayName: z.string().trim().min(2).max(80),
    niveau: z.enum(['B1', 'B2', 'B1_B2']),
  }).safeParse(await c.req.json().catch(() => null));
  if (!body.success) return apiError(c, 400, 'Invalid profile information', 'BAD_REQUEST');

  const user = c.get('user');
  const db = getDb(c.env.DB);
  await db.update(users).set({ displayName: body.data.displayName, niveau: body.data.niveau }).where(eq(users.id, user.id));
  const [updated] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  return c.json({ user: publicUser(updated) });
});

app.get('/preferences', authMiddleware, async (c) => {
  const user = c.get('user');
  const [preferences] = await getDb(c.env.DB).select().from(userPreferences).where(eq(userPreferences.userId, user.id)).limit(1);
  return c.json({ preferences: preferences ?? { userId: user.id, locale: 'fr', emailStudyReminders: true, emailProductUpdates: false } });
});

app.patch('/preferences', authMiddleware, async (c) => {
  const body = z.object({ locale: z.enum(['fr', 'de']), emailStudyReminders: z.boolean(), emailProductUpdates: z.boolean() }).safeParse(await c.req.json().catch(() => null));
  if (!body.success) return apiError(c, 400, 'Invalid preferences', 'BAD_REQUEST');
  const user = c.get('user');
  const now = new Date();
  await getDb(c.env.DB).insert(userPreferences).values({ userId: user.id, ...body.data, createdAt: now, updatedAt: now }).onConflictDoUpdate({ target: userPreferences.userId, set: { ...body.data, updatedAt: now } });
  return c.json({ preferences: { userId: user.id, ...body.data, updatedAt: now } });
});

app.get('/account/export', authMiddleware, async (c) => {
  const user = c.get('user');
  const db = getDb(c.env.DB);
  const [userSubscriptions, payments, usage, submissions, readingSessions, sharedAttempts, drafts, progress, activity, preferences, consents] = await Promise.all([
    db.select().from(subscriptions).where(eq(subscriptions.userId, user.id)),
    db.select({ id: manualPayments.id, planId: manualPayments.planId, amountMad: manualPayments.amountMad, status: manualPayments.status, whatsappSentAt: manualPayments.whatsappSentAt, approvedAt: manualPayments.approvedAt, rejectionReason: manualPayments.rejectionReason, reviewedAt: manualPayments.reviewedAt, createdAt: manualPayments.createdAt }).from(manualPayments).where(eq(manualPayments.userId, user.id)),
    db.select().from(usageLimits).where(eq(usageLimits.userId, user.id)),
    db.select().from(aiSubmissions).where(eq(aiSubmissions.userId, user.id)),
    db.select().from(readingExamSessions).where(eq(readingExamSessions.userId, user.id)),
    db.select().from(attempts).where(eq(attempts.userId, user.id)),
    db.select().from(writingDrafts).where(eq(writingDrafts.userId, user.id)),
    db.select().from(learnerProgress).where(eq(learnerProgress.userId, user.id)),
    db.select().from(activityEvents).where(eq(activityEvents.userId, user.id)),
    db.select().from(userPreferences).where(eq(userPreferences.userId, user.id)),
    db.select({ documentType: userConsents.documentType, documentVersion: userConsents.documentVersion, acceptedAt: userConsents.acceptedAt }).from(userConsents).where(eq(userConsents.userId, user.id)),
  ]);
  const [readingAnswers, answers] = await Promise.all([
    readingSessions.length ? db.select().from(readingUserAnswers).where(inArray(readingUserAnswers.sessionId, readingSessions.map((session) => session.id))) : [],
    sharedAttempts.length ? db.select().from(attemptAnswers).where(inArray(attemptAnswers.attemptId, sharedAttempts.map((attempt) => attempt.id))) : [],
  ]);

  c.header('Content-Disposition', `attachment; filename="telc-prep-data-${new Date().toISOString().slice(0, 10)}.json"`);
  return c.json({
    exportedAt: new Date().toISOString(),
    profile: publicUser(user),
    account: { createdAt: user.createdAt, lastSeenAt: user.lastSeenAt },
    preferences: preferences[0] ?? { locale: 'fr', emailStudyReminders: true, emailProductUpdates: false },
    legalConsents: consents,
    subscriptions: userSubscriptions,
    payments,
    usage,
    learning: { attempts: sharedAttempts, answers, readingSessions, readingAnswers, writingDrafts: drafts, aiSubmissions: submissions, progress, activity },
  });
});

app.delete('/account', authMiddleware, async (c) => {
  const body = z.object({ password: z.string().min(1) }).safeParse(await c.req.json().catch(() => null));
  if (!body.success) return apiError(c, 400, 'Password is required', 'BAD_REQUEST');
  const user = c.get('user');
  if (user.role === 'admin') return apiError(c, 403, 'Administrator accounts cannot be deleted here', 'FORBIDDEN');
  if (!await bcrypt.compare(body.data.password, user.passwordHash)) return apiError(c, 401, 'Incorrect password', 'UNAUTHORIZED');

  const proofRows = await getDb(c.env.DB).select({ objectKey: manualPayments.proofObjectKey }).from(manualPayments).where(eq(manualPayments.userId, user.id));
  await Promise.all(proofRows.flatMap((row) => row.objectKey ? [c.env.PAYMENT_PROOFS.delete(row.objectKey)] : []));
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM payment_status_events WHERE payment_id IN (SELECT id FROM manual_payments WHERE user_id = ?)').bind(user.id),
    c.env.DB.prepare('DELETE FROM subscriptions WHERE user_id = ?').bind(user.id),
    c.env.DB.prepare('DELETE FROM manual_payments WHERE user_id = ?').bind(user.id),
    c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id),
  ]);
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
  return c.json({ ok: true });
});

app.post('/verification/resend', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.emailVerifiedAt) return c.json({ ok: true, alreadyVerified: true });
  const key = await rateLimitKey('verification', user.id);
  if (!await checkRateLimit(c.env.DB, key, 3, 3600)) return apiError(c, 429, 'Too many verification emails', 'LIMIT_EXCEEDED');
  const token = await createAccountToken(c.env.DB, user.id, 'email_verification', 24 * 60);
  const delivery = await sendAccountEmail(c.env, { to: user.email, subject: 'Verify your TELC Prep email', path: `/verify-email?token=${encodeURIComponent(token)}`, action: 'Verify email' }).catch((error) => { console.error(error); return { delivered: false, devUrl: null }; });
  return c.json({ ok: true, alreadyVerified: false, devVerificationUrl: delivery.devUrl });
});

app.post('/verification/confirm', async (c) => {
  const body = z.object({ token: z.string().min(20) }).safeParse(await c.req.json().catch(() => null));
  if (!body.success) return apiError(c, 400, 'Invalid verification token', 'BAD_REQUEST');
  const token = await consumeAccountToken(c.env.DB, body.data.token, 'email_verification');
  if (!token) return apiError(c, 400, 'Verification link is invalid or expired', 'BAD_REQUEST');
  await getDb(c.env.DB).update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, token.userId));
  return c.json({ ok: true });
});

app.post('/password/forgot', async (c) => {
  const body = z.object({ email: z.string().email() }).safeParse(await c.req.json().catch(() => null));
  if (!body.success) return apiError(c, 400, 'Invalid email', 'BAD_REQUEST');
  const email = body.data.email.toLowerCase();
  const key = await rateLimitKey('password-reset', `${c.req.header('CF-Connecting-IP') ?? 'local'}:${email}`);
  if (!await checkRateLimit(c.env.DB, key, 5, 3600)) return apiError(c, 429, 'Too many reset requests', 'LIMIT_EXCEEDED');
  const db = getDb(c.env.DB);
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  let devResetUrl: string | null = null;
  if (user) {
    const token = await createAccountToken(c.env.DB, user.id, 'password_reset', 30);
    const delivery = await sendAccountEmail(c.env, { to: user.email, subject: 'Reset your TELC Prep password', path: `/reset-password?token=${encodeURIComponent(token)}`, action: 'Reset password' }).catch((error) => { console.error(error); return { delivered: false, devUrl: null }; });
    devResetUrl = delivery.devUrl;
  }
  return c.json({ ok: true, message: 'If this email exists, a reset link has been sent.', devResetUrl });
});

app.post('/password/reset', async (c) => {
  const body = z.object({ token: z.string().min(20), password: z.string().min(8).max(200) }).safeParse(await c.req.json().catch(() => null));
  if (!body.success) return apiError(c, 400, 'Invalid password reset', 'BAD_REQUEST');
  const token = await consumeAccountToken(c.env.DB, body.data.token, 'password_reset');
  if (!token) return apiError(c, 400, 'Reset link is invalid or expired', 'BAD_REQUEST');
  const db = getDb(c.env.DB);
  await db.update(users).set({ passwordHash: await bcrypt.hash(body.data.password, 10) }).where(eq(users.id, token.userId));
  await db.delete(sessions).where(eq(sessions.userId, token.userId));
  return c.json({ ok: true });
});

app.get('/sessions', authMiddleware, async (c) => {
  const user = c.get('user');
  const currentId = getCookie(c, SESSION_COOKIE);
  const rows = await getDb(c.env.DB).select({ id: sessions.id, createdAt: sessions.createdAt, expiresAt: sessions.expiresAt, userAgent: sessions.userAgent, ip: sessions.ip }).from(sessions).where(and(eq(sessions.userId, user.id), gt(sessions.expiresAt, new Date()))).orderBy(desc(sessions.createdAt));
  return c.json({ sessions: rows.map((session) => ({ ...session, current: session.id === currentId })) });
});

app.delete('/sessions/:id', authMiddleware, async (c) => {
  const user = c.get('user');
  const currentId = getCookie(c, SESSION_COOKIE);
  await getDb(c.env.DB).delete(sessions).where(and(eq(sessions.id, c.req.param('id')), eq(sessions.userId, user.id)));
  if (currentId === c.req.param('id')) deleteCookie(c, SESSION_COOKIE, { path: '/' });
  return c.json({ ok: true, currentRevoked: currentId === c.req.param('id') });
});

app.post('/sessions/revoke-all', authMiddleware, async (c) => {
  const user = c.get('user');
  await getDb(c.env.DB).delete(sessions).where(eq(sessions.userId, user.id));
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
  return c.json({ ok: true });
});

async function createSession(c: Context<Env>, userId: string) {
  const sessionId = nanoid();
  await getDb(c.env.DB).insert(sessions).values({
    id: sessionId,
    userId,
    expiresAt: sessionExpiry(),
    createdAt: new Date(),
    userAgent: c.req.header('User-Agent') ?? null,
    ip: c.req.header('CF-Connecting-IP') ?? null,
  });
  return sessionId;
}

export default app;
