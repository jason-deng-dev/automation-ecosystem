**Project:** python-analytics-service

**Platform:** running.moximoxi.net — analytics layer for the XHS automation pipeline

**Author:** Jason Deng

**Date:** April 2026

**Status:** Complete and deployed (May 2026)

---

## Scope

Operator uploads monthly Excel export from XHS Creator Studio. Service backfills performance data onto the post archive, runs scoring pipeline, returns ranked post types with recommended weights for the posting schedule.

**Single endpoint: `POST /analyze/xhs`**

**Deferred:**
- `/embed/xhs` RAG pipeline — activate after archive exceeds ~500 generated posts

---

## 1. What This Is

A standalone Python/C++ analytics microservice (FastAPI) that the operator triggers monthly via the dashboard. Instead of a hardcoded post type rotation, the operator uploads the latest XHS Creator Studio export and gets back: which post types are performing best and how to weight the schedule.

**The architectural pattern mirrors quant research infrastructure:**

| Layer | Quant firm | This service |
|---|---|---|
| Orchestration | Python research environment | FastAPI (Python) |
| Data wrangling | pandas / numpy | pandas / numpy |
| Hot-path computation | C++ pricing/risk engine | C++ scoring core (pybind11) |
| Output | Strategy signals | Content weights for posting schedule |

---

## 2. Architecture

```
XHS Creator Studio → manual Excel export
                            ↓
Dashboard → POST /api/analytics/calibrate → POST /analyze/xhs (FastAPI)
                            ↓
                  pd.read_excel → DataFrame
                  match titles to xhs_post_archive by title → backfill views/saves/CTR
                            ↓
                  compute_scores()       — views×0.4 + saves×0.35 + CTR×0.25  [C++]
                  ewma_scores()          — recency weighting (λ=0.94)          [C++]
                  undersampling boost    — <15 posts + above median → ×1.3     [Python]
                  fit_ols_prior()        — regression prior per type            [Python/numpy]
                  blend EWMA + OLS 50/50 per post                              [Python]
                  monte_carlo_optimize() — 10k bootstrap sims, 4 threads       [C++]
                  markowitz_weights()    — mean/variance Sharpe optimization    [C++]
                            ↓
                  JSON response: ranked_types + content_weights + top_posts
                            ↓
                  Dashboard displays ranked list + weight bars
```

---

## 3. Scoring Pipeline

**Step 1 — Composite score per post**
```
score = views×0.4 + (saves×100)×0.35 + (CTR×1000)×0.25
```
saves and CTR scaled to views magnitude so the weighted sum isn't dominated by raw view counts.

**Step 2 — EWMA smoothing per type**
Posts sorted oldest→newest per type. EWMA (λ=0.94) runs over the sequence:
```
ewma[t] = 0.94 × ewma[t-1] + 0.06 × score[t]
```
Recent posts count more. Last EWMA value = type's smoothed score.

**Step 3 — Undersampling correction**
If a type has <15 posts AND its EWMA score is above the global median → ×1.3 boost.
Prevents burying a high-signal category just because we haven't posted in it much.

**Step 4 — OLS prior (numpy lstsq)**
Fits a linear regression over all posts:
- Features: post_type one-hot (4 cols: race, training, nutritionSupplement, wearable) + month + recency_days
- Target: EWMA-smoothed composite score

Predicts the expected score for each post type at median month and zero recency (i.e. a fresh post of that type today). This OLS prediction becomes the prior — blended 50/50 with the EWMA score before Monte Carlo runs:
```
blended[i] = 0.5 × ewma[i] + 0.5 × ols_predicted[type_of_post_i]
```
Biases simulations toward predicted performance, not just raw historical averages. Helps when a type has few posts but OLS sees a strong trend.

**Step 5 — Monte Carlo bootstrap (C++, 4 threads, N=10,000)**
- Bootstraps over blended (EWMA + OLS) per-post scores
- Each simulation: resample per type with replacement, compute mean, normalize to weight vector
- Average 10k weight vectors → mean weight + variance per type

**Step 6 — Markowitz optimization**
Takes MC output (mean + variance per type). Computes Sharpe-style ratio:
```
sharpe[t] = mean[t] / std[t]
```
Normalizes sharpe ratios to final content weights. Favors consistent performers over high-variance types — a type averaging 400 reliably beats one averaging 500 with wild swings.

---

## 4. Endpoint

### `POST /analyze/xhs`

**Input:** multipart Excel upload (.xlsx/.xls) — XHS Creator Studio 笔记数据 export

