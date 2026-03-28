- [ ] Setup
  - [ ] Initialize Next.js project (App Router)
  - [ ] Install Tailwind CSS + configure design tokens (per design-system.md)
  - [ ] Set up shared volume reads — `DATA_DIR` from `.env`
  - [ ] Set up `NODE_ENV` switching for local (direct node) vs prod (docker exec) script invocation

---

- [ ] Home page — pipeline cards
  - [ ] XHS card: run state, weekly posts success/fail ratio, last post, next scheduled post, auth status
  - [ ] Scraper card: run state, last run timestamp + outcome, races scraped, data freshness
  - [ ] Rakuten card: catalog size, WooCommerce live count, last activity, error indicator
  - [ ] `GET /api/pipeline-state` — read `xhs/pipeline_state.json` + `scraper/pipeline_state.json`
  - [ ] Poll or SSE to keep cards live without page refresh

---

- [ ] XHS section
  - [ ] Schedule management
    - [ ] `GET /api/xhs/schedule` — read `xhs/config.json`
    - [ ] `POST /api/xhs/schedule` — write `xhs/config.json`
    - [ ] Weekly grid UI — per-day rows, time picker + post type dropdown per slot, add/remove slot, save button
  - [ ] Run history
    - [ ] `GET /api/xhs/run-history` — read `xhs/run_log.json`
    - [ ] Table: timestamp, post type, outcome, error stage, error message, token counts
  - [ ] Post archive viewer
    - [ ] `GET /api/xhs/post-archive` — read `xhs/post_archive/` weekly files
    - [ ] List: title, post type, publish timestamp — expandable to show full post content
  - [ ] Manual trigger
    - [ ] `POST /api/xhs/trigger` — runs `run-manualPost.js <type>` via docker exec
    - [ ] Post type dropdown + "Run now" button
  - [ ] Preview mode
    - [ ] `POST /api/xhs/preview` — runs `run-preview.js <type>` via docker exec, captures stdout
    - [ ] Parse returned JSON and display generated post in dashboard
    - [ ] Post type dropdown + "Preview" button
  - [ ] Auth status + re-auth
    - [ ] `GET /api/xhs/auth-status` — derive session age from `xhs/auth.json` mtime
    - [ ] Session indicator: active / expiring soon / expired
    - [ ] `POST /api/xhs/login` — spawn `xhs-login.js` via docker exec
    - [ ] `GET /api/xhs/login/stream` — SSE screenshot stream (base64 frames as NDJSON lines)
    - [ ] Dashboard renders screenshot stream as `<img>` for QR code scanning
    - [ ] On `{ type: 'done' }` event, close panel and clear auth alert
  - [ ] Live log stream
    - [ ] `GET /api/xhs/logs/stream` — SSE stream of XHS process stdout
    - [ ] Scrollable log panel, auto-scroll to bottom, colour-coded lines
  - [ ] Claude API token tracker
    - [ ] Tokens per post (input + output) from run_log.json
    - [ ] Cumulative this week / this month

---

- [ ] Scraper section
  - [ ] `GET /api/scraper/run-history` — read `scraper/run_log.json`
  - [ ] `POST /api/scraper/trigger` — spawn scraper via docker exec
  - [ ] Key metrics: races scraped, failure count, data freshness
  - [ ] Failed URLs list — expandable from last run
  - [ ] races.json viewer — table of current races (name, date, location)
  - [ ] Run history table: timestamp, races scraped, failure count, outcome

---

- [ ] Rakuten section
  - [ ] `GET /api/rakuten/stats` — read `rakuten/product_stats.json`
  - [ ] `GET /api/rakuten/import-log` — read `rakuten/import_log.json`
  - [ ] `GET /api/rakuten/config` — read `rakuten/config.json`
  - [ ] `POST /api/rakuten/config` — write `rakuten/config.json`
  - [ ] Catalog stats: total cached, pushed to WooCommerce, per-category breakdown
  - [ ] Pricing config editor — inline editable table, save writes config.json
  - [ ] Import log table with failed imports panel + one-click retry
  - [ ] `POST /api/rakuten/trigger` — fetch more products (category + count) via Rakuten :3002
  - [ ] `POST /api/rakuten/retry` — retry failed WooCommerce imports via Rakuten :3002

---

- [ ] Docker & Deploy
  - [ ] Write Dockerfile
  - [ ] Add to docker-compose.yml
  - [ ] Verify all docker exec commands work inside container network
  - [ ] Configure PM2 + NGINX on Lightsail
  - [ ] Provision AWS Lightsail instance (Linux, $10/mo — 2 GB RAM, 2 vCPUs, 60 GB SSD, 3 TB transfer)
  - [ ] Install Docker + Docker Compose on Lightsail
  - [ ] Clone repo, create .env with production keys, transfer auth.json
  - [ ] Run docker-compose up, verify all containers start and cron fires correctly
  - [ ] Hand off — document: docker-compose up to start, "Login to XHS" button when session expires
