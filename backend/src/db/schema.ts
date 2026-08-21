import { relations } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name').notNull(),
  niveau: text('niveau', { enum: ['B1', 'B2', 'B1_B2'] }).default('B1'),
  role: text('role', { enum: ['student', 'support', 'content_editor', 'admin'] }).default('student'),
  emailVerifiedAt: integer('email_verified_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  lastSeenAt: integer('last_seen_at', { mode: 'timestamp' }),
});

export const accountTokens = sqliteTable(
  'account_tokens',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    type: text('type', { enum: ['email_verification', 'password_reset'] }).notNull(),
    tokenHash: text('token_hash').unique().notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    usedAt: integer('used_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => ({ userTypeIdx: index('account_tokens_user_type_idx').on(table.userId, table.type, table.createdAt) }),
);

export const rateLimits = sqliteTable('rate_limits', {
  key: text('key').primaryKey(),
  count: integer('count').default(0).notNull(),
  windowExpiresAt: integer('window_expires_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const userPreferences = sqliteTable('user_preferences', {
  userId: text('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  locale: text('locale', { enum: ['fr', 'de'] }).default('fr').notNull(),
  emailStudyReminders: integer('email_study_reminders', { mode: 'boolean' }).default(true).notNull(),
  emailProductUpdates: integer('email_product_updates', { mode: 'boolean' }).default(false).notNull(),
  personalizedRecommendations: integer('personalized_recommendations', { mode: 'boolean' }).default(true).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const userConsents = sqliteTable(
  'user_consents',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    documentType: text('document_type', { enum: ['terms', 'privacy'] }).notNull(),
    documentVersion: text('document_version').notNull(),
    acceptedAt: integer('accepted_at', { mode: 'timestamp' }).notNull(),
    ip: text('ip'),
    userAgent: text('user_agent'),
  },
  (table) => ({ userDocumentVersionIdx: uniqueIndex('user_consents_user_document_version_idx').on(table.userId, table.documentType, table.documentVersion) }),
);

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
  proofObjectKey: text('proof_object_key'),
  proofFileName: text('proof_file_name'),
  proofMimeType: text('proof_mime_type'),
  rejectionReason: text('rejection_reason'),
  reviewedAt: integer('reviewed_at', { mode: 'timestamp' }),
  note: text('note'),
  createdAt: integer('created_at', { mode: 'timestamp' }),
});

export const subscriptions = sqliteTable('subscriptions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  planId: text('plan_id').notNull().references(() => plans.id),
  paymentId: text('payment_id').unique().references(() => manualPayments.id),
  status: text('status', { enum: ['trial', 'active', 'expired', 'cancelled'] }).default('trial'),
  startsAt: integer('starts_at', { mode: 'timestamp' }),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }),
});

