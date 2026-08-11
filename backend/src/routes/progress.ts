import { desc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { getDb } from '../db';
import { activityEvents, attempts, contentItems, learnerProgress } from '../db/schema';
import { authMiddleware } from '../middleware/auth';
import { subscriptionMiddleware } from '../middleware/subscription';
import type { Env } from '../types';

const app = new Hono<Env>();
app.use('*', authMiddleware, subscriptionMiddleware);

app.get('/', async (c) => {
  const user = c.get('user');
  const db = getDb(c.env.DB);
  const progress = await db.select().from(learnerProgress).where(eq(learnerProgress.userId, user.id));
  const recentActivity = await db
    .select({
      id: activityEvents.id, eventType: activityEvents.eventType, occurredAt: activityEvents.occurredAt,
      skill: attempts.skill, score: attempts.percentage, title: contentItems.title, contentItemId: contentItems.id,
    })
    .from(activityEvents)
    .innerJoin(attempts, eq(activityEvents.entityId, attempts.id))
    .innerJoin(contentItems, eq(attempts.contentItemId, contentItems.id))
    .where(eq(activityEvents.userId, user.id))
    .orderBy(desc(activityEvents.occurredAt))
    .limit(5);
  return c.json({ progress, recentActivity });
});

export default app;
