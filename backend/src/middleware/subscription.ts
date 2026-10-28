import { and, eq, gt } from 'drizzle-orm';
import type { MiddlewareHandler } from 'hono';
import { getDb } from '../db';
import { subscriptions } from '../db/schema';
import { apiError } from '../lib/http';
import type { Env } from '../types';

export const subscriptionMiddleware: MiddlewareHandler<Env> = async (c, next) => {
  const user = c.get('user');
  const db = getDb(c.env.DB);
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, user.id),
        eq(subscriptions.status, 'active'),
        gt(subscriptions.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!sub) return apiError(c, 403, 'Subscription required', 'NO_SUBSCRIPTION');
  await next();
};
