import { Hono } from 'hono';
import { clerkAuth } from '../middleware/auth';
import type { Env } from '../types';

const app = new Hono<{ Bindings: Env; Variables: { userId: string; userEmail: string | null } }>();

// GET /api/images/:key* — serve a user's target image from R2
app.get('/*', clerkAuth, async (c) => {
  const userId = c.get('userId');
  const key = c.req.param('*') ?? '';

  // Keys are always {userId}/{roundId}/end-{n}-{ts}.jpg — enforce ownership
  if (!key || !key.startsWith(`${userId}/`)) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const object = await c.env.IMAGES.get(key);
  if (!object) return c.json({ error: 'Not found' }, 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('cache-control', 'private, max-age=3600');

  return new Response(object.body, { headers });
});

export default app;
