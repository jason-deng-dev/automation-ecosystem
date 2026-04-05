# Ecosystem Improvements Roadmap

Production-grade upgrades across all services. Ordered by priority — security and reliability first, then architecture, then polish.

---

## Priority 1 — Dashboard Authentication (Security)

**The gap:** Every trigger endpoint in the dashboard (`POST /api/xhs/trigger`, `POST /api/rakuten/config`, etc.) is unauthenticated. Anyone who finds the URL can fire pipelines, overwrite configs, or wipe the XHS schedule.

**What to build:** HTTP Basic Auth middleware on all dashboard API routes. A single username + password stored in `.env` checked on every request. No session management needed — the dashboard is operator-only.

**Implementation:**
- Add `DASHBOARD_USER` and `DASHBOARD_PASS` to `.env`
- Write a Next.js middleware (`middleware.ts`) that reads the `Authorization` header and returns 401 if missing or wrong
- Apply to all `/api/*` routes

**Resume signal:** Security boundary on an internal tool — shows you think about attack surface, not just happy path.

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

## Priority 5 — Move Run Logs to PostgreSQL with Prisma (Data Integrity)

**The gap:** `xhs/run_log.json` and `scraper/run_log.json` grow unbounded, can't be queried, have no schema enforcement, and are vulnerable to partial-write corruption if a run crashes mid-write. The dashboard computes 30-day success rates by loading the entire file into memory and filtering in JS.

**What to build:** Two new tables in the existing Rakuten PostgreSQL instance. Prisma schema additions. All run log writes go through `prisma.xhsRun.create()` instead of file I/O.

**Schema additions (`schema.prisma`):**
```prisma
model XhsRun {
  id           Int      @id @default(autoincrement())
  timestamp    DateTime @default(now())
  type         String
  outcome      String
  errorStage   String?
  errorMsg     String?
  inputTokens  Int?
  outputTokens Int?
}

model ScraperRun {
  id           Int      @id @default(autoincrement())
  timestamp    DateTime @default(now())
  outcome      String
  racesScraped Int
  failureCount Int
  failedUrls   String[]
  errorMsg     String?
}
```

**Dashboard query examples:**
- 30-day success rate: `WHERE timestamp > NOW() - INTERVAL '30 days'` — one indexed query, no file reads
- Failure rate by post type: `GROUP BY type, outcome` — impossible with flat JSON
- Token usage over time: `SUM(input_tokens + output_tokens) GROUP BY date_trunc('week', timestamp)`

**Why Prisma:** You already have it set up and know it. Consistent ORM across the project. Type-safe queries catch schema mismatches at compile time.

**Resume signal:** Migrating from flat file storage to a relational model mid-project — shows architectural thinking and understanding of when file-based approaches break down.

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

## Deferred — Terraform (Infrastructure as Code)

**What it is:** Define the Lightsail instance, firewall rules, and DNS in Terraform so the entire infrastructure can be recreated with `terraform apply`.

**Why defer:** The instance is stable and unlikely to be recreated. The value is in the signal, not the operational need. Do this after the higher-priority items are shipped — it's resume polish, not production necessity.

---

## Not Doing — Log Rotation

**Why:** Moot once run logs move to PostgreSQL (Priority 5). File-based logs that grow unbounded are a symptom of the file storage approach, not a standalone problem to fix.

---

## Summary Table

| Priority | Item | Effort | Value |
|---|---|---|---|
| 1 | Dashboard auth | Low | Critical — security hole |
| 2 | Telegram alerts | Low | High — closes open question |
| 3 | Zod validation | Low | High — protects config integrity |
| 4 | BullMQ job queue | High | High — biggest architectural signal |
| 5 | Postgres run logs + Prisma | Medium | High — enables real queries, removes file I/O |
| 6 | Retry/backoff | Low | Medium — self-healing pipelines |
| 7 | Pino structured logging | Low | Medium — production observability |
| 8 | Health check endpoints | Low | Medium — real-time service status |
| 9 | Claude failure diagnosis | Medium | High — impressive differentiator |
| — | Terraform | Medium | Low — resume polish only |
