import { and, eq, gt } from 'drizzle-orm';
import { getCookie } from 'hono/cookie';
import type { MiddlewareHandler } from 'hono';
import { getDb } from '../db';
import { sessions, users } from '../db/schema';
import { apiError } from '../lib/http';
import { SESSION_COOKIE } from '../lib/session';
import type { Env } from '../types';

export const authMiddleware: MiddlewareHandler<Env> = async (c, next) => {
  const sessionId = getCookie(c, SESSION_COOKIE);
  if (!sessionId) return apiError(c, 401, 'Unauthorized', 'UNAUTHORIZED');

  const db = getDb(c.env.DB);
  const [row] = await db
    .select({ user: users, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date())))
    .limit(1);

  if (!row) return apiError(c, 401, 'Session expired', 'UNAUTHORIZED');
  c.set('user', row.user);
  await db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, row.user.id));
  await next();
};
