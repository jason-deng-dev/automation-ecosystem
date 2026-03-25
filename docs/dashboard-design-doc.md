**Project:** Automation Pipeline Monitoring Dashboard

**Author:** Jason Deng

**Date:** March 2026

**Status:** Planning — to be built after all three pipelines are operational

<!-- --- -->

## 1. Problem Statement

Three automation pipelines are running in production:

- **Race Scraper Pipeline** — weekly RunJapan scrape → `races.json`
- **Rakuten Product Aggregator** — product data pipeline
- **RedNote Content Generator** — daily Claude-powered XHS post generation and publishing

Currently, the only way to check pipeline health is to read raw log files. This is fine during development but breaks down at handoff — a non-technical operator shouldn't need to dig through logs to know if something is broken.

A unified monitoring dashboard gives a single place to check the health of all three pipelines without touching the underlying systems.

---

## 2. Goals

- Surface the operational status of all three pipelines in one place
- Track success/failure rates per pipeline run
- Monitor prompt generation quality (RedNote pipeline)
- Make the system self-diagnosing: when a pipeline fails, surface enough context for the operator to understand what broke and how to fix it
- Reduce operator burden — no raw log reading required for routine checks

---

## 3. Key Metrics (Per Pipeline)

### All Pipelines
- Last run timestamp
- Last run status (success / failure / partial)
- Success rate over last 7 / 30 days
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

### RedNote Content Generator
- Posts generated per day
- Posts published successfully vs. failed
- Post type distribution (race / training / nutrition / wearable)
- Prompt generation quality score (TBD — format: did the response parse correctly, was JSON valid, did it hit required fields)
- Claude API error rate (429s, 5xx, timeout)
- XHS publish failure rate and failure reasons

---

## 4. Claude-Assisted Error Resolution

When a pipeline run fails, the dashboard feeds the error context (pipeline name, failed stage, error message, recent log lines) to Claude with a system prompt that gives it full knowledge of the pipeline architecture.

Claude returns a plain-English explanation of what likely went wrong and a step-by-step fix — displayed directly in the dashboard. The operator follows the steps without needing to understand the underlying code.

Example flow:
1. RedNote pipeline fails at publisher stage — `auth.json` session expired
2. Dashboard detects failure, identifies error type
3. Feeds error context to Claude
4. Claude responds: "Your XHS session has expired. Click the **Login to XHS** button to refresh your session."
5. Operator clicks the button, logs in via the embedded browser view, pipeline resumes

---

## 5. XHS Session Management

XHS sessions expire periodically (typically every few weeks). Rather than requiring the operator to SSH into the server and run a script, the dashboard exposes a browser-based re-authentication flow.

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

The dashboard surfaces session state as a status indicator on the RedNote pipeline card:
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

The dashboard should allow the operator to configure the RedNote posting schedule without touching code or the server.

### Per-Day Schedule Config

Each day supports multiple post slots — each slot has a time and a post type. The operator can add or remove slots per day from the dashboard.

- **Time** — time picker per slot (24h, CST)
- **Post Type** — dropdown per slot: Race Guide / Training / Nutrition / Wearables
- **Add slot** — button to add another post to the same day
- **Remove slot** — button to remove a slot

The schedule is stored in `xhs/config.json` on the shared volume. The dashboard reads and writes this file via an API endpoint. The scheduler reads `config.json` at runtime to register one cron job per slot — no code changes or restarts required.

### schedule.json Shape

```json
{
  "monday":    [{ "time": "21:00", "type": "race" }],
  "tuesday":   [{ "time": "21:00", "type": "nutritionSupplement" }],
  "wednesday": [{ "time": "21:00", "type": "training" }],
  "thursday":  [{ "time": "09:00", "type": "race" }, { "time": "21:00", "type": "wearable" }],
  "friday":    [{ "time": "21:00", "type": "race" }],
  "saturday":  [{ "time": "21:00", "type": "training" }],
  "sunday":    [{ "time": "21:00", "type": "wearable" }]
}
```

---

## 7. Dashboard Home Page — Pipeline Cards

