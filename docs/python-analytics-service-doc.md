**Project:** python-analytics-service

**Platform:** running.moximoxi.net — shared analytics layer for the XHS automation pipeline

**Author:** Jason Deng

**Date:** April 2026

**Status:** Planned (in-scope — implement after core pipelines deployed)

---

## 1. What This Is

A standalone Python/C++ analytics microservice (FastAPI) that the XHS content automation pipeline calls monthly to calibrate its content strategy. Instead of a hardcoded post type rotation, the scheduler asks this service: "given our performance data, what should we post more of?" The service analyzes the export, responds with normalized weights, and the scheduler updates its config automatically.

Python owns the API surface, data ingestion, and orchestration. C++ owns the numerical computation via a pybind11 bridge. This is the same two-layer split used in quant research infrastructure — Python research environment calling into a C++ computation engine.

**The core architectural pattern mirrors quant research infrastructure:**

| Layer | Quant firm | This service |
|---|---|---|
| Orchestration | Python research environment | FastAPI (Python) |
| Data wrangling | pandas / numpy | pandas / numpy |
| Hot-path computation | C++ pricing/risk engine | C++ scoring core (pybind11) |
| Execution | Trading system (C++/Java/Go) | XHS pipeline (Node) |
| Output | Strategy signals / trade orders | Content weights + updated prompts |

Python owns data ingestion, API surface, and orchestration. C++ owns the numerical computation. Node executes the output. Each layer does what it's best at — no layer reaches into another's concerns.

---

## 2. Why a Separate Service

The XHS pipeline currently runs 1–2 posts/day. Node could handle the math inline. The service is built separately because:

- **Scale trajectory:** Boss direction is hourly posts. At 1 post/hour → **8,760 posts/year**. After two years: 17,500+ archive rows. Rolling aggregations, per-type scoring, cosine similarity across that volume is not inline code — it's a data pipeline.
- **Clean separation:** Node executes. Python analyzes. Mixing them couples pipeline logic to analysis logic — hard to change either independently.
- **Data tooling:** The source is a cumulative Excel export from XHS Creator Studio. `pd.read_excel` + DataFrame manipulation is exactly what pandas is built for. Doing this in Node is verbose and non-idiomatic.
- **Industry alignment:** The full pattern is three layers — Python for orchestration and data wrangling, C++ for hot-path computation, Node for execution. This is exactly how quant research infrastructure is structured. Python handles the research environment, C++ owns the pricing/risk math, a separate execution system acts on the output. Building to that pattern now makes the architecture legible to any fintech/quant interviewer — and the C++ swap is a drop-in, not a rewrite, because the scoring interface is isolated from day one.

**Why not TypeScript:**

| Task | TypeScript | Python + C++ |
|---|---|---|
| Rolling averages, weighted scoring | Verbose, no native DataFrame | pandas — 2 lines |
| Statistical significance | No standard library | scipy/numpy built-in |
| Large-scale data manipulation | Doable but not idiomatic | Industry standard |
| Hot-path numerical computation | No path to native C++ integration | pybind11 bridge — C++ .so called directly from Python |

---

## 3. Architecture

Two phases. Phase 1 ships with the core pipelines. Phase 2 activates once enough performance-enriched archive rows exist.

### Phase 1 — Analytics + Performance Backfill

```
XHS Creator Studio → manual Excel export → shared_volume/xhs/performance_export.xlsx
                                                      ↓
XHS Scheduler (Node) ──→ POST /analyze/xhs ──→ FastAPI (Python)
                                                      ↓
                                               pd.read_excel → DataFrame
                                               match rows to xhs_post_archive by title/timestamp
                                               write views/saves/CTR onto archive rows (backfill)
                                                      ↓
                                          ┌── C++ scoring core (pybind11) ──┐
                                          │  compute_scores()               │
                                          │  normalize_weights()            │
                                          └─────────────────────────────────┘
                                                      ↓
                                          JSON response (content_weights + top posts per type)
                                                      ↓
                          ┌───────────────────────────┴────────────────────────────┐
                          ↓                                                         ↓
                Scheduler writes                                        POST /tune/xhs (Claude)
                xhs/config.json                                                     ↓
                (rotation weights)                              top posts + current prompt → Claude
                                                                                    ↓
                                                                     archive current prompt
                                                                     write updated prompt to prompts.json
```

