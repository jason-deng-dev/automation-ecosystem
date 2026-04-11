## 1. Problem Statement

Three automation pipelines are running in production:

- **Race Scraper Pipeline** — weekly RunJapan scrape → `races.json`
- **Rakuten Product Aggregator** — product data pipeline
- **XHS Pipeline** — daily Claude-powered XHS post generation and publishing

Currently, the only way to check pipeline health is to read raw log files. This is fine during development but breaks down at handoff — a non-technical operator shouldn't need to dig through logs to know if something is broken.

A unified monitoring dashboard gives a single place to check the health of all three pipelines without touching the underlying systems.

---

## 2. Goals

- Surface the operational status of all three pipelines in one place
- Track success/failure rates per pipeline run
- Monitor prompt generation quality (XHS pipeline)
- Make the system self-diagnosing: when a pipeline fails, surface enough context for the operator to understand what broke and how to fix it
- Reduce operator burden — no raw log reading required for routine checks

---

## 3. Key Metrics (Per Pipeline)

### All Pipelines
- Last run timestamp
- Last run status (success / failure / partial)
- Success rate over last 30 days
- Error count by error type
- Current pipeline state (idle / running / failed)

### Race Scraper Pipeline
- Races scraped per run (threshold alert: < 30)
- Scrape failures per run (individual race detail pages that failed)
- Data freshness (how old is the current `races.json`)

### Rakuten Product Aggregator
- Products fetched per run
- Failure rate per product / category
- Data freshness

### XHS Pipeline
- Posts generated per day
- Post type distribution (race / training / nutrition / wearable)

---

## 5. XHS Session Management

XHS sessions expire periodically (typically every few weeks, or when signed in from another browser/device). Rather than requiring the operator to SSH into the server and run a script, the dashboard exposes a browser-based re-authentication flow.

### How It Works

1. Operator clicks **"Login to XHS"** button in the dashboard
2. Server spawns `xhs-login.js` — Playwright launches a headless browser and navigates to the XHS login page
3. `xhs-login.js` automatically clicks through to the QR code sign-in screen (click sequence is hardcoded — no operator interaction needed to reach it)
4. Server begins polling `page.screenshot()` every 2 seconds and streaming screenshots to the dashboard via SSE
5. Dashboard displays the screenshot stream — operator sees the QR code and scans it with their phone
6. Playwright detects the post-login redirect to XHS home, stops the stream, saves `auth.json` to the shared volume
7. Dashboard clears the auth alert — all future automated publishing runs use the refreshed `auth.json`

### Why This Approach

- **Solves bot detection** — it's a real human login producing a real session, not a scripted credential submission
- **No server access required** — operator never touches SSH, the terminal, or any files
- **No credentials stored in code** — `auth.json` is a session artifact, not a hardcoded password
- **Self-service re-auth** — when the session expires, the operator clicks one button and scans a QR code — done in under a minute
- **Screenshot polling over noVNC** — the only operator action is scanning a QR code; no clicking or typing inside the browser is needed. Navigation to the QR code screen is automated, making screenshot polling fully sufficient. noVNC would require a VNC server + virtual display on the Lightsail instance for no added benefit.

### Session Expiry Detection

The dashboard surfaces session state as a status indicator on the XHS pipeline card:
- **Session active** — last successful publish timestamp + estimated expiry (30 days from last login)
- **Session expiring soon** — warning at <7 days remaining
- **Session expired / publish failed** — error state with the Login button prominently shown

### Implementation Notes

- Backend: `POST /api/xhs/login` — spawns `xhs-login.js`, begins SSE screenshot stream on `GET /api/xhs/login/stream`
- Frontend: dashboard opens a screenshot panel, connects to the SSE stream, renders each frame as an `<img>`
- On successful login detection, server closes the browser, saves `auth.json`, sends a final SSE event to close the panel
- `auth.json` is never transmitted to the client — it stays on the shared volume

---

## 6. Pipeline Configuration

The dashboard should allow the operator to configure the XHS posting schedule without touching code or the server.

### Per-Day Schedule Config

Each day supports multiple post slots — each slot has a time and a post type. The operator can add or remove slots per day from the dashboard.

- **Time** — time picker per slot (24h, CST)
- **Post Type** — dropdown per slot: Race Guide / Training / Nutrition / Wearables
- **Add slot** — button to add another post to the same day
- **Remove slot** — button to remove a slot

