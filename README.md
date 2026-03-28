# Archery Score

Mobile-first archery scorekeeper with AI-powered target scoring via Claude Vision.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React + Vite PWA (Tailwind + shadcn/ui) |
| Auth | Clerk (Google / Apple / Facebook) |
| Backend | Cloudflare Workers + Hono |
| AI Scoring | Anthropic claude-opus-4-6 Vision |
| Images | Cloudflare R2 |
| Database | Cloudflare D1 (SQLite) |
| Cache/Sessions | Cloudflare KV |

---

## Setup

### 1. Install dependencies

```bash
npm install
npm install -g wrangler
```

### 2. Cloudflare login

```bash
wrangler login
```

### 3. Create Cloudflare resources

```bash
# D1 database
wrangler d1 create archery-score-db
# → Copy the database_id into apps/worker/wrangler.toml

# R2 bucket
wrangler r2 bucket create archery-score-images

# KV namespace
wrangler kv namespace create archery-score-kv
# → Copy the id into apps/worker/wrangler.toml
```

### 4. Run D1 migration

```bash
wrangler d1 execute archery-score-db \
  --file=apps/worker/migrations/0001_init.sql \
  --remote
```

### 5. Set worker secrets

```bash
cd apps/worker
wrangler secret put ANTHROPIC_API_KEY      # sk-ant-...
wrangler secret put CLERK_SECRET_KEY       # sk_live_... or sk_test_...
```

### 6. Set up Clerk

1. Sign up at [clerk.com](https://clerk.com)
2. Create a new application
3. Enable **Google**, **Apple**, and **Facebook** in Social Connections
4. Copy your keys:
   - `Publishable Key` → `apps/web/.env` as `VITE_CLERK_PUBLISHABLE_KEY`
   - `Secret Key` → set via `wrangler secret put CLERK_SECRET_KEY`
5. Add `http://localhost:5173` to Clerk's allowed origins (dev)
6. Add your production domain once deployed

### 7. Local development

```bash
# Terminal 1 — Worker
cd apps/worker
cp .dev.vars.example .dev.vars
# Fill in .dev.vars with your real keys
npm run dev

# Terminal 2 — Web
cd apps/web
cp .env.example .env
# Fill in VITE_CLERK_PUBLISHABLE_KEY
npm run dev
```

Web runs at `http://localhost:5173`, proxies `/api` to the worker at `8787`.

### 8. Deploy

```bash
# Deploy worker
npm run deploy --workspace=apps/worker

# Deploy web to Cloudflare Pages (from dashboard or):
# Connect your GitHub repo → build command: npm run build --workspace=apps/web
# Build output: apps/web/dist
# Set VITE_CLERK_PUBLISHABLE_KEY and VITE_API_URL env vars in Pages settings
```

---

## How scoring works

1. Archer photographs the target after each end
2. Image is uploaded to Cloudflare R2
3. Claude Vision analyzes arrow positions and returns per-arrow scores (X, 10–1, M)
4. Scores are displayed for review — archer can correct any arrow before saving
5. All data (scores, images) stored in D1 / R2 for history

## Round types

| Preset | Ends | Arrows/end | Max score |
|---|---|---|---|
| Vegas 300 | 10 | 3 | 300 |
| 600 Round | 20 | 3 | 600 |
| 900 Round | 30 | 3 | 900 |
| Custom | any | any | — |
