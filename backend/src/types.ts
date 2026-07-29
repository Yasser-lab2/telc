import type { User } from './db/schema';

export type Env = {
  Bindings: {
    DB: D1Database;
    GEMINI_API_KEY?: string;
    SESSION_SECRET: string;
    ADMIN_EMAIL: string;
    WHATSAPP_NUMBER: string;
    CIH_ACCOUNT_NUMBER: string;
    APP_URL: string;
  };
  Variables: {
    user: User;
  };
};

export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'NO_SUBSCRIPTION'
  | 'LIMIT_EXCEEDED'
  | 'AI_UNAVAILABLE'
  | 'INTERNAL_ERROR';

export type GradingResult = {
  score_inhalt: number;
  score_redemittel: number;
  score_korrektheit: number;
  score_total: number;
  niveau_vocab: 'A2' | 'B1' | 'B2' | 'C1';
  errors: Array<{ type: string; original: string; correction: string }>;
  suggestions: string[];
  improved_text: string;
  feedback_ar: string;
};
