**English** | [中文](handoff-runbook.zh.md)

# Operator Runbook & AI Agent Reference

**Platform:** running.moximoxi.net automation ecosystem  
**Last updated:** May 2026  
**Server:** AWS Lightsail — `<SERVER_IP>` (user: `ubuntu`)  
**Repo path on server:** `/home/ubuntu/automation-ecosystem`

---

## What This System Does — Plain English

**running.moximoxi.net** is a platform for Chinese runners who want to run Japanese marathons and buy Japanese running products. It has a store, a race information hub, and a Xiaohongshu (RedNote) social media account that drives traffic to both.

The automation ecosystem handles three things that would otherwise require hours of manual work every day:

---

**1. XHS Content Pipeline — generates social media posts automatically**

Every day, a program runs on the server. It calls the Claude AI API and generates a complete Xiaohongshu post — written in Chinese, formatted correctly for the platform, with a title, body, caption, hashtags, and comments pre-written. The post is saved to a database.

The operator opens the dashboard, sees the post, copies each section with one click, and pastes it into the XHS app manually. The whole posting process takes about 3 minutes instead of 1–2 hours of writing from scratch.

Posts rotate between four types: race guides (information about specific Japanese marathons), training tips, nutrition advice, and running gear — weighted by what historically gets the most views.

---

**2. Race Scraper — keeps race data fresh automatically**

Once a week, the server visits runjapan.jp and collects information about all upcoming Japanese marathons: name, date, location, registration status, description. It saves all of this to a database and translates it into Chinese.

This data powers two things: the Race Hub page on the website (where visitors browse upcoming races), and the content pipeline above (which uses real race data to write accurate race guide posts).

---

**3. Rakuten Product Pipeline — stocks the store automatically**

Once a week, the server calls the Rakuten Japan API and pulls in the top-selling running products across multiple categories (shoes, nutrition, gear, recovery, apparel). It translates the product names to Chinese, calculates a sale price in yuan, and pushes each product into the WooCommerce store automatically.

When a customer searches for a product that isn't in the store, they can submit a request — the pipeline fetches it from Rakuten, prices it, and adds it to the store within about 2 minutes.

---

**4. Dashboard — one screen to monitor and control everything**

A private web page (port 3002 on the server) shows the status of all three pipelines, recent run history, error logs, and upcoming schedule. The operator uses it to:
- See if anything failed overnight
- Read and copy the daily generated XHS post
- Trigger a manual run of any pipeline
- Edit the posting schedule
- Update pricing config (exchange rate, markup)

---

**How it all connects:**

```
RunJapan website
    → scraped weekly → race database
        → Race Hub page on website (runners browse races)
        → XHS generator uses race data to write accurate posts

Rakuten API
    → fetched weekly → product database
        → WooCommerce store (customers browse and buy)

Claude AI
    → called daily → generates XHS post → saved to database
        → Dashboard shows post → operator copies → posts to XHS manually
            → XHS drives traffic back to the store and race hub
```

Everything runs on a single rented server ($10/month, AWS Lightsail) as Docker containers — isolated programs that start automatically and run independently of each other.

---

## How to Use This Document

---

### 👤 If you are the operator (non-technical)

**Read these sections — they are written for you:**

