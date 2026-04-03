**Project:** automation-ecosystem

**Last updated:** April 2026

---

## Overall Progress

| Service | Status |
|---|---|
| XHS | Feature complete — Dockerfile written, awaiting docker-compose & deploy |
| Scraper | Feature complete — awaiting Dockerfile & deploy |
| Race Hub | SPA + i18n complete — Vite bundle + WP plugin + deploy remaining |
| Rakuten | Core pipeline complete — product request flow + TranslatePress remaining |
| Dashboard | Home cards done (XHS + Scraper) — detail pages not started |

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
- [ ] Dockerfile
- [ ] docker-compose integration
- [ ] Verify races.json written to shared volume on run

---

## Race Hub (`services/race-hub/`)
> Full checklist: `services/race-hub/docs/race-hub-checklist.md`

- [x] GET /api/races — serve races.json
- [x] React SPA (listing, detail, filter, search, drawer)
- [x] i18n — EN/ZH toggle
- [ ] Vite bundle + WordPress plugin PHP/shortcode
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
- [x] fs.watch on config.json — auto-recalculates + re-pushes prices on change
- [x] TranslatePress installed + configured (waiting on Google Translate API key)
- [ ] Product request flow (keyword → Rakuten search → push WC → SSE progress)
- [ ] Dashboard integration (POST /trigger, /retry, pipeline_state)
- [ ] Shared volume output (import_log.json)
- [ ] Dockerfile
- [ ] docker-compose integration
- [ ] Deploy (pg_dump migration approach)

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

## CI/CD & Deploy
> Full checklist: `docs/cicd-checklist.md`

- [x] CI workflows for XHS + Scraper (GitHub Actions)
- [ ] CI workflow for Rakuten
- [ ] Provision AWS Lightsail VPS
- [ ] SSH keys + GitHub Secrets
- [ ] Docker Hub account + credentials
- [ ] Dockerfiles for all services
- [ ] docker-compose.yml (all services + shared volume)
- [ ] CD workflows per service
- [ ] Smoke test all pipelines end-to-end on Lightsail

---

## Portfolio Architecture Diagrams

- [x] Rakuten pipeline diagram (`docs/architecture/rakuten/rakuten.html`)
- [ ] XHS pipeline diagram
- [ ] Scraper pipeline diagram
- [ ] Race Hub architecture diagram
- [ ] Dashboard architecture diagram
- [ ] Ecosystem-wide diagram
