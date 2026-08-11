import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { getDb } from '../db';
import {
  readingExamSections,
  readingExamSessions,
  readingExams,
  readingOptions,
  readingQuestions,
  readingUserAnswers,
  attempts,
} from '../db/schema';
import { apiError } from '../lib/http';
import { getCurrentPlan } from '../lib/subscriptions';
import { authMiddleware } from '../middleware/auth';
import type { Env } from '../types';
import { ensureReadingCatalogItem } from '../lib/reading-catalog';
import { syncProgressAfterCompletion } from '../lib/progress';

const app = new Hono<Env>();
app.use('*', authMiddleware);

app.get('/exams', async (c) => {
  const exams = await getDb(c.env.DB)
    .select()
    .from(readingExams)
    .where(eq(readingExams.status, 'published'))
    .orderBy(asc(readingExams.createdAt));

  return c.json({ exams });
});

app.get('/exams/:id', async (c) => {
  const user = c.get('user');
  const includeAnswers = user.role === 'admin';
  const db = getDb(c.env.DB);
  const [exam] = await db.select().from(readingExams).where(eq(readingExams.id, c.req.param('id'))).limit(1);

  if (!exam) return apiError(c, 404, 'Reading exam not found', 'NOT_FOUND');
  if (exam.status !== 'published' && user.role !== 'admin') return apiError(c, 404, 'Reading exam not found', 'NOT_FOUND');

  if (exam.accessStatus === 'premium' && user.role !== 'admin') {
    const plan = await getCurrentPlan(c.env.DB, user.id);
    if (!plan || plan.subscription.status !== 'active') {
      return apiError(c, 403, 'Premium exam requires an active subscription', 'NO_SUBSCRIPTION');
    }
  }
  const detail = await loadExamDetail(c.env.DB, exam.id, includeAnswers);
  return c.json({ exam: detail });
});

app.get('/exams/:id/session', async (c) => {
  const user = c.get('user');
  const db = getDb(c.env.DB);
  const [session] = await db.select().from(readingExamSessions).where(and(
    eq(readingExamSessions.userId, user.id),
    eq(readingExamSessions.examId, c.req.param('id')),
    eq(readingExamSessions.status, 'in_progress'),
  )).limit(1);
  if (!session) return c.json({ session: null, answers: [] });
  const answers = await db.select({
    questionId: readingUserAnswers.questionId,
    selectedOptionCode: readingUserAnswers.selectedOptionCode,
    timeSpentSeconds: readingUserAnswers.timeSpentSeconds,
  }).from(readingUserAnswers).where(eq(readingUserAnswers.sessionId, session.id));
  return c.json({ session, answers, serverTime: new Date() });
});

app.get('/exams/:id/history', async (c) => {
  const user = c.get('user');
  const db = getDb(c.env.DB);
  const [exam] = await db.select({ id: readingExams.id }).from(readingExams).where(eq(readingExams.id, c.req.param('id'))).limit(1);
  if (!exam) return apiError(c, 404, 'Reading exam not found', 'NOT_FOUND');
  const history = await db.select({
    id: readingExamSessions.id, startedAt: readingExamSessions.startedAt, finishedAt: readingExamSessions.finishedAt,
    scoreObtained: readingExamSessions.scoreObtained, scoreMax: readingExamSessions.scoreMax, percentage: readingExamSessions.percentage,
  }).from(readingExamSessions).where(and(
    eq(readingExamSessions.userId, user.id), eq(readingExamSessions.examId, exam.id), eq(readingExamSessions.status, 'completed'),
  )).orderBy(desc(readingExamSessions.finishedAt)).limit(20);
  return c.json({ history });
});

app.post('/exams/:id/start', async (c) => {
  const user = c.get('user');
  const db = getDb(c.env.DB);
  const [exam] = await db
    .select()
    .from(readingExams)
    .where(and(eq(readingExams.id, c.req.param('id')), eq(readingExams.status, 'published')))
    .limit(1);

  if (!exam) return apiError(c, 404, 'Reading exam not found', 'NOT_FOUND');
  if (exam.accessStatus === 'premium' && user.role !== 'admin') {
    const plan = await getCurrentPlan(c.env.DB, user.id);
    if (!plan || plan.subscription.status !== 'active') {
      return apiError(c, 403, 'Premium exam requires an active subscription', 'NO_SUBSCRIPTION');
    }
  }
  const contentItemId = await ensureReadingCatalogItem(c.env.DB, exam);

  const [existing] = await db
    .select()
    .from(readingExamSessions)
    .where(
      and(
        eq(readingExamSessions.userId, user.id),
        eq(readingExamSessions.examId, exam.id),
        eq(readingExamSessions.status, 'in_progress'),
      ),
    )
    .limit(1);

  if (existing) {
    if (existing.sharedAttemptId) return c.json({ session: existing });
    const sharedAttempt = await createReadingAttempt(c.env.DB, user.id, contentItemId);
    await db.update(readingExamSessions).set({ sharedAttemptId: sharedAttempt.id }).where(eq(readingExamSessions.id, existing.id));
    return c.json({ session: { ...existing, sharedAttemptId: sharedAttempt.id } });
  }

  const sharedAttempt = await createReadingAttempt(c.env.DB, user.id, contentItemId);
  const session = {
    id: nanoid(),
    userId: user.id,
    examId: exam.id,
    startedAt: new Date(),
    status: 'in_progress' as const,
    scoreMax: exam.scoreMax,
    sharedAttemptId: sharedAttempt.id,
  };
  await db.insert(readingExamSessions).values(session);
  return c.json({ session }, 201);
});