- [Daily Routine](#daily-routine) — start here, this is your actual job
- [Part 3 — XHS Pipeline](#part-3--xhs-pipeline) — how to publish posts
- [Part 4 — Common Failures](#part-4--common-failures) — when something breaks
- [Part 5 — Scraper Failures](#part-5--scraper-failures)
- [Part 6 — Rakuten Failures](#part-6--rakuten-failures)
- [Part 7 — Database & Infrastructure](#part-7--database--infrastructure)
- [Part 8 — Stripe & Payments](#part-8--stripe--payments)
- [Part 9 — WooCommerce Orders](#part-9--woocommerce-orders)
- [Part 10 — Making Code Changes with Claude Code](#part-10--making-code-changes-with-claude-code) — how to get AI help
- [Part 11 — Monthly Maintenance & Costs](#part-11--monthly-maintenance--costs)
- [Part 12 — Quick Reference](#part-12--quick-reference)

**Skip these — they are technical reference for developers and AI tools:**
- Part 1 — System Architecture
- Part 2 — Dashboard Features (technical inventory)

---

### 🤖 If you are an AI agent (Claude Code / developer)

**Read Part 1 first** — it gives you the full system map before touching any code: every service, file path, database table, environment variable, and how services connect.

**Then read Part 2** for the full dashboard feature scope.

**Parts 3–12** contain operator-facing failure guides and workflow descriptions — useful context, but Part 1 is the primary technical reference.

---

### 📋 Full Table of Contents

| Section | Audience |
|---|---|
| [Daily Routine](#daily-routine) | 👤 Operator |
| [Part 1 — System Architecture](#part-1--system-architecture) | 🤖 AI agent / Developer |
| [Part 2 — Dashboard Features](#part-2--dashboard-features) | 🤖 AI agent / Developer |
| [Part 3 — XHS Pipeline](#part-3--xhs-pipeline) | 👤 Operator + 🤖 AI agent |
| [Part 4 — Common Failures](#part-4--common-failures) | 👤 Operator |
| [Part 5 — Scraper Failures](#part-5--scraper-failures) | 👤 Operator |
| [Part 6 — Rakuten Failures](#part-6--rakuten-failures) | 👤 Operator |
| [Part 7 — Database & Infrastructure](#part-7--database--infrastructure) | 👤 Operator |
| [Part 8 — Stripe & Payments](#part-8--stripe--payments) | 👤 Operator |
| [Part 9 — WooCommerce Orders](#part-9--woocommerce-orders) | 👤 Operator |
| [Part 10 — Making Code Changes with Claude Code](#part-10--making-code-changes-with-claude-code) | 👤 Operator |
| [Part 11 — Monthly Maintenance & Costs](#part-11--monthly-maintenance--costs) | 👤 Operator |
| [Part 12 — Quick Reference](#part-12--quick-reference) | 👤 Operator + 🤖 AI agent |

---

## Daily Routine

> This is what you actually do. On a normal day the whole thing takes under 10 minutes.

---

### Every Morning

1. **Open the dashboard** at `http://<SERVER_IP>:3002`
2. **Check the home page** — three pipeline cards. All should show a green status and a recent run timestamp.
   - XHS card: look for any **red/orange warning banner** (means a post is waiting to be published or overdue)
   - Scraper card: last run should be within the past 7 days
   - Rakuten card: last sync should be within the past 7 days
3. **If XHS shows a pending post** (orange dot on the XHS nav item, or warning banner on the home card):
   - Go to Dashboard → XHS → **Pending section** (top of the page, red border cards)
   - Open the post card
   - Copy each field using the copy buttons: **Title → Hook → Body sections → Description → Comments**
   - Open the XHS app on your phone or [creator.xiaohongshu.com](https://creator.xiaohongshu.com) in a browser
   - Create a new post, paste each field into its matching area
   - Publish the post on XHS
   - Return to dashboard → click **"✓ Mark as Posted"** on that post card
4. **If any pipeline card shows red/failed:** go to the relevant failure section in this document

That's a normal day. No server access, no code, no terminal.

---

### What "Healthy" Looks Like

| Pipeline | Normal baseline |
|---|---|
| **XHS** | 1 post generated per day per schedule, pending queue ≤1–2 posts, run history showing green "success" rows |
| **Scraper** | Last run within 7 days (Sunday 2am JST), races count 80+, no failed runs |
| **Rakuten** | Last sync within 7 days, product count stable (not dropping by more than 10–20 per sync) |

If all three look like the table above, everything is working.

---

### Weekly (Mondays)

- Check the Rakuten card — confirm the weekend sync ran and product count looks normal
- Glance at XHS run history — confirm posts are generating daily

### Monthly (1st of the month)

- Check exchange rate at [xe.com](https://xe.com) — if JPY/CNY moved more than 2% since you last updated, go to Dashboard → Rakuten → Config → update the rate → Save
- Check [console.anthropic.com](https://console.anthropic.com) → Usage — confirm Claude spend is in line with expectations
- Check [deepl.com](https://deepl.com) → Account → Usage — confirm translation quota is not near the limit

---

## Part 1 — System Architecture

> 🤖 **This section is for AI agents and developers only.** If you are the operator, skip to [Daily Routine](#daily-routine) or [Part 4 — Common Failures](#part-4--common-failures).
>
> This section describes every service, where it lives, what it does, how services connect, and what to look at when diagnosing problems.

---

### 1.1 What This System Is

Five Docker containers running on a single AWS Lightsail instance (`<SERVER_IP>`). Together they power:

1. **Content pipeline** — daily Claude-generated XHS posts for the XHS account (see note below on account status)
2. **Race data pipeline** — weekly scrape of RunJapan → PostgreSQL → WordPress Race Hub
3. **Product pipeline** — weekly Rakuten product fetch → WooCommerce store
4. **Monitoring** — dashboard at `:3002` that surfaces all pipeline state and allows manual control

All services share a single PostgreSQL instance. Two databases: `ecosystemdb` (XHS + Scraper + Race Hub) and `rakutendb` (Rakuten pipeline).

---

### 1.2 Infrastructure

| Item | Value |
|---|---|
| Server | AWS Lightsail, `<SERVER_IP>`, user `ubuntu` |
| OS | Ubuntu, Docker + docker-compose |
| Repo path | `/home/ubuntu/automation-ecosystem` |
| SSH key | `~/.ssh/automation-ecosystem.pem` |
| SSH command | `ssh -i ~/.ssh/automation-ecosystem.pem ubuntu@<SERVER_IP>` |
| Container management | `docker-compose up/down/restart/logs` from repo root |
| CD pipeline | GitHub Actions (`.github/workflows/`) — push to `main` triggers build + deploy |
| PostgreSQL | Port 5432, TCP — use `psql -U goodsoft -d ecosystemdb -h localhost` |

---

### 1.3 Services — What They Are and Where They Live

#### Dashboard (`services/dashboard/`)
- **What:** Next.js monitoring dashboard at port `:3002`
- **Audience:** Operator — pipeline monitoring, manual triggers, XHS post archive, config editing
- **Entry point:** Next.js App Router — `app/` directory
- **Key files:**
  - `app/page.js` — home page (pipeline cards)
  - `app/xhs/page.js` — XHS detail page (schedule, run history, post archive)
  - `app/scraper/page.js` — Scraper detail page (run history, races viewer)
  - `app/rakuten/page.js` — Rakuten detail page (run log, import log, config editor)
  - `app/api/` — all API routes (Next.js route handlers)
  - `app/ui/` — all React components
  - `app/ui/XhsPostCard.js` — post archive card with per-field copy buttons
  - `app/ui/xhsMetrics.js` — XHS home card metrics
  - `app/lib/locales/en.js` + `zh.js` — all UI strings, both languages
  - `app/lib/dict.js` — locale picker: reads `lang` cookie, falls back to `NEXT_PUBLIC_LANG` env var
- **Databases:** Reads from both `ecosystemdb` and `rakutendb`
- **Invokes other services via:** `docker exec` (not HTTP) — has Docker socket mounted
- **Port:** `:3002`
- **Language toggle:** Cookie `lang=zh|en` — `LangToggle` client component sets cookie + reloads; all pages call `getDict()` which returns the correct locale object

#### XHS Pipeline (`services/xhs/`)
- **What:** Daily Claude-powered post generator. Generates XHS posts, archives to DB, operator publishes manually.
- **No HTTP server** — invoked via `docker exec` from dashboard or cron
- **Key files:**
  - `src/scheduler.js` — node-cron orchestrator. Loads schedule from `xhs_schedule` DB table on startup. Calls `Run(postType)` per slot. Has `setupAllDailyCrons()` (called by dashboard reload trigger).
  - `src/generator.js` — Claude API integration. `generatePost(type)` → calls `chooseRace()` (for race type only, separate API call) → calls Claude with system prompt + context → returns structured post object `{ title, hook, contents[], cta, description, hashtags, comments, post_type, race_name, input_tokens, output_tokens }`
  - `src/publisher.js` — Playwright automation. **KEPT in codebase but NOT called in production.** Semi-auto pivot means operator publishes manually. Do not remove — may be reactivated if XHS policy changes.
  - `src/db/queries.js` — all DB queries (pool from `src/db/pool.js`)
  - `scripts/run-scheduler.js` — container entry point
  - `scripts/run-manualPost.js` — called by dashboard manual trigger via `docker exec xhs node scripts/run-manualPost.js <postType>`
  - `config/prompts.json` — system prompt, post-type context templates (edit here to tune content, not in generator.js)
- **Databases:** `ecosystemdb`
- **DB tables used:**

| Table | Direction | Purpose |
|---|---|---|
| `races` | reads | Race context for Race Guide posts (written by Scraper) |
| `xhs_schedule` | reads | Per-day post schedule — loaded on startup, reloaded via dashboard trigger |
| `pipeline_state` | writes | Current state: `idle`, `running`, `failed` |
| `xhs_run_logs` | writes | Per-run: post type, outcome, error stage/msg, token counts |
| `xhs_post_archive` | writes | Full post content — `published=false` until operator marks it |
| `xhs_post_history` | reads + writes | Race names posted in last 7 days — dedup filter for race selection |

#### Race Scraper (`services/scraper/`)
- **What:** Weekly cron that scrapes RunJapan and writes race data to PostgreSQL
- **No HTTP server** — pure cron process
- **Key files:**
  - `scraper.js` — two-pass scraper: POST listing page (session cookie) → GET detail pages. Uses Cheerio for HTML parsing.
  - `run-scraper.js` — entry point
- **Cron:** Sunday 2am JST (`0 2 * * 0 Asia/Tokyo`)
- **Databases:** `ecosystemdb`
- **DB tables used:**

| Table | Direction | Purpose |
|---|---|---|
| `races` | writes | All race data — upsert on URL conflict |
| `scraper_run_logs` | writes | Per-run: outcome, races scraped, failures, error msg |
| `pipeline_state` | writes | Current state |

- **Scrape fields:** `name`, `name_zh`, `url`, `date`, `date_zh`, `location`, `location_zh`, `entryStart`, `entryEnd`, `registrationOpen`, `registrationUrl`, `website`, `description`, `description_zh`, `info`, `info_zh`, `notice`, `notice_zh`, `images`
- **Translation:** DeepL EN→ZH-HANS for name, date, location, description, info, notice fields

#### Race Hub (`services/race-hub/`)
- **What:** Express API at `:3001` — serves race data from `ecosystemdb.races` to WordPress
- **Used by:** WordPress plugin (`/racehub/` page) via HTTP
- **Databases:** `ecosystemdb` — reads `races` only

#### Rakuten Pipeline (`services/rakuten/`)
- **What:** TypeScript Express API at `:3000`. Fetches products from Rakuten Ranking API, translates names via DeepL, pushes to WooCommerce.
- **Key files:**
  - `src/app.ts` — Express entry point
  - `src/controller.ts` — all route handlers: bulk push, sync, product request, config
  - `src/services/rakutenAPI.ts` — Rakuten API wrapper (`getProductsByRankingGenre`, `getProductsByKeyword`)
  - `src/services/woocommerceAPI.ts` — WooCommerce REST API wrapper (Consumer Key + Secret auth)
  - `src/services/pricing.ts` — JPY→CNY conversion formula
  - `src/db/queries.ts` — all DB queries
  - `src/db/pool.ts` — DB connection pool
  - `src/runWeeklySync.ts` — weekly sync logic: `incrementMissedScrapes()` → fetch ranking → `upsertProducts()` → `deleteStaleProducts()` + WC removal
- **Databases:** `rakutendb`
- **DB tables used:**

| Table | Purpose |
|---|---|
| `products` | All product data — `itemURL` is dedup key; `missed_scrapes` counter; `wc_product_id` links to WooCommerce |
| `categories` | Top-level category names + WC category IDs |
| `subcategories` | Subcategory names, `genre_ids[]` array, WC category IDs |
| `config` | Single row: `yen_to_yuan`, `markup_percent`, `search_fill_threshold`, `products_per_category` |
| `run_logs` | Per-sync: operation, new products pushed, price updates, stale removed, errors |
| `import_logs` | Per-product WooCommerce push result (success/failed/skipped) |
| `product_stats` | Aggregate totals: total cached, total pushed, per-category breakdown |

- **Stale product culling:** `missed_scrapes` increments for every product on each sync. Products not returned by the Ranking API don't get reset. At `missed_scrapes >= 15`, product is deleted from WooCommerce AND from PostgreSQL. Threshold is 15 — raised from 3 in May 2026 to reduce over-aggressive culling.
- **Pricing:** `sale_price = rakuten_price_jpy * yen_to_yuan`. Markup applied separately via WooCommerce Discount Rules plugin — not in pipeline.
- **Port:** `:3000`

---

### 1.4 How Services Connect

```
                         ┌─────────────────────────────────────┐
                         │         AWS Lightsail :3002          │
                         │         Dashboard (Next.js)          │
                         │                                      │
                         │  Reads: ecosystemdb + rakutendb      │
                         │  Invokes via docker exec:            │
                         │    → xhs (manual post, reload sched) │
                         │    → scraper (manual run)            │
                         │    → rakuten (manual sync)           │
                         └─────────────────┬───────────────────┘
                                           │
              ┌────────────────────────────┼───────────────────────────┐
              │                            │                           │
              ▼                            ▼                           ▼
   ┌──────────────────┐        ┌──────────────────┐       ┌──────────────────────┐
   │  XHS Container   │        │ Scraper Container │       │  Rakuten Container   │
   │  (node-cron)     │        │  (node-cron)      │       │  Express :3000       │
   │                  │        │                   │       │                      │
   │ scheduler.js     │        │ scraper.js        │       │ runWeeklySync.ts     │
   │ generator.js     │        │ Sunday 2am JST    │       │ Ranking API fetch    │
   │                  │        │                   │       │ WC push              │
   └────────┬─────────┘        └────────┬──────────┘       └──────────┬───────────┘
            │ reads/writes               │ writes                      │ reads/writes
            ▼                            ▼                             ▼
   ┌──────────────────────────────────────────┐        ┌──────────────────────────┐
   │              ecosystemdb (PostgreSQL)    │        │    rakutendb (PostgreSQL) │
   │  races (written by scraper, read by xhs) │        │  products, config,        │
   │  xhs_post_archive, xhs_run_logs,         │        │  run_logs, import_logs    │
   │  xhs_schedule, xhs_post_history,         │        └──────────────────────────┘
   │  scraper_run_logs, pipeline_state        │
   └──────────────────────────────────────────┘
            │ reads                              reads
            ▼                                    ▼
   ┌──────────────────────┐         ┌────────────────────────────────┐
   │  Race Hub :3001      │         │    WordPress / WooCommerce      │
   │  Serves races to WP  │ ──────► │    running.moximoxi.net        │
   └──────────────────────┘         │    Receives products via WC API│
                                    └────────────────────────────────┘
```

---

### 1.5 Environment Variables

Each service has its own `.env` (never committed). Key variables per service:

**XHS (`services/xhs/.env`):**
- `ANTHROPIC_API_KEY` — Claude API
- `DATABASE_URL` — `ecosystemdb` connection string
- `XHS_AUTH_SECRET` — shared secret for dashboard SSE auth

**Scraper (`services/scraper/.env`):**
- `DATABASE_URL` — `ecosystemdb`
- `DEEPL_API_KEY` — race name/description translation

**Rakuten (`services/rakuten/.env`):**
- `RAKUTEN_APP_ID` — Rakuten API application ID
- `RAKUTEN_ACCESS_KEY` — Rakuten API access key
- `ANTHROPIC_API_KEY` — Claude API (genre classifier)
- `WP_WOOCOMMERCE_CONSUMER_KEY` + `WP_WOOCOMMERCE_CONSUMER_SECRET` — WooCommerce REST API
- `WP_URL` — `https://running.moximoxi.net`
- `DATABASE_URL` — `rakutendb` connection string
- `DEEPL_API_KEY` — product name translation
- `REDIS_URL` — rate limiting (Redis runs locally in Docker)

**Dashboard (`services/dashboard/.env`):**
- `DATABASE_URL` — `ecosystemdb`
- `RAKUTEN_DATABASE_URL` — `rakutendb`
- `RAKUTEN_SERVICE_URL` — internal URL to Rakuten Express service (`http://rakuten:3000`)
- `XHS_AUTH_SECRET` — must match the XHS service value
- `NEXT_PUBLIC_LANG` — `zh` in production, `en` in local dev

---

### 1.6 Design Docs & AI Agent Entry Points

**Start here when working on any service — read in this order:**

1. `CLAUDE.md` (repo root) — project-wide rules, repo structure, doc-sync requirements
2. `services/<service>/CLAUDE.md` — service-specific rules, repo structure, what to read before coding
3. `services/<service>/docs/<service>-design-doc.md` — full architecture, DB schema, technical decisions, engineering challenge log
4. `docs/ecosystem/ecosystem-checklist.md` — current build state across all services (what's done, what's pending)

| Service | CLAUDE.md | Design doc |
|---|---|---|
| XHS | `services/xhs/CLAUDE.md` | `services/xhs/docs/xhs-design-doc.md` |
| Scraper | `services/scraper/CLAUDE.md` | `services/scraper/docs/scraper-design-doc.md` |
| Rakuten | `services/rakuten/CLAUDE.md` | `services/rakuten/docs/rakuten-design-doc.md` |
| Dashboard | — | `services/dashboard/docs/dashboard-design-doc.md` |
| Race Hub | — | `services/race-hub/docs/race-hub-design-doc.md` |

The `CLAUDE.md` files are the most important entry point — they tell Claude Code exactly what to read, what conventions to follow, and what never to skip (e.g. keeping checklists and design docs in sync after every change).

---

## Part 2 — Dashboard Features

> 🤖 **This section is a technical feature inventory for AI agents and developers.** It documents every dashboard feature, API route, and component.
>
> 👤 **Operator:** You don't need to read this section. To learn how to use the dashboard, see [Daily Routine](#daily-routine) and [Part 3 — XHS Pipeline](#part-3--xhs-pipeline).

The dashboard at `http://<SERVER_IP>:3002` is the operator's primary interface. Full feature inventory:

---

### 2.1 Home Page — Pipeline Cards

Three cards, metrics only. No triggers on home page — triggers are on detail pages.

**XHS Card** — shows: pipeline state, last run timestamp, last run status, next scheduled post, success rate (30d), error breakdown by stage, post type distribution, cumulative API token usage.

**Scraper Card** — shows: pipeline state, last run timestamp, next scheduled scrape, total races in DB, last scrape count, data freshness indicator (alert if stale beyond threshold).

**Rakuten Card** — shows: catalog size (total products in DB), WooCommerce live count (products with `wc_product_id`), last sync timestamp, last operation, new products pushed last run, recent error count, per-category breakdown.

---

### 2.2 XHS Detail Page (`/xhs`)

**Post Archive** — table of all posts in `xhs_post_archive`. Each row expandable into a full post card showing:
- Title, hook, body sections, description/CTA, hashtags, comments
- Per-field copy button — copies that field's text to clipboard
- **"✓ Mark as Posted"** button — sets `published=true` in DB, moves post out of Pending section
- Copy button uses `navigator.clipboard.writeText()` with `execCommand('copy')` fallback for non-HTTPS

**Pending Section** — posts where `published=false`. This is the operator's work queue — posts generated but not yet manually published to XHS.

**Run History** — table of `xhs_run_logs`: timestamp, post type, outcome, error stage, error message, input/output token counts.

**Schedule Management** — weekly grid (Sun–Sat). Per day: add/remove post slots, set time (24h CST), set post type (Race / Training / Nutrition / Wearable). Save writes to `xhs_schedule` table. Dashboard then calls `setupAllDailyCrons()` via `docker exec` to reload cron jobs without restart.

**Manual Post Trigger** — post type selector dropdown + "Generate Post" button. Fires `docker exec xhs node scripts/run-manualPost.js <type>`. Live log panel via SSE stream shows stdout in real time. Log persists on reload (mount-time GET restores buffer, reconnects SSE if still running). Panel lingers on failure for diagnosis.

---

### 2.3 Scraper Detail Page (`/scraper`)

**Run History** — table of `scraper_run_logs`: timestamp, outcome, races scraped, failure count, error message.

**Races Viewer** — full table from `races` DB: race name, date, location, entry status badge (Open / Closed — locale-aware). Fixed column widths.

**Failed URLs** — collapsible list of URLs that failed in the last scraper run.

**"Run Scraper Now"** — trigger button. Fires `docker exec scraper node run-scraper.js`. Live log panel via SSE (same pattern as XHS trigger). Log persists on reload.

---

### 2.4 Rakuten Detail Page (`/rakuten`)

**Run Log** — table of `run_logs`: timestamp, operation, new products pushed, price updates, stale removed, errors.

**Import Log** — table of `import_logs`: timestamp, product name, status (success/failed/skipped), error message.

**Pricing Config Editor** — inline editable fields for:
- `yenToYuan` — JPY → CNY exchange rate
- `markupPercent` — markup percentage (note: actual markup applied via WooCommerce plugin, this field is legacy/informational)
- `searchFillThreshold` — keyword search fill threshold
- `productsPerCategory` — target products per top-level category (divided across subcategories)

Save button POSTs to `/api/rakuten/config` → proxies to Rakuten Express service → updates `config` table in `rakutendb`.

**"Run Sync Now"** — trigger button. Fires `docker exec rakuten` sync command. Live log panel via SSE. Log persists on reload.

---

### 2.5 Language Toggle

`LangToggle` client component in nav. Sets `lang` cookie (`en` or `zh`) and reloads. All pages call `getDict()` from `app/lib/dict.js` — reads cookie, falls back to `NEXT_PUBLIC_LANG` env var, returns `{ dict, lang }`. All UI strings come from locale files — no hardcoded strings in page/component files.

Production `NEXT_PUBLIC_LANG=zh` — default Chinese. Local dev defaults to `en`.

---

## Part 3 — XHS Pipeline

### 3.1 How Post Generation Works

```
xhs_schedule table
    ↓  loaded on container startup by scheduler.js
node-cron jobs (one per schedule slot)
    ↓  fires at scheduled time
Run(postType)  [scheduler.js]
    ↓
generatePost(type)  [generator.js]
    ↓  if type === 'race':
    chooseRace()  →  Claude API (separate call, picks best race from DB)
    ↓
    Claude API  ←  system prompt (MOXI persona, format rules) + context prompt (race data / season / month)
    ↓
    returns { title, hook, contents[], cta, description, hashtags, comments, post_type, race_name, input_tokens, output_tokens }
    ↓
insertPostArchive(post, published=false)  [scheduler.js]
    ↓
xhs_post_archive table — published=false
    ↓
insertRunLog(...)  — writes to xhs_run_logs
upsertPipelineState('idle' or 'failed')
```

**Post types:** `race`, `training`, `nutritionSupplement`, `wearable`

**Content strategy:** Race (40%), Training (25%), Nutrition (20%), Recovery/Wearable (15%) — derived from 115-post historical performance data.

**Race deduplication:** `xhs_post_history` stores race names posted in last 7 days. `getPostedRaces()` filters them out before `chooseRace()` selects a race. `deleteOldPostHistory()` runs monthly (1st of month cron) to purge entries older than 7 days.

**Prompts:** System prompt and per-type context templates live in `config/prompts.json` — edit there to tune content strategy without touching `generator.js`.

---

### 3.2 XHS Account Status

> ⚠️ **Important:** The original MOXI爱跑步 account was suspended by XHS in April 2026 after automated login testing triggered their bot detection. A new XHS account needs to be registered before the pipeline can publish live posts. This is a pending task at handoff time.

**What the pipeline does today:** Generates complete posts daily and saves them to the dashboard. Posts wait in the Pending queue until the operator copies and publishes them manually. Everything except the final paste-and-publish is automated.

**Once the new account is live:** The workflow below applies immediately — no code changes needed.

---

### 3.3 Operator Publishing Workflow

The system generates posts automatically. The operator's job is to copy them from the dashboard and paste them into XHS. Takes about 3 minutes per post.

**Why not fully automatic:** XHS detects and bans accounts that post from datacenter IP addresses (the server's IP). Content creation is the bottleneck — not clicking publish. The 3-minute paste is acceptable; the risk of account suspension is not.

**Operator workflow:**
1. Open dashboard → XHS → **Pending section** (top of page, red border cards)
2. Posts generated by the nightly scheduler appear here
3. Click a post card to expand it
4. Copy each field using the copy button: **Title → Hook → Body sections → Description → Comments**
5. Open the XHS app or [creator.xiaohongshu.com](https://creator.xiaohongshu.com) → create new post → paste each field into its matching area
6. Publish the post on XHS
7. Return to dashboard → click **"✓ Mark as Posted"** — moves the post to the Archive section

**Field mapping (XHS post creation):**

| Dashboard field | Where it goes in XHS |
|---|---|
| Title | Post title (top field) |
| Hook | First slide — paste as body text |
| Body sections | One per slide — each has a subtitle and body |
| Description | Caption field below the slides |
| Comments | Post these immediately after publishing — one at a time, paste into the comment box |

**Overdue posts:** If a post has been pending for more than 4 hours, the dashboard shows a red "Overdue" badge. This means the scheduler ran but you haven't posted yet — post it as soon as you can.

**`publisher.js` status:** File exists in the codebase as a reference. Not called in production. Auto-publishing may be reinstated in the future if a non-datacenter IP solution is found.

---

### 3.4 Schedule Management

Schedule stored in `xhs_schedule` table (`day` 0–6, `time` HH:MM, `post_type`). Dashboard reads and writes via `GET/POST /api/xhs/schedule`. After saving, dashboard calls `docker exec xhs node scripts/run-reloadSchedule.js` — this calls `setupAllDailyCrons()` which clears existing jobs and re-registers from the updated table. No container restart needed.

---

## Part 4 — Common Failures

### 4.1 An API Key Stopped Working

**Symptom:** Dashboard shows errors with "401", "Unauthorized", "Invalid API Key", or "Authentication Failed".

| Error in | Broken key | Where to renew |
|---|---|---|
| XHS generate stage | Anthropic (Claude) API | console.anthropic.com |
| Scraper translation | DeepL API | deepl.com/pro → Account → API keys |
| Rakuten product names | DeepL API | deepl.com/pro → Account → API keys |
| Rakuten product fetch | Rakuten API | webservice.rakuten.co.jp |
| Rakuten WooCommerce push | WooCommerce consumer key | WordPress admin → WooCommerce → Settings → Advanced → REST API |

**Fix:**
1. Get new key from the relevant provider
2. SSH into server: `ssh -i ~/.ssh/automation-ecosystem.pem ubuntu@<SERVER_IP>`
3. Edit the service's `.env`: `nano /home/ubuntu/automation-ecosystem/services/<service>/.env`
4. Replace the old key value
5. Restart the container: `docker-compose restart <service>`
6. Re-trigger the failed pipeline from the dashboard

---

### 4.2 Pipeline Failed — Generic Error

**Symptom:** Dashboard shows a run as "Failed" with an error message.

**Fix:**
1. Click the failed run in the dashboard to see the full error
2. Copy the error message
3. 🤖 Paste into Claude or ChatGPT: *"This error appeared in my automation pipeline on AWS Lightsail running Docker. The service is [XHS / Scraper / Rakuten]. Error: [paste]. What does it mean and how do I fix it?"*
4. If the AI suggests a code fix, see [Part 10](#part-10--making-code-changes-with-claude-code)
5. After fixing, use the manual trigger button to re-run

---

### 4.3 Posts Not Appearing at Scheduled Time

**Symptom:** Expected daily XHS post wasn't generated. Dashboard shows no run entry at the scheduled time.

**Check in order:**
1. **Is the schedule set correctly?** Dashboard → XHS → Schedule. Confirm day and time. Timezone is Asia/Shanghai.
2. **Did the cron fire?** Check XHS run history — if no entry exists at all, the cron job didn't trigger. Restart the XHS container: `docker-compose restart xhs`
3. **Is the XHS container running?** Dashboard health indicators show status per service. If XHS is red, check logs: `docker-compose logs xhs`
4. **Did generation fail?** If there IS a run entry with "Failed" at "generate" stage — see Section 3.4 (Claude API errors)

---

### 4.4 Claude API Failing / Post Not Generating

**Symptom:** Dashboard shows error at "generate" stage in XHS run history.

| Error contains | Cause | Fix |
|---|---|---|
| "401" or "Unauthorized" | Anthropic key invalid | Section 4.1 — renew key |
| "429" or "rate limit" | Too many requests | Wait 1 hour, re-trigger |
| "timeout" | Anthropic API slow or down | Check status.anthropic.com — wait if outage |
| "JSON parse error" | Claude returned malformed output | Re-trigger (usually transient). If repeating, see below |

**If JSON parse error repeats:**
🤖 *"My XHS post generator using the Anthropic Claude API in `services/xhs/src/generator.js` is repeatedly failing with a JSON parse error. The system prompt is in `services/xhs/config/prompts.json`. What in the prompt might cause Claude to return invalid JSON and how do I fix it?"*

---

### 4.5 DeepL Translation Quota Exceeded

**Symptom:** Race names or product names appearing in Japanese instead of Chinese. Dashboard may show DeepL errors in scraper or Rakuten runs.

**Fix:**
1. Log into deepl.com → account → usage — check monthly character limit
2. If near limit: wait until 1st of next month for reset
3. If reset but still failing: API key may have changed — see Section 4.1
4. Previously translated content is cached in DB — only new content needs re-translating

---

## Part 5 — Scraper Failures

The scraper runs weekly. If it fails, race data on the website goes stale but nothing breaks immediately — last good data is preserved in `ecosystemdb.races`.

---

### 5.1 Scraper Returned 0 Races or Failed Entirely

**Symptom:** Dashboard shows "races scraped: 0" or scraper run failed.

**Most likely cause:** RunJapan's website changed its HTML structure (redesign or update).

**Fix:**
1. Dashboard → Scraper → last run → copy the error message
2. 🤖 *"My web scraper for runjapan.jp is failing with this error: [paste error]. The scraper is in `services/scraper/scraper.js` and uses Cheerio to parse HTML with a two-pass approach: POST listing page then GET detail pages. What changed and how do I update the selectors?"*
3. Apply fix per [Part 10](#part-10--making-code-changes-with-claude-code)

**While fixing:** Previous race data stays in `races` table — website and XHS generator continue working with slightly stale data.

---

### 5.2 Only Partial Race Data Returned

**Symptom:** Scraper succeeded but with fewer races than usual (usually 80+).

**Most likely cause:** RunJapan pagination changed, or session cookie handling broke.

**Fix:**
🤖 *"My RunJapan scraper in `services/scraper/scraper.js` returned only [X] races instead of the usual 80+. It uses `tough-cookie` + `axios-cookiejar-support` for session handling across paginated requests. What could cause partial results?"*

---

### 5.3 Race Data Looks Wrong

**Symptom:** Races show missing dates, wrong locations, or blank descriptions.

**Cause:** RunJapan changed the HTML structure of detail pages — Cheerio selectors are reading from the wrong fields.

**Fix:** Same as Section 5.1 — update selectors in `scraper.js`.

---

## Part 6 — Rakuten Failures

---

### 6.1 Products Not Appearing in WooCommerce

**Symptom:** Sync ran but products didn't appear in the store.

**Check in order:**
1. Dashboard → Rakuten → Import Log — look for errors per product
2. Common: WooCommerce API auth failed → Section 4.1 (renew WC consumer key)
3. Common: Image sideload failed → products created without images. Check WooCommerce admin — products may exist with placeholder image.

---

### 6.2 Rakuten API Rate Limit

**Symptom:** Rakuten errors with "429" or "Too Many Requests" in run log.

**Fix:** Wait 1 hour, re-trigger sync from dashboard. Pipeline has 1-second delays between API calls but large fetches can still hit limits.

🤖 If repeating: *"My Rakuten API calls are hitting rate limits. The sync logic is in `services/rakuten/src/runWeeklySync.ts`. How do I reduce request rate?"*

---

### 6.3 Products Have No Images

**Symptom:** Products in store show placeholder image instead of product photo.

**Cause:** WooCommerce image sideloading from Rakuten CDN failed (CDN blocked the request or URL expired).

**Fix:** Re-trigger the sync — products with no `wc_product_id` are re-pushed automatically on the next sync. If images still fail: 🤖 *"My WooCommerce product image sideloading from Rakuten CDN URLs is failing. What's the most likely cause and fix?"*

---

### 6.4 Exchange Rate Is Stale

**Symptom:** Product prices look wrong compared to current JPY/CNY rate.

**Fix:**
1. Check current rate at xe.com or Google
2. Dashboard → Rakuten → Config → update "日元 → 人民币汇率" (JPY → CNY Rate)
3. Save — prices recalculate on the next sync

---

### 6.5 Products Being Deleted Too Aggressively

**Symptom:** Products that should be available are disappearing from the store.

**How stale culling works:**
- Every sync: `incrementMissedScrapes()` bumps ALL products by 1
- Products returned by Ranking API: `upsertProducts()` resets their `missed_scrapes` to 0
- Products at `missed_scrapes >= 15`: deleted from WooCommerce AND from PostgreSQL

**Why it happens:** If `productsPerCategory` is set low, few products are fetched per subcategory per sync, so products cycle out of the ranking faster than the threshold catches them.

**Fix:**
1. Dashboard → Rakuten → Config → increase `productsPerCategory`
2. Or: reduce the frequency of syncs temporarily while the catalog stabilizes

---

### 6.6 Weekly Sync Didn't Run

**Symptom:** Prices are stale or products show as out-of-stock when they shouldn't be.

**Fix:**
1. Dashboard → Rakuten → "Run Sync Now"
2. If it fails, check for DB errors (Section 7.1) or API auth errors (Section 4.1)

---

## Part 7 — Database & Infrastructure

---

### 7.1 Database Connection Errors

**Symptom:** Multiple services failing simultaneously. Errors mention "ECONNREFUSED", "database", "PostgreSQL", or "connection refused".

**Fix:**
1. SSH into server
2. `docker-compose ps` — check if `postgres` container is running
3. If "Exit" or "Restarting": `docker-compose restart postgres`
4. Wait 30 seconds: `docker-compose ps` again
5. If keeps crashing: `docker-compose logs postgres` → 🤖 copy and paste output

**If disk is full** ("no space left on device"):
1. `df -h` — check disk usage
2. `docker system prune -f` — remove unused Docker images/containers
3. If still full, Lightsail instance storage needs upgrading (AWS console)

---

### 7.2 A Container Keeps Crashing

**Symptom:** Dashboard shows a service down, keeps restarting.

**Fix:**
1. SSH into server
2. `docker-compose logs <service>` (service names: `xhs`, `scraper`, `rakuten`, `race-hub`, `dashboard`)
3. Copy last 50 lines
4. 🤖 *"My Docker container [service] keeps crashing on AWS Lightsail. Here are the logs: [paste]. What is causing this?"*

---

### 7.3 All Services Down

**Symptom:** Dashboard unreachable. Website still works but automation is stopped.

**Most likely cause:** Lightsail instance rebooted (AWS maintenance) and containers didn't auto-start.

**Fix:**
1. SSH into server
2. `docker-compose up -d`
3. Wait 1 minute: `docker-compose ps` — all services should show "Up"
4. Open dashboard to confirm

**Prevention:** `sudo systemctl enable docker` ensures Docker starts on boot. Run this if not already done.

---

## Part 8 — Stripe & Payments

Stripe processes all payments for the WooCommerce store. You don't need to touch Stripe for day-to-day operations — WooCommerce handles order flow automatically. You only need Stripe when something goes wrong with a payment.

---

### 8.1 Checking Payment Status

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com)
2. **Payments** tab — shows every transaction. Status: Succeeded / Failed / Refunded
3. Search by customer email or order amount to find a specific payment

---

### 8.2 Customer Says Payment Failed

1. Go to Stripe → Payments → find the failed charge
2. Check the failure reason (shown under the payment): card declined, insufficient funds, authentication required, etc.
3. Tell the customer the reason and ask them to:
   - Try a different card
   - Contact their bank if it says "authentication required" (3D Secure issue)
   - Try again — sometimes transient failures clear on retry
4. If the payment succeeded but WooCommerce doesn't show an order: 🤖 *"A Stripe payment succeeded but no WooCommerce order was created. What could cause a webhook delivery failure and how do I check the Stripe webhook log?"*

---

### 8.3 Issuing a Refund

1. Stripe → Payments → find the payment → click **Refund**
2. Enter the amount (full or partial) and a reason
3. Click **Refund** — customer receives the money within 5–10 business days
4. Go to WooCommerce admin → Orders → find the order → update status to **Refunded**

---

### 8.4 Payouts

Stripe pays out to your linked bank account on a rolling basis (typically 2–7 business days after each payment clears). You can see the payout schedule at Stripe → **Payouts** tab.

If a payout is delayed or missing:
1. Stripe → Payouts → check for any "Failed" payout entry
2. Verify the bank account details are correct: Stripe → Settings → Bank accounts

---

### 8.5 Stripe Fees

Stripe charges ~2.9% + ¥30 per transaction (or regional equivalent). This is deducted automatically from each payment before payout — you never pay separately. Check the exact fee at Stripe → Settings → Pricing.

---

## Part 9 — WooCommerce Orders

When a customer buys something from the store, an order appears in WooCommerce. You need to manually handle fulfilment — the automation pipeline only stocks the store and prices products. Shipping and customer communication is manual.

---

### 9.1 Where to See Orders

WordPress admin → [running.moximoxi.net/wp-admin](https://running.moximoxi.net/wp-admin) → **WooCommerce → Orders**

Each order shows: customer name, email, items ordered, total paid, customer note (size/colour preference if they filled it in), order status.

---

### 9.2 Normal Order Flow

1. Customer places an order → WooCommerce automatically emails them an order confirmation
2. You see the order in WooCommerce admin → status: **Processing**
3. Check the order for any customer notes (size/colour preference)
4. Purchase the item from Rakuten Japan (the product page link is in WooCommerce under the product)
5. Arrange shipping to the customer via your forwarding/proxy service
6. Once shipped, update the order status to **Completed** — WooCommerce emails the customer
7. If the item is unavailable or delayed, email the customer directly (their email is on the order)

---

### 9.3 Order Status Reference

| Status | Meaning |
|---|---|
| **Pending payment** | Payment not confirmed yet — wait, usually auto-resolves |
| **Processing** | Payment confirmed — you need to fulfil this |
| **Completed** | Fulfilled and shipped — customer notified |
| **Refunded** | Refund issued via Stripe |
| **Cancelled** | Order cancelled — no payment taken |
| **On hold** | Needs manual review — check the order notes |

---

### 9.4 Customer Enquiries

Customers contact via:
- The live chat widget (bottom-right of site)
- Phone: 15721021232
- The email they used at checkout

Common questions:
- **"Where is my order?"** — check if you've shipped it and update the tracking if available
- **"Can I change my size?"** — update the order note in WooCommerce admin before purchasing from Rakuten
- **"The product is out of stock"** — check Rakuten for the item. If unavailable, refund and offer an alternative

---

### 9.5 Product Not in Store (Customer Request)

The Rakuten dashboard has a product request endpoint — if a customer asks for a specific product that's not in the store:

1. Dashboard → Rakuten → find the product request section (or ask them to submit via the site's request form)
2. The pipeline fetches the product from Rakuten, prices it, and adds it to WooCommerce automatically within ~2 minutes
3. Send the customer the product page link

---

## Part 10 — Making Code Changes with Claude Code

### 10.1 What Claude Code Is

Claude Code is an AI coding assistant that runs in the terminal. When launched from the repo directory, it reads the codebase directly and can make targeted code changes. It is the fastest way to diagnose and fix issues in this system without deep knowledge of the code.

### 10.2 How to Start a Debugging Session

**Option A — on the server directly:**
```bash
ssh -i ~/.ssh/automation-ecosystem.pem ubuntu@<SERVER_IP>
cd /home/ubuntu/automation-ecosystem
claude  # starts Claude Code CLI
```

**Option B — on a local clone:**
```bash
git clone <repo-url>
cd automation-ecosystem
claude
```

**First message to Claude Code in every debugging session:**
```
I'm maintaining the automation ecosystem for running.moximoxi.net. 
It has 5 Docker services on AWS Lightsail:
- XHS: daily Claude-powered post generator (services/xhs/) — semi-auto, generates to DB
- Scraper: weekly RunJapan scraper (services/scraper/)
- Race Hub: Express API serving race data to WordPress (services/race-hub/)
- Rakuten: TypeScript product aggregator from Rakuten to WooCommerce (services/rakuten/)
- Dashboard: Next.js monitoring dashboard (services/dashboard/)

Two PostgreSQL databases: ecosystemdb (XHS + Scraper) and rakutendb (Rakuten).
Design docs are in services/<service>/docs/<service>-design-doc.md.

[Paste your specific problem here]
```

### 10.3 Prompts by Failure Type

**Scraper selector broke (RunJapan redesign):**
```
Read services/scraper/scraper.js in full. The scraper is failing with: [paste error].
RunJapan likely changed their HTML. Identify which Cheerio selectors need updating
and suggest the fix. I'll need to verify the new selectors in a browser first — 
tell me what to look for in DevTools.
```

**XHS post generator failing:**
```
Read services/xhs/src/generator.js and services/xhs/config/prompts.json.
The generator is failing at [generate/chooseRace] stage with: [paste error].
Diagnose the cause and suggest a fix. Do not change the prompt content in 
prompts.json without explaining the tradeoff first.
```

**Dashboard showing wrong data / feature broken:**
```
Read services/dashboard/app/[relevant page file] and related components in 
services/dashboard/app/ui/. The issue is: [describe what's wrong].
Also check services/dashboard/app/lib/locales/ if it's a display/string issue.
```

**Rakuten sync issues:**
```
Read services/rakuten/src/runWeeklySync.ts and services/rakuten/src/db/queries.ts.
The Rakuten sync is failing/behaving unexpectedly: [paste error or describe behavior].
Also check the config table values if it's a volume/culling issue.
```

**Container won't start:**
```
The [service] Docker container keeps crashing. Here are the logs:
[paste docker-compose logs output]
Read services/<service>/Dockerfile and the entry point script to diagnose.
```

**Database schema question:**
```
Read services/rakuten/src/db/queries.ts (or services/xhs/src/db/queries.js)
to understand the current schema. Question: [your question about DB structure].
```

### 10.4 Applying a Fix via GitHub (Recommended)

1. Go to the GitHub repo in a browser
2. Find the file Claude Code identified
3. Click the pencil icon (Edit)
4. Make the change
5. Click "Commit changes"
6. CD pipeline deploys automatically within a few minutes
7. Check dashboard to confirm the service restarted cleanly

### 10.5 Applying a Fix Directly on the Server (Emergency)

```bash
ssh -i ~/.ssh/automation-ecosystem.pem ubuntu@<SERVER_IP>
cd /home/ubuntu/automation-ecosystem
nano services/<service>/src/<file>   # make the change
docker-compose restart <service>
docker-compose logs <service>        # verify it started cleanly
```

⚠️ Changes made directly on the server will be overwritten on the next GitHub deploy. Always commit the same change to GitHub afterward.

---

## Part 11 — Monthly Maintenance & Costs

### 11.1 Monthly Tasks

| Task | When | How |
|---|---|---|
| Check exchange rate | 1st of month | xe.com → Dashboard → Rakuten → Config → update if moved >2% |
| Review XHS post archive | Any time | Dashboard → XHS → Post Archive — check recent posts look correct |
| Check DeepL quota | If translations stop | deepl.com → account → usage |
| Check Anthropic usage | Any time | console.anthropic.com → usage |
| Rakuten catalog review | Monthly | Dashboard → Rakuten → by-category counts — confirm no major unexpected drops |
| Domain renewal check | Annually (set a reminder) | Log into your domain registrar — confirm auto-renewal is on for `moximoxi.net` |

---

### 11.2 Monthly Costs (Approximate)

These are the recurring costs to keep the platform running. All are billed to the accounts in the handoff-setup.md.

| Service | Cost | Billed by |
|---|---|---|
| AWS Lightsail VPS | ~$10–20 USD/month | AWS |
| Anthropic (Claude API) | ~$5–30 USD/month (varies with usage) | Anthropic |
| DeepL | Depends on plan (Free tier: 500k chars/month) | DeepL |
| Domain (`moximoxi.net`) | ~$10–20 USD/year | Domain registrar |
| Docker Hub | Free (public repos) | Docker Hub |
| Stripe | 2.9% + ¥30 per transaction (no monthly fee) | Deducted from each payment |
| Google Translate API | Minimal (TranslatePress only translates new content) | Google Cloud |

**What to watch for:**
- AWS bill spikes: usually means the instance is under load or you have excess snapshots — check the AWS Lightsail console
- Anthropic bill spike: means XHS is generating far more posts than expected — check the run history
- DeepL quota exhausted: new race translations will fail — upgrade plan or wait for monthly reset

---

## Part 12 — Quick Reference

### Error Message Lookup

| Error message | Meaning | Go to |
|---|---|---|
| `401 Unauthorized` | API key invalid or expired | Section 4.1 |
| `429 Too Many Requests` | Rate limit | Wait 1 hour, retry |
| `ECONNREFUSED` | Service not running or DB down | Section 7.1 |
| `selector not found` / `strict mode violation` | Website HTML changed | Section 5.1 or 3.2 |
| `JSON parse error` | Claude returned malformed response | Re-trigger; if repeating see Section 4.4 |
| `no space left on device` | Server disk full | Section 7.1 |
| `DEEPL_API_KEY` | DeepL key missing or expired | Section 4.1 |
| `missed_scrapes >= 15` | Product deleted as stale | Section 6.5 |
| `published=false` | Post generated, operator hasn't posted to XHS yet | Normal — see Part 3.2 |

### SSH & Docker Commands

```bash
# SSH in
ssh -i ~/.ssh/automation-ecosystem.pem ubuntu@<SERVER_IP>

# Check all containers
docker-compose ps

# View logs for a service
docker-compose logs xhs
docker-compose logs -f rakuten   # follow mode

# Restart a service
docker-compose restart xhs

# Start everything (after reboot)
docker-compose up -d

# Connect to PostgreSQL
psql -U goodsoft -d ecosystemdb -h localhost
psql -U goodsoft -d rakutendb -h localhost
```

### Container Names

| Container | Service |
|---|---|
| `xhs` | XHS post generator |
| `scraper` | Race scraper |
| `race-hub` | Race Hub API |
| `rakuten` | Rakuten product aggregator |
| `dashboard` | Monitoring dashboard |
| `postgres` | PostgreSQL |

### Key URLs

| URL | What |
|---|---|
| `http://<SERVER_IP>:3002` | Dashboard |
| `https://running.moximoxi.net` | WordPress store |
| `https://running.moximoxi.net/wp-admin` | WordPress admin |
| `https://running.moximoxi.net/racehub/` | Race Hub page |
| `https://creator.xiaohongshu.com` | XHS Creator Studio |
| `https://console.anthropic.com` | Anthropic API keys + usage |
| `https://webservice.rakuten.co.jp` | Rakuten API console |
