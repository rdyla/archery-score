import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { clerkAuth } from '../middleware/auth';
import { upsertShooter, getShooter } from '../db/queries';
import type { Env } from '../types';

const app = new Hono<{ Bindings: Env; Variables: { userId: string; userEmail: string | null } }>();

// GET /api/me — get or create the current user's shooter profile
app.get('/me', clerkAuth, async (c) => {
  const userId = c.get('userId');
  const shooter = await getShooter(c.env.DB, userId);
  if (!shooter) {
    return c.json({ error: 'Profile not found — call POST /api/me to create' }, 404);
  }
  return c.json(shooter);
});

// POST /api/me — upsert profile (called after first sign-in)
app.post(
  '/me',
  clerkAuth,
  zValidator(
    'json',
    z.object({
      name: z.string().min(1).max(100),
      email: z.string().email().optional().nullable(),
      avatar_url: z.string().url().optional().nullable(),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const { name, email, avatar_url } = c.req.valid('json');
    const shooter = await upsertShooter(
      c.env.DB,
      userId,
      name,
      email ?? c.get('userEmail'),
      avatar_url ?? null
    );
    return c.json(shooter);
  }
);

export default app;
