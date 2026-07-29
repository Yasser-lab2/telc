import type { MiddlewareHandler } from 'hono';
import { apiError } from '../lib/http';
import type { Env } from '../types';

export const adminMiddleware: MiddlewareHandler<Env> = async (c, next) => {
  const user = c.get('user');
  if (user.role !== 'admin') return apiError(c, 403, 'Admin access required', 'FORBIDDEN');
  await next();
};
