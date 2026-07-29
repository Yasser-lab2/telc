import type { Context } from 'hono';
import type { ApiErrorCode, Env } from '../types';

export function apiError(c: Context<Env>, status: 400 | 401 | 403 | 404 | 429 | 500, error: string, code: ApiErrorCode) {
  return c.json({ error, code }, status);
}

export function publicUser(user: {
  id: string;
  email: string;
  displayName: string;
  niveau: string | null;
  role: string | null;
}) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    niveau: user.niveau,
    role: user.role,
  };
}
