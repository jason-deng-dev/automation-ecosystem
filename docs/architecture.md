**Project:** automation-ecosystem

**Platform:** running.moximoxi.net — Japanese marathon platform for Chinese runners

**Author:** Jason Deng

**Date:** March 2026

**Status:** In Development

---

## 1. What This Is

running.moximoxi.net is a marathon platform targeting Chinese runners in China who see Japan as an aspirational race destination and Japanese running products as premium and authentic. The platform has four core destinations: a shop (`/shop/`), a race hub (`/racehub/`), marathon prep tools (`/mara-prep-tools/`), and a community (`/community/`).

Running the platform manually at scale is not viable. Three core operations — content creation, race data, and product sourcing — each require hours of repetitive work per week. This repo contains the automation systems that replace that manual work, plus the monitoring infrastructure to operate them without technical knowledge.

---

## 2. The Three Problems Being Solved

### 2.1 Content Creation Bottleneck — XHS Pipeline

**Problem:** The platform's primary traffic channel is Xiaohongshu (XHS / RedNote). Building an audience requires consistent daily posts — race guides, training tips, nutrition breakdowns, gear recommendations. Writing, formatting, and publishing each post manually takes 1-2 hours. At daily cadence, this is unsustainable alongside other platform work.

**Solution:** A fully automated content pipeline. Claude generates structured posts in the MOXI brand voice, calibrated against 115 manually written posts and 60k+ views of real performance data. Playwright publishes directly to XHS on a configurable daily schedule. Zero manual effort per post.

→ See `services/xhs/docs/xhs-design-doc.md`

---

### 2.2 Stale Race Data — Scraper + Race Hub

**Problem:** The race hub is supposed to show upcoming Japanese marathons — registration windows, dates, locations, entry fees. This data changes constantly: new races open, deadlines pass, events are added. Updating it manually means either stale listings or hours of copy-paste per week.

**Solution:** A weekly automated scraper pulls all upcoming race data from RunJapan and writes it to a shared data store. A persistent Race Hub server exposes this data via REST API. The race hub page on WordPress embeds a React SPA that fetches from the API — always showing live, current race listings with search, filter, and direct registration links.

→ See `services/scraper/docs/scraper-design-doc.md` and `services/race-hub/docs/race-hub-design-doc.md`

---

### 2.3 Manual Product Sourcing — Rakuten Aggregator

**Problem:** The store sells Japanese running products sourced from Rakuten Ichiba. Every product currently requires: finding it on Rakuten, translating the name and description from Japanese to Chinese, calculating a sale price with margin and shipping, downloading images, and creating the WooCommerce listing by hand. This limits catalog size and makes scaling the store impossible.

**Solution:** An automated pipeline that fetches top-ranked products from the Rakuten Ranking API, normalises and stores them permanently in PostgreSQL (URL-based deduplication), calculates prices using a configurable margin formula, and pushes them to WooCommerce. Translation is handled by TranslatePress + DeepL on first customer view in WordPress — not in the pipeline. A "request a product" flow lets customers trigger the pipeline in real time if they can't find what they need.

→ See `services/rakuten/docs/rakuten-design-doc.md`

---

## 3. System Architecture

All five containers run on a single AWS Lightsail VPS, managed by one `docker-compose.yml`. They share a Docker volume for state and configuration.