The schedule is stored in the `xhs_schedule` table in PostgreSQL. The dashboard reads and writes this via an API endpoint. The XHS scheduler polls the table at runtime to register one cron job per slot — no code changes or restarts required.

### config.json Shape

Keys are numeric day indices matching JavaScript's `Date.getDay()` — `0` = Sunday, `1` = Monday, ..., `6` = Saturday. Using numeric keys means the scheduler can call `new Date().getDay()` and look up the schedule directly with no string conversion or mapping step.

```json
{
  "1": [{ "time": "21:00", "type": "race" }],
  "2": [{ "time": "21:00", "type": "nutritionSupplement" }],
  "3": [{ "time": "21:00", "type": "training" }],
  "4": [{ "time": "09:00", "type": "race" }, { "time": "21:00", "type": "wearable" }],
  "5": [{ "time": "21:00", "type": "race" }],
  "6": [{ "time": "21:00", "type": "training" }],
  "0": [{ "time": "21:00", "type": "wearable" }]
}
```

---

## 7. Dashboard Home Page — Pipeline Cards

**Layout principle: home cards = metrics + action triggers. Detail pages = scrollable data tables.**

The home page shows one card per pipeline side by side, full height. Each card surfaces the most critical info at a glance and exposes action buttons — operator never needs to leave the home page for routine operations. Detail pages exist for bulk data (run history tables, races viewer, post archive).

### 7.1 XHS Pipeline Card 

- **Current run state** — color-coded: running (green) / failed (red) / idle (yellow)
- **Last run** — timestamp in CST
- **Last status** — success or failed with error stage (Authentication / Generate / Publishing)
- **Next scheduled post** — day, time, post type, and time until — from `xhs/config.json`
- **Success rate (30d)** — `success/total (%)` format
- **Errors by type** — count per error stage
- **Post type distribution** — count per type (Race, Training, Nutrition & Supplement, Wearable)
- **API tokens (lifetime)** — input + output token totals
- **Auth banner** — shown only when last run failed at auth stage; includes Login button
- **Action triggers** (to be added): manual trigger, preview
- **Re-auth** — no dedicated trigger needed; Login button appears automatically in the auth banner when `authStatus === 'failed'`

### 7.2 Race Scraper Pipeline Card 

- **Current run state** — color-coded: running / failed / idle
- **Last run** — timestamp in CST
- **Last status** — success or failed
- **Total races** — live count from `races.json`
- **Last scraped** — races_scraped from last run log, with below-threshold warning (< 30)
- **Next scrape** — time until next Sunday 02:00 CST cron
- **Data freshness** — age of `races.json`
- **Success rate (30d)** — `success/total (%)` format
- **Action triggers** (to be added): manual trigger

### 7.3 Rakuten Aggregator Pipeline Card

- **Catalog size** — total products cached in PostgreSQL
- **WooCommerce live** — how many products have been pushed to the store
- **Last activity** — timestamp of last Rakuten fetch or WooCommerce push
- **Error indicator** — any recent API failures (Rakuten, WooCommerce)
- **Action triggers** (to be added): manual sync trigger

---

## 8. XHS Dashboard Section — Full Spec

### 8.1 Schedule Management

- Weekly grid — one row per day, each row shows all configured post slots
- Per slot: time picker (24h CST) + post type dropdown (Race Guide / Training / Nutrition / Wearables)
- Add slot button per day, remove button per slot
- Save button writes to `xhs_schedule` table via `POST /api/xhs/schedule`
- Scheduler picks up changes at runtime without restart — polls `xhs_schedule` table for changes and re-registers cron jobs on update

### 8.2 Live Log Stream

- Scrollable log panel showing real-time stdout from the XHS automation process
- Streamed from the server via SSE (Server-Sent Events) — `GET /api/xhs/logs/stream`
- New lines appended as they arrive, auto-scrolls to bottom
- Lines are colour-coded: errors in red, success messages in green, neutral in default

### 8.3 Key Metrics

- Post type distribution (race / training / nutrition / wearable)
- Last run timestamp + status

### 8.4 Post Archive Viewer

- List of recent published posts pulled from `xhs/post_archive/`
- Shows: title, post type, publish timestamp
- Expandable to show full post content (hook, contents, cta)

