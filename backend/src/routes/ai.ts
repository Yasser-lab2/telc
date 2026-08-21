import { and, eq, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { getDb } from '../db';
import { aiSubmissions, attempts, contentItems, usageLimits, writingDrafts } from '../db/schema';
import { gradeWriting } from '../lib/ai-provider';
import { apiError } from '../lib/http';
import { getCurrentPlan } from '../lib/subscriptions';
import { todayKey } from '../lib/time';
import { syncProgressAfterCompletion } from '../lib/progress';
import { authMiddleware } from '../middleware/auth';
import { subscriptionMiddleware } from '../middleware/subscription';
import type { Env } from '../types';

const app = new Hono<Env>();

const gradeSchema = z.object({
  userText: z.string().min(30).max(5000),
  niveau: z.enum(['B1', 'B2']),
  themaType: z.string().min(1).max(80),
  themaContext: z.string().min(1).max(2000),
  attemptId: z.string().min(1),
});

app.post('/grade', authMiddleware, subscriptionMiddleware, async (c) => {
  const body = gradeSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return apiError(c, 400, 'Invalid grading payload', 'BAD_REQUEST');
  const user = c.get('user');
  const db = getDb(c.env.DB);
  const [attemptRow] = await db
    .select({ attempt: attempts, item: contentItems, draft: writingDrafts })
    .from(attempts)
    .innerJoin(contentItems, eq(attempts.contentItemId, contentItems.id))
    .innerJoin(writingDrafts, eq(writingDrafts.attemptId, attempts.id))
    .where(and(eq(attempts.id, body.data.attemptId), eq(attempts.userId, user.id)))
    .limit(1);
  if (!attemptRow || attemptRow.attempt.skill !== 'writing' || attemptRow.item.id !== body.data.themaType) {
    return apiError(c, 400, 'Invalid writing attempt', 'BAD_REQUEST');
  }
  const [existingSubmission] = await db.select().from(aiSubmissions).where(eq(aiSubmissions.attemptId, attemptRow.attempt.id)).limit(1);
  if (existingSubmission?.aiFeedback) {
    return c.json({ result: JSON.parse(existingSubmission.aiFeedback), usage: { limit: 0, used: 0 }, attemptId: attemptRow.attempt.id, reused: true });
  }
  if (attemptRow.attempt.status !== 'in_progress') return apiError(c, 400, 'Writing attempt is already completed', 'BAD_REQUEST');
  if (!c.env.OPENROUTER_API_KEY && !c.env.GEMINI_API_KEY) return apiError(c, 500, 'No AI provider is configured', 'AI_UNAVAILABLE');

  const today = todayKey();
  const planRow = await getCurrentPlan(c.env.DB, user.id);
  const limit = planRow?.plan.aiCreditsPerDay ?? 1;
  const [usage] = await db
    .select()
    .from(usageLimits)
    .where(and(eq(usageLimits.userId, user.id), eq(usageLimits.date, today)))
    .limit(1);

  if ((usage?.aiCreditsUsed ?? 0) >= limit) {
    return apiError(c, 429, 'Daily AI limit reached', 'LIMIT_EXCEEDED');
  }

  const started = Date.now();
  try {
    const grading = await gradeWriting(c.env, {
      userText: body.data.userText,
      niveau: attemptRow.item.level,
      themaContext: attemptRow.item.instructions ?? body.data.themaContext,
    });
    const result = grading.result;

    await db.insert(usageLimits).values({
      id: nanoid(),
      userId: user.id,
      date: today,
      aiCreditsUsed: 1,
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: [usageLimits.userId, usageLimits.date],
      set: {
        aiCreditsUsed: sql`ai_credits_used + 1`,
        updatedAt: new Date(),
      },
    });

    const submissionId = nanoid();
    const submittedAt = new Date();
    await db.insert(aiSubmissions).values({
      id: submissionId,
      userId: user.id,
      attemptId: attemptRow.attempt.id,
      themaType: body.data.themaType,
      niveau: body.data.niveau,
      userText: body.data.userText,
      scoreTotal: result.score_total,
      scoreInhalt: result.score_inhalt,
      scoreRedemittel: result.score_redemittel,
      scoreKorrektheit: result.score_korrektheit,
      niveauVocab: result.niveau_vocab,
      aiFeedback: JSON.stringify(result),
      improvedText: result.improved_text,
      feedbackAr: result.feedback_ar,
      latencyMs: Date.now() - started,
      aiProvider: grading.provider,
      aiModel: grading.model,
      promptVersion: grading.promptVersion,
      submittedAt,
    });

    await db.update(writingDrafts).set({
      text: body.data.userText,
      wordCount: body.data.userText.trim().split(/\s+/).length,
      updatedAt: submittedAt,
    }).where(eq(writingDrafts.attemptId, attemptRow.attempt.id));
    await db.update(attempts).set({
      status: 'completed', submittedAt, lastSavedAt: submittedAt,
      scoreObtained: result.score_total, scoreMax: 100, percentage: Math.max(0, Math.min(100, result.score_total)),
    }).where(and(eq(attempts.id, attemptRow.attempt.id), eq(attempts.status, 'in_progress')));
    await syncProgressAfterCompletion(c.env.DB, {
      userId: user.id, attemptId: attemptRow.attempt.id, skill: 'writing', level: attemptRow.item.level,
    });

    return c.json({ result, usage: { limit, used: (usage?.aiCreditsUsed ?? 0) + 1 }, attemptId: attemptRow.attempt.id, reused: false });
  } catch (error) {
    console.error(error);
    return apiError(c, 500, 'AI grading failed', 'AI_UNAVAILABLE');
  }
});

export default app;
