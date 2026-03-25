**Project:** automation-ecosystem

**Last updated:** March 2026

---

## Overall Progress

| Service | Status |
|---|---|
| XHS | Feature complete — awaiting Docker & deploy |
| Scraper | Feature complete — awaiting Docker & deploy |
| Race Hub | In progress |
| Rakuten | Not started |
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
- [ ] GET /api/races — serve full races.json
- [ ] CORS for running.moximoxi.net
- [ ] React SPA WordPress plugin (listing, detail, filter, search)
- [ ] Dockerfile
- [ ] Deploy + smoke test end-to-end

---

## Rakuten (`services/rakuten/`)
> Full checklist: `services/rakuten/docs/rakuten-checklist.md`

- [ ] Not started

---

## Dashboard (`services/dashboard/`)
> Full checklist: `services/dashboard/docs/dashboard-checklist.md`

- [ ] Not started

---

## Docker & Deploy (all services)

- [ ] Write all Dockerfiles
- [ ] Write docker-compose.yml
- [ ] Provision AWS Lightsail VPS
- [ ] Set up shared Docker volume
- [ ] Deploy all containers
- [ ] Smoke test each pipeline end-to-end in production
