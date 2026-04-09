# CI/CD Rollout Checklist

> See `docs/cicd.md` for full pipeline design and workflow file examples.



## Phase 1 — CI (GitHub Actions)

- [x] Create `.github/workflows/` folder at repo root
- [x] `ci-scraper.yml` — on push to `services/scraper/**`, run `npm test`
- [x] `ci-xhs.yml` — on push to `services/xhs/**`, run `npm test`
- [x] Verify both workflows pass on GitHub
- [ ] `ci-rakuten.yml` — on push to `services/rakuten/**`, run `npm test`

---

## Phase 2 — Lightsail VPS Setup

- [x] Provision AWS Lightsail instance (Ubuntu 24.04 LTS, Docker 29.3.1 + Compose v5.1.1)
- [x] SSH key downloaded + configured (`ssh lightsail` works)
- [x] Firewall configured (22 SSH, 80/443 public, 3000/3001/3002 internal only, 5432 never open)
- [x] PostgreSQL running natively on VPS — `rakutendb` created, user `goodsoft` set up
- [ ] GitHub Secrets populated (`LIGHTSAIL_HOST`, `LIGHTSAIL_USER`, `LIGHTSAIL_SSH_KEY`)
- [ ] Docker Hub account created + `DOCKER_USERNAME` / `DOCKER_PASSWORD` added to GitHub Secrets

---

## Phase 3 — CD Workflows (deploy order)

### rakuten (deploy first — PostgreSQL already on VPS, no service dependencies)
- [ ] Write `Dockerfile` for rakuten
- [ ] Transfer `.env` to VPS
- [ ] Seed DB on VPS (`npm run db`)
- [ ] Write `cd-rakuten.yml` — build image, push to Docker Hub, SSH deploy to Lightsail
- [ ] Verify rakuten container connects to DB and pipeline runs on Lightsail

### scraper (no dependencies)
- [ ] Write `Dockerfile` for scraper
- [ ] Write `cd-scraper.yml`
- [ ] Verify scraper container starts and cron fires on Lightsail

### race-hub (depends on scraper shared volume)
- [ ] Write `Dockerfile` for race-hub
- [ ] Write `cd-race-hub.yml`
- [ ] Verify race-hub serves races.json from shared volume on Lightsail

### xhs (depends on races.json from shared volume)
- [ ] Fix bot detection mitigations in publisher.js (see xhs-checklist.md)
- [ ] Set up dashboard re-auth flow (required for headless deploy)
- [ ] Transfer `auth.json` to Lightsail instance
- [ ] Write `cd-xhs.yml`
- [ ] Verify xhs container runs and cron fires on Lightsail

### dashboard (depends on all services running)
- [ ] Build dashboard service
- [ ] Write `Dockerfile` for dashboard
- [ ] Write `cd-dashboard.yml`
- [ ] Verify dashboard health cards show correct state for all services

---

## Phase 4 — docker-compose (ties everything together)

- [ ] Write `docker-compose.yml` at repo root — all services + shared volume
- [ ] Verify `docker-compose up` starts all containers correctly on Lightsail
- [ ] Smoke test each pipeline end-to-end in production