The home page shows one card per pipeline. Each card surfaces the most critical info at a glance without needing to navigate into the full pipeline view.

### 7.1 RedNote Pipeline Card

- **Current run state** — live indicator: Idle / Running / Failed
- **Weekly posts** — success count / failed count / success ratio (e.g. 6/7 — 86%)
- **Last post** — timestamp, post type, status (success / failed)
- **Last failure reason** — if last run failed, surface the error type inline: auth expired / Claude API error / publish timeout
- **Next scheduled post** — day, time, and post type from `xhs/config.json`
- **Auth status** — session active / expiring soon / expired (Login button shown if expired)

### 7.2 Race Scraper Pipeline Card

- **Current run state** — live indicator: Idle / Running / Failed
- **Last run** — timestamp + outcome (success / failed)
- **Races scraped** — count from last run, with threshold alert if < 30
- **Data freshness** — how old is the current `races.json` (e.g. "3 days ago")

### 7.3 Rakuten Aggregator Pipeline Card

- **Catalog size** — total products cached in PostgreSQL
- **WooCommerce live** — how many products have been pushed to the store
- **Last activity** — timestamp of last Rakuten fetch or WooCommerce push
- **Error indicator** — any recent API failures (Rakuten, WooCommerce)

---

## 8. RedNote Dashboard Section — Full Spec

### 8.1 Schedule Management

- Weekly grid — one row per day, each row shows all configured post slots
- Per slot: time picker (24h CST) + post type dropdown (Race Guide / Training / Nutrition / Wearables)
- Add slot button per day, remove button per slot
- Save button writes to `xhs/config.json` via `POST /api/schedule`
- Scheduler picks up changes at runtime without restart — watches `xhs/config.json` for changes and re-registers cron jobs on update

### 8.2 Live Log Stream

- Scrollable log panel showing real-time stdout from the XHS automation process
- Streamed from the server via SSE (Server-Sent Events) — `GET /api/logs/stream`
- New lines appended as they arrive, auto-scrolls to bottom
- Lines are colour-coded: errors in red, success messages in green, neutral in default

### 8.3 XHS Authentication

- Session status indicator on the RedNote card:
  - **Active** — last successful publish timestamp + estimated expiry (30 days from last login)
  - **Expiring soon** — warning at <7 days remaining
  - **Expired / failed** — error state with Login button prominently shown
- When auth error is detected in the log stream, dashboard surfaces an alert banner prompting the operator to re-authenticate
- **Login to XHS** button — triggers `POST /api/xhs/login`, spawns `xhs-login.js`, auto-navigates to QR code screen, streams screenshots via SSE so operator can scan the QR code without leaving the dashboard
- On successful login, `auth.json` is saved on the server and the alert clears

### 8.4 Key Metrics

- Posts published today / this week
- Posts published successfully vs. failed
- Post type distribution (race / training / nutrition / wearable)
- Last run timestamp + status
- Claude API error rate (429s, 5xx, timeout)
- XHS publish failure rate and failure reasons

### 8.5 Post Archive Viewer

- List of recent published posts pulled from `xhs/post_archive/`
- Shows: title, post type, publish timestamp
- Expandable to show full post content (hook, contents, cta)

### 8.6 Manual Trigger

- "Run now" button — fires a post immediately outside the schedule
- Post type dropdown to select what type to generate
- **Preview mode** — checkbox to generate without publishing; output is shown in the dashboard for QA without consuming an XHS post slot
- Useful for testing or one-off posts without modifying the schedule

### 8.7 Run History

- Table of every run attempt, not just successful publishes
- Columns: timestamp, post type, outcome (success / failed), error message if failed
- Fills the gap left by `post_archive/` which only records successful posts — failed runs currently leave no trace

### 8.8 Claude API Cost Tracker

- Tokens used per post (input + output) logged from the `usage` field on each API response
- Cumulative tokens and estimated cost this week / this month
- Per-post cost visible in the run history table

---

## 9. Race Scraper Dashboard Section — Full Spec

### 9.1 Key Metrics

