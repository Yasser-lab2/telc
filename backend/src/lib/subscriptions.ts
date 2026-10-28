import { and, desc, eq, gt } from 'drizzle-orm';
import { getDb } from '../db';
import { plans, subscriptions } from '../db/schema';

export async function getCurrentPlan(dbBinding: D1Database, userId: string) {
  const db = getDb(dbBinding);
  const [row] = await db
    .select({ plan: plans, subscription: subscriptions })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, 'active'),
        gt(subscriptions.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(subscriptions.expiresAt))
    .limit(1);

  return row ?? null;
}