app.post('/sessions/:sessionId/answers', async (c) => {
  const user = c.get('user');
  const body = (await c.req.json().catch(() => null)) as { answers?: Array<{ questionId: string; selectedOptionCode: string; timeSpentSeconds?: number }> } | null;
  if (!body?.answers?.length) return apiError(c, 400, 'Answers are required', 'BAD_REQUEST');

  const db = getDb(c.env.DB);
  const [session] = await db
    .select()
    .from(readingExamSessions)
    .where(and(eq(readingExamSessions.id, c.req.param('sessionId')), eq(readingExamSessions.userId, user.id)))
    .limit(1);
  if (!session) return apiError(c, 404, 'Session not found', 'NOT_FOUND');
  if (session.status !== 'in_progress') return apiError(c, 400, 'Session is not in progress', 'BAD_REQUEST');

  const now = new Date();
  for (const answer of body.answers) {
    await db
      .insert(readingUserAnswers)
      .values({
        id: nanoid(),
        sessionId: session.id,
        questionId: answer.questionId,
        selectedOptionCode: answer.selectedOptionCode,
        timeSpentSeconds: answer.timeSpentSeconds ?? null,
        answeredAt: now,
      })
      .onConflictDoUpdate({
        target: [readingUserAnswers.sessionId, readingUserAnswers.questionId],
        set: {
          selectedOptionCode: answer.selectedOptionCode,
          timeSpentSeconds: answer.timeSpentSeconds ?? null,
          answeredAt: now,
        },
      });
  }

  if (session.sharedAttemptId) {
    const [shared] = await db.select().from(attempts).where(eq(attempts.id, session.sharedAttemptId)).limit(1);
    if (shared?.status === 'in_progress') {
      await db.update(attempts).set({ lastSavedAt: now, stateVersion: shared.stateVersion + 1 }).where(eq(attempts.id, shared.id));
    }
  }

  return c.json({ ok: true });
});