- Races scraped per run (threshold alert if < 30)
- Scrape failures per run — count of individual race detail pages that failed
- Data freshness — age of current `races.json`

### 9.2 Failed URLs List

- Expandable list of race URLs that failed during the last scrape run
- Shows which races are missing from `races.json` without requiring log access

### 9.3 races.json Viewer

- Simple table of currently scraped races: name, date, location
- Lets the operator spot-check data quality after a fresh scrape without SSHing in

### 9.4 Run History

- Table of past scrape runs: timestamp, races scraped, failure count, outcome
- Same pattern as RedNote run history — failed runs currently leave no trace

### 9.5 Manual Trigger

- "Run scraper now" button — fires the scrape on demand outside the weekly cron
- Number input to cap the scrape limit (default: all races)

---

## 10. Rakuten Aggregator Dashboard Section — Full Spec

### 10.1 Catalog Stats

- Total products cached in PostgreSQL
- Products pushed to WooCommerce vs not yet pushed
- Stale products (cache older than 24h) — count with a force-refresh option per category
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
- Save button writes to `pricing_config.js` via API — no code changes or server access required
- Exchange rate last updated shown next to the field — if it's been weeks and the rate has moved, margins are silently off

### 10.3 Import Log

- Table of all WooCommerce push attempts from `import_log`: timestamp, product name, status (success / failed / skipped), error message if failed
- **Failed imports panel** — products with `status = 'failed'` surfaced as a list with a one-click retry button per product

### 10.4 Manual Trigger

- "Fetch more products" button with category dropdown + count input
- Fetches from Rakuten, normalises, prices, and caches in PostgreSQL — WooCommerce push triggered separately
- Product request flow trigger: manually submit a keyword to test the on-page request flow end-to-end

---

## 11. Open Questions

- How is prompt quality scored? (Parse success alone, or semantic review?)
- Does the Claude-assisted fix mode run automatically on failure, or on-demand?
- Should the dashboard send alerts (email, Telegram) when a pipeline fails, or is checking it manually sufficient?

---

## 12. System Architecture

### Container Layout

Five Docker containers, all on the same AWS Lightsail VPS, managed by a single `docker-compose.yml`:

```
┌──────────────────────────────── AWS Lightsail VPS ──────────────────────────────────────┐
│                                                                                         │
│  [Scraper container]  [Race Hub container]  [XHS container]    [Rakuten container]      │
│   cron only            Express :3001         scheduler.js       cron: fetch pipeline    │
│   scraper.js weekly    (always up)           generator.js       PostgreSQL              │
│   no HTTP              serves races.json     publisher.js       Express :3002           │
│          │             to WordPress               │             (internal only)          │
│          │                   │                    │                    │                 │
│          ▼                   ▼                    ▼                    ▼                 │
│    ┌──────────────────────────────────────────────────────────────────────┐              │
│    │                          shared volume                               │              │
│    │                                                                      │              │
│    │  scraper/                xhs/                    rakuten/            │              │
│    │   races.json ←            run_log.json ←          run_log.json ←     │              │
│    │   run_log.json ←          post_archive/ ←         catalog_stats.json←│              │
│    │   config.json →           auth.json ←             import_log.json ←  │              │
│    │                           config.json →            config.json →      │              │
│    │                                                                      │              │
│    │   ← pipeline writes          → dashboard writes                     │              │
│    └───────────────────────────────────┬──────────────────────────────────┘              │
│                                        │ reads all                                      │
│                                        ▼                                                │
│                      ┌───────────────────────────────────┐                             │
│                      │        Dashboard container         │                             │
│                      │  Express :3000 + React SPA         │                             │
│                      │  (operator-facing only)            │                             │
│                      │  commands → Rakuten :3002          │                             │
│                      └───────────────┬───────────────────┘                             │
│                                      │                                                  │
└──────────────────────────────────────┼──────────────────────────────────────────────────┘
                │                      │                                │
              HTTPS                  HTTPS                           HTTPS
          GET /api/races          (operator)                    (push products)
          (race hub WP plugin)        │                                │
                │                     ▼                                ▼
       [WordPress race hub]    [Operator browser]          [WooCommerce REST API]
```

