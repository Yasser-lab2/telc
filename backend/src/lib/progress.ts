import { and, avg, count, eq, max } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { getDb } from '../db';
import { activityEvents, attempts, contentItems, learnerProgress } from '../db/schema';

export async function syncProgressAfterCompletion(
  dbBinding: D1Database,
  input: { userId: string; attemptId: string; skill: 'reading' | 'listening' | 'writing' | 'speaking' | 'simulation'; level: 'B1' | 'B2' },
) {
  const db = getDb(dbBinding);
  const [summary] = await db
    .select({ completed: count(), average: avg(attempts.percentage), best: max(attempts.percentage) })
    .from(attempts)
    .innerJoin(contentItems, eq(attempts.contentItemId, contentItems.id))
    .where(and(
      eq(attempts.userId, input.userId),
      eq(attempts.skill, input.skill),
      eq(attempts.status, 'completed'),
      eq(contentItems.level, input.level),
    ));

  const now = new Date();
  await db.insert(learnerProgress).values({
    id: nanoid(), userId: input.userId, skill: input.skill, level: input.level,
    completedAttempts: summary.completed, averagePercentage: Number(summary.average ?? 0),
    bestPercentage: Number(summary.best ?? 0), lastPracticedAt: now, updatedAt: now,
  }).onConflictDoUpdate({
    target: [learnerProgress.userId, learnerProgress.skill, learnerProgress.level],
    set: {
      completedAttempts: summary.completed, averagePercentage: Number(summary.average ?? 0),
      bestPercentage: Number(summary.best ?? 0), lastPracticedAt: now, updatedAt: now,
    },
  });

  await db.insert(activityEvents).values({
    id: nanoid(), userId: input.userId, eventType: 'attempt_completed', entityType: 'attempt',
    entityId: input.attemptId, dedupeKey: `attempt_completed:${input.attemptId}`, occurredAt: now,
    metadataJson: JSON.stringify({ skill: input.skill, level: input.level }),
  }).onConflictDoNothing({ target: activityEvents.dedupeKey });
}
