**Project:** automation-ecosystem

**Last updated:** April 25 2026

---

## Overall Progress

| Service | Status |
|---|---|
| XHS | Deployed — live on Lightsail, docker-compose + dashboard integration remaining |
| Scraper | Deployed — live on Lightsail, docker-compose remaining |
| Race Hub | Deployed — live at running.moximoxi.net/racehub/, docker-compose remaining |
| Rakuten | Feature complete — deployed on Lightsail, rate limited, dashboard endpoints done; docker-compose remaining |
| Dashboard | Home cards + detail pages done — re-auth, live log panels, auth banner all done; docker-compose + deploy remaining |
| Analytics | Not started — planned FastAPI service, XHS weights endpoint first |

---

## XHS Pipeline (`services/xhs/`)
> Full checklist: `services/xhs/docs/xhs-checklist.md`

- [x] Scheduler, generator, publisher fully built
- [x] 7-day post cycle verified end-to-end
- [x] Structured run logging — xhs_run_logs, xhs_post_archive, pipeline_state (PostgreSQL)
- [x] Weekly cron + config-driven schedule (xhs_schedule table, hot-reloadable)
- [x] PostgreSQL migration — all file ops replaced with DB (xhs_run_logs, xhs_post_history, xhs_post_archive, xhs_schedule, pipeline_state)
- [x] Bot detection mitigations — clipboard paste, humanDelay(), random post time offset ±15–30min
- [x] Dockerfile + CI/CD pipeline (cicd-xhs.yml)
- [x] Deployed — container live on Lightsail, 7 cron jobs registered, awaiting cron fire confirmation
- [x] Dashboard integration — manual trigger + preview mode (docker exec scripts)
- [x] Dashboard re-auth flow — headless QR scan, two-step login (creator + xhs.com), SSE QR emit
- [x] Manual trigger live log panel — SSE stream, buffer replay on reload, skips random offset
- [x] Auth banner on home card clears client-side after successful re-auth
- [ ] docker-compose integration

---

## Scraper (`services/scraper/`)
> Full checklist: `services/scraper/docs/scraper-checklist.md`

- [x] Incremental scraping (skip already-scraped races)
- [x] DeepL EN→ZH translation for all race fields
- [x] Abort + preserve if < 30 races returned
- [x] Weekly cron (Sunday 2am JST), manual trigger via docker exec
- [x] PostgreSQL migration — races, scraper_run_logs, pipeline_state; all file writes replaced with DB ops
- [x] Dockerfile + CI/CD pipeline (cicd-scraper.yml)
- [x] Deployed — container live on Lightsail, cron verified, races writing to ecosystemdb.races
- [ ] docker-compose integration

---

## Race Hub (`services/race-hub/`)
> Full checklist: `services/race-hub/docs/race-hub-checklist.md`

- [x] GET /api/races — serve races.json (reads from `races` PostgreSQL table)
- [x] React SPA (listing, detail, filter, search, drawer)
- [x] i18n — EN/ZH toggle
- [x] Vite bundle + WordPress plugin PHP/shortcode
- [x] Deployed — live at running.moximoxi.net/racehub/ over HTTPS (api.moximoxi.net → VPS :3001)
- [x] PostgreSQL migration — server.js reads from races table instead of races.json
- [x] Dockerfile + CI/CD pipeline (cicd-race-hub.yml)
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
- [ ] CSS for `.product-specs` table on WordPress (2-col, bordered, `th` background)
- [ ] Handoff document — markup config, shipping rate, exchange rate update, pipeline ops, AWS/Stripe MFA transfer
- [ ] Size/color preference capture — WooCommerce Product Add-Ons (size dropdown + color text field)
- [ ] docker-compose integration

---

## Dashboard (`services/dashboard/`)
> Full checklist: `services/dashboard/docs/dashboard-checklist.md`

- [x] Next.js setup, Tailwind, DB connections (ecosystemPool + rakutenPool)
- [x] i18n (EN/ZH)
- [x] Home page — all 3 pipeline cards (XHS, Scraper, Rakuten)
- [x] XHS detail page — schedule editor (GET/POST /api/xhs/schedule), run history table, post archive viewer
- [x] Scraper detail page — races table, run history, failed URLs list, manual trigger button
- [x] Rakuten detail page — pricing config editor, import log table, run log table, manual sync trigger
- [x] XHS re-auth flow — headless QR scan + SSE QR emit; auth banner clears client-side on success
- [x] Live log panels for all 3 triggers (XHS manual, scraper, Rakuten) — SSE stream, buffer replay on reload, no page scroll jump, overflow contained
- [x] Stream race condition fixed — fast processes no longer show 失败 with empty log panel
- [x] publisher.js headless:true — was crashing in container (no X server)
- ~~Live container logs (docker logs -f)~~ — scrapped
- ~~Poll/SSE home cards~~ — scrapped
- [x] Dockerfile + CI/CD pipeline (cicd-dashboard.yml)
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
- [ ] Dockerfiles for all services — Analytics pending (Rakuten ✓, XHS ✓, Scraper ✓, Race Hub ✓, Dashboard ✓)
- [ ] docker-compose.yml (all services + PostgreSQL)
- [ ] CD workflows per service — Analytics pending (Rakuten ✓, XHS ✓, Scraper ✓, Race Hub ✓, Dashboard ✓)
- [ ] Smoke test all pipelines end-to-end on Lightsail