**What it does:**
1. Parses Excel, renames Chinese columns
2. Matches titles to `xhs_post_archive` by title — updates performance columns (views, saves, CTR, etc.) on matches; skips unknowns
3. Runs scoring pipeline: composite score → EWMA → undersampling correction → Monte Carlo
4. Returns ranked types + weights

**Output:**
```json
{
  "ingested": { "updated": 90, "skipped_unknown": 25 },
  "ranked_types": [
    { "post_type": "race",               "weight": 0.42 },
    { "post_type": "training",           "weight": 0.31 },
    { "post_type": "nutritionSupplement","weight": 0.19 },
    { "post_type": "wearable",           "weight": 0.08 }
  ],
  "content_weights": { "race": 0.42, "training": 0.31, ... },
  "top_posts": { "race": [...], "training": [...], ... },
  "flags": ["wearable has only 3 posts but strong performance — weight boosted"],
  "computed_at": "2026-05-11T10:00:00Z"
}
```

**Archive cross-reference:** `post_type` comes from the archive, not the Excel. Excel has no type column. Backfill only updates performance numbers — never touches `post_type`. Posts not in the archive are skipped (type unknown, can't score).

---

## 5. C++ Scoring Core

`scoring_core.cpp` compiled to `xhs_analytics_core.so` via pybind11 at Docker build time.

`scoring.py` tries to import the `.so`; falls back to numpy if not compiled (dev environment).

| Function | What it does |
|---|---|
| `compute_scores(matrix, weights)` | Weighted sum over [n_posts × 3] metric matrix |
| `normalize_weights(scores)` | Normalize to weights summing to 1 |
| `ewma_scores(scores, λ=0.94)` | Exponentially weighted moving average |
| `monte_carlo_optimize(scores, indices, n_types)` | 10k bootstrap simulations, 4 std::async threads |
| `cosine_similarity(a, b)` | Cosine similarity — reserved for Phase 2 RAG dedup |
| `markowitz_weights(means, variances)` | Sharpe-style mean/variance optimization → final weights |

---

## 6. Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | FastAPI | Async-native, Pydantic validation |
| Data wrangling | pandas + numpy | Excel ingestion, DataFrame aggregation |
| Scoring core | C++ via pybind11 | No GIL, tight loops — same pattern as quant infra |
| Containerization | Docker | Compiles C++ .so at build time; portable |

---

## 7. Deployment

Runs in its own container. Dashboard proxies to it via `/api/analytics/calibrate`.

Deployed via GitHub Actions CI/CD — push to `services/analytics/**` builds image, pushes to Docker Hub, SSHes to Lightsail and runs container with `--network host`. Env file at `~/analytics/.env` on VPS.

**Monthly ops process:**
1. Download Excel from XHS Creator Studio → 笔记数据 → 导出数据
2. Go to dashboard XHS page → Content Calibration panel
3. Upload Excel → click Analyze
4. Read ranked types — adjust posting schedule weights accordingly

---

## 8. Phase 2 — RAG Pipeline (deferred, ~500+ posts)

```
POST /embed/xhs
  → for each archive row with no embedding:
      embed(title + hook) → text-embedding-3-small → store in pgvector column
  → at generation time: embed candidate topic → nearest 5 by type + views → few-shot injection
  → semantic dedup: cosine_similarity() against last 30 days → steer away if similarity > 0.85
```

Activate once archive has enough generated posts for embeddings to be meaningful.

---

## 9. Resume / Interview Framing

**"How did you use Python in these projects?"**

> I built a Python analytics microservice the XHS content pipeline calls monthly to calibrate its posting schedule. Operator uploads the cumulative performance export from XHS Creator Studio — views, saves, CTR per post. Service matches each row to our post archive by title to get the post type, backfills the performance data, then runs a scoring pipeline: composite score per post, EWMA smoothing so recent posts count more, undersampling correction for types with few posts, then a Monte Carlo bootstrap in C++ that resamples 10,000 times to get stable optimal weights per post type. Dashboard shows the ranked types and recommended weights. FastAPI exposes the endpoint, pandas handles Excel ingestion, C++ handles the hot-path math.

**"Where does C++ fit in?"**

> The numerical computation — weighted scoring, EWMA, Monte Carlo bootstrap — is isolated behind a clean interface in `scoring.py`. The C++ module compiles to a `.so` via pybind11 inside Docker at build time. Python imports it like any module. The Monte Carlo runs 10,000 bootstrap simulations across 4 threads using `std::async` — no GIL, no interpreter overhead. Same pattern quant firms use: Python orchestrates, C++ owns the hot path.
