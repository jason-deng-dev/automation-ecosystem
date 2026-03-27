**Project:** automation-ecosystem

**Last updated:** March 2026

---

## Overall Progress

| Service | Status |
|---|---|
| XHS | Feature complete — awaiting Docker & deploy |
| Scraper | Feature complete — awaiting Docker & deploy |
| Race Hub | SPA + i18n complete — awaiting bundle & deploy |
| Rakuten | In progress — pipeline design done, build starting |
| Dashboard | Not started |

---

## XHS Pipeline (`services/xhs/`)
> Full checklist: `services/xhs/docs/xhs-checklist.md`

- [x] Port and wire scheduler, generator, publisher
- [x] Structured run_log.json and pipeline_state.json output
- [x] Weekly cron + config-driven schedule
- [x] Manual trigger via run-testRun.js
- [x] Dockerfile (Playwright + Chromium)
- [ ] docker-compose integration
- [ ] Deploy to Lightsail + smoke test

---

## Scraper (`services/scraper/`)
> Full checklist: `services/scraper/docs/scraper-checklist.md`

- [x] RunJapan scraper (session cookies, SSL bypass, pagination)
- [x] Structured run_log.json and pipeline_state.json output
- [x] Abort + preserve races.json if < 30 races returned
- [x] Weekly cron (Sunday 2am JST)
- [x] Manual trigger via run-scraper.js
- [ ] Dockerfile
- [ ] docker-compose integration
- [ ] Verify races.json written to shared volume on run

---

## Race Hub (`services/race-hub/`)
> Full checklist: `services/race-hub/docs/race-hub-checklist.md`

- [x] Setup (package.json, .env, .dockerignore, .gitignore)
- [x] GET /api/races — serve full races.json
- [x] CORS for running.moximoxi.net
- [x] React SPA WordPress plugin (listing, detail, filter, search, drawer)
- [x] i18n — EN/ZH toggle, locale files, _zh field rendering
- [ ] Bundle with Vite → wp-plugin/dist/
- [ ] WordPress plugin PHP + shortcode
- [ ] Upload to running.moximoxi.net + smoke test
- [ ] Dockerfile + docker-compose integration

---

## Rakuten (`services/rakuten/`)
> Full checklist: `services/rakuten/docs/rakuten-checklist.md`

- [x] Setup (package.json, .env.example, .dockerignore, .gitignore)
- [x] Rakuten API — keyword search + genre fetch implemented
- [ ] Ranking API (getRanking) — primary fetch mechanism, not yet built
- [ ] normalizeItems.js
- [ ] pricing.js
- [ ] PostgreSQL product store (permanent, URL-based dedup)
- [ ] WooCommerce integration
- [ ] Initial bulk push
- [ ] Product request flow + SSE stream
- [ ] Weekly auto-sync cron
- [ ] Docker & deploy

---

## Dashboard (`services/dashboard/`)
> Full checklist: `services/dashboard/docs/dashboard-checklist.md`

- [ ] Not started

---

## Portfolio Architecture Diagrams

Visual HTML/CSS diagrams for each service + the full ecosystem — intended for portfolio use.

- [x] Rakuten pipeline diagram (`docs/architecture/rakuten/rakuten.html`)
- [ ] XHS pipeline diagram
- [ ] Scraper pipeline diagram
- [ ] Race Hub architecture diagram
- [ ] Dashboard architecture diagram
- [ ] Ecosystem-wide diagram (all services + how they connect on Lightsail)

---

## Docker & Deploy (all services)

- [ ] Write all Dockerfiles
- [ ] Write docker-compose.yml
- [ ] Provision AWS Lightsail VPS
- [ ] Set up shared Docker volume
- [ ] Deploy all containers
- [ ] Smoke test each pipeline end-to-end in production