### Phase 2 — RAG Pipeline (activates after performance backfill)

```
POST /embed/xhs (analytics service)
        ↓
For each row in xhs_post_archive with no embedding:
    embed(title + hook) → text-embedding-3-small
    store in embedding vector(1536) column (pgvector)
        ↓
xhs_post_archive now has: content + post_type + views + saves + ctr + embedding

At generation time (XHS generator — Node):
    embed(candidate topic) → pgvector query
        ORDER BY embedding <-> $candidate LIMIT 5
        WHERE post_type = $type
        ORDER BY views DESC          ← performance-weighted, not just semantic
        ↓
    Top 3 posts injected into Claude prompt as few-shot examples
    Claude writes toward proven content, not just instructions

Before generation (semantic dedup):
    C++ cosine_similarity() against last 30 days of archive
    If similarity > 0.85 → steer to different angle
    Prevents repeated topic angles (post_history.json only deduplicates race names)
```

The analytics service runs in its own Docker container. XHS scheduler calls it once per month (or on demand) after a new export drops. `/embed/xhs` runs automatically after each `/analyze/xhs` to keep embeddings current.

---

## 4. C++ Scoring Core

### The pattern

In quant firms, Python handles research, data wrangling, and strategy logic. The actual numerical computation — pricing models, risk calculations, signal scoring — runs in C++. Python calls into it via a bridge (pybind11, Cython, or similar). This gives Python's ergonomics for the work Python is good at, and C++'s performance for tight numerical loops.

This service follows the same separation:

```
FastAPI (Python)
    → pd.read_excel → DataFrame          ← Python: I/O, wrangling
    → df.to_numpy()
        → xhs_analytics_core (C++ .so)   ← C++: hot-path math
            → compute_scores()           ← weighted sum + undersampling correction
            → normalize_weights()        ← softmax normalization
            → cosine_similarity()        ← semantic dedup (Phase 2)
    ← numpy array
    → DB writes, JSON response           ← Python: orchestration, output
```

Python side stays clean — the C++ module is just a function call:

```python
import xhs_analytics_core  # compiled pybind11 .so

scores = xhs_analytics_core.compute_scores(df[metrics].to_numpy(), weights)
normalized = xhs_analytics_core.normalize_weights(scores, post_counts)
```

C++ owns the computation — no GIL, no interpreter overhead:

```cpp
// xhs_analytics_core.cpp
std::vector<double> compute_scores(
    const py::array_t<double>& metric_matrix,  // [n_posts x 3] — views, saves, CTR
    const py::array_t<double>& weights         // [0.4, 0.35, 0.25]
) {
    auto buf = metric_matrix.request();
    double* data = static_cast<double*>(buf.ptr);
    std::vector<double> scores(buf.shape[0]);

    for (ssize_t i = 0; i < buf.shape[0]; i++) {
        scores[i] = weights.at(0) * data[i*3 + 0]   // views
                  + weights.at(1) * data[i*3 + 1]   // saves
                  + weights.at(2) * data[i*3 + 2];  // CTR
    }
    return scores;
}
```

### Why this matters at scale

At current cadence (1–2 posts/day), pandas scoring completes in milliseconds. C++ is a no-op performance gain today.

At 1 post/hour — **8,760 posts after year one, 17,500 after year two** — every `/analyze/xhs` call means:

- Composite scoring across 8,760+ rows grouped by 5 post types
- Rolling window aggregations for trend detection
- Undersampling correction computed per-type
- Phase 2: cosine similarity against the full archive for semantic dedup

At that volume, GIL contention, DataFrame overhead, and Python's interpreted loop cost are real. The scoring math — tight numerical loops over large double arrays — is exactly the workload C++ is built for.

### Implementation plan

The scoring logic is deliberately isolated in `analytics/scoring.py` from day one — not entangled in endpoint logic. This makes the C++ swap a drop-in: `scoring.py` calls `xhs_analytics_core` instead of numpy math. No endpoint changes, no pipeline changes.

| Phase | What | Trigger |
|---|---|---|
| Now | Python scoring in `analytics/scoring.py` — pandas/numpy, isolated interface | Ship with core pipelines |
| Later | C++ drop-in — `scoring.py` calls compiled `.so`, interface unchanged | Archive exceeds ~5,000 posts or calibration latency becomes noticeable |

---

## 5. Endpoints

### `POST /analyze/xhs`