### 8.5 Manual Trigger

- "Run now" button — fires a post immediately outside the schedule
- Post type dropdown to select what type to generate
- **Preview mode** — checkbox to generate without publishing; output is shown in the dashboard for QA without consuming an XHS post slot
- Useful for testing or one-off posts without modifying the schedule

### 8.6 Run History

- Table of every run attempt, not just successful publishes
- Columns: timestamp, post type, outcome (success / failed), error message if failed
- Fills the gap left by `post_archive/` which only records successful posts — failed runs currently leave no trace

### 8.7 Claude API Token Tracker

- Tokens used per post (input + output) logged from the `usage` field on each API response
- Cumulative tokens this week / this month
- Per-post token counts visible in the run history table
- Cost calculation is left to the operator — token pricing changes over time

---

## 9. Race Scraper Dashboard Section — Full Spec

Home card metrics and triggers are in section 7.2. This section covers the detail page only.

### 9.1 races.json Viewer (detail page)

- Simple table of currently scraped races: name, date, location
- Lets the operator spot-check data quality after a fresh scrape without SSHing in

### 9.2 Run History (detail page)

- Table of past scrape runs: timestamp, races scraped, failure count, outcome

### 9.3 Failed URLs List (detail page)

- Expandable list of race URLs that failed during the last scrape run
- Shows which races are missing from `races.json` without requiring log access

### 9.4 Manual Trigger (home card)

- "Run scraper now" button on the home card — fires the scrape on demand outside the weekly cron
- Always scrapes all races — no limit config needed

---

## 10. Rakuten Aggregator Dashboard Section — Full Spec

### 10.1 Catalog Stats

- Total products cached in PostgreSQL
- Products pushed to WooCommerce vs not yet pushed
- **Per-category breakdown** — product count for each of the five planned top-level categories:
  - 🏃 Running Gear
  - 💪 Training
  - 🥤 Nutrition & Supplements
  - 🧴 Recovery & Care
  - 👕 Sportswear
  - Each row shows: cached / pushed to WC

### 10.2 Pricing Config Editor

- Per-category table: shipping estimate (CNY) + target margin % — editable inline
- JPY → CNY exchange rate field with last-updated timestamp
- **Search fill threshold** — number input controlling how many DB results trigger a live Rakuten fill-up (default: 10)
- Save button writes to `rakuten_config` table via `POST /api/rakuten/config` — no code changes or server access required
- Exchange rate last updated shown next to the field — if it's been weeks and the rate has moved, margins are silently off

### 10.3 Import Log

- Table of all WooCommerce push attempts from `import_logs` table: timestamp, product name, status (success / failed / skipped), error message if failed
- Failed products self-heal on the next weekly sync — no manual retry needed

### 10.4 Manual Sync Trigger

- "Run sync now" button — fires `runWeeklySync()` on demand via `POST /api/rakuten/sync` (calls rakuten `POST /api/sync`)
- Same logic as the weekly cron — fetches top-ranked products per genre, upserts DB, pushes new ones to WooCommerce, removes stale products
- To add more products to the store: update `productsPerCategory` in the pricing config editor, then trigger a sync

---

## 11. Open Questions

- Does the Claude-assisted fix mode run automatically on failure, or on-demand?
- Should the dashboard send alerts (email, Telegram) when a pipeline fails, or is checking it manually sufficient?

---

## 12. API Endpoints (Next.js Route Handlers)

All endpoints are implemented as Next.js Route Handlers in `app/api/`. They read from / write to PostgreSQL. No shared volume dependency.

### XHS

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/xhs/schedule` | Query `xhs_schedule` table — returns per-day post schedule |
| `POST` | `/api/xhs/schedule` | Update `xhs_schedule` table — XHS scheduler polls for changes and re-registers cron jobs |
| `GET` | `/api/xhs/run-history` | Query `xhs_run_logs` table — full post run history |
| `GET` | `/api/xhs/post-archive` | Query `xhs_post_archive` table — published post archive |
| `POST` | `/api/xhs/trigger` | Spawn manual XHS run — accepts `{ type }` body; runs `run-manualPost.js <type>` via docker exec (non-blocking) |
| `POST` | `/api/xhs/preview` | Generate post without publishing — runs `run-preview.js <type>` via docker exec, captures stdout, returns parsed post JSON |
| `GET` | `/api/xhs/logs/stream` | SSE — streams XHS process stdout in real time |
| `POST` | `/api/xhs/login` | Spawn `xhs-login.js` via docker exec, begin screenshot polling |
| `GET` | `/api/xhs/login` | SSE — streams screenshots from login browser for QR code display |

### Scraper

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/scraper/run-history` | Query `scraper_run_logs` table — full scrape run history |
| `POST` | `/api/scraper/trigger` | Spawn manual scraper run via docker exec (non-blocking) |

