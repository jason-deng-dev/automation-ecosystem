## Scope (revised May 2026)
Manual operator-triggered analysis. Operator uploads Excel export, service backfills archive,
runs C++ scoring + Monte Carlo simulation, returns optimal content weights + top posts + auto-tuned prompts via Claude API.

---

- [ ] Setup
  - [x] Create `services/analytics/` directory
  - [x] Install dependencies: fastapi, uvicorn, pandas, openpyxl, numpy, psycopg2-binary, python-dotenv
  - [x] Add `.env` (DATABASE_URL)
  - [ ] Add `.env.example`
  - [ ] Write Dockerfile
  - [ ] Add to docker-compose / cicd

- [x] Schema migration
  - [x] `xhs_post_archive` — content fields nullable (legacy posts have no hook/contents/cta)
  - [x] `xhs_post_archive` — add performance columns: impressions, views, ctr, likes, comments_count, saves, shares, followers_gained, avg_watch_time
  - [x] Migration 001 applied to VPS

- [x] Historical post backfill
  - [x] Write `backfill_historical.py` — reads Excel, classifies titles by post_type (keyword rules), inserts 115 rows into `xhs_post_archive` with performance metrics
  - [x] Run script — 115 rows inserted, 0 skipped

- [x] `POST /analyze/xhs` endpoint
  - [x] Accept multipart Excel upload (.xlsx/.xls)
  - [x] Parse Excel, match titles to `xhs_post_archive` by title — update performance columns on matches, skip unknowns (post_type already in DB for all generated posts)
  - [x] Compute composite score per post type: views (0.4) + saves (0.35) + CTR (0.25)
  - [x] Apply undersampling correction (< 15 posts + score > median → ×1.3)
  - [x] Return: best_post_type, content_weights, top 3 posts per type, flags, ingestion summary

- [ ] C++ scoring engine (pybind11)
  - [ ] Write `analytics/scoring_core.cpp` — `compute_scores()`, `normalize_weights()`, `cosine_similarity()`
  - [ ] Write `CMakeLists.txt` — pybind11_add_module wiring
  - [ ] Compile `.so` inside Docker at build time (`RUN cmake .. && make` in Dockerfile)
  - [ ] Swap `scoring.py` implementation from numpy to `xhs_analytics_core` — interface unchanged

- [ ] Multithreaded Monte Carlo engine (std::async)
  - [ ] Add `monte_carlo_optimize()` to `scoring_core.cpp` — N=10,000 bootstrap simulations, std::async threads
  - [ ] Each simulation: resample archive rows per type, compute weighted score, record weight vector
  - [ ] Return optimal weight vector + confidence intervals (5th/95th percentile per type)
  - [ ] Expose via pybind11, call from `scoring.py`

- [ ] EWMA volatility
  - [ ] Add `ewma_scores()` to `scoring_core.cpp` — exponentially weighted moving average over per-type time series
  - [ ] λ (decay factor) configurable; recent posts weighted more heavily
  - [ ] Feed EWMA-smoothed scores into Monte Carlo prior instead of raw averages

- [ ] OLS-fitted generative model
  - [ ] Fit OLS regression in `scoring.py` (numpy lstsq) — features: post_type (one-hot), month, recency_days → target: composite score
  - [ ] Use fitted coefficients as Monte Carlo prior (shift sampling distribution toward predicted performance)

- [ ] Markowitz cross-validation
  - [ ] Add `markowitz_weights()` to `scoring_core.cpp` — mean-variance optimization over post type scores
  - [ ] Maximize expected score / variance (Sharpe-style ratio) rather than raw mean
  - [ ] Output: Markowitz-optimal weight vector alongside Monte Carlo weights

- [ ] asyncio.gather() latency optimization
  - [ ] Refactor `POST /analyze/xhs` — run DB backfill, scoring, Monte Carlo as concurrent async tasks via asyncio.gather()
  - [ ] Target: ~360ms → ~120ms

- [ ] `POST /tune/xhs` — Claude API prompt auto-tuning
  - [ ] Accept: post_type, top_posts (title + content), current_prompt
  - [ ] Send to Claude API — return updated prompt based on patterns in top performers
  - [ ] Archive current prompt to `xhs/prompt_archive/YYYY-MM-DD/<post_type>.txt`
  - [ ] Write updated prompt to `xhs/prompts.json`
  - [ ] Rollback logic: compare next month's avg score vs baseline; auto-revert if lower

- [ ] Dashboard upload form (XHS detail page)
  - [ ] File input + submit button on XHS detail page
  - [ ] POST multipart to analytics service `POST /analyze/xhs`
  - [ ] Display results: best type, Monte Carlo weights + confidence intervals, top posts per type, flags
  - [ ] "Auto-tune prompts" button → calls `POST /tune/xhs` per type, shows diff