app.post('/sessions/:sessionId/submit', async (c) => {
  const user = c.get('user');
  const db = getDb(c.env.DB);
  const [session] = await db
    .select()
    .from(readingExamSessions)
    .where(and(eq(readingExamSessions.id, c.req.param('sessionId')), eq(readingExamSessions.userId, user.id)))
    .limit(1);
  if (!session) return apiError(c, 404, 'Session not found', 'NOT_FOUND');
  if (session.status === 'abandoned') return apiError(c, 400, 'Session was abandoned', 'BAD_REQUEST');

  const [exam] = await db.select().from(readingExams).where(eq(readingExams.id, session.examId)).limit(1);
  if (!exam) return apiError(c, 404, 'Reading exam not found', 'NOT_FOUND');
  let sharedAttemptId = session.sharedAttemptId;
  let shouldCompleteSharedAttempt = false;
  if (!sharedAttemptId) {
    const contentItemId = await ensureReadingCatalogItem(c.env.DB, exam);
    const shared = await createReadingAttempt(c.env.DB, user.id, contentItemId);
    sharedAttemptId = shared.id;
    shouldCompleteSharedAttempt = true;
    await db.update(readingExamSessions).set({ sharedAttemptId }).where(eq(readingExamSessions.id, session.id));
  }

  const sectionRows = await db
    .select()
    .from(readingExamSections)
    .where(eq(readingExamSections.examId, session.examId))
    .orderBy(asc(readingExamSections.orderIndex));
  const questions = await db
    .select()
    .from(readingQuestions)
    .where(inArray(readingQuestions.sectionId, sectionRows.map((section) => section.id)));
  const options = await db.select().from(readingOptions).where(inArray(readingOptions.questionId, questions.map((question) => question.id)));
  const answers = await db.select().from(readingUserAnswers).where(eq(readingUserAnswers.sessionId, session.id));

  const answerByQuestion = new Map(answers.map((answer) => [answer.questionId, answer]));
  const correctByQuestion = new Map(options.filter((option) => option.isCorrect).map((option) => [option.questionId, option]));

  let score = 0;
  const sectionSummary = sectionRows.map((section) => ({ sectionCode: section.sectionCode, score: 0, scoreMax: section.pointsMax }));
  const summaryBySection = new Map(sectionSummary.map((summary) => [summary.sectionCode, summary]));
  const corrections = questions.map((question) => {
    const answer = answerByQuestion.get(question.id);
    const correct = correctByQuestion.get(question.id);
    const isCorrect = Boolean(answer && correct && answer.selectedOptionCode === correct.code);
    if (isCorrect) {
      score += question.points;
      const section = sectionRows.find((item) => item.id === question.sectionId);
      if (section) summaryBySection.get(section.sectionCode)!.score += question.points;
    }
    return {
      questionId: question.id,
      questionNumber: question.questionNumber,
      questionText: question.questionText,
      selectedOptionCode: answer?.selectedOptionCode ?? null,
      correctOptionCode: correct?.code ?? null,
      explanation: correct?.explanation ?? null,
      isCorrect,
      points: isCorrect ? question.points : 0,
      pointsMax: question.points,
    };
  });

  for (const correction of corrections) {
    const answer = answerByQuestion.get(correction.questionId);
    if (answer) await db.update(readingUserAnswers).set({ isCorrect: correction.isCorrect }).where(eq(readingUserAnswers.id, answer.id));
  }

  const percentage = session.scoreMax ? Math.round((score / session.scoreMax) * 100) : 0;
  if (session.status === 'in_progress') {
    const finishedAt = new Date();
    await db.update(readingExamSessions).set({ status: 'completed', finishedAt, scoreObtained: score, percentage }).where(and(eq(readingExamSessions.id, session.id), eq(readingExamSessions.status, 'in_progress')));
    shouldCompleteSharedAttempt = true;
  }
  if (shouldCompleteSharedAttempt) {
    const finishedAt = session.finishedAt ?? new Date();
    await db.update(attempts).set({
      status: 'completed', submittedAt: finishedAt, lastSavedAt: finishedAt,
      scoreObtained: score, scoreMax: session.scoreMax ?? exam.scoreMax, percentage,
    }).where(and(eq(attempts.id, sharedAttemptId), eq(attempts.status, 'in_progress')));
    await syncProgressAfterCompletion(c.env.DB, { userId: user.id, attemptId: sharedAttemptId, skill: 'reading', level: exam.level });
  }

  return c.json({
    score,
    scoreMax: session.scoreMax ?? 105,
    percentage,
    sectionSummary,
    corrections,
  });
});

async function createReadingAttempt(dbBinding: D1Database, userId: string, contentItemId: string) {
  const now = new Date();
  const attempt = {
    id: nanoid(), userId, contentItemId, skill: 'reading' as const, mode: 'practice' as const,
    status: 'in_progress' as const, startedAt: now, lastSavedAt: now, elapsedSeconds: 0, stateVersion: 1,
  };
  await getDb(dbBinding).insert(attempts).values(attempt);
  return attempt;
}

export async function loadExamDetail(dbBinding: D1Database, examId: string, includeAnswers: boolean) {
  const db = getDb(dbBinding);
  const [exam] = await db.select().from(readingExams).where(eq(readingExams.id, examId)).limit(1);
  const sections = await db
    .select()
    .from(readingExamSections)
    .where(eq(readingExamSections.examId, examId))
    .orderBy(asc(readingExamSections.orderIndex));
  const questions = sections.length
    ? await db
        .select()
        .from(readingQuestions)
        .where(inArray(readingQuestions.sectionId, sections.map((section) => section.id)))
        .orderBy(asc(readingQuestions.orderIndex))
    : [];
  const options = questions.length
    ? await db
        .select()
        .from(readingOptions)
        .where(inArray(readingOptions.questionId, questions.map((question) => question.id)))
        .orderBy(asc(readingOptions.orderIndex))
    : [];

  return {
    ...exam,
    sections: sections.map((section) => ({
      ...section,
      extraData: section.extraDataJson ? JSON.parse(section.extraDataJson) : null,
      questions: questions
        .filter((question) => question.sectionId === section.id)
        .map((question) => ({
          ...question,
          options: options
            .filter((option) => option.questionId === question.id)
            .map((option) =>
              includeAnswers
                ? option
                : {
                    id: option.id,
                    questionId: option.questionId,
                    code: option.code,
                    text: option.text,
                    orderIndex: option.orderIndex,
                  },
            ),
        })),
    })),
  };
}

export default app;
