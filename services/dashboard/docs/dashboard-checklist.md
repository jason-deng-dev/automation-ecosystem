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

**Layout principle: home cards = metrics + action triggers. Detail pages = scrollable data tables.**

- [ ] Home page — pipeline cards
  - [x] XHS card: run state, last run, next scheduled post, auth status, success rate, error breakdown, post type distribution, API token totals
  - [x] Scraper card: run state, last run, next scrape, total races, last scraped, data freshness, success rate
  - [ ] Rakuten card: catalog size, WooCommerce live count, last activity, error indicator
  - [ ] Action triggers on each home card (manual trigger, re-auth, etc.) — XHS card has placeholder UI stubs, not wired up
  - [ ] Poll or SSE to keep cards live without page refresh

---

- [ ] XHS section (detail page)
  - [ ] Schedule management
    - [ ] `GET /api/xhs/schedule` — read `xhs/config.json`
    - [ ] `POST /api/xhs/schedule` — write `xhs/config.json`
    - [ ] Weekly grid UI — per-day rows, time picker + post type dropdown per slot, add/remove slot, save button
  - [ ] Run history table: timestamp, post type, outcome, error stage, error message, token counts
    - [ ] `GET /api/xhs/run-history` — read `xhs/run_log.json`
  - [ ] Post archive viewer
    - [ ] `GET /api/xhs/post-archive` — read `xhs/post_archive/` weekly files
    - [ ] List: title, post type, publish timestamp — expandable to show full post content
  - [ ] Live log stream
    - [ ] `GET /api/xhs/logs/stream` — SSE stream of XHS process stdout
    - [ ] Scrollable log panel, auto-scroll to bottom, colour-coded lines
  - [ ] Home card triggers
    - [ ] Manual trigger: `POST /api/xhs/trigger` — post type dropdown + "Run now" button
    - [ ] Preview: `POST /api/xhs/preview` — post type dropdown + "Preview" button, display returned JSON
    - [ ] Re-auth: `POST /api/xhs/login` + `GET /api/xhs/login/stream` — triggered by auth banner Login button (shown automatically when authStatus === 'failed'); SSE screenshot stream as `<img>` for QR scan, close on `{ type: 'done' }`

---

- [ ] Scraper section (detail page)
  - [x] `scrapperController.js` — pipeline state, last run, success rate, data freshness, races scraped, failed URLs, manual trigger
  - [x] Scraper home card
  - [ ] Run history table: timestamp, races scraped, failure count, outcome
    - [ ] `GET /api/scraper/run-history` — read `scraper/run_log.json`
  - [ ] Failed URLs list — expandable from last run
  - [ ] races.json viewer — table of current races (name, date, location)
  - [ ] Home card triggers
    - [ ] Manual trigger: `POST /api/scraper/trigger` — spawn scraper via docker exec

---

- [ ] Rakuten section (detail page)
  - Note: all data reads from PostgreSQL directly (shared volume JSON files removed — see rakuten §11.16)
  - Note: `POST /api/rakuten/trigger` and `POST /api/rakuten/retry` removed — trigger-category is redundant (use config + sync), retry self-heals via weekly sync
  - [ ] Catalog stats: total cached, pushed to WooCommerce, per-category breakdown
    - [ ] `GET /api/rakuten/stats` — query `product_stats` table in PostgreSQL
  - [ ] Import log table with failed imports panel
    - [ ] `GET /api/rakuten/import-log` — query `import_logs` table in PostgreSQL
  - [ ] Pricing config editor — inline editable fields, save calls rakuten service
    - [ ] `GET /api/rakuten/config` — query `config` table in PostgreSQL
    - [ ] `POST /api/rakuten/config` — call rakuten `POST /api/config` (updates DB + reloads pricing + re-pushes prices)
  - [ ] Manual sync trigger
    - [ ] `POST /api/rakuten/sync` — call rakuten `POST /api/sync` (triggers `runWeeklySync()`)
  - [ ] Run log table — query `run_logs` table in PostgreSQL

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
