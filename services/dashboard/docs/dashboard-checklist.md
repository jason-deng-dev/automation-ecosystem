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

**Layout principle: home cards = metrics + action triggers. Detail pages = scrollable data tables.**

- [x] Home page — pipeline cards
  - [x] XHS card: run state, last run, next scheduled post, auth status, success rate, error breakdown, post type distribution, API token totals
  - [x] Scraper card: run state, last run, next scrape, total races, last scraped, data freshness, success rate
  - [x] Rakuten card: catalog size, WooCommerce live count, last activity, error indicator, per-category breakdown
  - [ ] Home card triggers
    - [ ] XHS — "Run Now" button: post type dropdown + `POST /api/xhs/trigger` (non-blocking docker exec)
    - [ ] XHS — "Preview" button: post type dropdown + `POST /api/xhs/preview`, display returned post JSON
    - [ ] XHS — Re-auth: Login button in auth banner → `POST /api/xhs/login` → SSE screenshot stream panel for QR scan
    - [ ] Scraper — "Run Scraper Now" button: `POST /api/scraper/trigger` (non-blocking docker exec)
    - [ ] Rakuten — "Run Sync Now" button: `POST /api/rakuten/sync` (proxies to rakuten service)
  - [ ] Poll or SSE to keep cards live without page refresh

---

- [ ] XHS section (detail page)
  - [ ] Schedule management
    - [ ] `GET /api/xhs/schedule` — read `xhs_schedule` table
    - [ ] `POST /api/xhs/schedule` — write `xhs_schedule` table; scheduler polls for changes and re-registers cron jobs
    - [ ] Weekly grid UI — per-day rows, time picker + post type dropdown per slot, add/remove slot, save button
  - [ ] Run history table: timestamp, post type, outcome, error stage, error message, token counts
    - [ ] `GET /api/xhs/run-history` — query `xhs_run_logs` table
  - [ ] Post archive viewer
    - [ ] `GET /api/xhs/post-archive` — query `xhs_post_archive` table
    - [ ] List: title, post type, publish timestamp — expandable to show full post content
  - [ ] Live log stream
    - [ ] `GET /api/xhs/logs/stream` — SSE stream of XHS process stdout
    - [ ] Scrollable log panel, auto-scroll to bottom, colour-coded lines

---

- [ ] Scraper section (detail page)
  - [x] `scrapperController.js` — pipeline state, last run, success rate, data freshness, races scraped
  - [x] Scraper home card
  - [ ] races.json viewer — table of current races (name, date, location, entry status badge)
    - [ ] `GET /api/scraper/races` — query `races` table
  - [ ] Run history table: timestamp, races scraped, failure count, outcome
    - [ ] `GET /api/scraper/run-history` — query `scraper_run_logs` table
  - [ ] Failed URLs list — expandable from last run log

---

- [ ] Rakuten section (detail page)
  - [x] `rakutenController.js` — pipeline state, catalog size, WC live count, last sync, per-category breakdown, error indicator
  - [x] Rakuten home card
  - [ ] Catalog stats page: total cached, pushed to WooCommerce, per-category breakdown
    - [ ] `GET /api/rakuten/stats` — query `product_stats` + `products` tables
  - [ ] Pricing config editor — inline editable fields, save calls rakuten service
    - [ ] `GET /api/rakuten/config` — query `config` table
    - [ ] `POST /api/rakuten/config` — proxy to rakuten `POST /api/config` (updates DB + reloads pricing + re-pushes prices)
  - [ ] Import log table: timestamp, product name, status (success/failed/skipped), error message
    - [ ] `GET /api/rakuten/import-log` — query `import_logs` table
  - [ ] Run log table: timestamp, operation, products fetched/pushed/stale deleted, errors
    - [ ] `GET /api/rakuten/run-log` — query `run_logs` table

---

- [ ] XHS re-auth flow (broken — needs fix)
  - [ ] `POST /api/xhs/login` — spawn `xhs-login.js` via docker exec, begin screenshot polling
  - [ ] `GET /api/xhs/login/stream` — SSE stream of `page.screenshot()` every 2s; final event `{ type: 'done' }` on login detect
  - [ ] Add `runReAuth()` to `xhsController.js` (currently called by route but not exported)
  - [ ] Client component: screenshot panel on XHS card, connects to SSE stream, renders each frame as `<img>`, closes on `done`

---

- [ ] Docker & Deploy
  - [ ] Write Dockerfile
  - [ ] Add to docker-compose.yml
  - [ ] Verify all docker exec commands work inside container network
  - [ ] Configure PM2 + NGINX on Lightsail
  - [ ] Provision AWS Lightsail instance (Linux, $10/mo — 2 GB RAM, 2 vCPUs, 60 GB SSD, 3 TB transfer)
  - [ ] Install Docker + Docker Compose on Lightsail
  - [ ] Clone repo, create .env with production keys, transfer auth.json
  - [ ] Set `NEXT_PUBLIC_LANG=zh` in production `.env` (local dev defaults to `en`)
  - [ ] Run docker-compose up, verify all containers start and cron fires correctly
  - [ ] Hand off — document: docker-compose up to start, "Login to XHS" button when session expires