### Rakuten

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/rakuten/stats` | Query `product_stats` table — catalog size, WC push count, per-category breakdown |
| `GET` | `/api/rakuten/import-log` | Query `import_logs` table — per-product WC push attempts |
| `GET` | `/api/rakuten/config` | Query `config` table — pricing config |
| `POST` | `/api/rakuten/config` | Call rakuten `POST /api/config` — updates DB row, triggers price reload + re-push |
| `POST` | `/api/rakuten/sync` | Call rakuten `POST /api/sync` — triggers `runWeeklySync()` on demand |

### Shared

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/pipeline-state` | Query `pipeline_state` table — returns `{ xhs, scraper, rakuten }` each `"idle\|running\|failed"` |

### Shared File Schemas

**`xhs/pipeline_state.json`** and **`scraper/pipeline_state.json`**
```json
{ "state": "idle | running | failed" }
```

---

**`xhs/run_log.json`**
```json
{
  "2026-03-25T06:10:28.030Z": {
    "type": "race | training | nutritionSupplement | wearable",
    "outcome": "success | failed",
    "errorStage": "auth | generate | publish | null",
    "errorMsg": "string | null",
    "input_tokens": 1727,
    "output_tokens": 1241
  }
}
```

---

**`scraper/run_log.json`**
```json
{
  "2026-03-25T02:00:00.000Z": {
    "outcome": "success | failed",
    "races_scraped": 87,
    "failure_count": 2,
    "failed_urls": ["https://runjapan.jp/race/E123456"],
    "error_msg": "string | null"
  }
}
```

---

→ See `docs/architecture.md` for container layout, shared volume ownership, and system design.

---

## 13. Resolved Decisions

- **Form:** Web UI — **Next.js + Tailwind CSS** (replaces the earlier "Express :3000 + React SPA" plan)
  - Next.js serves both the React frontend (App Router pages) and the API (Route Handlers in `app/api/`)
  - Express is no longer a separate server — Next.js is the server
  - SSE endpoints implemented via Next.js streaming responses (`new Response(ReadableStream)`)
  - Tailwind CSS with design system tokens configured in `tailwind.config.js` per `docs/design-system.md`
  - Goldwin-inspired aesthetic: minimal, sharp corners, warm off-white, deep red accent
- **Deployment:** Same AWS Lightsail instance as all three pipelines — Next.js runs as a Node.js process via PM2 (`pm2 start npm --name dashboard -- start`), proxied by NGINX on port 3000
- **Translation tracking:** Removed — translation is handled by TranslatePress on the WordPress side, not tracked in the dashboard
- **Language switching:** No runtime toggle — UI language is controlled by `NEXT_PUBLIC_LANG` env var. Set to `zh` in production `.env`, defaults to `en` locally. Components import from `en.js` or `zh.js` vocab files and read from the right one at render time. No React context or client components needed.
- **XHS login browser streaming: screenshot polling, not noVNC** — noVNC requires a VNC server (x11vnc) and virtual display (Xvfb) on the Lightsail instance — significant infrastructure overhead for a single use case. Screenshot polling via `page.screenshot()` every 2 seconds is sufficient because the only operator action is scanning a QR code with their phone. The navigation to the QR code screen is automated in `xhs-login.js` (click sequence is hardcoded), so the QR code is already showing by the time the first screenshot reaches the dashboard. Operator never needs to click or type inside the browser.
- **State/config storage: PostgreSQL, not shared volume** — all pipeline state, run logs, post history, config, and race data are stored in a shared PostgreSQL instance. Dashboard reads from DB directly. Config updates go through API endpoints that write to DB rows. Eliminates shared volume as an inter-container communication layer. Exception: `xhs/auth.json` stays as a file (session cookies are a runtime artifact, not config data). See `docs/architecture.md §5`.

