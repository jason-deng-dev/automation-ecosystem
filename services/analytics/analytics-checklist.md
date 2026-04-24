- [ ] Setup
  - [x] Create `services/analytics/` directory
  - [ ] Initialize Python project (pyproject.toml or requirements.txt)
  - [ ] Install dependencies: fastapi, uvicorn, pandas, openpyxl, numpy, psycopg2-binary, python-multipart
  - [ ] Add `.env.example` (DATABASE_URL, shared volume path)
  - [ ] Write Dockerfile
  - [ ] Add to docker-compose / cicd

- [x] Schema migration
  - [x] `xhs_post_archive` — content fields nullable (legacy posts have no hook/contents/cta)
  - [x] `xhs_post_archive` — add performance columns: impressions, views, ctr, likes, comments_count, saves, shares, followers_gained, avg_watch_time
  - [x] Migration 001 applied to VPS

- [ ] Legacy post backfill
  - [ ] Tag 57 historical posts with post_type (manual, in Excel or CSV)
  - [ ] Write insert script — reads tagged file, inserts rows into `xhs_post_archive` (content fields NULL)
  - [ ] Verify rows inserted correctly

- [ ] `/upload/xhs` endpoint
  - [ ] Accept multipart Excel upload
  - [ ] Store file to shared volume at `xhs/performance_export.xlsx`
  - [ ] Return 200 on success

- [ ] Dashboard upload form (XHS detail page)
  - [ ] File input + submit button on XHS detail page
  - [ ] POST multipart to analytics service `/upload/xhs`
  - [ ] Show success/error feedback

- [ ] `/analyze/xhs` endpoint
  - [ ] Read `xhs/performance_export.xlsx` → DataFrame
  - [ ] Match rows to `xhs_post_archive` by title
  - [ ] Backfill performance columns on matched rows
  - [ ] Pass metric matrix to scoring logic
  - [ ] Apply undersampling correction per post type
  - [ ] Normalize scores into content weights
  - [ ] Return `content_weights` + `top_posts` per type + `flags`

- [ ] `analytics/scoring.py`
  - [ ] `compute_scores()` — weighted sum: views (0.4), saves (0.35), CTR (0.25)
  - [ ] `normalize_weights()` — softmax normalization
  - [ ] Undersampling correction — boost high-signal low-count types (< 15 posts, score > median → ×1.3)
  - [ ] Weights configurable via config, not hardcoded

- [ ] Monte Carlo content optimizer
  - [ ] Bootstrap resample per post type from archive
  - [ ] Simulate N=10,000 rotation weight combinations
  - [ ] Score each simulation against historical performance
  - [ ] Return optimal weight vector + confidence intervals
  - [ ] Document sample size caveat in output flags

- [ ] Write updated weights to DB / config
  - [ ] Scheduler reads updated weights for post type rotation
