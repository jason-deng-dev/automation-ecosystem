# CI/CD Rollout Checklist

> See `docs/cicd.md` for full pipeline design and workflow file examples.



## Phase 1 — CI (GitHub Actions)

- [x] Create `.github/workflows/` folder at repo root
- [x] `ci-scrapper.yml` — was created with typo; now deleted, replaced by `cicd-scraper.yml`
- [x] `ci-xhs.yml` — was created; now deleted, replaced by `cicd-xhs.yml`
- [x] `cicd-rakuten.yml` — CI + CD combined; CI runs `npm test` on push to `services/rakuten/**`
- [x] `cicd-race-hub.yml` — test job (wp-plugin vitest) gates deploy; Docker layer caching via buildx
- [x] `cicd-scraper.yml` — CI + CD; test gates deploy; Docker layer caching via buildx
- [x] `cicd-xhs.yml` — CI + CD; test gates deploy; auth.json bind-mounted from VPS at deploy time
- [x] Verify all workflows pass on GitHub

---

## Phase 2 — Lightsail VPS Setup

- [x] Provision AWS Lightsail instance (Ubuntu 24.04 LTS, Docker 29.3.1 + Compose v5.1.1)
- [x] SSH key downloaded + configured (`ssh lightsail` works)
- [x] Firewall configured — Lightsail: 22/80/3000-3001 open; UFW: 22/80/443/3000/3001 open; 5432 never open
- [x] PostgreSQL running natively on VPS — `rakutendb` + `ecosystemdb` created, user `goodsoft` set up
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
- [x] PostgreSQL migration — scraper fully migrated to `ecosystemdb` (see scraper-checklist.md)
- [x] Write `Dockerfile` for scraper
- [x] Write `cicd-scraper.yml` — CI + CD; test gates deploy; Docker layer caching
- [x] Transfer `.env` to VPS (`~/scraper/.env`)
- [x] Verify scraper container starts and cron fires on Lightsail — races written to `ecosystemdb.races`

### race-hub (depends on `ecosystemdb.races` populated by scraper)
- [x] PostgreSQL migration — migrate race-hub from `races.json` file read to `SELECT * FROM races` in `ecosystemdb`
- [x] Write `Dockerfile` for race-hub
- [x] Write `cicd-race-hub.yml` — test job (wp-plugin vitest) gates deploy; Docker layer caching via buildx
- [x] Transfer `.env` to VPS (`~/race-hub/.env`) — `scp services/race-hub/.env lightsail:~/race-hub/.env`
- [x] `npm install` in `services/race-hub/` — pull in `pg` dependency
- [x] Verify race-hub container starts and serves races from `ecosystemdb` on Lightsail

### xhs (depends on `ecosystemdb.races` populated by scraper — already migrated to DB)
- [x] Fix bot detection mitigations in publisher.js (see xhs-checklist.md)
- [ ] Set up dashboard re-auth flow (required for headless deploy)
- [x] Transfer `auth.json` to Lightsail instance (`~/xhs/auth.json`)
- [x] Write `cicd-xhs.yml` — replaces ci-xhs.yml; CI runs `npm test`, CD builds → Docker Hub → SSH deploy; auth.json bind-mounted from /home/ubuntu/xhs/auth.json
- [x] Transfer `.env` to VPS (`~/xhs/.env`)
- [x] Verify xhs container runs on Lightsail — 7 cron jobs registered from xhs_schedule; cron fire pending

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
