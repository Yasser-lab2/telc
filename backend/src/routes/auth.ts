import bcrypt from 'bcryptjs';
import { and, eq, gt, inArray } from 'drizzle-orm';
import type { Context } from 'hono';
import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { getDb } from '../db';
import { plans, sessions, subscriptions, users } from '../db/schema';
import { authMiddleware } from '../middleware/auth';
import { addDays } from '../lib/time';
import { apiError, publicUser } from '../lib/http';
import { secureCookieOptions, SESSION_COOKIE, sessionExpiry } from '../lib/session';
import type { Env } from '../types';

const app = new Hono<Env>();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(2).max(80),
  niveau: z.enum(['B1', 'B2', 'B1_B2']).default('B1'),
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
  return c.json({ user: publicUser(created) }, 201);
});

app.post('/login', async (c) => {
  const body = loginSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return apiError(c, 400, 'Invalid login payload', 'BAD_REQUEST');

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
