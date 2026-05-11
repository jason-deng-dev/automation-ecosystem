## Scope (May 2026)
Operator uploads monthly Excel export → service backfills archive → scoring pipeline →
ranked post types + recommended weights for posting schedule.

---

- [x] Setup
  - [x] Create `services/analytics/` directory
  - [x] Install dependencies: fastapi, uvicorn, pandas, openpyxl, numpy, psycopg2-binary, python-dotenv, anthropic
  - [x] Add `.env` (DATABASE_URL)
  - [x] Add `.env.example`
  - [x] Write Dockerfile
  - [ ] Add to docker-compose

- [x] Schema migration
  - [x] `xhs_post_archive` — content fields nullable
  - [x] `xhs_post_archive` — add performance columns: impressions, views, ctr, likes, comments_count, saves, shares, followers_gained, avg_watch_time
  - [x] Migration 001 applied to VPS

- [x] Historical post backfill
  - [x] Write `backfill_historical.py`
  - [x] Run — 115 rows inserted, 0 skipped

- [x] `POST /analyze/xhs`
  - [x] Accept multipart Excel upload (.xlsx/.xls)
  - [x] Backfill performance columns onto matching archive rows (title match, never overwrites post_type)
  - [x] Composite score per post: views×0.4 + saves×100×0.35 + CTR×1000×0.25
  - [x] EWMA smoothing per type (λ=0.94) — recent posts weighted more heavily
  - [x] Undersampling correction (< 15 posts + score > median → ×1.3)
  - [x] Monte Carlo bootstrap (10k sims, 4 C++ threads) → optimal weights per type
  - [x] Return: ranked_types, content_weights, top_posts, flags

- [x] C++ scoring engine (pybind11)
  - [x] `scoring_core.cpp` — compute_scores, normalize_weights, ewma_scores, monte_carlo_optimize, cosine_similarity
  - [x] `CMakeLists.txt` — pybind11_add_module, -O3 -march=native
  - [x] Dockerfile compiles .so at build time
  - [x] `scoring.py` — tries C++ .so, falls back to numpy

- [x] Dashboard (XHS page — left column)
  - [x] File upload + Analyze button
  - [x] Summary line: best performer callout
  - [x] Ranked type list with weight bars (%)
  - [x] Undersampling flags
  - [x] Top posts per type accordion
  - [x] Localized (zh/en)
  - [x] API routes: /api/analytics/calibrate

- [ ] docker-compose wiring

- [ ] Phase 2 — RAG pipeline (activate after ~500 generated posts)
  - [ ] `POST /embed/xhs` — embeddings for archive rows via text-embedding-3-small → pgvector
  - [ ] Semantic dedup at generation time via cosine_similarity
  - [ ] Performance-weighted few-shot injection into Claude prompt
