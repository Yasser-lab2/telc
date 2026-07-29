import { Hono } from 'hono';
import { apiError } from '../lib/http';
import { authMiddleware } from '../middleware/auth';
import { subscriptionMiddleware } from '../middleware/subscription';
import type { Env } from '../types';

const app = new Hono<Env>();

app.use('*', authMiddleware, subscriptionMiddleware);

app.get('/', (c) => c.json({ themes: [] }));

app.get('/:themeId', (c) => {
  return apiError(c, 404, 'Use /api/reading/exams for database-backed Lesen exams', 'NOT_FOUND');
});

export default app;
