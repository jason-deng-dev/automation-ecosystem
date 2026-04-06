# Ecosystem Improvements Roadmap

Production-grade upgrades across all services. Ordered by priority — security and reliability first, then architecture, then polish.

---

## Priority 1 — OAuth2 / SSO (Security)

**The gap:** Every trigger endpoint in the dashboard (`POST /api/xhs/trigger`, `POST /api/rakuten/config`, etc.) is unauthenticated. Anyone who finds the URL can fire pipelines, overwrite configs, or wipe the XHS schedule.

**What to build:** Google OAuth via Auth.js (NextAuth.js v5). A single whitelisted Google account — yours. No user table, no passwords to manage. Auth.js handles the OAuth handshake, issues a JWT session cookie, and middleware enforces it on every request.

**Why OAuth2 over Basic Auth:**
- No credentials stored in `.env` that can leak — Google handles authentication
- Token-based sessions (JWT) are stateless — no server-side session store needed
- Expandable: adding a second user or swapping to GitHub OAuth is a config change, not a rewrite
- Shows you understand delegated auth, not just password checking

**Implementation:**
- `npm install next-auth` in dashboard service
- Configure `GoogleProvider` with `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` from Google Cloud Console
- Add `ALLOWED_EMAIL` to `.env` — checked in the `signIn` callback to block any Google account that isn't yours
- `NEXTAUTH_SECRET` for JWT signing
- `middleware.ts` calls `auth()` and redirects unauthenticated requests to the login page
- Applies to all `/api/*` routes and the dashboard UI

**Resume signal:** OAuth2 is the industry standard for delegated authentication — every fintech system uses it. Showing you can implement it (not just use it as a consumer) is a strong signal. SSO via a trusted provider also demonstrates you understand why rolling your own auth is an anti-pattern.

**Flow:**
```
User visits dashboard → middleware checks JWT session cookie
→ no session: redirect to /api/auth/signin → Google login
→ Google returns token → signIn callback checks email === ALLOWED_EMAIL
→ Auth.js issues session cookie → user lands on dashboard
```

---

## Priority 2 — Telegram Alerts on Pipeline Failure (Reliability)

**The gap:** The only way to know a pipeline failed is to check the dashboard. If the XHS pipeline fails at 9pm and you don't check until morning, you've missed a post slot.

**What to build:** A Telegram bot that sends a message whenever a pipeline run ends in failure. One message per failure with: pipeline name, error stage, error message, timestamp.

**Implementation:**
- Create a Telegram bot via BotFather, store token in `.env`
- Write a shared `notify.ts` util: `sendTelegramAlert(message: string)` — single `fetch` call to the Telegram Bot API
- Call it at the end of each pipeline run when `outcome === 'failed'`
- Covers XHS, scraper, and Rakuten in one util

**Resume signal:** Closes the open question in the design doc. Shows you ship observable systems, not fire-and-forget automation.

---

## Priority 3 — Zod Validation on All POST Endpoints (Security + Reliability)

**The gap:** Dashboard config write endpoints accept arbitrary JSON and write it directly to the shared volume. A malformed `xhs/config.json` silently corrupts the scheduler at runtime — the cron jobs fail to register and you don't know why.

**What to build:** Zod schemas on every POST endpoint. Invalid input returns a 400 with a clear error message before anything touches the filesystem.

**Schemas needed:**
- `POST /api/xhs/schedule` — validate day keys (0-6), time format (HH:MM), post type enum
- `POST /api/rakuten/config` — validate markup %, exchange rate (positive number), threshold (integer)
- `POST /api/xhs/trigger` and `/api/rakuten/trigger` — validate body shape and enum values

**Implementation:**
- `npm install zod` in dashboard service
- One schema file per service (`xhs.schema.ts`, `rakuten.schema.ts`)
- `schema.safeParse(body)` at the top of each route handler

**Resume signal:** Input validation at system boundaries — standard practice in production APIs, shows you understand where trust boundaries are.

---

## Priority 4 — BullMQ Job Queue (Architecture)

**The gap:** Manual triggers work via `docker exec` — fire and forget. No retry, no visibility into what's running, no backpressure. If a trigger fires while a run is already in progress, you get two concurrent pipeline runs with no coordination.

**What to build:** Replace direct `docker exec` triggers with a BullMQ job queue backed by Redis. Each "trigger" button enqueues a named job. Workers pick up jobs, execute the pipeline, and log the result. Bull Board provides a visual queue inspector embedded in the dashboard.

**Implementation:**
- Add BullMQ worker to each pipeline service (`src/worker.ts`) — listens for jobs, runs the pipeline function, logs outcome
- Dashboard enqueues jobs via BullMQ client instead of `docker exec`
- Embed Bull Board UI in the dashboard at `/admin/queues`
- Named queues: `xhs-posts`, `rakuten-sync`, `scraper-run`
- Configure retries (3 attempts) and backoff (exponential) per queue

