import { relations } from 'drizzle-orm';
import { integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name').notNull(),
  niveau: text('niveau', { enum: ['B1', 'B2', 'B1_B2'] }).default('B1'),
  role: text('role', { enum: ['student', 'admin'] }).default('student'),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  lastSeenAt: integer('last_seen_at', { mode: 'timestamp' }),
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  userAgent: text('user_agent'),
  ip: text('ip'),
});

export const plans = sqliteTable('plans', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  durationDays: integer('duration_days').notNull(),
  priceMad: real('price_mad').notNull(),
  aiCreditsPerDay: integer('ai_credits_per_day').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
});

export const manualPayments = sqliteTable('manual_payments', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  planId: text('plan_id').notNull().references(() => plans.id),
  amountMad: real('amount_mad').notNull(),
  status: text('status', { enum: ['pending', 'approved', 'rejected'] }).default('pending'),
  whatsappSentAt: integer('whatsapp_sent_at', { mode: 'timestamp' }),
  approvedAt: integer('approved_at', { mode: 'timestamp' }),
  approvedByAdmin: text('approved_by_admin'),
  proofImageUrl: text('proof_image_url'),
  note: text('note'),
  createdAt: integer('created_at', { mode: 'timestamp' }),
});

export const subscriptions = sqliteTable('subscriptions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  planId: text('plan_id').notNull().references(() => plans.id),
  paymentId: text('payment_id').references(() => manualPayments.id),
  status: text('status', { enum: ['trial', 'active', 'expired', 'cancelled'] }).default('trial'),
  startsAt: integer('starts_at', { mode: 'timestamp' }),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }),
});

export const usageLimits = sqliteTable(
  'usage_limits',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    date: text('date').notNull(),
    aiCreditsUsed: integer('ai_credits_used').default(0),
    updatedAt: integer('updated_at', { mode: 'timestamp' }),
  },
  (table) => ({
    userDateIdx: uniqueIndex('usage_limits_user_date_idx').on(table.userId, table.date),
  }),
);

export const aiSubmissions = sqliteTable('ai_submissions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  themaType: text('thema_type').notNull(),
  niveau: text('niveau').notNull(),
  userText: text('user_text').notNull(),
  scoreTotal: integer('score_total'),
  scoreInhalt: integer('score_inhalt'),
  scoreRedemittel: integer('score_redemittel'),
  scoreKorrektheit: integer('score_korrektheit'),
  niveauVocab: text('niveau_vocab'),
  aiFeedback: text('ai_feedback'),
  improvedText: text('improved_text'),
  feedbackAr: text('feedback_ar'),
  latencyMs: integer('latency_ms'),
  submittedAt: integer('submitted_at', { mode: 'timestamp' }),
});

export const readingExams = sqliteTable('reading_exams', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  level: text('level', { enum: ['B1', 'B2'] }).default('B1').notNull(),
  durationMinutes: integer('duration_minutes').default(90).notNull(),
  scoreMax: real('score_max').default(105).notNull(),
  accessStatus: text('access_status', { enum: ['free', 'premium'] }).default('premium').notNull(),
  status: text('status', { enum: ['draft', 'published'] }).default('draft').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
});

export const readingExamSections = sqliteTable('reading_exam_sections', {
  id: text('id').primaryKey(),
  examId: text('exam_id').notNull().references(() => readingExams.id, { onDelete: 'cascade' }),
  sectionCode: text('section_code', { enum: ['teil1', 'teil2', 'teil3', 'sprach1', 'sprach2'] }).notNull(),
  title: text('title').notNull(),
  instructions: text('instructions'),
  mainText: text('main_text'),
  exerciseType: text('exercise_type').notNull(),
  extraDataJson: text('extra_data_json'),
  orderIndex: integer('order_index').notNull(),
  pointsMax: real('points_max').notNull(),
});

export const readingQuestions = sqliteTable('reading_questions', {
  id: text('id').primaryKey(),
  sectionId: text('section_id').notNull().references(() => readingExamSections.id, { onDelete: 'cascade' }),
  questionNumber: integer('question_number').notNull(),
  questionText: text('question_text').notNull(),
  points: real('points').notNull(),
  answerType: text('answer_type').notNull(),
  orderIndex: integer('order_index').notNull(),
});

export const readingOptions = sqliteTable('reading_options', {
  id: text('id').primaryKey(),
  questionId: text('question_id').notNull().references(() => readingQuestions.id, { onDelete: 'cascade' }),
  code: text('code').notNull(),
  text: text('text').notNull(),
  isCorrect: integer('is_correct', { mode: 'boolean' }).default(false).notNull(),
  explanation: text('explanation'),
  orderIndex: integer('order_index').notNull(),
});

export const readingExamSessions = sqliteTable('reading_exam_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  examId: text('exam_id').notNull().references(() => readingExams.id, { onDelete: 'cascade' }),
  startedAt: integer('started_at', { mode: 'timestamp' }),
  finishedAt: integer('finished_at', { mode: 'timestamp' }),
  status: text('status', { enum: ['in_progress', 'completed', 'abandoned'] }).default('in_progress').notNull(),
  scoreObtained: real('score_obtained'),
  scoreMax: real('score_max'),
  percentage: real('percentage'),
});

export const readingUserAnswers = sqliteTable(
  'reading_user_answers',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id').notNull().references(() => readingExamSessions.id, { onDelete: 'cascade' }),
    questionId: text('question_id').notNull().references(() => readingQuestions.id, { onDelete: 'cascade' }),
    selectedOptionCode: text('selected_option_code').notNull(),
    isCorrect: integer('is_correct', { mode: 'boolean' }).default(false),
    timeSpentSeconds: integer('time_spent_seconds'),
    answeredAt: integer('answered_at', { mode: 'timestamp' }),
  },
  (table) => ({
    sessionQuestionIdx: uniqueIndex('reading_user_answers_session_question_idx').on(table.sessionId, table.questionId),
  }),
);

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  subscriptions: many(subscriptions),
  payments: many(manualPayments),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export type User = typeof users.$inferSelect;
export type Plan = typeof plans.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type ManualPayment = typeof manualPayments.$inferSelect;
export type ReadingExam = typeof readingExams.$inferSelect;
