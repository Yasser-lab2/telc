import { Hono } from 'hono';
import { horenAudios } from '../data/exercises';
import { apiError } from '../lib/http';
import { authMiddleware } from '../middleware/auth';
import { subscriptionMiddleware } from '../middleware/subscription';
import type { Env } from '../types';

const app = new Hono<Env>();

app.use('*', authMiddleware, subscriptionMiddleware);

app.get('/', (c) => c.json({ audios: horenAudios.map(({ transcript: _transcript, questions: _questions, ...audio }) => audio) }));

app.get('/:audioId', (c) => {
  const audio = horenAudios.find((item) => item.id === c.req.param('audioId'));
  if (!audio) return apiError(c, 404, 'Horen audio not found', 'NOT_FOUND');
  return c.json({ audio });
});

export default app;