export const paymentStatusEvents = sqliteTable(
  'payment_status_events',
  {
    id: text('id').primaryKey(),
    paymentId: text('payment_id').notNull().references(() => manualPayments.id, { onDelete: 'cascade' }),
    status: text('status').notNull(),
    note: text('note'),
    actorUserId: text('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => ({ paymentCreatedIdx: index('payment_status_events_payment_created_idx').on(table.paymentId, table.createdAt) }),
);

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
  attemptId: text('attempt_id').unique().references(() => attempts.id, { onDelete: 'set null' }),
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
  aiProvider: text('ai_provider'),
  aiModel: text('ai_model'),
  promptVersion: text('prompt_version'),
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
  sharedAttemptId: text('shared_attempt_id').unique().references(() => attempts.id, { onDelete: 'set null' }),
  practiceScope: text('practice_scope', { enum: ['all', 'teil1', 'teil2', 'teil3', 'sprach1', 'sprach2'] }).default('all').notNull(),
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

// Shared learning core. Existing reading tables remain operational while content is migrated skill by skill.
export const contentItems = sqliteTable(
  'content_items',
  {
    id: text('id').primaryKey(),
    slug: text('slug').unique().notNull(),
    skill: text('skill', { enum: ['reading', 'listening', 'writing', 'speaking', 'simulation'] }).notNull(),
    kind: text('kind', { enum: ['exercise', 'exam', 'prompt', 'simulation'] }).notNull(),
    level: text('level', { enum: ['B1', 'B2'] }).notNull(),
    title: text('title').notNull(),
    description: text('description'),
    instructions: text('instructions'),
    status: text('status', { enum: ['draft', 'published', 'archived'] }).default('draft').notNull(),
    accessStatus: text('access_status', { enum: ['free', 'premium'] }).default('premium').notNull(),
    difficulty: text('difficulty', { enum: ['introductory', 'standard', 'advanced'] }).default('standard').notNull(),
    durationMinutes: integer('duration_minutes'),
    scoreMax: real('score_max'),
    tagsJson: text('tags_json'),
    metadataJson: text('metadata_json'),
    publishedAt: integer('published_at', { mode: 'timestamp' }),
    createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => ({
    catalogIdx: index('content_items_catalog_idx').on(table.status, table.skill, table.level),
  }),
);

export const contentSections = sqliteTable(
  'content_sections',
  {
    id: text('id').primaryKey(),
    contentItemId: text('content_item_id').notNull().references(() => contentItems.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    title: text('title').notNull(),
    instructions: text('instructions'),
    body: text('body'),
    exerciseType: text('exercise_type').notNull(),
    orderIndex: integer('order_index').notNull(),
    pointsMax: real('points_max'),
    settingsJson: text('settings_json'),
  },
  (table) => ({
    itemOrderIdx: uniqueIndex('content_sections_item_order_idx').on(table.contentItemId, table.orderIndex),
    itemCodeIdx: uniqueIndex('content_sections_item_code_idx').on(table.contentItemId, table.code),
  }),
);

export const contentQuestions = sqliteTable(
  'content_questions',
  {
    id: text('id').primaryKey(),
    sectionId: text('section_id').notNull().references(() => contentSections.id, { onDelete: 'cascade' }),
    number: integer('number').notNull(),
    prompt: text('prompt').notNull(),
    answerType: text('answer_type').notNull(),
    points: real('points').default(1).notNull(),
    explanation: text('explanation'),
    orderIndex: integer('order_index').notNull(),
    settingsJson: text('settings_json'),
  },
  (table) => ({
    sectionOrderIdx: uniqueIndex('content_questions_section_order_idx').on(table.sectionId, table.orderIndex),
  }),
);

export const contentOptions = sqliteTable(
  'content_options',
  {
    id: text('id').primaryKey(),
    questionId: text('question_id').notNull().references(() => contentQuestions.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    label: text('label').notNull(),
    isCorrect: integer('is_correct', { mode: 'boolean' }).default(false).notNull(),
    explanation: text('explanation'),
    orderIndex: integer('order_index').notNull(),
  },
  (table) => ({
    questionCodeIdx: uniqueIndex('content_options_question_code_idx').on(table.questionId, table.code),
    questionOrderIdx: uniqueIndex('content_options_question_order_idx').on(table.questionId, table.orderIndex),
  }),
);

export const mediaAssets = sqliteTable(
  'media_assets',
  {
    id: text('id').primaryKey(),
    objectKey: text('object_key').unique().notNull(),
    sourceUrl: text('source_url'),
    kind: text('kind', { enum: ['audio', 'image', 'document'] }).notNull(),
    fileName: text('file_name').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    durationSeconds: integer('duration_seconds'),
    altText: text('alt_text'),
    createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => ({ kindIdx: index('media_assets_kind_idx').on(table.kind) }),
);

export const contentItemMedia = sqliteTable(
  'content_item_media',
  {
    id: text('id').primaryKey(),
    contentItemId: text('content_item_id').notNull().references(() => contentItems.id, { onDelete: 'cascade' }),
    mediaAssetId: text('media_asset_id').notNull().references(() => mediaAssets.id, { onDelete: 'restrict' }),
    role: text('role').notNull(),
    orderIndex: integer('order_index').default(0).notNull(),
    settingsJson: text('settings_json'),
  },
  (table) => ({
    itemRoleOrderIdx: uniqueIndex('content_item_media_role_order_idx').on(table.contentItemId, table.role, table.orderIndex),
  }),
);

export const attempts = sqliteTable(
  'attempts',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    contentItemId: text('content_item_id').notNull().references(() => contentItems.id, { onDelete: 'restrict' }),
    skill: text('skill', { enum: ['reading', 'listening', 'writing', 'speaking', 'simulation'] }).notNull(),
    mode: text('mode', { enum: ['practice', 'exam'] }).default('practice').notNull(),
    status: text('status', { enum: ['in_progress', 'completed', 'abandoned'] }).default('in_progress').notNull(),
    startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
    lastSavedAt: integer('last_saved_at', { mode: 'timestamp' }).notNull(),
    submittedAt: integer('submitted_at', { mode: 'timestamp' }),
    elapsedSeconds: integer('elapsed_seconds').default(0).notNull(),
    scoreObtained: real('score_obtained'),
    scoreMax: real('score_max'),
    percentage: real('percentage'),
    stateVersion: integer('state_version').default(1).notNull(),
    metadataJson: text('metadata_json'),
  },
  (table) => ({
    userStatusIdx: index('attempts_user_status_idx').on(table.userId, table.status, table.lastSavedAt),
    contentIdx: index('attempts_content_idx').on(table.contentItemId, table.status),
  }),
);

export const attemptAnswers = sqliteTable(
  'attempt_answers',
  {
    id: text('id').primaryKey(),
    attemptId: text('attempt_id').notNull().references(() => attempts.id, { onDelete: 'cascade' }),
    questionId: text('question_id').notNull().references(() => contentQuestions.id, { onDelete: 'restrict' }),
    selectedOptionCode: text('selected_option_code'),
    textAnswer: text('text_answer'),
    answerJson: text('answer_json'),
    isCorrect: integer('is_correct', { mode: 'boolean' }),
    pointsAwarded: real('points_awarded'),
    timeSpentSeconds: integer('time_spent_seconds'),
    answeredAt: integer('answered_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => ({
    attemptQuestionIdx: uniqueIndex('attempt_answers_attempt_question_idx').on(table.attemptId, table.questionId),
  }),
);

export const writingDrafts = sqliteTable(
  'writing_drafts',
  {
    id: text('id').primaryKey(),
    attemptId: text('attempt_id').notNull().references(() => attempts.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    contentItemId: text('content_item_id').notNull().references(() => contentItems.id, { onDelete: 'restrict' }),
    text: text('text').default('').notNull(),
    wordCount: integer('word_count').default(0).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => ({
    attemptIdx: uniqueIndex('writing_drafts_attempt_idx').on(table.attemptId),
    userUpdatedIdx: index('writing_drafts_user_updated_idx').on(table.userId, table.updatedAt),
  }),
);

export const learnerProgress = sqliteTable(
  'learner_progress',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    skill: text('skill', { enum: ['reading', 'listening', 'writing', 'speaking', 'simulation'] }).notNull(),
    level: text('level', { enum: ['B1', 'B2'] }).notNull(),
    completedAttempts: integer('completed_attempts').default(0).notNull(),
    averagePercentage: real('average_percentage'),
    bestPercentage: real('best_percentage'),
    lastPracticedAt: integer('last_practiced_at', { mode: 'timestamp' }),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => ({
    userSkillLevelIdx: uniqueIndex('learner_progress_user_skill_level_idx').on(table.userId, table.skill, table.level),
  }),
);

export const activityEvents = sqliteTable(
  'activity_events',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    eventType: text('event_type').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    dedupeKey: text('dedupe_key').unique(),
    occurredAt: integer('occurred_at', { mode: 'timestamp' }).notNull(),
    metadataJson: text('metadata_json'),
  },
  (table) => ({
    userOccurredIdx: index('activity_events_user_occurred_idx').on(table.userId, table.occurredAt),
  }),
);

export const studyGoals = sqliteTable('study_goals', {
  userId: text('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }).notNull(),
  weeklyTarget: integer('weekly_target').default(3).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const mistakeItems = sqliteTable('mistake_items', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  attemptId: text('attempt_id').references(() => attempts.id, { onDelete: 'set null' }),
  contentItemId: text('content_item_id').notNull().references(() => contentItems.id, { onDelete: 'cascade' }),
  sourceQuestionId: text('source_question_id').notNull(),
  skill: text('skill').notNull(),
  prompt: text('prompt').notNull(),
  selectedAnswer: text('selected_answer'),
  correctAnswer: text('correct_answer'),
  explanation: text('explanation'),
  occurrenceCount: integer('occurrence_count').default(1).notNull(),
  status: text('status', { enum: ['open', 'reviewed'] }).default('open').notNull(),
  firstSeenAt: integer('first_seen_at', { mode: 'timestamp' }).notNull(),
  lastSeenAt: integer('last_seen_at', { mode: 'timestamp' }).notNull(),
  reviewedAt: integer('reviewed_at', { mode: 'timestamp' }),
}, (table) => ({ userQuestionIdx: uniqueIndex('mistake_items_user_question_idx').on(table.userId, table.contentItemId, table.sourceQuestionId) }));

export const dismissedRecommendations = sqliteTable('dismissed_recommendations', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  contentItemId: text('content_item_id').notNull().references(() => contentItems.id, { onDelete: 'cascade' }),
  dismissedAt: integer('dismissed_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({ pk: uniqueIndex('dismissed_recommendations_pk').on(table.userId, table.contentItemId) }));

export const simulationBlueprints = sqliteTable('simulation_blueprints', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  level: text('level', { enum: ['B1', 'B2'] }).notNull(),
  status: text('status', { enum: ['draft', 'published', 'archived'] }).default('draft').notNull(),
  accessStatus: text('access_status', { enum: ['free', 'premium'] }).default('premium').notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  instructions: text('instructions'),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  publishedAt: integer('published_at', { mode: 'timestamp' }),
});

export const speakingSubmissions = sqliteTable('speaking_submissions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  contentItemId: text('content_item_id').notNull().references(() => contentItems.id, { onDelete: 'restrict' }),
  objectKey: text('object_key').notNull().unique(),
  fileName: text('file_name').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  durationSeconds: integer('duration_seconds'),
  status: text('status', { enum: ['recorded', 'reviewed'] }).default('recorded').notNull(),
  consentedAt: integer('consented_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  deleteAfter: integer('delete_after', { mode: 'timestamp' }).notNull(),
  reviewedAt: integer('reviewed_at', { mode: 'timestamp' }),
  feedbackJson: text('feedback_json'),
  attemptId: text('attempt_id').unique().references(() => attempts.id, { onDelete: 'set null' }),
  reviewerUserId: text('reviewer_user_id').references(() => users.id, { onDelete: 'set null' }),
}, (table) => ({ userCreatedIdx: index('speaking_submissions_user_created_idx').on(table.userId, table.createdAt) }));

export const simulationModules = sqliteTable('simulation_modules', {
  id: text('id').primaryKey(),
  simulationId: text('simulation_id').notNull().references(() => simulationBlueprints.id, { onDelete: 'cascade' }),
  contentItemId: text('content_item_id').notNull().references(() => contentItems.id, { onDelete: 'restrict' }),
  skill: text('skill', { enum: ['reading', 'listening', 'writing'] }).notNull(),
  orderIndex: integer('order_index').notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  weight: real('weight').default(1).notNull(),
}, (table) => ({ simulationOrderIdx: uniqueIndex('simulation_modules_simulation_order_idx').on(table.simulationId, table.orderIndex) }));

export const simulationSessions = sqliteTable('simulation_sessions', {
  id: text('id').primaryKey(),
  simulationId: text('simulation_id').notNull().references(() => simulationBlueprints.id, { onDelete: 'restrict' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  attemptId: text('attempt_id').notNull().unique().references(() => attempts.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['in_progress', 'completed', 'expired', 'abandoned'] }).default('in_progress').notNull(),
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  finishedAt: integer('finished_at', { mode: 'timestamp' }),
  percentage: real('percentage'),
}, (table) => ({ userStatusIdx: index('simulation_sessions_user_status_idx').on(table.userId, table.status, table.startedAt) }));

export const simulationModuleResults = sqliteTable('simulation_module_results', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => simulationSessions.id, { onDelete: 'cascade' }),
  moduleId: text('module_id').notNull().references(() => simulationModules.id, { onDelete: 'restrict' }),
  childAttemptId: text('child_attempt_id').references(() => attempts.id, { onDelete: 'set null' }),
  status: text('status', { enum: ['locked', 'available', 'in_progress', 'completed'] }).default('locked').notNull(),
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  percentage: real('percentage'),
}, (table) => ({ sessionModuleIdx: uniqueIndex('simulation_module_results_session_module_idx').on(table.sessionId, table.moduleId) }));

export const simulationSchedules = sqliteTable('simulation_schedules', {
  id: text('id').primaryKey(), userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }), simulationId: text('simulation_id').notNull().references(() => simulationBlueprints.id, { onDelete: 'cascade' }), scheduledAt: integer('scheduled_at', { mode: 'timestamp' }).notNull(), reminderSentAt: integer('reminder_sent_at', { mode: 'timestamp' }), status: text('status', { enum: ['scheduled', 'cancelled', 'completed'] }).default('scheduled').notNull(), createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
export const referralCodes = sqliteTable('referral_codes', { code: text('code').primaryKey(), ownerUserId: text('owner_user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }), createdAt: integer('created_at', { mode: 'timestamp' }).notNull() });
export const referrals = sqliteTable('referrals', { id: text('id').primaryKey(), code: text('code').notNull().references(() => referralCodes.code, { onDelete: 'cascade' }), referrerUserId: text('referrer_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }), referredUserId: text('referred_user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }), status: text('status', { enum: ['registered', 'converted'] }).default('registered').notNull(), createdAt: integer('created_at', { mode: 'timestamp' }).notNull(), convertedAt: integer('converted_at', { mode: 'timestamp' }) });

export const adminAuditLogs = sqliteTable(
  'admin_audit_logs',
  {
    id: text('id').primaryKey(),
    actorUserId: text('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    targetType: text('target_type').notNull(),
    targetId: text('target_id').notNull(),
    metadataJson: text('metadata_json'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => ({
    targetIdx: index('admin_audit_logs_target_idx').on(table.targetType, table.targetId, table.createdAt),
    actorIdx: index('admin_audit_logs_actor_idx').on(table.actorUserId, table.createdAt),
  }),
);

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  subscriptions: many(subscriptions),
  payments: many(manualPayments),
  attempts: many(attempts),
  progress: many(learnerProgress),
  activityEvents: many(activityEvents),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export type User = typeof users.$inferSelect;
export type Plan = typeof plans.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type ManualPayment = typeof manualPayments.$inferSelect;
export type ReadingExam = typeof readingExams.$inferSelect;
export type ContentItem = typeof contentItems.$inferSelect;
export type Attempt = typeof attempts.$inferSelect;
export type LearnerProgress = typeof learnerProgress.$inferSelect;
