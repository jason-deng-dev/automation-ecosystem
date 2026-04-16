# CI/CD Rollout Checklist

> See `docs/cicd.md` for full pipeline design and workflow file examples.



## Phase 1 — CI (GitHub Actions)

- [x] Create `.github/workflows/` folder at repo root
- [x] `ci-scrapper.yml` — on push to `services/scraper/**`, run `npm test` (filename has typo — `scrapper` not `scraper`)
- [x] `ci-xhs.yml` — on push to `services/xhs/**`, run `npm test`
- [x] `cicd-rakuten.yml` — CI + CD combined; CI runs `npm test` on push to `services/rakuten/**`
- [x] `cicd-race-hub.yml` — added test job (wp-plugin vitest); deploy now gated on tests passing
- [x] Verify all three workflows pass on GitHub

---

## Phase 2 — Lightsail VPS Setup

- [x] Provision AWS Lightsail instance (Ubuntu 24.04 LTS, Docker 29.3.1 + Compose v5.1.1)
- [x] SSH key downloaded + configured (`ssh lightsail` works)
- [x] Firewall configured (22 SSH, 80/443 public, 3000/3001/3002 internal only, 5432 never open)
- [x] PostgreSQL running natively on VPS — `rakutendb` created, user `goodsoft` set up
- [x] GitHub Secrets populated — `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, `VPS_HOST`, `VPS_SSH_KEY` (confirmed working via rakuten deploy)
- [x] Docker Hub account created + credentials added to GitHub Secrets

---

## Phase 3 — CD Workflows (deploy order)

### rakuten (deploy first — PostgreSQL already on VPS, no service dependencies)
- [x] Write `Dockerfile` for rakuten
- [x] Transfer `.env` to VPS (`~/rakuten/.env` — injected via `--env-file` at runtime)
- [x] Seed DB on VPS (`npm run db`)
- [x] Write `cicd-rakuten.yml` — CI + CD combined; build image, push to Docker Hub, SSH deploy
- [x] Verify rakuten container connects to DB and pipeline runs on Lightsail

### scraper (no dependencies — writes to `ecosystemdb.races` table)
- [ ] PostgreSQL migration — migrate scraper from `races.json` file I/O to `ecosystemdb` (see scraper-checklist.md)
- [ ] Write `Dockerfile` for scraper
- [ ] Write `cd-scraper.yml` (or combine into `cicd-scraper.yml`)
- [ ] Transfer `.env` to VPS (`~/scraper/.env`)
- [ ] Verify scraper container starts and cron fires on Lightsail — races written to `ecosystemdb.races`

### race-hub (depends on `ecosystemdb.races` populated by scraper)
- [x] PostgreSQL migration — migrate race-hub from `races.json` file read to `SELECT * FROM races` in `ecosystemdb`
- [x] Write `Dockerfile` for race-hub
- [x] Write `cicd-race-hub.yml` — deploy only (no tests); build image, push to Docker Hub, SSH deploy
- [x] Transfer `.env` to VPS (`~/race-hub/.env`) — `scp services/race-hub/.env lightsail:~/race-hub/.env`
- [x] `npm install` in `services/race-hub/` — pull in `pg` dependency
- [x] Verify race-hub container starts and serves races from `ecosystemdb` on Lightsail

### xhs (depends on `ecosystemdb.races` populated by scraper — already migrated to DB)
- [x] Fix bot detection mitigations in publisher.js (see xhs-checklist.md)
- [ ] Set up dashboard re-auth flow (required for headless deploy)
- [ ] Transfer `auth.json` to Lightsail instance
- [x] Write `cicd-xhs.yml` — replaces ci-xhs.yml; CI runs `npm test`, CD builds → Docker Hub → SSH deploy; auth.json bind-mounted from ~/xhs/auth.json
- [ ] Transfer `.env` to VPS (`~/xhs/.env`)
- [ ] Verify xhs container runs and cron fires on Lightsail

### dashboard (depends on all services running)
- [ ] Build dashboard service
- [ ] Write `Dockerfile` for dashboard
- [ ] Write `cd-dashboard.yml`
- [ ] Verify dashboard health cards show correct state for all services

---

## Phase 4 — docker-compose (ties everything together)

- [ ] Write `docker-compose.yml` at repo root — all services + shared network/DB config
- [ ] Verify `docker-compose up` starts all containers correctly on Lightsail
- [ ] Smoke test each pipeline end-to-end in production