---

## Portfolio Architecture Diagrams

- [x] Rakuten pipeline diagram (`docs/architecture/rakuten/rakuten.html`)
- [ ] XHS pipeline diagram
- [ ] Scraper pipeline diagram
- [ ] Race Hub architecture diagram
- [ ] Dashboard architecture diagram
- [ ] Ecosystem-wide diagram

---

## Improvements Roadmap (`docs/improvements.md`)
> Full detail: `docs/improvements.md` — ordered by priority

**⚠ Core platform work must ship before starting these** (dashboard detail pages, XHS manual/preview scripts, Rakuten `.product-specs` CSS)

- [ ] OAuth2 / SSO — Auth.js + Google OAuth; whitelist single email; protects all dashboard trigger endpoints
- [ ] Telegram alerts — pipeline failure notifications (XHS, Scraper, Rakuten); single `sendTelegramAlert()` util
- [ ] Zod validation — schemas on all POST endpoints; invalid input returns 400 before touching DB
- [ ] LangFuse LLM observability — trace all Claude API calls; self-hosted Docker container
- [ ] BullMQ job queue — replace `docker exec` triggers with Redis-backed queue; named queues per pipeline; Bull Board UI in dashboard
- [ ] Claude tool use / function calling — refactor `chooseRace()` + Rakuten genre classifier to typed tool schema; remove brittle JSON.parse
- [ ] Python Analytics Service + RAG pipeline — Phase 1: ingest XHS Excel export, FastAPI dashboard endpoints; Phase 2: pgvector embeddings, few-shot injection, semantic dedup
- [ ] Retry with exponential backoff — `withRetry()` wrapper on all external API calls (Rakuten, DeepL, WC, Claude)
- [ ] Pino structured logging — replace `console.log` across all services; JSON logs with `level`/`service`/`timestamp`
- [ ] Health check endpoints — `GET /health` on all Express apps; dashboard polls every 30s; service up/down indicator
- [ ] Claude-assisted failure diagnosis — on pipeline failure, pass last N log lines to Claude; display natural-language diagnosis in dashboard
- [ ] Redis caching layer — cache-aside pattern; Rakuten rankings, DeepL translations, dashboard stats, race list
- [ ] Terraform (deferred) — infrastructure as code for Lightsail instance; resume polish only

---

## Quant Dev Improvements (`docs/quant-improvements.md`)
> Full detail: `docs/quant-improvements.md` — build after core platform ships

**⚠ Prereqs same as Improvements Roadmap above — do not start until core platform done**

### Tier 1 — Core (ship all four; all have measurable before/after numbers)

- [ ] `p-limit` semaphore in Rakuten genre sync — bounded concurrent API fetching; target ~3x speedup; `npm install p-limit`
- [ ] `asyncio.gather()` in FastAPI analytics service — parallel metric computation; measure stats endpoint latency before/after
- [ ] BullMQ worker pool for Rakuten product request — producer-consumer pattern; 3 concurrent workers; immediate enqueue response + polling (overlaps with Improvements Roadmap BullMQ item)
- [ ] pybind11 C++ scoring core (`analytics/scoring_core.cpp`) — `compute_scores()` weighted sum; compile inside Docker; benchmark N=100k synthetic matrix on VPS; add C++ + pybind11 to resume

### Tier 2 — Strong additions (deepen C++ story)

- [ ] Time-decay + cosine similarity — extend `scoring_core.cpp`; `time_decay_score()` + `cosine_similarity()`; alpha decay pattern
- [ ] Monte Carlo content optimizer (`std::async`) — N=10k simulations parallelised across hardware threads; first real C++ speedup benchmark from work project

### Tier 3 — Nice to have (deepen quant vocabulary)

- [ ] EWMA rolling statistics — `ewma_update()` in C++; RiskMetrics σ² recurrence; volatility-adjusted content weighting
- [ ] OLS feature attribution — Gaussian elimination in C++; factor model analogy; document N=[ ] sample size caveat
- [ ] Markowitz mean-variance optimizer — Cholesky covariance inversion; efficient frontier; document sample size caveat

### Measurement checklist (fill after building)

- [ ] `asyncio.gather()`: stats endpoint before → after (ms)
- [ ] `p-limit`: full genre sync before → after (seconds); expected ~3x for concurrency=3
- [ ] BullMQ: inline handler response before → after (seconds → ms)
- [ ] pybind11: N=100k Python vs C++ benchmark on VPS (speedup ratio)
- [ ] Monte Carlo: Python single-threaded vs C++ `std::async`, N=10k (speedup ratio)
