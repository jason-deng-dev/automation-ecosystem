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

## Priority 4 — LangFuse LLM Observability

**The gap:** Every Claude API call in the ecosystem is a black box. You log token counts and outcome to `run_log.json`, but you have no visibility into prompt/response pairs over time, latency per call, error patterns, or quality trends across post types. When a generated post is bad, there's no trace to inspect.

**What to build:** Instrument all Claude calls with LangFuse. Every call becomes a traced span — you see the full prompt, response, latency, token usage, and outcome in a UI. LangFuse is open-source and self-hostable (runs as a Docker container alongside the other services).

**Implementation:**
- Add LangFuse as a service in `docker-compose.yml` (Postgres-backed, single container)
- `npm install langfuse` in `xhs/` service
- Wrap each `anthropic.messages.create()` call with a LangFuse trace: `langfuse.trace({ name: 'generate-post', input: { type, prompt }, output: response })`
- Tag each trace with post type so you can filter by `race` vs `training` vs `nutrition` in the UI
- Self-host at `langfuse.yourdomain.com` — internal only, not public-facing

**What you get:**
- Full prompt/response history queryable by date, post type, outcome
- Latency and token usage graphs over time — spot regressions after prompt changes
- A/B comparison if you ever test prompt variants
- The observability layer the JD explicitly names

**Resume signal:** "LLM observability" is now on the required list for AI engineering roles. LangFuse specifically is what teams use when they outgrow console.log. Being able to say you ran it in production (not just a tutorial) is a direct checkmark on this JD.

---

## Priority 5 — BullMQ Job Queue (Architecture)

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

## Priority 6 — Claude Tool Use / Function Calling

**The gap:** Two places in the ecosystem parse free-text Claude responses and hope they're valid: `chooseRace()` in the XHS generator, and the planned genre classifier in the Rakuten pipeline. Both use JSON.parse on Claude's output — fragile, and the XHS pipeline has already crashed from this (the double-quote ban workaround in the system prompt is a symptom).

**What to build:** Refactor both to use the Claude tools API. Define a typed schema for the expected output; Claude returns a structured tool call instead of a JSON string embedded in prose. The response is guaranteed to match the schema — no parsing, no guarding.

**XHS — `chooseRace()`:**
```js
// Define a tool
const tools = [{
  name: 'select_race',
  description: 'Select the most relevant race for this post',
  input_schema: {
    type: 'object',
    properties: {
      race_name: { type: 'string', description: 'Exact race name from the provided list' }
    },
    required: ['race_name']
  }
}];
// Claude returns tool_use block — no JSON.parse needed
const toolCall = response.content.find(b => b.type === 'tool_use');
const { race_name } = toolCall.input; // typed, guaranteed
```

**Rakuten — genre classifier (planned):**
- Same pattern: define a `classify_genre` tool with `{ subcategory_id: number | null }`
- Claude picks the best subcategory ID from the list, or returns null for off-theme
- Replaces the free-text classification response that currently feeds into a fragile lookup

**Resume signal:** Tool/function calling is the core primitive of agentic LLM systems. Every serious AI engineering role uses it. Showing you've replaced brittle JSON parsing with native tool use — and explaining *why* — demonstrates real production experience with LLMs, not just API call wrappers.

---

## Priority 7 — RAG Pipeline (pgvector + Post Archive)

**The gap:** The XHS generator runs cold on every call — it has only the system prompt and race data to work with. It can't learn from what's already worked. The 115-post performance dataset in Section 3 of the design doc is manually curated and baked into static instructions. As the archive grows, that knowledge stays frozen.

**What to build:** A retrieval layer over the `xhs_post_archive` table using pgvector (a Postgres extension — no new infrastructure). Two uses:

**A — Few-shot injection from top performers**
At generation time, embed the post topic/type and retrieve the 3–5 highest-performing past posts that are semantically similar. Inject them into the prompt as live examples. Claude writes toward proven content, not just instructions.

**B — Semantic dedup before generation**
Before generating, check if the proposed topic is too close to anything published in the last 30 days. If cosine similarity > 0.85, steer to a different angle. Prevents audience fatigue — `post_history.json` only deduplicates race names, not topic angles.

**Implementation:**
- Enable `pgvector` extension on the existing PostgreSQL instance
- Add `embedding vector(1536)` column to `xhs_post_archive`
- On archive write: call Claude's embedding endpoint (or `text-embedding-3-small` via OpenAI — cheaper for embeddings) to embed the post title + hook; store in column
- At generation time: embed the candidate topic, run `ORDER BY embedding <-> $1 LIMIT 5` to retrieve nearest neighbours
- Filter by post type and sort by views descending to bias toward top performers

**Resume signal:** RAG is the most-requested LLM skill on AI engineering JDs right now. Building it on pgvector (rather than a standalone vector DB like Pinecone) shows architectural judgement — you chose the right tool for the data volume, not the most impressive-sounding one.

---

## Priority 8 — Migrate File-Based Data to PostgreSQL (Data Integrity)

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

## Priority 9 — Retry with Exponential Backoff on External API Calls (Reliability)

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

## Priority 10 — Structured Logging with Pino (Observability)