**Why this matters architecturally:** File-based IPC (writing `pipeline_state.json`) is invisible — you can't see what's queued, what's running, or what failed without reading files. A job queue makes the pipeline state observable in real time and handles retry automatically.

**Resume signal:** Redis-backed job queues are production standard in fintech. Every trading system, payment processor, and data pipeline uses them. BullMQ specifically shows up in Node.js fintech stacks. Building one from scratch and instrumenting it with Bull Board is a concrete talking point.

---

## Priority 5 — Migrate File-Based Data to PostgreSQL (Data Integrity)

**The gap:** The ecosystem stores critical state in flat JSON files — run logs, race data. These grow unbounded, can't be queried, and are vulnerable to partial-write corruption if a process crashes mid-write. The dashboard computes stats by loading entire files into memory and filtering in JS.

**What to build:** New tables in the existing PostgreSQL instance using `pg` (node-postgres) directly — no new ORM. All file writes become `INSERT` queries. Dashboard stats become SQL queries instead of in-memory file filtering.

**Files to migrate:**

| File | Problem | New table |
|---|---|---|
| `xhs/run_log.json` | Unbounded, no queries, corruption risk | `xhs_runs` |
| `scraper/run_log.json` | Same as above | `scraper_runs` |
| `races.json` (shared volume) | Read by race-hub on every WP request, no schema | `races` |

