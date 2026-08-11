const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8787';

export type AppRole = 'student' | 'support' | 'content_editor' | 'admin';
export type Permission = 'admin.access' | 'analytics.view' | 'payments.review' | 'users.view' | 'users.manage' | 'users.roles' | 'subscriptions.manage' | 'content.manage';

export type User = {
  id: string;
  email: string;
  displayName: string;
  niveau: 'B1' | 'B2' | 'B1_B2';
  role: AppRole;
  emailVerified: boolean;
  permissions: Permission[];
};

export type SubscriptionState =
  | {
      isActive: true;
      status: 'trial' | 'active';
      planId: string;
      planName: string;
      expiresAt: string;
      aiCreditsPerDay: number;
    }
  | { isActive: false };

export type MeResponse = {
  user: User;
  subscription: SubscriptionState;
};

export type Plan = {
  id: string;
  name: string;
  durationDays: number;
  priceMad: number;
  aiCreditsPerDay: number;
  isActive: boolean;
};

export type UserPreferences = {
  userId?: string;
  locale: 'fr' | 'de';
  emailStudyReminders: boolean;
  emailProductUpdates: boolean;
  updatedAt?: string;
};

export type AdminStats = {
  generatedAt: string;
  overview: { totalUsers: number; newUsers7d: number; activeLearners7d: number };
  learning: { attemptsStarted7d: number; attemptsCompleted7d: number; completionRate7d: number; averageScore7d: number };
  subscriptions: { active: number; trial: number; usersWithExpiredHistory: number };
  payments: { pending: number; approved30d: number; rejected30d: number; revenueMad30d: number; averageReviewHours30d: number };
  ai: { submissionsToday: number; averageLatencyMs7d: number };
  content: { published: number; drafts: number };
};

export type SimulationSession = {
  id: string; title: string; level: 'B1' | 'B2'; status: 'in_progress' | 'completed' | 'expired' | 'abandoned';
  startedAt: string; expiresAt: string; finishedAt: string | null; percentage: number | null;
  modules: Array<{ id: string; title: string; skill: 'reading' | 'listening' | 'writing'; orderIndex: number; durationMinutes: number; weight: number; resultStatus: 'locked' | 'available' | 'in_progress' | 'completed'; percentage: number | null }>;
};

export type AdminLearningPayload = {
  skill: 'listening' | 'writing'; title: string; level: 'B1' | 'B2'; status: 'draft' | 'published';
  accessStatus: 'free' | 'premium'; difficulty: 'introductory' | 'standard' | 'advanced'; durationMinutes?: number;
  context?: string; audioUrl?: string; transcript?: string; maxPlays?: number;
  questions?: Array<{ prompt: string; explanation?: string; correctCode: string; options: Array<{ code: string; label: string }> }>;
};

export type Question = {
  id: string;
  prompt: string;
  options: string[];
  answerIndex: number;
};

export type ReadingExamListItem = {
  id: string;
  title: string;
  level: 'B1' | 'B2';
  durationMinutes: number;
  scoreMax: number;
  accessStatus: 'free' | 'premium';
  status: 'draft' | 'published';
  createdAt: string | null;
  updatedAt: string | null;
};

export type ReadingOption = {
  id: string;
  questionId: string;
  code: string;
  text: string;
  orderIndex: number;
  isCorrect?: boolean;
  explanation?: string | null;
};

export type ReadingQuestion = {
  id: string;
  sectionId: string;
  questionNumber: number;
  questionText: string;
  points: number;
  answerType: string;
  orderIndex: number;
  options: ReadingOption[];
};

export type ReadingSection = {
  id: string;
  examId: string;
  sectionCode: 'teil1' | 'teil2' | 'teil3' | 'sprach1' | 'sprach2';
  title: string;
  instructions: string | null;
  mainText: string | null;
  exerciseType: 'matching_titles' | 'multiple_choice' | 'matching_ads' | 'gap_three_options' | 'gap_word_bank' | string;
  extraData: unknown;
  orderIndex: number;
  pointsMax: number;
  questions: ReadingQuestion[];
};

export type ReadingExamDetail = ReadingExamListItem & {
  sections: ReadingSection[];
};

