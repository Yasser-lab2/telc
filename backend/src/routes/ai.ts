import { and, eq, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { getDb } from '../db';
import { aiSubmissions, usageLimits } from '../db/schema';
import { gradeSchreiben } from '../lib/gemini';
import { apiError } from '../lib/http';
import { getCurrentPlan } from '../lib/subscriptions';
import { todayKey } from '../lib/time';
import { authMiddleware } from '../middleware/auth';
import { subscriptionMiddleware } from '../middleware/subscription';
import type { Env } from '../types';

const app = new Hono<Env>();

const gradeSchema = z.object({
  userText: z.string().min(30).max(5000),
  niveau: z.enum(['B1', 'B2']),
  themaType: z.string().min(1).max(80),
  themaContext: z.string().min(1).max(2000),
});

app.post('/grade', authMiddleware, subscriptionMiddleware, async (c) => {
  const body = gradeSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return apiError(c, 400, 'Invalid grading payload', 'BAD_REQUEST');
  if (!c.env.GEMINI_API_KEY) return apiError(c, 500, 'Gemini API key is not configured', 'AI_UNAVAILABLE');

  const user = c.get('user');
  const db = getDb(c.env.DB);
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
    const result = await gradeSchreiben(
      body.data.userText,
      body.data.niveau,
      body.data.themaContext,
      c.env.GEMINI_API_KEY,
    );

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

    await db.insert(aiSubmissions).values({
      id: nanoid(),
      userId: user.id,
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
      submittedAt: new Date(),
    });

    return c.json({ result, usage: { limit, used: (usage?.aiCreditsUsed ?? 0) + 1 } });
  } catch (error) {
    console.error(error);
    return apiError(c, 500, 'AI grading failed', 'AI_UNAVAILABLE');
  }
});

export default app;
