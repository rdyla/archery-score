-- Shooters (linked to Clerk user IDs)
CREATE TABLE IF NOT EXISTS shooters (
  id TEXT PRIMARY KEY,                    -- Clerk user ID
  email TEXT,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Rounds
CREATE TABLE IF NOT EXISTS rounds (
  id TEXT PRIMARY KEY,
  shooter_id TEXT NOT NULL REFERENCES shooters(id) ON DELETE CASCADE,
  label TEXT NOT NULL,                    -- e.g. "Vegas 300", "600 Round", custom
  ends_total INTEGER NOT NULL,            -- 10 for 300, 20 for 600, 30 for 900
  arrows_per_end INTEGER NOT NULL DEFAULT 3,
  max_arrow_score INTEGER NOT NULL DEFAULT 10,  -- highest scoring ring
  status TEXT NOT NULL DEFAULT 'active',  -- active | completed | abandoned
  total_score INTEGER,
  x_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  completed_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_rounds_shooter ON rounds(shooter_id, created_at DESC);

-- Ends (a group of arrows shot at one time)
CREATE TABLE IF NOT EXISTS ends (
  id TEXT PRIMARY KEY,
  round_id TEXT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  end_number INTEGER NOT NULL,            -- 1-based
  arrows_json TEXT NOT NULL,             -- JSON: [{"score":10,"is_x":true},{"score":9,"is_x":false},...]
  total_score INTEGER NOT NULL,
  x_count INTEGER NOT NULL DEFAULT 0,
  image_key TEXT,                         -- R2 object key
  ai_raw_json TEXT,                       -- raw Anthropic response stored for debugging
  scoring_method TEXT NOT NULL DEFAULT 'manual', -- 'ai' | 'manual'
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_ends_round ON ends(round_id, end_number);

-- Leaderboard / personal bests view helper
CREATE TABLE IF NOT EXISTS personal_bests (
  shooter_id TEXT PRIMARY KEY REFERENCES shooters(id) ON DELETE CASCADE,
  best_300 INTEGER,
  best_600 INTEGER,
  best_900 INTEGER,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
