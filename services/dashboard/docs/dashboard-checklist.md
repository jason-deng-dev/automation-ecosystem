- [x] Setup
  - [x] Initialize Next.js project (App Router)
  - [x] Install Tailwind CSS + configure design tokens (per design-system.md)
  - [x] Set up shared volume reads — `DATA_DIR` from `.env`
  - [x] Set up `NODE_ENV` switching for local (direct node) vs prod (docker exec) script invocation

---

- [x] i18n — vocab files
  - [x] Create `app/lib/locales/en.js` and `app/lib/locales/zh.js`
  - [x] Read `NEXT_PUBLIC_LANG` env var to select locale at render time
  - [x] Replace all hardcoded UI strings with vocab file references
  - [x] Verify Chinese strings display correctly

---

- [x] DB connection
  - [x] `ecosystemPool` — `DATABASE_URL` → ecosystemdb (XHS + Scraper tables)
  - [x] `rakutenPool` — `RAKUTEN_DATABASE_URL` → rakutendb (same Postgres instance, port 5432)
  - [x] SSH tunnel config (`~/.ssh/config` LocalForward 5555→5432) for local dev

---

**Layout principle: home cards = metrics only. Detail pages = scrollable data tables + action triggers.**

- [x] Home page — pipeline cards
  - [x] XHS card: run state, last run, next scheduled post, auth status, success rate, error breakdown, post type distribution, API token totals
  - [x] Scraper card: run state, last run, next scrape, total races, last scraped, data freshness, success rate
  - [x] Rakuten card: catalog size, WooCommerce live count, last activity, error indicator, per-category breakdown
  - [x] Home card triggers — removed, home is monitoring-only; triggers live on detail pages
  - ~~Poll or SSE to keep cards live without page refresh~~ — scrapped

---

- [x] XHS section (detail page)
  - [x] Schedule management
    - [x] `GET /api/xhs/schedule` — read `xhs_schedule` table
    - [x] `POST /api/xhs/schedule` — write `xhs_schedule` table; scheduler polls for changes and re-registers cron jobs
    - [x] Weekly grid UI — per-day rows, time picker + post type dropdown per slot, add/remove slot, save button
  - [x] Run history table: timestamp, post type, outcome, error stage, error message, token counts
    - [x] `GET /api/xhs/run-history` — query `xhs_run_logs` table (inline in page.js)
  - [x] Post archive viewer
    - [x] `GET /api/xhs/post-archive` — query `xhs_post_archive` table (inline in page.js)
    - [x] List: title, post type, publish timestamp — expandable to show full post content
---

- [x] Scraper section (detail page)
  - [x] `scrapperController.js` — pipeline state, last run, success rate, data freshness, races scraped
  - [x] Scraper home card
  - [x] Races table viewer — name, date, location, entry status badge (zh/en aware)
  - [x] Run history table: timestamp, outcome, races scraped, failure count, error message
  - [x] Failed URLs list — collapsible, from last run log
  - [x] "Run Scraper Now" trigger button — `POST /api/scraper/trigger` (non-blocking docker exec)
  - [x] Collapsible sections with chevron indicator
  - [x] Fixed column widths + whitespace-nowrap

---

- [x] Rakuten section (detail page)
  - [x] `rakutenController.js` — pipeline state, catalog size, WC live count, last sync, per-category breakdown, error indicator
  - [x] Rakuten home card
  - [x] Pricing config editor — inline editable fields, save calls rakuten service
    - [x] `GET /api/rakuten/config` — query `config` table
    - [x] `POST /api/rakuten/config` — proxy to rakuten `POST /api/config`
  - [x] "Run Sync Now" trigger button — `POST /api/rakuten/sync` (proxies to rakuten service)
  - [x] Import log table: timestamp, product name, status, error message (inline query in page.js)
  - [x] Run log table: timestamp, operation, products fetched/pushed/stale deleted, errors (inline query in page.js)

---

- ~~Live container logs (all 3 detail pages)~~ — scrapped

---

- [x] XHS re-auth flow
  - [x] `POST /api/xhs/login` — spawn `xhs-login.js` via docker exec
  - [x] `GET /api/xhs/login/stream` — SSE stream; emits `qr-src` (data URI) when QR ready, `qr-scanned` on nav, `done` on success
  - [x] Add `runReAuth()` to `xhsController.js`
  - [x] Client component: renders QR data URI directly (no screenshot streaming); two-step login (creator + xhs.com)

---

- [ ] Docker & Deploy
  - [x] Write Dockerfile
  - [x] Write CI/CD workflow (cicd-dashboard.yml) — build job gates deploy; Docker socket mounted for docker exec
  - [ ] Add to docker-compose.yml
  - [ ] Verify all docker exec commands work inside container network
  - [ ] Configure PM2 + NGINX on Lightsail
  - [ ] Provision AWS Lightsail instance (Linux, $10/mo — 2 GB RAM, 2 vCPUs, 60 GB SSD, 3 TB transfer)
  - [ ] Install Docker + Docker Compose on Lightsail
  - [ ] Clone repo, create .env with production keys, transfer auth.json
  - [ ] Set `NEXT_PUBLIC_LANG=zh` in production `.env` (local dev defaults to `en`)
  - [ ] Run docker-compose up, verify all containers start and cron fires correctly
  - [ ] Hand off — document: docker-compose up to start, "Login to XHS" button when session expires
