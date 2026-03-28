export interface Env {
  DB: D1Database;
  IMAGES: R2Bucket;
  KV: KVNamespace;
  ANTHROPIC_API_KEY: string;
  CLERK_SECRET_KEY: string;
  CLERK_PUBLISHABLE_KEY: string;
}

export interface Shooter {
  id: string;
  email: string | null;
  name: string;
  avatar_url: string | null;
  created_at: number;
}

export interface Round {
  id: string;
  shooter_id: string;
  label: string;
  ends_total: number;
  arrows_per_end: number;
  max_arrow_score: number;
  status: 'active' | 'completed' | 'abandoned';
  total_score: number | null;
  x_count: number;
  notes: string | null;
  created_at: number;
  completed_at: number | null;
}

export interface Arrow {
  score: number;  // 0–10
  is_x: boolean;
}

export interface End {
  id: string;
  round_id: string;
  end_number: number;
  arrows_json: string;   // serialized Arrow[]
  total_score: number;
  x_count: number;
  image_key: string | null;
  ai_raw_json: string | null;
  scoring_method: 'ai' | 'manual';
  created_at: number;
}

export interface AiScoreResult {
  arrows: Arrow[];
  total: number;
  x_count: number;
  confidence: number;
  notes: string;
}

// Extended types for API responses
export interface RoundWithEnds extends Round {
  ends: EndWithArrows[];
  ends_completed: number;
}

export interface EndWithArrows extends Omit<End, 'arrows_json'> {
  arrows: Arrow[];
  image_url?: string;
}