**Schema (raw SQL):**
```sql
CREATE TABLE xhs_runs (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  type TEXT,
  outcome TEXT,
  error_stage TEXT,
  error_msg TEXT,
  input_tokens INT,
  output_tokens INT
);

CREATE TABLE scraper_runs (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  outcome TEXT,
  races_scraped INT,
  failure_count INT,
  failed_urls TEXT[],
  error_msg TEXT
);

CREATE TABLE races (
  id SERIAL PRIMARY KEY,
  name TEXT,
  date TIMESTAMPTZ,
  location TEXT,
  url TEXT UNIQUE,
  distances TEXT[],
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Dashboard query examples:**
- 30-day success rate: `WHERE timestamp > NOW() - INTERVAL '30 days'`
- Failure rate by post type: `GROUP BY type, outcome`
- Token usage over time: `SUM(input_tokens + output_tokens) GROUP BY date_trunc('week', timestamp)`

**race-hub change:** Queries `SELECT * FROM races` instead of reading `races.json` from the shared Docker volume — decoupling scraper and race-hub through the DB instead of a shared filesystem.

**Resume signal:** Migrating from flat file storage to a relational model mid-project — recognising when a tool breaks down and upgrading it. The races.json → DB change also eliminates a Docker volume dependency, a real infrastructure simplification.

---

## Priority 6 — Retry with Exponential Backoff on External API Calls (Reliability)

**The gap:** A single timeout on any of Rakuten API, DeepL, WooCommerce REST, or Claude API kills the entire pipeline run and logs a failure. Most of these are transient — a retry 5 seconds later would succeed.

**What to build:** A shared `withRetry` wrapper that retries on network errors and 5xx responses with exponential backoff.

**Implementation:**
```ts
// src/utils/retry.ts (shared across services)
async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3, baseDelayMs = 1000): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      await sleep(baseDelayMs * 2 ** (attempt - 1));
    }
  }
}
```

Wrap all external calls: `withRetry(() => rakutenAPI.getRanking(...))`, `withRetry(() => deepl.translate(...))`, etc.

**Resume signal:** Resilience patterns — shows you understand distributed systems fail transiently and design for it.

---

## Priority 7 — Structured Logging with Pino (Observability)

**The gap:** All services use `console.log`. The dashboard's live log stream is a raw string stream that requires regex matching to colour-code by severity. Log lines have no consistent structure — finding errors requires reading every line.

**What to build:** Replace `console.log` with Pino in all services. Each log line is JSON with `level`, `service`, `timestamp`, `msg`, and optional context fields.

**Implementation:**
- `npm install pino pino-pretty` per service
- One logger instance per service (`src/logger.ts`): `pino({ name: 'rakuten', level: 'info' })`
- Replace all `console.log` → `logger.info()`, `console.error` → `logger.error()`
- Dashboard log stream parser reads JSON lines and colour-codes by `level` field

**Resume signal:** Structured logging is table stakes in production systems. JSON logs are queryable (Datadog, Loki, CloudWatch all ingest JSON natively). Shows you think about what happens at scale.

---

## Priority 8 — Health Check Endpoints (Observability)

**The gap:** The dashboard pipeline cards show last run status from log files — but if the XHS container itself crashes (OOM, runtime error), the log never gets written and the card shows "idle" forever. There's no way to distinguish "pipeline hasn't run yet" from "container is down."

**What to build:** `GET /health` on every service Express app. Returns `{ status: "ok", uptime: <seconds>, service: "<name>" }`. Dashboard polls these every 30 seconds and shows a "service up/down" indicator independent of run logs.

**Implementation:**
- One route added to each service's Express app: `app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }))`
- Dashboard: `setInterval(() => pollHealth(), 30_000)` on page load
- Pipeline card shows green dot (service up) or red dot (service unreachable) next to the run state

**Resume signal:** Health checks are how container orchestration systems (Kubernetes, ECS) determine if a service needs restarting. Shows you understand operational concerns, not just feature delivery.

---

## Priority 9 — Claude-Assisted Failure Diagnosis (Observability)

**The gap:** When a pipeline fails, the dashboard shows an error message — but figuring out what actually went wrong still requires reading raw logs and understanding the pipeline internals. This defeats the goal of making the system operable without technical knowledge.

**What to build:** On pipeline failure, automatically pass the last N log lines + error message to Claude and display a natural-language diagnosis in the dashboard. Not a fix — a human-readable explanation of what broke and suggested next steps.

**Implementation:**
- Trigger: end of any failed run
- Input to Claude: error stage, error message, last 20 log lines, pipeline name
- Prompt: "This is a failure log from the [pipeline] pipeline. Explain in plain language what broke and suggest the most likely fix."
- Response displayed in the pipeline card as a collapsible "Diagnosis" panel

**Resume signal:** Self-diagnosing systems are a genuinely impressive feature — not many portfolios have one. Directly demonstrates Claude API usage in a production context. Strong talking point in interviews.

---

## Priority 10 — Redis Caching Layer (Performance + Cost)

**The gap:** Several operations in this ecosystem repeat expensive work on every call — Rakuten API fetches, DeepL translations, dashboard stat computations from log files. Each redundant call costs latency, API quota, or both.

**What to build:** A cache-aside layer backed by the Redis instance already introduced by BullMQ (Priority 4) — no extra infrastructure. A shared `cache.ts` util wraps get/set with TTL. Services check the cache first; on a miss they do the real work and populate the cache for next time.

**Cache-aside pattern:**
```ts
// src/utils/cache.ts (shared)
async function getOrSet<T>(key: string, fn: () => Promise<T>, ttlSeconds: number): Promise<T> {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);
  const result = await fn();
  await redis.set(key, JSON.stringify(result), 'EX', ttlSeconds);
  return result;
}
```

**Where to apply it:**

| Data | Cache key | TTL | Source (without cache) | Why cache it |
|---|---|---|---|---|
| Rakuten API product rankings | `rakuten:rankings:<keyword>` | 1 hour | Rakuten API (rate-limited, slow) | Rankings don't change minute-to-minute |
| DeepL translations | `deepl:<hash(sourceText)>` | 7 days | DeepL API (paid per character) | Same JP product names repeat across runs |
| Dashboard 30-day success stats | `dashboard:stats:30d` | 5 min | Postgres aggregation query | Avoids re-running the same GROUP BY on every page load |
| Race list (race-hub → WordPress) | `racehub:races` | Invalidated on scrape | Postgres `race.findMany()` | WordPress calls this on every page load; DB query on every request is wasteful |

**Why the Redis reuse matters:** BullMQ already requires Redis for its queue backend. Using the same instance as a cache means zero added infrastructure — just a second logical use of the connection you already have.

**Invalidation strategy:**
- TTL-based for API data and stats — let them expire naturally
- Explicit `redis.del('racehub:races')` triggered at the end of a successful scraper run, after the DB write commits — ensures race-hub always serves fresh data after a new scrape
- No invalidation needed for translations — source text is the cache key, same input always maps to same output

**Resume signal:** Cache design is a core system design topic. Being able to explain cache-aside vs write-through, TTL choices, and invalidation strategies is exactly what gets asked in fintech interviews. Building a real one (not a tutorial) and attaching it to real latency/cost problems shows you understand *when* to cache, not just *how*.

---

## Deferred — Terraform (Infrastructure as Code)

**What it is:** Define the Lightsail instance, firewall rules, and DNS in Terraform so the entire infrastructure can be recreated with `terraform apply`.

**Why defer:** The instance is stable and unlikely to be recreated. The value is in the signal, not the operational need. Do this after the higher-priority items are shipped — it's resume polish, not production necessity.

---

## Summary Table

| Priority | Item | Effort | Value |
|---|---|---|---|
| 1 | OAuth2 / SSO (Auth.js + Google) | Low | Critical — security hole, industry-standard auth |
| 2 | Telegram alerts | Low | High — closes open question |
| 3 | Zod validation | Low | High — protects config integrity |
| 4 | BullMQ job queue | High | High — biggest architectural signal |
| 5 | Migrate file-based data to PostgreSQL | Medium | High — removes file I/O, enables real queries |
| 6 | Retry/backoff | Low | Medium — self-healing pipelines |
| 7 | Pino structured logging | Low | Medium — production observability |
| 8 | Health check endpoints | Low | Medium — real-time service status |
| 9 | Claude failure diagnosis | Medium | High — impressive differentiator |
| 10 | Redis caching layer | Low | Medium — performance + cost reduction |
| — | Terraform | Medium | Low — resume polish only |
