import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import shootersRoute from './routes/shooters';
import roundsRoute from './routes/rounds';
import analyzeRoute from './routes/analyze';
import imagesRoute from './routes/images';
import type { Env } from './types';

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('*', logger());
app.use(
  '/api/*',
  cors({
    origin: [
      'http://localhost:5173',
      'https://archery-score.pages.dev',
      // Add your custom domain here
    ],
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// Health check
app.get('/', (c) => c.json({ status: 'ok', service: 'archery-score-api' }));

// Routes
app.route('/api', shootersRoute);
app.route('/api/rounds', roundsRoute);
app.route('/api/analyze', analyzeRoute);
app.route('/api/images', imagesRoute);

// 404 handler
app.notFound((c) => c.json({ error: 'Not found' }, 404));

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

export default app;