**The gap:** All services use `console.log`. The dashboard's live log stream is a raw string stream that requires regex matching to colour-code by severity. Log lines have no consistent structure — finding errors requires reading every line.

**What to build:** Replace `console.log` with Pino in all services. Each log line is JSON with `level`, `service`, `timestamp`, `msg`, and optional context fields.

**Implementation:**
- `npm install pino pino-pretty` per service
- One logger instance per service (`src/logger.ts`): `pino({ name: 'rakuten', level: 'info' })`
- Replace all `console.log` → `logger.info()`, `console.error` → `logger.error()`
- Dashboard log stream parser reads JSON lines and colour-codes by `level` field

**Resume signal:** Structured logging is table stakes in production systems. JSON logs are queryable (Datadog, Loki, CloudWatch all ingest JSON natively). Shows you think about what happens at scale.

---

## Priority 11 — Health Check Endpoints (Observability)

**The gap:** The dashboard pipeline cards show last run status from log files — but if the XHS container itself crashes (OOM, runtime error), the log never gets written and the card shows "idle" forever. There's no way to distinguish "pipeline hasn't run yet" from "container is down."

**What to build:** `GET /health` on every service Express app. Returns `{ status: "ok", uptime: <seconds>, service: "<name>" }`. Dashboard polls these every 30 seconds and shows a "service up/down" indicator independent of run logs.

**Implementation:**
- One route added to each service's Express app: `app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }))`
- Dashboard: `setInterval(() => pollHealth(), 30_000)` on page load
- Pipeline card shows green dot (service up) or red dot (service unreachable) next to the run state

**Resume signal:** Health checks are how container orchestration systems (Kubernetes, ECS) determine if a service needs restarting. Shows you understand operational concerns, not just feature delivery.

---

## Priority 12 — Claude-Assisted Failure Diagnosis (Observability)

**The gap:** When a pipeline fails, the dashboard shows an error message — but figuring out what actually went wrong still requires reading raw logs and understanding the pipeline internals. This defeats the goal of making the system operable without technical knowledge.

**What to build:** On pipeline failure, automatically pass the last N log lines + error message to Claude and display a natural-language diagnosis in the dashboard. Not a fix — a human-readable explanation of what broke and suggested next steps.

**Implementation:**
- Trigger: end of any failed run
- Input to Claude: error stage, error message, last 20 log lines, pipeline name
- Prompt: "This is a failure log from the [pipeline] pipeline. Explain in plain language what broke and suggest the most likely fix."
- Response displayed in the pipeline card as a collapsible "Diagnosis" panel

**Resume signal:** Self-diagnosing systems are a genuinely impressive feature — not many portfolios have one. Directly demonstrates Claude API usage in a production context. Strong talking point in interviews.

---

## Priority 13 — LangChain / Python Generator (Learning + JD Coverage)

**The gap:** The JD explicitly requires LangChain and/or LangGraph experience. Your existing generator is Node.js + raw Anthropic SDK — functionally solid, but not what hiring managers mean when they ask about "LLM orchestration frameworks."

**What to build:** A Python port of `generator.js` using LangChain + `ChatAnthropic`. Not a replacement — run it as a parallel implementation (`services/xhs/generator.py`). The goal is framework familiarity, not shipping.

**Why LangChain over raw SDK:**
- `PromptTemplate` / `ChatPromptTemplate` — parameterized prompts with typed variables, same concept as your `prompts.json` substitution but standardized
- `StructuredOutputParser` — enforces JSON schema on Claude responses without manual parsing
- `RunnableSequence` (LCEL) — chains prompt → model → parser into a single composable pipeline

**Stretch: LangGraph**
The Rakuten request flow (validate keyword → classify genre → fetch Rakuten → push WooCommerce) maps naturally to a LangGraph state machine. Each node is a step; edges are conditional on whether the previous step succeeded. Builds the mental model for agentic workflows without over-engineering the production pipeline.

**Resume signal:** LangChain is the first thing most teams reach for when building LLM apps. Being able to say "I've used both the raw SDK and LangChain — here's when I'd use each" is a stronger answer than either alone.

---

## Priority 14 — Redis Caching Layer (Performance + Cost)

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
| 4 | LangFuse LLM observability | Low | High — direct JD requirement, 1-day integration |
| 5 | BullMQ job queue | High | High — biggest architectural signal |
| 6 | Claude tool use / function calling | Medium | High — removes brittle JSON parsing, core LLM skill |
| 7 | RAG pipeline (pgvector + post archive) | High | High — improves XHS quality + top JD signal |
| 8 | Migrate file-based data to PostgreSQL | Medium | High — removes file I/O, enables real queries |
| 9 | Retry/backoff | Low | Medium — self-healing pipelines |
| 10 | Pino structured logging | Low | Medium — production observability |
| 11 | Health check endpoints | Low | Medium — real-time service status |
| 12 | Claude failure diagnosis | Medium | High — impressive differentiator |
| 13 | LangChain / Python generator | Medium | Medium — JD coverage, learning exercise |
| 14 | Redis caching layer | Low | Medium — performance + cost reduction |
| — | Terraform | Medium | Low — resume polish only |