```
┌──────────────────────────────── AWS Lightsail VPS ──────────────────────────────────────┐
│                                                                                         │
│  [Scraper container]  [Race Hub container]  [XHS container]    [Rakuten container]      │
│   cron only            Express :3001         scheduler.js       cron: fetch pipeline    │
│   scraper.js weekly    (always up)           generator.js       PostgreSQL              │
│   no HTTP              serves races.json     publisher.js       Express :3002           │
│          │             to WordPress               │             (internal only)         │
│          │                   │                    │                    │                │
│          ▼                   ▼                    ▼                    ▼                │
│    ┌──────────────────────────────────────────────────────────────────────┐             │
│    │                          shared volume                               │             │
│    │                                                                      │             │
│    │  scraper/                xhs/                    rakuten/            │             │
│    │   races.json ←            run_log.json ←          run_log.json ←     │             │
│    │   run_log.json ←          pipeline_state.json ←   product_stats.json←│             │
│    │   pipeline_state.json ←   post_archive/ ←         import_log.json ←  │             │
│    │                           auth.json ←             config.json →      │             │
│    │                           config.json →                               │             │
│    │                                                                      │             │
│    │   ← pipeline writes          → dashboard writes                     │             │
│    └───────────────────────────────────┬──────────────────────────────────┘             │
│                                        │ reads all                                      │
│                                        ▼                                                │
│                      ┌───────────────────────────────────┐                             │
│                      │        Dashboard container         │                             │
│                      │  Next.js :3000 (PM2 + NGINX)       │                             │
│                      │  App Router pages + API routes     │                             │
│                      │  (operator-facing only)            │                             │
│                      │  commands → Rakuten :3002          │                             │
│                      └───────────────┬───────────────────┘                             │
│                                      │                                                  │
└──────┬───────────────────────────────┼───────────────────────────────────────┬──────────┘
       │ Race Hub :3001                │ Dashboard :3000                        │ Rakuten :3002
     HTTPS                          HTTPS                                     HTTPS
 GET /api/races                  (operator)                             push products
       │                              │                                         │
       ▼                              ▼                                         ▼
[WordPress plugin           [Operator browser]                    [WooCommerce REST API]
 running.moximoxi.net]
```

---

## 4. Container Responsibilities

| Container | Role | External calls |
|---|---|---|
| **Scraper** | Cron-only process. Runs weekly, scrapes RunJapan, writes `scraper/races.json` to shared volume. No HTTP server. | RunJapan (scrape) |
| **Race Hub** | Persistent Express server (:3001). Always up. Reads `scraper/races.json` from shared volume, serves it to WordPress via `GET /api/races`. Public-facing. | — |
| **XHS** | Daily automation pipeline. Scheduler triggers generator (Claude API) → publisher (Playwright → XHS). Reads race data from shared volume, writes logs and post archive back. | Claude API, XHS web |
| **Rakuten** | Product ingestion pipeline. Fetches from Rakuten API, normalises, prices, stores permanently in PostgreSQL, pushes to WooCommerce. Internal Express :3002 for dashboard commands only. Translation handled by TranslatePress on WordPress side — not in the pipeline. | Rakuten API, WooCommerce REST API |
| **Dashboard** | Operator-facing monitoring UI. Next.js :3000 (App Router + API routes, served via PM2 + NGINX). Reads all pipeline state from the shared volume. Writes config files that pipelines pick up at runtime. Calls Rakuten :3002 for commands (trigger fetch, retry import). | — |

---

## 5. Shared Volume — Data Flow

**Local dev:** `shared_volume/` at repo root. Set `DATA_DIR=../../shared_volume` in each service's `.env`.
**Production (Docker):** mounted at `/data` inside each container. Set `DATA_DIR=/data` in each service's environment.



The shared volume is the communication bus between all containers. Pipelines write their state (logs, output data) to it. The dashboard reads state from it and writes config back. Pipelines watch their config files and adjust behaviour at runtime without restarting.

| File | Written by | Read by | Contains |
|---|---|---|---|
| `scraper/races.json` | Scraper | Race Hub, XHS | All upcoming race data from RunJapan |
| `scraper/pipeline_state.json` | Scraper | Dashboard | Current scraper state — `{ state: "idle | running | failed" }` |
| `scraper/run_log.json` | Scraper | Dashboard | Per-run: timestamp, races scraped, failure count, failed URLs, outcome |
| `xhs/pipeline_state.json` | XHS | Dashboard | Current XHS state — `{ state: "idle | running | failed" }` |
| `xhs/run_log.json` | XHS | Dashboard | Per-run: timestamp, post_type, outcome, error_stage, error_message, tokens_input, tokens_output |
| `xhs/post_archive/` | XHS | Dashboard | Published post content, weekly JSON files |
| `xhs/auth.json` | XHS (xhs-login.js) | XHS (publisher.js) | XHS session cookies |
| `xhs/post_history.json` | XHS | XHS | Tracks which races have been posted — avoids re-posting the same race |
| `xhs/config.json` | Dashboard | XHS | Per-day post schedule — XHS re-registers cron jobs on change |
| `rakuten/run_log.json` | Rakuten | Dashboard | Per-run: operation, category, products fetched/pushed, failures |
| `rakuten/product_stats.json` | Rakuten | Dashboard | Total cached, total pushed, per-category breakdown |
| `rakuten/import_log.json` | Rakuten | Dashboard | Per-product WooCommerce push attempts and outcomes |
| `rakuten/config.json` | Dashboard | Rakuten | Per-category margin %, shipping estimate, JPY→CNY rate, fetch count, search fill threshold |

