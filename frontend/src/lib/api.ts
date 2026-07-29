const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8787';

export type User = {
  id: string;
  email: string;
  displayName: string;
  niveau: 'B1' | 'B2' | 'B1_B2';
  role: 'student' | 'admin';
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
    selectedOptionCode: string | null;
    correctOptionCode: string | null;
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
    throw new Error(`${data.error ?? 'Request failed'}${details}`);
  }
  return data as T;
}

export const apiClient = {
  me: () => api<MeResponse>('/api/me'),
  register: (payload: { email: string; password: string; displayName: string; niveau: string }) =>
    api<MeResponse>('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload: { email: string; password: string }) =>
    api<MeResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  logout: () => api<{ ok: true }>('/api/auth/logout', { method: 'POST' }),
  plans: () => api<{ plans: Plan[] }>('/api/plans'),
  createPayment: (planId: string) =>
    api<{ paymentId: string; whatsappUrl: string }>('/api/payments/manual/create', {
      method: 'POST',
      body: JSON.stringify({ planId }),
    }),
  myPayments: () => api<{ payments: Array<Record<string, unknown>> }>('/api/payments/manual/my'),
  adminPayments: () => api<{ payments: Array<Record<string, unknown>> }>('/api/admin/payments/pending'),
  adminStats: () => api<Record<string, number>>('/api/admin/stats'),
  approvePayment: (id: string) => api<{ ok: true; expiresAt: string }>(`/api/admin/payments/${id}/approve`, { method: 'POST' }),
  rejectPayment: (id: string) => api<{ ok: true }>(`/api/admin/payments/${id}/reject`, { method: 'POST' }),
  usage: () => api<{ limit: number; used: number; remaining: number; date: string }>('/api/usage'),
  lesen: () => api<{ themes: Array<{ id: string; title: string; niveau: string }> }>('/api/lesen'),
  lesenTheme: (id: string) =>
    api<{ theme: { id: string; title: string; niveau: string; text: string; questions: Question[] } }>(`/api/lesen/${id}`),
  readingExams: () => api<{ exams: ReadingExamListItem[] }>('/api/reading/exams'),
  readingExam: (id: string) => api<{ exam: ReadingExamDetail }>(`/api/reading/exams/${id}`),
  startReadingExam: (id: string) => api<{ session: { id: string } }>(`/api/reading/exams/${id}/start`, { method: 'POST' }),
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
    api<{ audio: { id: string; title: string; niveau: string; audioUrl: string; transcript: string; questions: Question[] } }>(
      `/api/horen/${id}`,
    ),
  schreiben: () => api<{ types: Array<{ id: string; title: string; niveau: string; context: string }> }>('/api/schreiben'),
  schreibenType: (id: string) =>
    api<{ type: { id: string; title: string; niveau: 'B1' | 'B2'; context: string } }>(`/api/schreiben/${id}`),
  grade: (payload: { userText: string; niveau: 'B1' | 'B2'; themaType: string; themaContext: string }) =>
    api<{ result: GradingResult; usage: { limit: number; used: number } }>('/api/ai/grade', {
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
