import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { clerkAuth } from '../middleware/auth';
import {
  createRound,
  getRound,
  getRoundWithEnds,
  listRounds,
  updateRoundStatus,
} from '../db/queries';
import type { Env } from '../types';

const app = new Hono<{ Bindings: Env; Variables: { userId: string; userEmail: string | null } }>();

const ROUND_PRESETS: Record<string, { label: string; ends: number; arrowsPerEnd: number }> = {
  '300': { label: 'Vegas 300', ends: 10, arrowsPerEnd: 3 },
  '600': { label: '600 Round', ends: 20, arrowsPerEnd: 3 },
  '900': { label: '900 Round', ends: 30, arrowsPerEnd: 3 },
};

// GET /api/rounds
app.get('/', clerkAuth, async (c) => {
  const userId = c.get('userId');
  const rounds = await listRounds(c.env.DB, userId);
  return c.json(rounds);
});

// POST /api/rounds
app.post(
  '/',
  clerkAuth,
  zValidator(
    'json',
    z.object({
      preset: z.enum(['300', '600', '900']).optional(),
      label: z.string().min(1).max(100).optional(),
      ends_total: z.number().int().min(1).max(60).optional(),
      arrows_per_end: z.number().int().min(1).max(6).optional().default(3),
      max_arrow_score: z.number().int().min(5).max(10).optional().default(10),
      notes: z.string().max(500).optional().nullable(),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const body = c.req.valid('json');

    let label: string;
    let endsTotal: number;
    let arrowsPerEnd: number;
    let maxArrowScore: number;

    if (body.preset) {
      const preset = ROUND_PRESETS[body.preset];
      label = body.label ?? preset.label;
      endsTotal = preset.ends;
      arrowsPerEnd = preset.arrowsPerEnd;
      maxArrowScore = body.max_arrow_score ?? 10;
    } else {
      if (!body.label || !body.ends_total) {
        return c.json({ error: 'label and ends_total are required for custom rounds' }, 400);
      }
      label = body.label;
      endsTotal = body.ends_total;
      arrowsPerEnd = body.arrows_per_end ?? 3;
      maxArrowScore = body.max_arrow_score ?? 10;
    }

    const id = crypto.randomUUID();
    const round = await createRound(
      c.env.DB,
      id,
      userId,
      label,
      endsTotal,
      arrowsPerEnd,
      maxArrowScore,
      body.notes ?? null
    );

    return c.json(round, 201);
  }
);

// GET /api/rounds/:id
app.get('/:id', clerkAuth, async (c) => {
  const userId = c.get('userId');
  const roundId = c.req.param('id');

  const round = await getRound(c.env.DB, roundId);
  if (!round) return c.json({ error: 'Round not found' }, 404);
  if (round.shooter_id !== userId) return c.json({ error: 'Forbidden' }, 403);

  const imageUrlPrefix = `https://images.archery-score.workers.dev`;
  const full = await getRoundWithEnds(c.env.DB, roundId, imageUrlPrefix);
  return c.json(full);
});

// PATCH /api/rounds/:id/complete
app.patch('/:id/complete', clerkAuth, async (c) => {
  const userId = c.get('userId');
  const roundId = c.req.param('id');

  const round = await getRound(c.env.DB, roundId);
  if (!round) return c.json({ error: 'Round not found' }, 404);
  if (round.shooter_id !== userId) return c.json({ error: 'Forbidden' }, 403);
  if (round.status !== 'active') return c.json({ error: 'Round is not active' }, 400);

  await updateRoundStatus(
    c.env.DB,
    roundId,
    'completed',
    round.total_score ?? 0,
    round.x_count
  );

  return c.json({ success: true });
});

// PATCH /api/rounds/:id/abandon
app.patch('/:id/abandon', clerkAuth, async (c) => {
  const userId = c.get('userId');
  const roundId = c.req.param('id');

  const round = await getRound(c.env.DB, roundId);
  if (!round) return c.json({ error: 'Round not found' }, 404);
  if (round.shooter_id !== userId) return c.json({ error: 'Forbidden' }, 403);

  await updateRoundStatus(c.env.DB, roundId, 'abandoned', round.total_score ?? 0, round.x_count);
  return c.json({ success: true });
});

export default app;