The calibration endpoint. Run monthly after dropping a new Excel export.

**Called by:** XHS scheduler (monthly, after Excel export is dropped into shared volume)

**Input:** No JSON body — reads `shared_volume/xhs/performance_export.xlsx` directly. The Excel file is the cumulative export from XHS Creator Studio (笔记数据 tab), one row per post with columns: 笔记标题, 首次发布时间, 曝光, 观看量, 封面点击率, 点赞, 评论, 收藏, 涨粉, 分享, 人均观看时长.

Post type inferred by matching 笔记标题 against `xhs/post_archive/` — archive already has post type tagged per entry.

**What it does:**
1. Ingests Excel → DataFrame
2. Backfills views/saves/CTR onto matching `xhs_post_archive` rows
3. Passes metric matrix to C++ scoring core → composite score per post
4. Applies undersampling correction per type
5. Normalizes scores into content generation weights
6. Returns weights + top 3 posts per type

**Output:**
```json
{
  "content_weights": {
    "race_guide": 0.38,
    "training_science": 0.24,
    "nutrition": 0.22,
    "health_recovery": 0.10,
    "comparison": 0.06
  },
  "top_posts": { ... },
  "flags": ["nutrition undersampled — high CTR signal, low post count"],
  "computed_at": "2026-04-02T10:00:00Z"
}
```

**Node action:** Scheduler writes `content_weights` to `xhs/config.json`. Next cron cycle picks up updated weights automatically — scheduler already watches config.json for changes.

**Backfill note:** The backfill is a side effect of `/analyze/xhs`, not a separate step. Without it, Phase 2 RAG can only retrieve semantically similar posts, not the ones that actually performed well.

---

### `POST /tune/xhs`

Prompt tuning endpoint. Called immediately after `/analyze/xhs` as part of the same monthly calibration flow.

**Input:**
```json
{
  "post_type": "race_guide",
  "top_posts": [
    { "title": "...", "content": "..." },
    { "title": "...", "content": "..." },
    { "title": "...", "content": "..." }
  ],
  "current_prompt": "..."
}
```

**What it does:**
- Sends top posts + current prompt to Claude
- Claude returns updated prompt based on patterns the top posts share
- Archives current prompt to `xhs/prompt_archive/YYYY-MM-DD/<post_type>.txt`
- Writes updated prompt to `xhs/prompts.json`

**Rollback logic:**
- Each calibration stores baseline score per post type in `xhs/prompt_archive/YYYY-MM-DD/baseline_scores.json`
- Next calibration: if composite score for a type is lower than last month's baseline → auto-rollback to archived prompt, flag in dashboard
- If higher → new prompt becomes the baseline

Self-adjusting prompts with automatic rollback based on month-over-month performance — no manual tuning required.

---

### `POST /embed/xhs` *(Phase 2)*

Generates and stores embeddings for all `xhs_post_archive` rows that don't yet have one. Called automatically after `/analyze/xhs` as part of the monthly calibration flow.

**What it does:**
- Queries `xhs_post_archive` for rows where `embedding IS NULL`
- For each row: calls `text-embedding-3-small` with `title + " " + hook`
- Stores resulting `vector(1536)` in the `embedding` column (pgvector)

**Result:** Archive becomes a searchable vector store. XHS generator (Node) queries it directly at generation time — no round-trip to analytics service needed, just a Postgres query.

---

## 6. Scoring Logic

**Composite performance score:**

```python
# analytics/scoring.py — isolated, swappable interface
def compute_scores(metric_matrix: np.ndarray, weights: list[float]) -> np.ndarray:
    # Phase 1: pure Python/numpy
    # Phase 2: xhs_analytics_core.compute_scores(metric_matrix, weights)
    return (weights[0] * metric_matrix[:, 0]   # views
          + weights[1] * metric_matrix[:, 1]   # saves
          + weights[2] * metric_matrix[:, 2])  # CTR

# Undersampling correction — boost high-signal low-count categories
# Encourages more posts in underrepresented types with strong metrics
if post_count < 15 and score > median_score:
    score *= 1.3
```

Metric weights (0.4 / 0.35 / 0.25) are configurable — stored in config, not hardcoded.

The function signature in `scoring.py` does not change when C++ drops in. The only change is the implementation line.

---

