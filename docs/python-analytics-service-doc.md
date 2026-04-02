**Project:** python-analytics-service

**Platform:** running.moximoxi.net — shared analytics layer for the Rakuten and XHS automation pipelines

**Author:** Jason Deng

**Date:** April 2026

**Status:** Planned (stretch goal — implement if ahead of schedule)

---

## 1. What This Is

A standalone Python microservice (FastAPI) that both the Rakuten product aggregator and the XHS content automation pipeline call to get data-driven weights. Instead of hardcoded ratios and content distributions, both pipelines ask this service: "given current data, what should our weights be?" The service analyzes, responds, and each pipeline updates its strategy accordingly.

This is the same pattern used in quant/fintech infrastructure — Python owns data analysis and outputs a strategy, other systems execute it.

---

## 2. Why a Separate Service

Both Node.js pipelines need data analysis that Python handles better than JavaScript:
- pandas for tabular data manipulation and rolling metrics
- numpy for statistical computations
- Clean separation: Node executes, Python analyzes

A shared service avoids duplicating Python logic across two repos. Each pipeline calls it over HTTP — neither needs a Python runtime installed, and the analytics layer can be updated independently.

---

## 3. Why Python Over TypeScript Here

TypeScript could technically do this, but:

| Task | JS/TS | Python |
|---|---|---|
| Rolling averages, weighted scoring | Verbose, no native DataFrame | pandas — 2 lines |
| Statistical significance | No standard library | scipy/numpy built-in |
| Data manipulation at scale | Doable but not idiomatic | Industry standard |

More importantly: Python for data analysis is the fintech industry standard. This is how quant research infrastructure is actually structured — Python analyzes, other systems act on the output.

---

## 4. Architecture

```
Rakuten Aggregator (Node) ──→ POST /analyze/rakuten ──┐
                                                       ├──→ FastAPI (Python)
XHS Automation (Node) ──────→ POST /analyze/xhs ───────┘         ↓
                                                            pandas analysis
                                                                  ↓
                                                    JSON response (weights/ratios)
                                                                  ↓
                                              Node pipeline updates its config
```

Each service is its own Docker container. The Python service exposes two endpoints, one per pipeline.

---

## 5. Endpoints

### `POST /analyze/rakuten`

**Called by:** Rakuten aggregator (weekly, after ranking data is fetched)

**Input:**
```json
{
  "ranking_data": [
    { "category": "nutrition", "genre_id": "505814", "rank_scores": [1, 3, 5, 2] },
    { "category": "gear", "genre_id": "XXXXXX", "rank_scores": [8, 12, 15] }
  ]
}
```

**What it does:**
- Computes a relative popularity score per category from ranking positions
- Normalizes scores into scrape allocation weights (sum to 1.0)
- Higher-ranked categories get proportionally more API calls allocated

**Output:**
```json
{
  "scrape_weights": {
    "nutrition": 0.40,
    "gear": 0.25,
    "recovery": 0.15,
    "sportswear": 0.12,
    "training": 0.08
  },
  "computed_at": "2026-04-02T10:00:00Z"
}
```

**Node pipeline action:** Writes weights to `config/scrape_weights.json` — the scheduler reads this before each fetch cycle to determine how many products to pull per category.

---

### `POST /analyze/xhs`

**Called by:** XHS automation scheduler (weekly, after performance data is updated)

**Input:**
```json
{
  "post_performance": [
    { "category": "race_guide", "views": 721, "saves": 12.75, "ctr": 0.140, "post_count": 48 },
    { "category": "training_science", "views": 588, "saves": 6.80, "ctr": 0.110, "post_count": 15 },
    { "category": "nutrition", "views": 385, "saves": 4.43, "ctr": 0.248, "post_count": 7 }
  ]
}
```

**What it does:**
- Computes a composite performance score per category (weighted combination of views, saves, CTR)
- Applies an undersampling correction — categories with few posts but strong metrics get a boost to encourage more testing
- Normalizes into content generation weights

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
  "flags": ["nutrition undersampled — high CTR signal, low post count"],
  "computed_at": "2026-04-02T10:00:00Z"
}
```

**Node pipeline action:** Scheduler reads `content_weights` to determine post type for each day in the rotation.

---

## 6. Scoring Logic (both endpoints)

**Rakuten — category popularity score:**
```python
# Lower rank position = more popular
# Score = inverse of average rank position, normalized across categories
score = 1 / mean(rank_positions)
weight = score / sum(all_scores)
```

**XHS — composite performance score:**
```python
# Weighted combination of normalized metrics
score = (0.4 * norm_views) + (0.35 * norm_saves) + (0.25 * norm_ctr)

# Undersampling correction: boost categories with < 15 posts but score > median
if post_count < 15 and score > median_score:
    score *= 1.3
```

Weights (0.4 / 0.35 / 0.25) are configurable — stored in a config file, not hardcoded.

---

## 7. Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | FastAPI | Standard in quant/fintech Python backends; async-native; matches Investment Simulator stack |
| Data analysis | pandas + numpy | Industry standard; DataFrames make scoring logic clean and auditable |
| Containerization | Docker | Isolated Python runtime; portable; consistent with rest of stack |
| Config | JSON files | Node pipelines read JSON natively; no extra parsing layer needed |

---

## 8. Deployment

Each service runs in its own container via docker-compose:

```yaml
services:
  rakuten-aggregator:   # Node
  xhs-automation:       # Node
  analytics-service:    # Python/FastAPI — port 8000
```

Both Node services call `http://analytics-service:8000` internally. The Python service is not exposed publicly.

---

## 9. Resume / Interview Framing

**"How did you use Python in these projects?"**

> I built a shared Python analytics service that both the Rakuten aggregator and XHS automation pipeline call. For Rakuten, it reads ranking data across product categories and outputs scrape allocation weights — instead of hardcoding that we fetch 20 nutrition products and 10 gear products, the ratio shifts based on what's actually trending. For XHS, it reads post performance metrics and computes content generation weights using a composite score of views, saves, and CTR, with a correction for undersampled categories that show strong signals. FastAPI exposes two endpoints, pandas does the analysis, and the Node pipelines consume the output as JSON config. Python for analysis, Node for execution — same separation you'd see in a quant research infrastructure.

---

## 10. Implementation Notes

- Build this after the core Rakuten and XHS pipelines are working — it's an enhancement layer, not a dependency
- Start with hardcoded weights in the Node pipelines; swap in the analytics service call once it's built
- The scoring formulas are simple enough to implement and explain — complexity is in the data pipeline design, not the math
- Pydantic models for request/response validation (consistent with Investment Simulator FastAPI patterns)
