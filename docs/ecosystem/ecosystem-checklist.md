**Project:** automation-ecosystem

**Last updated:** April 2026

---

## Overall Progress

| Service | Status |
|---|---|
| XHS | Feature complete — Dockerfile written, awaiting docker-compose & deploy |
| Scraper | Feature complete — awaiting Dockerfile & deploy |
| Race Hub | SPA + i18n complete — Vite bundle + WP plugin + deploy remaining |
| Rakuten | Feature complete — deployed on Lightsail, rate limited, dashboard endpoints done; docker-compose remaining |
| Dashboard | Home cards done (XHS + Scraper) — detail pages not started |
| Analytics | Not started — planned FastAPI service, XHS weights endpoint first |

---

## XHS Pipeline (`services/xhs/`)
> Full checklist: `services/xhs/docs/xhs-checklist.md`

- [x] Scheduler, generator, publisher fully built
- [x] 7-day post cycle verified end-to-end
- [x] Structured run_log.json and pipeline_state.json output
- [x] Weekly cron + config-driven schedule (hot-reloadable)
- [x] Manual trigger via run-testRun.js
- [x] Shared volume migration
- [x] Dockerfile written
- [ ] PostgreSQL migration — xhs_run_logs, xhs_post_history, xhs_post_archive (full analytics record), xhs_schedule, pipeline_state; replace all file ops with DB
- [ ] Bot detection mitigations (publisher.js)
- [ ] Dashboard re-auth flow (headless QR scan via SSE)
- [ ] docker-compose integration
- [ ] Deploy to Lightsail + smoke test

---

## Scraper (`services/scraper/`)
> Full checklist: `services/scraper/docs/scraper-checklist.md`

- [x] Incremental scraping (skip already-scraped races)
- [x] DeepL EN→ZH translation for all race fields
- [x] Structured run_log.json and pipeline_state.json output
- [x] Abort + preserve races.json if < 30 races returned
- [x] Weekly cron (Sunday 2am JST)
- [x] Manual trigger via docker exec
- [ ] PostgreSQL migration — races table, scraper_run_logs, pipeline_state; replace all file writes with DB ops
- [ ] Dockerfile
- [ ] docker-compose integration
- [ ] Verify races written to PostgreSQL on run

---

## Race Hub (`services/race-hub/`)
> Full checklist: `services/race-hub/docs/race-hub-checklist.md`

- [x] GET /api/races — serve races.json
- [x] React SPA (listing, detail, filter, search, drawer)
- [x] i18n — EN/ZH toggle
- [ ] Vite bundle + WordPress plugin PHP/shortcode
- [ ] PostgreSQL migration — server.js reads from races table instead of races.json
- [ ] Dockerfile
- [ ] docker-compose integration

---

## Rakuten (`services/rakuten/`)
> Full checklist: `services/rakuten/docs/rakuten-checklist.md`

- [x] Rakuten API — keyword search, genre fetch, ranking fetch
- [x] normalizeItems — full field mapping, image URL cleanup, cleanTitle
- [x] pricing.ts — JPY→CNY formula, markupPercent, hot-reloadable config
- [x] PostgreSQL product store — upsert, dedup by URL, genre_ids array
- [x] WooCommerce integration — push, idempotency check, _rakuten_url meta
- [x] Initial bulk push across all categories
- [x] Weekly auto-sync cron — price updates, unavailability removal, stale cleanup
- [x] Config migrated to PostgreSQL — fs.watch replaced by POST /api/config endpoint
- [x] TranslatePress installed + configured — Google Translate API key active, JA→ZH verified
- [x] DeepL translation — product names JA→ZH at ingest time; descriptions lazy-translated by TranslatePress
- [x] Category names corrected in WooCommerce admin (Chinese, human-reviewed)
- [x] Currency set to 元 (CNY) in WooCommerce settings
- [x] Default language redirect — visitors land on Chinese version without toggling
- [x] Product request flow (keyword → genre validation → Rakuten fetch → push WC → return product IDs)
- [x] Rate limiting — express-rate-limit + Redis, 100 req/15min on POST /api/request-product
- [x] Dashboard endpoints — POST /api/sync (manual trigger), POST /api/config (already done)
- [x] Dockerfile + deploy to Lightsail — container live, CD pipeline active (cicd-rakuten.yml)
- [ ] docker-compose integration

---

## Dashboard (`services/dashboard/`)
> Full checklist: `services/dashboard/docs/dashboard-checklist.md`

- [x] Next.js setup, Tailwind, shared volume reads
- [x] i18n (EN/ZH)
- [x] XHS home card — all metrics, auth status, error breakdown, token totals
- [x] Scraper home card — all metrics
- [ ] Rakuten home card
- [ ] XHS detail page (schedule editor, run history, log stream, triggers)
- [ ] Scraper detail page
- [ ] Rakuten detail page
- [ ] Poll/SSE to keep cards live
- [ ] Dockerfile
- [ ] docker-compose integration

---

## Analytics Service (`services/analytics/`)
> Python FastAPI service — reads XHS post performance data from PostgreSQL, returns content weight recommendations for the XHS generator

**Critical path:** core pipelines deployed + real post data flowing → build this

- [ ] Setup — Python project, FastAPI, psycopg2, Dockerfile
- [ ] XHS weights endpoint — `GET /api/xhs/weights` — reads `xhs_run_logs` + `xhs_post_archive`, returns per-post-type performance scores + recommended schedule weights
- [ ] Rakuten endpoint — `GET /api/rakuten/insights` — category performance, price sensitivity analysis
- [ ] Dashboard integration — weights surface in XHS schedule editor
- [ ] docker-compose integration

---

## CI/CD & Deploy
> Full checklist: `docs/cicd-checklist.md`

- [x] CI workflows for XHS + Scraper (GitHub Actions)
- [x] CI/CD workflow for Rakuten (cicd-rakuten.yml — test on push, deploy to Lightsail on main)
- [x] Provision AWS Lightsail VPS
- [x] SSH keys + GitHub Secrets (DOCKERHUB_USERNAME, DOCKERHUB_TOKEN, VPS_HOST, VPS_SSH_KEY)
- [x] Docker Hub account + credentials
- [ ] Dockerfiles for all services (Rakuten ✓, XHS ✓ — Scraper, Race Hub, Dashboard, Analytics pending)
- [ ] docker-compose.yml (all services + PostgreSQL)
- [ ] CD workflows per service (Rakuten ✓ — XHS, Scraper, Race Hub, Dashboard, Analytics pending)
- [ ] Smoke test all pipelines end-to-end on Lightsail

---

## Portfolio Architecture Diagrams

- [x] Rakuten pipeline diagram (`docs/architecture/rakuten/rakuten.html`)
- [ ] XHS pipeline diagram
- [ ] Scraper pipeline diagram
- [ ] Race Hub architecture diagram
- [ ] Dashboard architecture diagram
- [ ] Ecosystem-wide diagram
