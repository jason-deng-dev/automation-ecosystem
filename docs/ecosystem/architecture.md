## 1. What This Is

running.moximoxi.net is a marathon platform targeting Chinese runners in China who see Japan as an aspirational race destination and Japanese running products as premium and authentic. The platform has four core destinations: a shop (`/shop/`), a race hub (`/racehub/`), marathon prep tools (`/mara-prep-tools/`), and a community (`/community/`).

Running the platform manually at scale is not viable. Three core operations — content creation, race data, and product sourcing — each require hours of repetitive work per week. This repo contains the automation systems that replace that manual work, plus the monitoring infrastructure to operate them without technical knowledge.

---

## 2. The Three Problems Being Solved

### 2.1 Content Creation Bottleneck — XHS Pipeline

**Problem:** The platform's primary traffic channel is Xiaohongshu (XHS / RedNote). Writing, formatting, and publishing each post manually takes 1-2 hours — unsustainable at daily cadence alongside other platform work.

→ See `services/xhs/docs/xhs-design-doc.md`

---

### 2.2 Stale Race Data — Scraper + Race Hub

**Problem:** The race hub shows upcoming Japanese marathons — registration windows, dates, locations, entry fees. This data changes constantly and updating it manually means either stale listings or hours of copy-paste per week.

→ See `services/scraper/docs/scraper-design-doc.md` and `services/race-hub/docs/race-hub-design-doc.md`

---

### 2.3 Manual Product Sourcing — Rakuten Aggregator

**Problem:** The store sells Japanese running products sourced from Rakuten Ichiba. Every product currently requires finding it on Rakuten, calculating a sale price with margin and shipping, downloading images, and creating the WooCommerce listing by hand. This limits catalog size and makes scaling the store impossible.

→ See `services/rakuten/docs/rakuten-design-doc.md`

---

## 3. System Architecture

All five containers run on a single AWS Lightsail VPS, managed by one `docker-compose.yml`. PostgreSQL is the shared communication bus — all pipeline state, config, logs, and data are stored in DB and read by the dashboard directly.

```
┌──────────────────────────────── AWS Lightsail VPS ──────────────────────────────────────┐
│                                                                                         │
│  [Scraper container]  [Race Hub container]  [XHS container]    [Rakuten container]      │
│   cron only            Express :3001         scheduler.js       cron: fetch pipeline    │
│   scraper.js weekly    (always up)           generator.js       Express :3000           │
│   no HTTP              reads races table     publisher.js       (internal only)         │
│          │             serves to WordPress        │                    │                │
│          │                   │                    │                    │                │
│          ▼                   ▼                    ▼                    ▼                │
│    ┌──────────────────────────────────────────────────────────────────────┐             │
│    │                        PostgreSQL (shared)                           │             │
│    │                                                                      │             │
│    │  races ←               xhs_schedule →        rakuten_config →       │             │
│    │  scraper_run_logs ←    xhs_run_logs ←         run_logs ←            │             │
│    │  pipeline_state ←      xhs_post_history ←     product_stats ←       │             │
│    │                        xhs_post_archive ←     import_logs ←         │             │
│    │                        pipeline_state ←        subcategories         │             │
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
│                      │  commands → Rakuten :3000          │                             │
│                      └───────────────┬───────────────────┘                             │
│                                      │                                                  │
└──────┬───────────────────────────────┼───────────────────────────────────────┬──────────┘
       │ Race Hub :3001                │ Dashboard :3000                        │ Rakuten :3000
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
| **Scraper** | Cron-only process. Runs weekly, scrapes RunJapan, writes race data to `races` table in PostgreSQL. No HTTP server. | RunJapan (scrape) |
| **Race Hub** | Persistent Express server (:3001). Always up. Reads from `races` table in PostgreSQL, serves it to WordPress via `GET /api/races`. Public-facing. | — |
| **XHS** | Daily automation pipeline. Scheduler triggers generator (Claude API) → publisher (Playwright → XHS). Reads race data from PostgreSQL, writes logs and post archive to PostgreSQL. Schedule config read from `xhs_schedule` table; `auth.json` stays as a file (session cookies). | Claude API, XHS web |
| **Rakuten** | Product ingestion pipeline. Fetches from Rakuten API, normalises, prices, stores permanently in PostgreSQL, pushes to WooCommerce. Internal Express :3000 for dashboard commands. All config and logs in PostgreSQL. | Rakuten API, WooCommerce REST API |
| **Dashboard** | Operator-facing monitoring UI. Next.js :3000 (App Router + API routes, served via PM2 + NGINX). Reads all pipeline state from PostgreSQL. Updates config via API endpoints that write to DB. Calls Rakuten :3000 for commands (manual sync, config update). | — |

---

## 5. PostgreSQL — Shared Data Layer

PostgreSQL is the communication bus between all containers. Pipelines write state, logs, and output data to it. The dashboard reads directly from it. Config is updated via dashboard API endpoints that write to DB — no file watching required.

**Shared instance:** All services connect to the same PostgreSQL instance. Each service owns its own tables.

| Table | Written by | Read by | Contains |
|---|---|---|---|
| `races` | Scraper | Race Hub, XHS | All upcoming race data from RunJapan |
| `scraper_run_logs` | Scraper | Dashboard | Per-run: timestamp, races scraped, failure count, failed URLs, outcome |
| `pipeline_state` | Scraper, XHS, Rakuten | Dashboard | Current state per service — `{ service, state: "idle\|running\|failed" }` |
| `xhs_schedule` | Dashboard | XHS | Per-day post schedule — XHS re-registers cron jobs when table changes |
| `xhs_run_logs` | XHS | Dashboard | Per-run: timestamp, post_type, outcome, error_stage, error_message, tokens_input, tokens_output |
| `xhs_post_history` | XHS | XHS | Races already posted — dedup tracker, reset monthly |
| `xhs_post_archive` | XHS | Dashboard | Published post content keyed by timestamp |
| `config` | Rakuten (via dashboard command) | Rakuten | YenToYuan, markupPercent, productsPerCategory, searchFillThreshold |
| `run_logs` | Rakuten | Dashboard | Per-run: operation, products pushed, price updates, removals, errors |
| `product_stats` | Rakuten | Dashboard | Total cached, total pushed, per-category breakdown |
| `import_logs` | Rakuten | Dashboard | Per-product WooCommerce push attempts and outcomes |
| `subcategories` | Seed + Claude (runtime) | Rakuten | Genre ID map — dynamically expandable |
| `products` | Rakuten | Rakuten, Dashboard | Full product store with WooCommerce IDs |

**Exception:** `xhs/auth.json` stays as a file — XHS session cookies are a runtime artifact, not configuration data. Stored on the container filesystem, never transmitted to clients.

---

## 6. Dashboard

The monitoring dashboard gives a non-technical operator full visibility and control over all pipelines from a browser — no SSH, no terminal, no code changes required. Reads all pipeline state from PostgreSQL; writes config updates via API endpoints that update DB rows.

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
