## Scope (revised May 2026)
Manual operator-triggered analysis. Operator uploads Excel export, service backfills archive,
scores post types, returns ranked types + recommended weights for posting schedule.

---

- [x] Setup
  - [x] Create `services/analytics/` directory
  - [x] Install dependencies: fastapi, uvicorn, pandas, openpyxl, numpy, psycopg2-binary, python-dotenv, anthropic
  - [x] Add `.env` (DATABASE_URL, ANTHROPIC_API_KEY, XHS_PROMPTS_PATH)
  - [x] Add `.env.example`
  - [x] Write Dockerfile
  - [ ] Add to docker-compose / cicd

- [x] Schema migration
  - [x] `xhs_post_archive` — content fields nullable (legacy posts have no hook/contents/cta)
  - [x] `xhs_post_archive` — add performance columns: impressions, views, ctr, likes, comments_count, saves, shares, followers_gained, avg_watch_time
  - [x] Migration 001 applied to VPS

- [x] Historical post backfill
  - [x] Write `backfill_historical.py`
  - [x] Run script — 115 rows inserted, 0 skipped

- [x] `POST /analyze/xhs` endpoint
  - [x] Accept multipart Excel upload (.xlsx/.xls)
  - [x] Backfill performance columns onto matching archive rows
  - [x] Compute composite score per post: views (0.4) + saves×100 (0.35) + CTR×1000 (0.25)
  - [x] EWMA smoothing per type — recent posts weighted more heavily
  - [x] Undersampling correction (< 15 posts + score > median → ×1.3)
  - [x] Return: ranked_types (sorted best→worst), content_weights, top 3 posts per type, flags

- [x] C++ scoring engine (pybind11)
  - [x] `scoring_core.cpp` — compute_scores, normalize_weights, cosine_similarity, ewma_scores
  - [x] `CMakeLists.txt` — pybind11_add_module, -O3 -march=native
  - [x] Dockerfile compiles .so at build time
  - [x] `scoring.py` — tries C++ .so, falls back to numpy; interface unchanged

- [x] `POST /tune/xhs` — Claude API prompt auto-tuning
  - [x] Accept: post_type, top_posts, current_prompt
  - [x] Send to Claude API — return updated prompt based on top performer patterns
  - [x] Archive current prompt to `xhs/prompt_archive/YYYY-MM-DD/<post_type>.txt`
  - [x] Write updated prompt to `xhs/prompts.json`
  - [ ] Rollback logic: compare next month's avg score vs baseline; auto-revert if lower

- [x] Dashboard (XHS page)
  - [x] File upload + Analyze button
  - [x] Summary line: best performer callout
  - [x] Ranked type list with weight bars (%)
  - [x] Undersampling flags
  - [x] Top posts per type accordion (with view counts)
  - [x] Auto-tune prompt button per type
  - [x] API routes: /api/analytics/calibrate, /api/analytics/tune

- [ ] Phase 2 — RAG pipeline (activate after ~500 generated posts in archive)
  - [ ] `POST /embed/xhs` — generate embeddings for archive rows, store in pgvector
  - [ ] Semantic dedup at generation time via cosine_similarity
  - [ ] Performance-weighted few-shot injection into Claude prompt