**Note on Scraper vs Race Hub:** separated by single responsibility. The Scraper is a pure cron process — no HTTP server, no persistent process. The Race Hub container runs Express persistently (always up) and reads `scraper/races.json` from the shared volume to serve to WordPress. Either can be restarted or updated independently.

**Note on Rakuten:** all passive state (run logs, catalog stats, import log) is written to the shared volume after each operation — dashboard reads it like everything else. Rakuten :3002 is only called by the dashboard for commands (trigger fetch, retry import) — never for reads.

### Shared volume file ownership

| File | Written by | Read by | Purpose |
|---|---|---|---|
| `scraper/races.json` | Scraper | XHS, Race Hub | Race data for XHS post generation + WordPress race hub |
| `scraper/run_log.json` | Scraper | Dashboard | Scrape run history — timestamp, races scraped, failure count, failed URLs, outcome |
| `scraper/config.json` | Dashboard | Scraper | `scrape_limit` (default: all races) |
| `xhs/run_log.json` | XHS | Dashboard | Post run history — timestamp, post_type, outcome, error_stage, error_message, tokens_input, tokens_output, cost_usd |
| `xhs/post_archive/` | XHS | Dashboard | Published post content (weekly JSON files keyed by ISO timestamp) |
| `xhs/auth.json` | XHS (xhs-login.js) | XHS (publisher.js) | XHS session cookies — mtime used by dashboard to derive session age |
| `xhs/config.json` | Dashboard | XHS | Per-day post slots (time + post type) — XHS watches for changes and re-registers cron jobs at runtime |
| `rakuten/run_log.json` | Rakuten | Dashboard | Run history — timestamp, operation (fetch/push), category, products_fetched, products_pushed, failures, outcome |
| `rakuten/catalog_stats.json` | Rakuten | Dashboard | Total cached, total pushed, stale count, per-category breakdown (cached / pushed to WC) — rewritten after each run |
| `rakuten/import_log.json` | Rakuten | Dashboard | Per-product WooCommerce push attempts — product_id, product_name, status (success/failed/skipped), error_message |
| `rakuten/config.json` | Dashboard | Rakuten | Per-category: `margin_pct`, `shipping_cny`, `default_fetch_count`; global: `jpy_to_cny_rate`, `jpy_to_cny_updated`, `search_fill_threshold` |

### Key design principles

- **Single instance, everything co-located** — one `docker-compose.yml` manages all five containers
- **Shared volume is two-way** — pipelines write state (logs, output), dashboard writes config; pipelines watch their config files and adjust at runtime without restarting
- **Commands vs reads** — dashboard reads state from shared volume; only calls internal APIs for triggering actions (Rakuten :3002 for fetch/retry, process spawning for XHS manual trigger)
- **Two external-facing servers** — Scraper :3001 (public, serves race data to WordPress) and Dashboard :3000 (operator-facing, auth-gated)
- **Rakuten :3002 is internal only** — never exposed outside the Docker network

---

## 13. Resolved Decisions

- **Form:** Web UI (React SPA + Express API)
- **Deployment:** Same AWS Lightsail instance as all three pipelines
- **Translation tracking:** Removed — translation is handled by TranslatePress on the WordPress side, not tracked in the dashboard
- **XHS login browser streaming: screenshot polling, not noVNC** — noVNC requires a VNC server (x11vnc) and virtual display (Xvfb) on the Lightsail instance — significant infrastructure overhead for a single use case. Screenshot polling via `page.screenshot()` every 2 seconds is sufficient because the only operator action is scanning a QR code with their phone. The navigation to the QR code screen is automated in `xhs-login.js` (click sequence is hardcoded), so the QR code is already showing by the time the first screenshot reaches the dashboard. Operator never needs to click or type inside the browser.

---

## 14. Next Steps

- Implement per-pipeline structured logging as a prerequisite (logs need consistent format for the dashboard to parse)
- Define prompt quality scoring criteria based on observed generator output
- Build dashboard after all three pipelines are deployed to Lightsail