export type ReadingSubmitResult = {
  score: number;
  scoreMax: number;
  percentage: number;
  sectionSummary: Array<{ sectionCode: string; score: number; scoreMax: number }>;
  corrections: Array<{
    questionId: string;
    questionNumber: number;
    questionText: string;
    selectedOptionCode: string | null;
    correctOptionCode: string | null;
    explanation: string | null;
    isCorrect: boolean;
    points: number;
    pointsMax: number;
  }>;
};

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const details = Array.isArray(data.details) ? `\n${data.details.join('\n')}` : '';
    const requestId = typeof data.requestId === 'string' ? `\nRéférence: ${data.requestId}` : '';
    throw new Error(`${data.error ?? 'Request failed'}${details}${requestId}`);
  }
  return data as T;
}

async function apiForm<T>(path: string, body: FormData): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { method: 'POST', body, credentials: 'include' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? 'Request failed');
  return data as T;
}

export const apiClient = {
  me: () => api<MeResponse>('/api/me'),
  register: (payload: { email: string; password: string; displayName: string; niveau: string; acceptTerms: true }) =>
    api<{ user: User; subscription?: SubscriptionState; verificationRequired: boolean; devVerificationUrl?: string | null }>('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload: { email: string; password: string }) =>
    api<{ user: User; subscription?: SubscriptionState }>('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  logout: () => api<{ ok: true }>('/api/auth/logout', { method: 'POST' }),
  updateProfile: (payload: { displayName: string; niveau: 'B1' | 'B2' | 'B1_B2' }) =>
    api<{ user: User }>('/api/auth/profile', { method: 'PATCH', body: JSON.stringify(payload) }),
  preferences: () => api<{ preferences: UserPreferences }>('/api/auth/preferences'),
  updatePreferences: (payload: UserPreferences) => api<{ preferences: UserPreferences }>('/api/auth/preferences', { method: 'PATCH', body: JSON.stringify(payload) }),
  exportAccount: () => api<Record<string, unknown>>('/api/auth/account/export'),
  deleteAccount: (password: string) => api<{ ok: true }>('/api/auth/account', { method: 'DELETE', body: JSON.stringify({ password }) }),
  confirmEmail: (token: string) => api<{ ok: true }>('/api/auth/verification/confirm', { method: 'POST', body: JSON.stringify({ token }) }),
  resendVerification: () => api<{ ok: true; alreadyVerified: boolean; devVerificationUrl?: string | null }>('/api/auth/verification/resend', { method: 'POST' }),
  forgotPassword: (email: string) => api<{ ok: true; message: string; devResetUrl?: string | null }>('/api/auth/password/forgot', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token: string, password: string) => api<{ ok: true }>('/api/auth/password/reset', { method: 'POST', body: JSON.stringify({ token, password }) }),
  sessions: () => api<{ sessions: Array<{ id: string; createdAt: string; expiresAt: string; userAgent: string | null; ip: string | null; current: boolean }> }>('/api/auth/sessions'),
  revokeSession: (id: string) => api<{ ok: true; currentRevoked: boolean }>(`/api/auth/sessions/${id}`, { method: 'DELETE' }),
  revokeAllSessions: () => api<{ ok: true }>('/api/auth/sessions/revoke-all', { method: 'POST' }),
  plans: () => api<{ plans: Plan[] }>('/api/plans'),
  createPayment: (planId: string) =>
    api<{ paymentId: string; whatsappUrl: string; reused: boolean }>('/api/payments/manual/create', {
      method: 'POST',
      body: JSON.stringify({ planId }),
    }),
  myPayments: () => api<{ payments: Array<Record<string, unknown>> }>('/api/payments/manual/my'),
  uploadPaymentProof: (id: string, file: File) => { const body = new FormData(); body.append('proof', file); return apiForm<{ ok: true; fileName: string }>(`/api/payments/manual/${id}/proof`, body); },
  adminPayments: () => api<{ payments: Array<Record<string, unknown>> }>('/api/admin/payments/pending'),
  adminStats: () => api<AdminStats>('/api/admin/stats'),
  adminUsers: (q = '') => api<{ users: Array<{
    id: string; email: string; displayName: string; niveau: 'B1' | 'B2' | 'B1_B2'; role: AppRole;
    createdAt: string; lastSeenAt: string; completedAttempts: number;
    subscription: { id: string; status: string; expiresAt: string; planName: string } | null;
  }> }>(`/api/admin/users${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  adminUserDetail: (id: string) => api<{
    user: { id: string; email: string; displayName: string; niveau: 'B1' | 'B2' | 'B1_B2'; role: AppRole; createdAt: string; lastSeenAt: string };
    subscriptions: Array<{ subscription: { id: string; status: string; expiresAt: string }; plan: { name: string } }>;
    payments: Array<{ payment: { id: string; status: string; amountMad: number; createdAt: string }; plan: { name: string } }>;
    progress: Array<{ id: string; skill: string; level: string; completedAttempts: number; averagePercentage: number | null }>;
    recentActivity: Array<{ id: string; occurredAt: string; eventType: string; skill: string; title: string; percentage: number | null }>;
  }>(`/api/admin/users/${id}`),
  updateAdminUser: (id: string, payload: { displayName?: string; niveau?: 'B1' | 'B2' | 'B1_B2'; role?: AppRole }) => api<{ ok: true }>(`/api/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  extendAdminSubscription: (id: string, days: number, planId = 'monthly') => api<{ ok: true; expiresAt: string }>(`/api/admin/users/${id}/subscription/extend`, { method: 'POST', body: JSON.stringify({ days, planId }) }),
  cancelAdminSubscription: (id: string) => api<{ ok: true }>(`/api/admin/users/${id}/subscription/cancel`, { method: 'POST' }),
  adminLearningContent: () => api<{ items: Array<{ id: string; title: string; skill: string; level: 'B1' | 'B2'; status: 'draft' | 'published' | 'archived'; accessStatus: 'free' | 'premium'; difficulty: string }> }>('/api/admin/content'),
  adminContentAnalytics: () => api<{ items: Array<{ id: string; title: string; skill: string; status: string; starts: number; completions: number; abandonments: number; averageScore: number | null }> }>('/api/admin/content/analytics'),
  adminLearningDetail: (id: string) => api<{ item: Record<string, unknown> & { id: string; skill: string; title: string; level: 'B1' | 'B2'; status: 'draft' | 'published' | 'archived'; accessStatus: 'free' | 'premium'; difficulty: 'introductory' | 'standard' | 'advanced'; durationMinutes: number | null; instructions: string | null; metadata: unknown; sections: Array<{ body: string | null; questions: Array<{ prompt: string; explanation: string | null; options: Array<{ code: string; label: string; isCorrect: boolean }> }> }>; media: Array<{ role: string; asset: { sourceUrl: string | null } }> } }>(`/api/admin/content/${id}`),
  createAdminLearningContent: (payload: AdminLearningPayload) => api<{ item: { id: string } }>('/api/admin/content', { method: 'POST', body: JSON.stringify(payload) }),
  updateAdminLearningContent: (id: string, payload: AdminLearningPayload) => api<{ item: { id: string } }>(`/api/admin/content/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  archiveAdminLearningContent: (id: string) => api<{ ok: true }>(`/api/admin/content/${id}/archive`, { method: 'POST' }),
  adminSimulationCandidates: () => api<{ items: Array<{ id: string; title: string; skill: 'reading' | 'listening' | 'writing'; level: 'B1' | 'B2'; durationMinutes: number | null }> }>('/api/admin/simulations/candidates'),
  adminSimulations: () => api<{ simulations: Array<{ id: string; title: string; level: 'B1' | 'B2'; status: 'draft' | 'published' | 'archived'; durationMinutes: number; modules: Array<{ id: string; title: string; skill: string; durationMinutes: number }> }> }>('/api/admin/simulations'),
  createAdminSimulation: (payload: { title: string; level: 'B1' | 'B2'; accessStatus: 'free' | 'premium'; durationMinutes: number; instructions?: string; modules: Array<{ contentItemId: string; durationMinutes: number; weight: number }> }) => api<{ simulation: { id: string } }>('/api/admin/simulations', { method: 'POST', body: JSON.stringify(payload) }),
  publishAdminSimulation: (id: string) => api<{ ok: true }>(`/api/admin/simulations/${id}/publish`, { method: 'POST' }),
  archiveAdminSimulation: (id: string) => api<{ ok: true }>(`/api/admin/simulations/${id}/archive`, { method: 'POST' }),
  approvePayment: (id: string) => api<{ ok: true; expiresAt: string; alreadyProcessed: boolean }>(`/api/admin/payments/${id}/approve`, { method: 'POST' }),
  rejectPayment: ({ id, reason }: { id: string; reason: string }) => api<{ ok: true; alreadyProcessed: boolean }>(`/api/admin/payments/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  paymentProofUrl: (id: string) => `${API_URL}/api/admin/payments/${id}/proof`,
  usage: () => api<{ limit: number; used: number; remaining: number; date: string }>('/api/usage'),
  progress: () => api<{
    progress: Array<{ id: string; skill: string; level: string; completedAttempts: number; averagePercentage: number | null; bestPercentage: number | null }>;
    recentActivity: Array<{ id: string; skill: string; score: number | null; title: string; contentItemId: string; occurredAt: string }>;
    readiness: { score: number | null; confidence: 'insufficient' | 'preliminary' | 'reliable'; evidenceAttempts: number; hasSimulation: boolean; measuredSkills: string[]; explanation: string };
    studyGoal: { weeklyTarget: number; completed: number; weekStartsAt: string };
    mistakes: Array<{ id: string; skill: string; prompt: string; selectedAnswer: string | null; correctAnswer: string | null; explanation: string | null; occurrenceCount: number; status: 'open' | 'reviewed'; contentTitle: string }>;
    recommendations: Array<{ id: string; title: string; skill: string; level: string; difficulty: string; route: string; reason: string }>;
    trends: Array<{ id: string; skill: string; percentage: number | null; submittedAt: string; title: string }>;
  }>('/api/progress'),
  updateStudyGoal: (weeklyTarget: number) => api<{ ok: true }>('/api/progress/study-goal', { method: 'PATCH', body: JSON.stringify({ weeklyTarget }) }),
  reviewMistake: ({ id, reviewed }: { id: string; reviewed: boolean }) => api<{ ok: true }>(`/api/progress/mistakes/${id}`, { method: 'PATCH', body: JSON.stringify({ reviewed }) }),
  dismissRecommendation: (contentId: string) => api<{ ok: true }>(`/api/progress/recommendations/${contentId}/dismiss`, { method: 'POST' }),
  simulations: () => api<{ simulations: Array<{ id: string; title: string; level: 'B1' | 'B2'; durationMinutes: number; instructions: string | null }> }>('/api/simulations'),
  activeSimulation: () => api<{ session: SimulationSession | null }>('/api/simulations/sessions/active'),
  simulationSession: (id: string) => api<{ session: SimulationSession; serverTime: string }>(`/api/simulations/sessions/${id}`),
  simulationHistory: () => api<{ history: Array<{ id: string; title: string; level: string; status: string; startedAt: string; finishedAt: string | null; percentage: number | null }> }>('/api/simulations/history/my'),
  startSimulation: (id: string) => api<{ session: SimulationSession; resumed: boolean }>(`/api/simulations/${id}/start`, { method: 'POST' }),
  startSimulationModule: (sessionId: string, moduleId: string) => api<{ launchPath: string }>(`/api/simulations/sessions/${sessionId}/modules/${moduleId}/start`, { method: 'POST' }),
  completeSimulationModule: (sessionId: string, moduleId: string) => api<{ completed: boolean; percentage?: number; nextModuleId?: string }>(`/api/simulations/sessions/${sessionId}/modules/${moduleId}/complete`, { method: 'POST' }),
  lesen: () => api<{ themes: Array<{ id: string; title: string; niveau: string }> }>('/api/lesen'),
  lesenTheme: (id: string) =>
    api<{ theme: { id: string; title: string; niveau: string; text: string; questions: Question[] } }>(`/api/lesen/${id}`),
  readingExams: () => api<{ exams: ReadingExamListItem[] }>('/api/reading/exams'),
  readingExam: (id: string) => api<{ exam: ReadingExamDetail }>(`/api/reading/exams/${id}`),
  activeReadingSession: (id: string) => api<{
    session: { id: string; startedAt: string; status: string } | null;
    answers: Array<{ questionId: string; selectedOptionCode: string; timeSpentSeconds: number | null }>;
    serverTime?: string;
  }>(`/api/reading/exams/${id}/session`),
  readingHistory: (id: string) => api<{ history: Array<{
    id: string; startedAt: string; finishedAt: string; scoreObtained: number; scoreMax: number; percentage: number;
  }> }>(`/api/reading/exams/${id}/history`),
  startReadingExam: (id: string) => api<{ session: { id: string; startedAt: string; status: string } }>(`/api/reading/exams/${id}/start`, { method: 'POST' }),
  saveReadingAnswers: (sessionId: string, answers: Array<{ questionId: string; selectedOptionCode: string }>) =>
    api<{ ok: true }>(`/api/reading/sessions/${sessionId}/answers`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    }),
  submitReadingSession: (sessionId: string) =>
    api<ReadingSubmitResult>(`/api/reading/sessions/${sessionId}/submit`, { method: 'POST' }),
  adminReadingExams: () => api<{ exams: ReadingExamListItem[] }>('/api/admin/reading/exams'),
  createAdminReadingExam: (payload: {
    title: string;
    level: 'B1' | 'B2';
    durationMinutes: number;
    scoreMax: number;
    accessStatus: 'free' | 'premium';
  }) => api<{ exam: ReadingExamListItem }>('/api/admin/reading/exams', { method: 'POST', body: JSON.stringify(payload) }),
  saveAdminReadingContent: (id: string, payload: unknown) =>
    api<{ ok: true; validation: { ok: true } }>(`/api/admin/reading/exams/${id}/content`, { method: 'PUT', body: JSON.stringify(payload) }),
  publishAdminReadingExam: (id: string) => api<{ ok: true }>(`/api/admin/reading/exams/${id}/publish`, { method: 'POST' }),
  unpublishAdminReadingExam: (id: string) => api<{ ok: true }>(`/api/admin/reading/exams/${id}/unpublish`, { method: 'POST' }),
  deleteAdminReadingExam: (id: string) => api<{ ok: true }>(`/api/admin/reading/exams/${id}`, { method: 'DELETE' }),
  horen: () => api<{ audios: Array<{ id: string; title: string; niveau: string; audioUrl: string }> }>('/api/horen'),
  horenAudio: (id: string) =>
    api<{ audio: { id: string; title: string; niveau: string; audioUrl: string; maxPlays: number; questions: Array<{ id: string; prompt: string; options: Array<{ code: string; label: string }> }> } }>(
      `/api/horen/${id}`,
    ),
  activeListeningSession: (id: string) => api<{
    attempt: { id: string } | null; answers: Array<{ questionId: string; selectedOptionCode: string | null }>;
    playCount: number; maxPlays: number;
  }>(`/api/horen/${id}/session`),
  startListeningAttempt: (id: string) =>
    api<{ attempt: { id: string } }>(`/api/horen/${id}/start`, { method: 'POST' }),
  saveListeningAnswers: (sessionId: string, answers: Array<{ questionId: string; selectedOptionCode: string }>) =>
    api<{ ok: true }>(`/api/horen/sessions/${sessionId}/answers`, { method: 'POST', body: JSON.stringify({ answers }) }),
  registerListeningPlay: (sessionId: string) => api<{ playCount: number; maxPlays: number; remaining: number }>(`/api/horen/sessions/${sessionId}/play`, { method: 'POST' }),
  submitListeningAttempt: (sessionId: string) =>
    api<{ score: number; scoreMax: number; percentage: number; transcript: string; corrections: Array<{
      questionId: string; questionText: string; selectedOptionCode: string | null; correctOptionCode: string | null;
      explanation: string | null; isCorrect: boolean;
    }> }>(
      `/api/horen/sessions/${sessionId}/submit`, { method: 'POST' },
    ),
  listeningHistory: (id: string) => api<{ history: Array<{ id: string; submittedAt: string; score: number; scoreMax: number; percentage: number }> }>(`/api/horen/${id}/history`),
  schreiben: () => api<{ types: Array<{ id: string; title: string; niveau: string; context: string }> }>('/api/schreiben'),
  schreibenType: (id: string) =>
    api<{ type: { id: string; title: string; niveau: 'B1' | 'B2'; context: string } }>(`/api/schreiben/${id}`),
  startWritingDraft: (id: string) => api<{ attempt: { id: string; status: string }; draft: { text: string; wordCount: number; updatedAt: string } }>(`/api/schreiben/${id}/draft`, { method: 'POST' }),
  saveWritingDraft: (attemptId: string, text: string) => api<{ ok: true; savedAt: string; wordCount: number }>(`/api/schreiben/drafts/${attemptId}`, { method: 'PUT', body: JSON.stringify({ text }) }),
  writingHistory: () => api<{ submissions: Array<{ attemptId: string; contentItemId: string; title: string; level: string; submittedAt: string; percentage: number; userText: string; feedback: GradingResult }> }>('/api/schreiben/history/my'),
  grade: (payload: { userText: string; niveau: 'B1' | 'B2'; themaType: string; themaContext: string; attemptId: string }) =>
    api<{ result: GradingResult; usage: { limit: number; used: number }; attemptId: string; reused: boolean }>('/api/ai/grade', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

export type GradingResult = {
  score_inhalt: number;
  score_redemittel: number;
  score_korrektheit: number;
  score_total: number;
  niveau_vocab: string;
  errors: Array<{ type: string; original: string; correction: string }>;
  suggestions: string[];
  improved_text: string;
  feedback_ar: string;
};