---

## 6. Dashboard

The monitoring dashboard gives a non-technical operator full visibility and control over all three pipelines from a browser — no SSH, no terminal, no code changes required.

**What the operator can see:**
- Per-pipeline health cards on the home page (run state, last run, success rate, next scheduled run)
- Live log stream from the XHS pipeline via SSE
- Full run history for all pipelines (including failed runs, not just successes)
- Post archive — all published XHS posts with full content
- Rakuten catalog stats and import log

**What the operator can configure:**
- XHS posting schedule — per-day time slots and post types, applied at runtime without restart
- Rakuten pricing — margins, shipping estimates, JPY→CNY rate, configurable per category

**What the operator can trigger:**
- Manual XHS post (with optional preview mode — generate without publishing)
- Manual scrape run
- Fetch more Rakuten products (category + count)
- Retry failed WooCommerce imports

**XHS session re-auth:**
XHS sessions expire every few weeks. The operator clicks "Login to XHS" in the dashboard — the server spawns a Playwright browser, auto-navigates to the QR code login screen, and streams screenshots via SSE. The operator scans the QR code with their phone. Playwright detects the successful login, saves `auth.json` to the shared volume, and the pipeline resumes. No terminal access required.

→ See `services/dashboard/docs/dashboard-design-doc.md`

---

## 7. Bilingual Strategy

The platform targets Chinese runners — all user-facing content defaults to Simplified Chinese. English is available via a toggle button for portfolio and development use.

**How translation flows through the system:**

```
RunJapan (English)
  → scraper.js extracts description + notice[]
  → DeepL API translates → description_zh, notice_zh[]
  → written into scraper/races.json (all _zh fields always included)
  → Race Hub always returns full data — both English and _zh fields in every response
  → SPA reads lang from localStorage via useLang() hook → renders _zh fields or falls back to English
```

**Key decisions:**

| Concern | Approach |
|---|---|
| Race content translation | Scraper pipeline — DeepL runs once after each scrape, results stored in `races.json` |
| UI string translation | Locale files in SPA — `locales/en.js` + `locales/zh.js`, loaded via `useLang()` hook |
| Language switching | localStorage via `useLang()` hook — EN/中文 segmented toggle in FilterBar; state persists across page loads |
| API response | Always returns full payload — all `_zh` fields included regardless of language; React picks the right field |
| Null fallback | If `_zh` field is null (DeepL unavailable), SPA silently renders English field instead |

Translation only affects the Scraper and Race Hub services. XHS pipeline generates content directly in Chinese via Claude. Rakuten uses TranslatePress + DeepL on WordPress for product descriptions — translation is not handled in the Rakuten pipeline.

---

## 8. Where to Go Next

| What you're looking for | Where to look |
|---|---|
| XHS pipeline — how posts are generated and published | `services/xhs/docs/xhs-design-doc.md` |
| XHS pipeline — what's built and what's left | `services/xhs/docs/xhs-checklist.md` |
| Scraper — RunJapan scraping, races.json schema | `services/scraper/docs/scraper-design-doc.md` |
| Race Hub — Express API + React SPA WordPress plugin | `services/race-hub/docs/race-hub-design-doc.md` |
| Rakuten pipeline — product ingestion and pricing | `services/rakuten/docs/rakuten-design-doc.md` |
| Dashboard — full UI spec and API endpoints | `services/dashboard/docs/dashboard-design-doc.md` |
| System architecture and container layout | this file (§3–§6) |
| Bilingual strategy — translation pipeline, language switching | this file (§7) |
| Portfolio evidence, interview talking points, resume framing | `docs/portfolio-design-doc.md` |
