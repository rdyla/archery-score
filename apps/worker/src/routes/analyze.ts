import { Hono } from 'hono';
import Anthropic from '@anthropic-ai/sdk';
import { clerkAuth } from '../middleware/auth';
import { getRound, createEnd, updateEnd } from '../db/queries';
import type { Env, Arrow, AiScoreResult } from '../types';

const app = new Hono<{ Bindings: Env; Variables: { userId: string; userEmail: string | null } }>();

const SYSTEM_PROMPT = `You are an expert archery scoring assistant. Your job is to analyze photos of archery targets and accurately determine the score for each arrow.

Scoring rules:
- X (innermost dot/ring): score=10, is_x=true — counts as 10 but tracks X count for tiebreaking
- 10: yellow inner area (not X dot), score=10, is_x=false
- 9: yellow outer area, score=9, is_x=false
- 8: red inner, score=8
- 7: red outer, score=7
- 6: blue inner, score=6
- 5: blue outer, score=5
- 4: black inner, score=4
- 3: black outer, score=3
- 2: white inner, score=2
- 1: white outer, score=1
- M (miss, outside scoring area): score=0, is_x=false

When an arrow is on a line, award the HIGHER score.
If you cannot confidently determine a score, use your best judgment and note it.

Always return ONLY valid JSON, no explanation text.`;

function buildScoringPrompt(arrowCount: number, endNumber: number, endsTotal: number): string {
  return `Analyze this archery target image. This is end ${endNumber} of ${endsTotal}. There should be exactly ${arrowCount} arrows in the target.

Return ONLY a JSON object in this exact format (no markdown, no explanation):
{
  "arrows": [
    {"score": 10, "is_x": true},
    {"score": 9, "is_x": false},
    {"score": 8, "is_x": false}
  ],
  "total": 27,
  "x_count": 1,
  "confidence": 0.95,
  "notes": "Arrow 2 is close to the 9/8 line, awarded 9."
}

Order arrows from highest score to lowest.
The "total" field is the sum of all scores.
"confidence" is your confidence level from 0.0 to 1.0.
If you see fewer or more arrows than expected, note it and score what you see.`;
}

// POST /api/analyze — upload image and score a new end
app.post('/', clerkAuth, async (c) => {
  const userId = c.get('userId');

  const formData = await c.req.formData();
  const imageFile = formData.get('image') as File | null;
  const roundId = formData.get('round_id') as string | null;
  const endNumberStr = formData.get('end_number') as string | null;

  if (!imageFile || !roundId || !endNumberStr) {
    return c.json({ error: 'image, round_id, and end_number are required' }, 400);
  }

  const endNumber = parseInt(endNumberStr, 10);
  if (isNaN(endNumber) || endNumber < 1) {
    return c.json({ error: 'Invalid end_number' }, 400);
  }

  // Verify round ownership
  const round = await getRound(c.env.DB, roundId);
  if (!round) return c.json({ error: 'Round not found' }, 404);
  if (round.shooter_id !== userId) return c.json({ error: 'Forbidden' }, 403);
  if (round.status !== 'active') return c.json({ error: 'Round is not active' }, 400);
  if (endNumber > round.ends_total) {
    return c.json({ error: `End number exceeds round total (${round.ends_total})` }, 400);
  }

  // Upload image to R2
  const imageBuffer = await imageFile.arrayBuffer();
  const imageKey = `${userId}/${roundId}/end-${endNumber}-${Date.now()}.jpg`;

  await c.env.IMAGES.put(imageKey, imageBuffer, {
    httpMetadata: { contentType: imageFile.type || 'image/jpeg' },
    customMetadata: { roundId, endNumber: String(endNumber), userId },
  });

  // Convert to base64 for Anthropic Vision
  const base64Image = btoa(
    new Uint8Array(imageBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
  );
  const mediaType = (imageFile.type || 'image/jpeg') as
    | 'image/jpeg'
    | 'image/png'
    | 'image/gif'
    | 'image/webp';

  // Call Anthropic Vision
  const anthropic = new Anthropic({ apiKey: c.env.ANTHROPIC_API_KEY });

  let aiResult: AiScoreResult;
  let aiRawJson: string;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64Image },
            },
            {
              type: 'text',
              text: buildScoringPrompt(round.arrows_per_end, endNumber, round.ends_total),
            },
          ],
        },
      ],
    });

    const rawText = message.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('');

    aiRawJson = rawText;

    // Strip any accidental markdown fences
    const cleaned = rawText.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned) as {
      arrows: Array<{ score: number; is_x: boolean }>;
      total: number;
      x_count: number;
      confidence: number;
      notes: string;
    };

    // Validate and clamp
    const arrows: Arrow[] = parsed.arrows.map((a) => ({
      score: Math.max(0, Math.min(round.max_arrow_score, Math.round(a.score))),
      is_x: Boolean(a.is_x),
    }));

    aiResult = {
      arrows,
      total: arrows.reduce((s, a) => s + a.score, 0),
      x_count: arrows.filter((a) => a.is_x).length,
      confidence: parsed.confidence ?? 0.9,
      notes: parsed.notes ?? '',
    };
  } catch (err) {
    // If AI fails, return the image key so the client can do manual entry
    return c.json(
      {
        error: 'AI scoring failed — please enter scores manually',
        image_key: imageKey,
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      422
    );
  }

  // Persist the end
  const endId = crypto.randomUUID();
  const end = await createEnd(
    c.env.DB,
    endId,
    roundId,
    endNumber,
    aiResult.arrows,
    imageKey,
    aiRawJson,
    'ai'
  );

  return c.json({
    end_id: end.id,
    arrows: aiResult.arrows,
    total: aiResult.total,
    x_count: aiResult.x_count,
    confidence: aiResult.confidence,
    notes: aiResult.notes,
    image_key: imageKey,
  });
});

