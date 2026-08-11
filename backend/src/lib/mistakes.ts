import { sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { getDb } from '../db';
import { mistakeItems } from '../db/schema';

export async function recordMistakes(dbBinding: D1Database, input: { userId: string; attemptId: string; contentItemId: string; skill: string; items: Array<{ questionId: string; prompt: string; selectedAnswer: string | null; correctAnswer: string | null; explanation: string | null; isCorrect: boolean }> }) {
  const now = new Date(); const db = getDb(dbBinding);
  for (const item of input.items.filter((entry) => !entry.isCorrect)) {
    await db.insert(mistakeItems).values({ id: nanoid(), userId: input.userId, attemptId: input.attemptId, contentItemId: input.contentItemId, sourceQuestionId: item.questionId, skill: input.skill, prompt: item.prompt, selectedAnswer: item.selectedAnswer, correctAnswer: item.correctAnswer, explanation: item.explanation, firstSeenAt: now, lastSeenAt: now })
      .onConflictDoUpdate({ target: [mistakeItems.userId, mistakeItems.contentItemId, mistakeItems.sourceQuestionId], set: { attemptId: input.attemptId, selectedAnswer: item.selectedAnswer, correctAnswer: item.correctAnswer, explanation: item.explanation, occurrenceCount: sql`${mistakeItems.occurrenceCount} + 1`, status: 'open', lastSeenAt: now, reviewedAt: null } });
  }
}
