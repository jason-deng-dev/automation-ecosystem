# CI/CD Rollout Checklist

> See `docs/cicd.md` for full pipeline design and workflow file examples.



## Phase 1 — CI (GitHub Actions, no server needed)

- [x] Create `.github/workflows/` folder at repo root
- [x] `ci-scraper.yml` — on push to `services/scraper/**`, run `npm test`
- [x] `ci-xhs.yml` — on push to `services/xhs/**`, run `npm test`
- [x] Verify both workflows pass on GitHub (push a small change to trigger them)
- [ ] Write tests for `rakuten` service
- [ ] `ci-rakuten.yml` — on push to `services/rakuten/**`, run `npm test`

---

## Phase 2 — Lightsail VPS Setup
> Deferred — staying in code mode to finish rakuten CI and bot detection fixes first. Infrastructure work (Lightsail, Docker Hub, secrets) is a separate context switch.

- [ ] Provision AWS Lightsail instance (Linux, Ubuntu 22.04, $10–20/mo plan)
- [ ] SSH into instance and install Docker + Docker Compose
- [ ] Open required ports in Lightsail firewall (3000, 3001, 3002 — internal only; 22 SSH)
- [ ] Generate SSH key pair — add public key to Lightsail instance
- [ ] Add private key as `LIGHTSAIL_SSH_KEY` in GitHub Secrets
- [ ] Add `LIGHTSAIL_HOST` and `LIGHTSAIL_USER` to GitHub Secrets

---

## Phase 3 — Docker Registry

- [ ] Create Docker Hub account (or use AWS ECR)
- [ ] Add `DOCKER_USERNAME` and `DOCKER_PASSWORD` to GitHub Secrets
- [ ] Test pushing a local image manually to confirm credentials work

---

## Phase 4 — CD Workflows (one per service, in deploy order)

### scraper (deploy first — no dependencies)
- [ ] Write `Dockerfile` for scraper
- [ ] Write `cd-scraper.yml` — build image, push to registry, SSH deploy to Lightsail
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

### rakuten (depends on PostgreSQL)
- [ ] Provision PostgreSQL on Lightsail (or use RDS)
- [ ] Write `Dockerfile` for rakuten
- [ ] Write `cd-rakuten.yml`
- [ ] Verify rakuten container connects to DB and pipeline runs on Lightsail

### dashboard (depends on all services running)
- [ ] Build dashboard service
- [ ] Write `Dockerfile` for dashboard
- [ ] Write `cd-dashboard.yml`
- [ ] Verify dashboard health cards show correct state for all services

---

## Phase 5 — docker-compose (ties everything together on Lightsail)

- [ ] Write `docker-compose.yml` at repo root — all services + shared volume
- [ ] Verify `docker-compose up` starts all containers correctly on Lightsail
- [ ] Smoke test each pipeline end-to-end in production
