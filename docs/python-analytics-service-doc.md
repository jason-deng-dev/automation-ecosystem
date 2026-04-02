**Project:** python-analytics-service

**Platform:** running.moximoxi.net — shared analytics layer for the Rakuten and XHS automation pipelines

**Author:** Jason Deng

**Date:** April 2026

**Status:** Planned (in-scope — implement after core pipelines deployed)

---

## 1. What This Is

A standalone Python microservice (FastAPI) that the XHS content automation pipeline calls to get data-driven content weights. Instead of a hardcoded post type rotation, the scheduler asks this service: "given our performance data, what should our content weights be?" The service analyzes the export, responds with normalized weights, and the scheduler updates its config accordingly.

This is the same pattern used in quant/fintech infrastructure — Python owns data analysis and outputs a strategy, other systems execute it.

**Scope decision:** Rakuten category weights dropped — product fetch allocation doesn't have enough signal to justify a separate analytics layer. XHS content weights are the primary use case.

---

## 2. Why a Separate Service + Why Python

The XHS pipeline currently runs 1-2 posts/day. At that scale, Node could handle the math in 20 lines. But:

- The business may scale to hourly posts (boss's direction) — at 700+ posts/month, pandas aggregation, normalization, and weighted scoring is the right tool
- The data source is a cumulative Excel export from XHS Creator Studio — `pd.read_excel` + DataFrame manipulation is exactly what pandas is built for
- Clean separation: Node executes the pipeline, Python analyzes performance and outputs strategy
- The analytics layer scales with post volume without changing the pipeline

**Data ingestion:** Monthly manual process — download Excel export from XHS Creator Studio (笔记数据 tab), drop into shared volume at `xhs/performance_export.xlsx`. The service reads this file on each `/analyze/xhs` call.

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
XHS Creator Studio → manual Excel export → shared_volume/xhs/performance_export.xlsx
                                                          ↓
XHS Scheduler (Node) ──→ POST /analyze/xhs ──→ FastAPI (Python)
                                                          ↓
                                                   pd.read_excel
                                                   join against post_archive (get post type)
                                                   pandas scoring per post type
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

The Python service is its own Docker container. The XHS scheduler calls it once per month (or on demand) after a new export is dropped into the shared volume.

---

## 5. Endpoints

### `POST /analyze/xhs`

The calibration endpoint. Run monthly after dropping a new Excel export.

**Called by:** XHS automation scheduler (monthly, after Excel export is dropped into shared volume)

**Input:** No JSON body — reads `shared_volume/xhs/performance_export.xlsx` directly. The Excel file is the cumulative export from XHS Creator Studio (笔记数据 tab), containing one row per post with columns: 笔记标题, 首次发布时间, 曝光, 观看量, 封面点击率, 点赞, 评论, 收藏, 涨粉, 分享, 人均观看时长.

Post type is inferred by matching 笔记标题 against `xhs/post_archive/` — the archive already has post type tagged per entry.

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

**Output also includes:** `top_posts` per post type (top 3 by composite score) — title + full content from post archive. This is passed directly to `/tune/xhs`.

**Node pipeline action:** Scheduler writes `content_weights` to `xhs/config.json`, overwriting the existing post type weights. Next cron cycle picks up the updated config automatically (scheduler already watches config.json for changes).

---

### `POST /tune/xhs`

The prompt tuning endpoint. Called immediately after `/analyze/xhs` as part of the same monthly calibration flow.

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
- Sends top performing posts + current prompt to Claude
- Claude returns an updated prompt with suggested additions/changes based on what patterns the top posts share
- Archives the current prompt to `xhs/prompt_archive/YYYY-MM-DD/<post_type>.txt` before overwriting
- Writes updated prompt to `xhs/prompts.json`

**Rollback logic:**
- Each monthly calibration stores a baseline score per post type in `xhs/prompt_archive/YYYY-MM-DD/baseline_scores.json`
- On next calibration, if composite score for a post type is lower than the baseline from the previous month → auto-rollback to archived prompt, flag in dashboard
- If higher → keep new prompt, archive becomes the new baseline

**Resume line:** "Self-adjusting prompts with automatic rollback based on month-over-month performance — no manual tuning required."

---

## 6. Scoring Logic

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

Runs in its own container via docker-compose:

```yaml
services:
  xhs-automation:       # Node
  analytics-service:    # Python/FastAPI — port 8000
```

XHS scheduler calls `http://analytics-service:8000` internally. Not exposed publicly.

**Monthly ops process:**
1. Download Excel export from XHS Creator Studio → 笔记数据 → 导出数据
2. Drop file into shared volume at `xhs/performance_export.xlsx`
3. Trigger via dashboard: `POST /api/analytics/calibrate`
   - Calls `/analyze/xhs` → writes updated weights to `xhs/config.json`
   - Calls `/tune/xhs` per post type → archives current prompts → writes updated prompts to `prompts.json`
   - Dashboard shows diff of what changed + any rollbacks triggered

---

## 9. Resume / Interview Framing

**"How did you use Python in these projects?"**

> I built a Python analytics service that the XHS automation pipeline calls monthly to calibrate its content strategy. It reads our cumulative performance export from XHS Creator Studio — views, saves, CTR per post — joins it against our post archive to tag each row by post type, then computes a composite score and normalizes it into content generation weights. The scheduler reads those weights to determine the post type rotation going forward. It also calls a prompt tuning endpoint that sends our top-performing posts per type to Claude along with the current prompt — Claude returns an updated prompt, we archive the old one, and if next month's performance is worse we auto-rollback. The whole thing runs without manual intervention. FastAPI exposes the endpoints, pandas handles Excel ingestion and aggregation. Python for analysis, Node for execution — same separation you'd see in quant research infrastructure.

**One-liner for resume:** Self-adjusting content pipeline — monthly performance export drives automatic rotation weight updates and prompt tuning, with rollback if metrics regress.

---

## 10. Implementation Notes

- Build this after the core Rakuten and XHS pipelines are working — it's an enhancement layer, not a dependency
- Start with hardcoded weights in the Node pipelines; swap in the analytics service call once it's built
- The scoring formulas are simple enough to implement and explain — complexity is in the data pipeline design, not the math
- Pydantic models for request/response validation (consistent with Investment Simulator FastAPI patterns)
