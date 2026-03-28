import type { D1Database } from '@cloudflare/workers-types';
import type { Shooter, Round, End, EndWithArrows, RoundWithEnds, Arrow } from '../types';

export function parseArrows(json: string): Arrow[] {
  try { return JSON.parse(json); } catch { return []; }
}

// ── Shooters ────────────────────────────────────────────────────────────────

export async function upsertShooter(
  db: D1Database,
  id: string,
  name: string,
  email: string | null,
  avatarUrl: string | null
): Promise<Shooter> {
  await db
    .prepare(
      `INSERT INTO shooters (id, name, email, avatar_url)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         email = excluded.email,
         avatar_url = excluded.avatar_url`
    )
    .bind(id, name, email, avatarUrl)
    .run();

  return db
    .prepare('SELECT * FROM shooters WHERE id = ?')
    .bind(id)
    .first<Shooter>() as Promise<Shooter>;
}

export async function getShooter(db: D1Database, id: string): Promise<Shooter | null> {
  return db.prepare('SELECT * FROM shooters WHERE id = ?').bind(id).first<Shooter>();
}

// ── Rounds ───────────────────────────────────────────────────────────────────

export async function createRound(
  db: D1Database,
  id: string,
  shooterId: string,
  label: string,
  endsTotal: number,
  arrowsPerEnd: number,
  maxArrowScore: number,
  notes: string | null
): Promise<Round> {
  await db
    .prepare(
      `INSERT INTO rounds (id, shooter_id, label, ends_total, arrows_per_end, max_arrow_score, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(id, shooterId, label, endsTotal, arrowsPerEnd, maxArrowScore, notes)
    .run();

  return db.prepare('SELECT * FROM rounds WHERE id = ?').bind(id).first<Round>() as Promise<Round>;
}

export async function getRound(db: D1Database, id: string): Promise<Round | null> {
  return db.prepare('SELECT * FROM rounds WHERE id = ?').bind(id).first<Round>();
}

export async function listRounds(db: D1Database, shooterId: string): Promise<Round[]> {
  const { results } = await db
    .prepare('SELECT * FROM rounds WHERE shooter_id = ? ORDER BY created_at DESC LIMIT 50')
    .bind(shooterId)
    .all<Round>();
  return results;
}

export async function updateRoundStatus(
  db: D1Database,
  roundId: string,
  status: 'completed' | 'abandoned',
  totalScore: number,
  xCount: number
): Promise<void> {
  await db
    .prepare(
      `UPDATE rounds SET status = ?, total_score = ?, x_count = ?,
       completed_at = CASE WHEN ? = 'completed' THEN unixepoch() ELSE NULL END
       WHERE id = ?`
    )
    .bind(status, totalScore, xCount, status, roundId)
    .run();
}

export async function getRoundWithEnds(
  db: D1Database,
  roundId: string,
  imageUrlPrefix: string
): Promise<RoundWithEnds | null> {
  const round = await getRound(db, roundId);
  if (!round) return null;

  const { results: rawEnds } = await db
    .prepare('SELECT * FROM ends WHERE round_id = ? ORDER BY end_number ASC')
    .bind(roundId)
    .all<End>();

  const ends: EndWithArrows[] = rawEnds.map((e) => ({
    ...e,
    arrows: parseArrows(e.arrows_json),
    image_url: e.image_key ? `${imageUrlPrefix}/${e.image_key}` : undefined,
  }));

  return { ...round, ends, ends_completed: ends.length };
}

// ── Ends ─────────────────────────────────────────────────────────────────────

export async function createEnd(
  db: D1Database,
  id: string,
  roundId: string,
  endNumber: number,
  arrows: Arrow[],
  imageKey: string | null,
  aiRawJson: string | null,
  scoringMethod: 'ai' | 'manual'
): Promise<End> {
  const totalScore = arrows.reduce((s, a) => s + a.score, 0);
  const xCount = arrows.filter((a) => a.is_x).length;
  const arrowsJson = JSON.stringify(arrows);

  await db
    .prepare(
      `INSERT INTO ends (id, round_id, end_number, arrows_json, total_score, x_count,
         image_key, ai_raw_json, scoring_method)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(id, roundId, endNumber, arrowsJson, totalScore, xCount, imageKey, aiRawJson, scoringMethod)
    .run();

  // Recompute round totals
  const { results } = await db
    .prepare('SELECT total_score, x_count FROM ends WHERE round_id = ?')
    .bind(roundId)
    .all<{ total_score: number; x_count: number }>();

  const roundTotal = results.reduce((s, e) => s + e.total_score, 0);
  const roundX = results.reduce((s, e) => s + e.x_count, 0);

  await db
    .prepare('UPDATE rounds SET total_score = ?, x_count = ? WHERE id = ?')
    .bind(roundTotal, roundX, roundId)
    .run();

  return db.prepare('SELECT * FROM ends WHERE id = ?').bind(id).first<End>() as Promise<End>;
}

export async function updateEnd(
  db: D1Database,
  endId: string,
  arrows: Arrow[]
): Promise<End> {
  const totalScore = arrows.reduce((s, a) => s + a.score, 0);
  const xCount = arrows.filter((a) => a.is_x).length;
  const arrowsJson = JSON.stringify(arrows);

  await db
    .prepare(
      `UPDATE ends SET arrows_json = ?, total_score = ?, x_count = ?, scoring_method = 'manual'
       WHERE id = ?`
    )
    .bind(arrowsJson, totalScore, xCount, endId)
    .run();

  // Recompute round totals
  const end = await db.prepare('SELECT * FROM ends WHERE id = ?').bind(endId).first<End>();
  if (end) {
    const { results } = await db
      .prepare('SELECT total_score, x_count FROM ends WHERE round_id = ?')
      .bind(end.round_id)
      .all<{ total_score: number; x_count: number }>();

    const roundTotal = results.reduce((s, e) => s + e.total_score, 0);
    const roundX = results.reduce((s, e) => s + e.x_count, 0);

    await db
      .prepare('UPDATE rounds SET total_score = ?, x_count = ? WHERE id = ?')
      .bind(roundTotal, roundX, end.round_id)
      .run();
  }

  return db.prepare('SELECT * FROM ends WHERE id = ?').bind(endId).first<End>() as Promise<End>;
}