// POST /api/analyze/manual — record end with manual scores (no image required)
app.post('/manual', clerkAuth, async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<{
    round_id: string;
    end_number: number;
    arrows: Arrow[];
  }>();

  if (!body.round_id || !body.end_number || !Array.isArray(body.arrows)) {
    return c.json({ error: 'round_id, end_number, and arrows are required' }, 400);
  }

  const round = await getRound(c.env.DB, body.round_id);
  if (!round) return c.json({ error: 'Round not found' }, 404);
  if (round.shooter_id !== userId) return c.json({ error: 'Forbidden' }, 403);
  if (round.status !== 'active') return c.json({ error: 'Round is not active' }, 400);

  const arrows: Arrow[] = body.arrows.map((a) => ({
    score: Math.max(0, Math.min(round.max_arrow_score, Math.round(a.score))),
    is_x: Boolean(a.is_x),
  }));

  const endId = crypto.randomUUID();
  const end = await createEnd(
    c.env.DB,
    endId,
    body.round_id,
    body.end_number,
    arrows,
    null,
    null,
    'manual'
  );

  return c.json({
    end_id: end.id,
    arrows,
    total: end.total_score,
    x_count: end.x_count,
  }, 201);
});

// PATCH /api/analyze/ends/:endId — override/correct scores for an existing end
app.patch('/ends/:endId', clerkAuth, async (c) => {
  const userId = c.get('userId');
  const endId = c.req.param('endId');
  const body = await c.req.json<{ arrows: Arrow[] }>();

  if (!Array.isArray(body.arrows)) {
    return c.json({ error: 'arrows array is required' }, 400);
  }

  // Fetch end and verify ownership via round
  const endRow = await c.env.DB
    .prepare(`SELECT e.*, r.shooter_id, r.max_arrow_score
              FROM ends e JOIN rounds r ON e.round_id = r.id WHERE e.id = ?`)
    .bind(endId)
    .first<{ shooter_id: string; max_arrow_score: number }>();

  if (!endRow) return c.json({ error: 'End not found' }, 404);
  if (endRow.shooter_id !== userId) return c.json({ error: 'Forbidden' }, 403);

  const arrows: Arrow[] = body.arrows.map((a) => ({
    score: Math.max(0, Math.min(endRow.max_arrow_score, Math.round(a.score))),
    is_x: Boolean(a.is_x),
  }));

  const updated = await updateEnd(c.env.DB, endId, arrows);

  return c.json({
    end_id: updated.id,
    arrows,
    total: updated.total_score,
    x_count: updated.x_count,
  });
});

export default app;