## 7. Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | FastAPI | Standard in quant/fintech Python backends; async-native; Pydantic validation built-in |
| Data wrangling | pandas + numpy | Industry standard; DataFrames make ingestion and aggregation clean and auditable |
| Scoring core | C++ via pybind11 | Hot-path math — no GIL, no interpreter overhead; same pattern as quant research infra |
| Embeddings | OpenAI `text-embedding-3-small` | Cheapest reliable embedding model; 1536-dim vectors |
| Vector store | pgvector (Postgres extension) | No new infrastructure — runs on existing Postgres instance; right tool at this data volume |
| Containerization | Docker | Isolated Python + compiled C++ runtime; portable; consistent with rest of stack |
| Config | JSON files | Node pipelines read JSON natively; no extra parsing layer |

---

## 8. Deployment

Runs in its own container via docker-compose:

```yaml
services:
  xhs-automation:       # Node
  analytics-service:    # Python/FastAPI + C++ .so — port 8000
```

XHS scheduler calls `http://analytics-service:8000` internally. Not exposed publicly.

**Monthly ops process:**
1. Download Excel export from XHS Creator Studio → 笔记数据 → 导出数据
2. Drop file into shared volume at `xhs/performance_export.xlsx`
3. Trigger via dashboard: `POST /api/analytics/calibrate`
   - Calls `/analyze/xhs` → backfills archive → scores via C++ core → writes updated weights to `xhs/config.json`
   - Calls `/tune/xhs` per post type → archives current prompts → writes updated prompts to `prompts.json`
   - Calls `/embed/xhs` → generates embeddings for new archive rows (Phase 2)
   - Dashboard shows diff of what changed + any rollbacks triggered

---

## 9. Resume / Interview Framing

**"How did you use Python in these projects?"**

> I built a Python analytics service that the XHS automation pipeline calls monthly to calibrate its content strategy. It reads our cumulative performance export from XHS Creator Studio — views, saves, CTR per post — joins it against our post archive to tag each row by post type, then computes a composite score and normalizes it into content generation weights. The scheduler reads those weights to determine post type rotation going forward. It also calls a prompt tuning endpoint that sends top-performing posts per type to Claude along with the current prompt — Claude returns an updated prompt, we archive the old one, and if next month's performance is worse we auto-rollback. FastAPI exposes the endpoints, pandas handles Excel ingestion, C++ handles the scoring math. Python for analysis and orchestration, Node for execution — same separation you'd see in quant research infrastructure.

**"Where does C++ fit in?"**

> The scoring computation — weighted sums across post metrics, normalization, cosine similarity for semantic dedup — is isolated behind a clean interface in `analytics/scoring.py`. Phase 1 ships with numpy math. The interface is defined so C++ can drop in via pybind11 without touching any endpoint or pipeline code. At current scale it doesn't matter, but at 1 post/hour the archive hits 8,000+ rows after year one, and tight numerical loops over that volume is exactly where C++ wins over an interpreted loop. Same pattern quant firms use: Python orchestrates, C++ owns the hot path.

**"Tell me about your RAG experience."**

> The analytics service drives a RAG pipeline. When it ingests the monthly Excel export it backfills performance data — views, saves, CTR — onto the post archive rows. Then a separate endpoint generates embeddings for every archive post using OpenAI's text-embedding-3-small and stores them in a pgvector column on the same Postgres instance. At generation time, the XHS pipeline embeds the candidate topic, queries for the 5 most semantically similar past posts filtered by type and sorted by views, and injects them as few-shot examples into the Claude prompt. There's also a semantic dedup check before generation — if the proposed angle is too close to something published in the last 30 days it steers away. I chose pgvector over a dedicated vector DB because the data volume didn't justify the infrastructure overhead — it's just a Postgres extension on the instance we already had.

**Resume one-liner:** Self-adjusting content pipeline — monthly performance export drives automatic rotation weight recalibration, prompt tuning with auto-rollback, and performance-weighted RAG few-shot injection. Scoring core designed for C++ drop-in at scale.

---

## 10. Implementation Notes

- Build after core Rakuten and XHS pipelines are working — enhancement layer, not a dependency
- Start with hardcoded weights in Node pipelines; swap in analytics service call once built
- Scoring logic goes in `analytics/scoring.py` from day one — isolated, not entangled in endpoint handlers. This is the C++ swap point.
- Pydantic models for request/response validation
- C++ module compiled into Docker image at build time — no runtime compilation
