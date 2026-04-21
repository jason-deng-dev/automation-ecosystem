# Automation Ecosystem — Build Roadmap

---

## ⚠ Resume Mismatch — Fix Before Applying

`pgvector` and `OpenAI Embeddings API` are in the resume skills but RAG was cut. Either:
- Add RAG back (Phase 2 of analytics service), or
- Remove both from the resume

`GitHub Actions CI/CD` is on the resume — must be built as part of Docker + deploy step.

---

## C++ Prerequisites

| Need | Source |
|---|---|
| `std::vector<double>`, loops, pointer arithmetic (`data[i*3+0]`) | LearnCpp ch17 (17.9 is the key lesson) |
| `std::async` + `std::future` | `<future>` header docs — 2hr read |
| Gaussian elimination, Cholesky | Eigen library — learn when you get there |
| pybind11 buffer protocol | pybind11 "First steps" + "Buffer protocol" docs |

---

## ⚠ Must Ship Before Quant Work

**Dashboard:**
- [ ] Rakuten home card
- [ ] XHS detail page (schedule management, run history, live log stream, manual trigger, re-auth)
- [ ] Scraper detail page (run history, failed URLs, manual trigger)
- [ ] Rakuten detail page (catalog stats, pricing config editor, sync trigger, run log)
- [ ] Docker + deploy — Dockerfile, docker-compose, PM2 + NGINX, Lightsail, GitHub Actions CI/CD

**XHS:**
- [ ] `scripts/run-manualPost.js` + `scripts/run-preview.js`
- [ ] `xhs-login.js` headless mode — QR screenshot stream via SSE

**Rakuten:**
- [ ] CSS for `.product-specs` table on WordPress

---

## Phase 1 — Platform (Resume Items)

These are already on the resume — must ship.

### BullMQ Job Queue
**On resume:** "producer–consumer job system with BullMQ, cutting customer-facing response latency from seconds to sub-second"

- BullMQ worker per pipeline service (`src/worker.ts`)
- Dashboard enqueues via BullMQ client
- Bull Board at `/admin/queues`
- Named queues: `xhs-posts`, `rakuten-sync`, `scraper-run`
- 3 retry attempts, exponential backoff

### Python Analytics Service
**On resume:** "Reduced analytics latency 3× (360ms → 120ms) via asyncio.gather() in FastAPI"

- Python + FastAPI (`services/analytics/`)
- Ingest XHS Excel export → match to `xhs_post_archive` → write views/saves/CTR
- Endpoints: content weight trends, token usage over time, post type performance breakdown
- `asyncio.gather()` on all independent DB queries (this is where the 3× latency win lives)

---

## Phase 2 — Quant Improvements

### Q1 — `asyncio.gather()` (Analytics Service)
**Resume bullet:** "Reduced analytics latency 3× via asyncio.gather()"
**Interview:** "`asyncio.gather()` and `std::async` share the same design — independent tasks launched concurrently, results collected via join."

```python
post_type_dist, token_usage, success_rate = await asyncio.gather(
    get_post_type_distribution(db),
    get_token_usage_30d(db),
    get_success_rate_30d(db),
)
```
- Measure stats endpoint before/after: `[ ] ms` → `[ ] ms` (`[ ]x`)

---

### Q2 — `p-limit` Semaphore (Rakuten)
**Resume bullet:** "semaphore-bounded concurrency, cutting throughput from 22s → 8s"
**Interview:** "`p-limit` is a semaphore — same primitive as `std::counting_semaphore<N>`. Unbounded `Promise.all` blew the rate limit; sequential wasted throughput; bounded semaphore is the correct answer."

```js
const limit = pLimit(3);
const results = await Promise.all(
  genreIds.map(genreId => limit(async () => {
    await sleep(1000 / 3);
    return getProductsByRankingGenre(genreId, count);
  }))
);
```
- `npm install p-limit` in `services/rakuten/`
- Measure genre sync before/after: `[ ] s` → `[ ] s` (`[ ]x`)

---

### Q3 — BullMQ Worker Pool (Rakuten Product Ingestion)
**Resume bullet:** "producer–consumer job system with BullMQ, cutting customer-facing response latency from seconds to sub-second"
**Interview:** "Producer-consumer — same pattern as a market data handler feeding concurrent strategy workers. Just at a higher abstraction level."

- `src/queues/productQueue.ts` + `src/workers/productWorker.ts`
- `concurrency: 3`, `attempts: 3`, exponential backoff
- Dead-letter queue for exhausted retries
- `GET /api/request-status/:requestId` — customer polls for completion
- Measure: inline response `[ ] s` → queued response `[ ] ms`

---

### Q4 — pybind11 C++ Scoring Core
**Resume bullet:** "integrated a C++ scoring engine via pybind11 for compute-intensive workloads"
**Skills added:** C++ (Languages), pybind11 + CMake (Frameworks/Tools)
**Interview:** "Python orchestrates — data ingestion, API surface. C++ owns the scoring math — no GIL, no interpreter overhead. Same split as quant research infra: Python research environment calling into a C++ computation engine."

```cpp
std::vector<double> compute_scores(
    const py::array_t<double>& metric_matrix,
    const py::array_t<double>& weights
) {
    auto buf = metric_matrix.request();
    double* data = static_cast<double*>(buf.ptr);
    std::vector<double> scores(buf.shape[0]);
    for (ssize_t i = 0; i < buf.shape[0]; i++) {
        scores[i] = weights.at(0) * data[i*3+0]
                  + weights.at(1) * data[i*3+1]
                  + weights.at(2) * data[i*3+2];
    }
    return scores;
}
PYBIND11_MODULE(xhs_analytics_core, m) {
    m.def("compute_scores", &compute_scores);
}
```

- `CMakeLists.txt`: `pybind11_add_module(xhs_analytics_core scoring_core.cpp)`
- Compile inside Docker — `.so` is OS/arch specific
- Benchmark N=100,000 synthetic matrix: Python `[ ] ms` vs C++ `[ ] ms` (`[ ]x`)
- Gate: `hello_world.cpp` must compile and be callable before writing scoring core

---

### Q5 — Time-Decay + Cosine Similarity (pybind11 extension)
**Resume bullet:** "time-decay weighting" (in Monte Carlo bullet)
**Interview:** "Same model as alpha decay — `e^(-λt)`. Recent observations carry more information than stale ones."

```cpp
double time_decay_score(double raw_score, double days_ago, double lambda = 0.05) {
    return raw_score * std::exp(-lambda * days_ago);
}
double cosine_similarity(const py::array_t<double>& a, const py::array_t<double>& b) {
    // dot(a, b) / (||a|| * ||b||)
}
```
- Extends existing `PYBIND11_MODULE` — no new build infra

---

### Q6 — Monte Carlo Content Optimizer (`std::async`)
**Resume bullet:** "Built a C++ Monte Carlo engine (std::async) scoring historical post performance with time-decay weighting"
**Interview:** "10,000 simulations parallelised with `std::async` across hardware threads — embarrassingly parallel, CPU-bound. Same structure as a backtesting engine: swap Dirichlet weight samples for GBM price paths, identical pattern."

```cpp
int n_threads = std::thread::hardware_concurrency();
std::vector<std::future<SimResult>> futures;
for (int t = 0; t < n_threads; ++t)
    futures.push_back(std::async(std::launch::async, run_simulation_chunk, data, chunk, seed[t]));
SimResult best;
for (auto& f : futures) { auto r = f.get(); if (r.expected_score > best.expected_score) best = r; }
```
- Build single-threaded first, verify against Python baseline, then add `std::async`
- Benchmark N=10,000 on VPS: Python `[ ] ms` → C++ `[ ] ms` (`[ ]x`)

---

### Q7 — EWMA Volatility (adds to resume)
**Adds to resume:** "EWMA volatility-adjusted content weighting — RiskMetrics σ² recurrence"
**Interview:** "Same recurrence as RiskMetrics: `σ²ₜ = λ(rₜ-μₜ)² + (1-λ)σ²ₜ₋₁`. Low-vol post types are reliable rotation pillars; high-vol types have higher ceiling but higher risk — same logic as risk-adjusted sizing."

```cpp
struct EWMAState { double mean; double variance; };
EWMAState ewma_update(EWMAState prev, double new_value, double lambda) {
    double mean = lambda * new_value + (1.0 - lambda) * prev.mean;
    double variance = lambda * std::pow(new_value - mean, 2.0) + (1.0 - lambda) * prev.variance;
    return { mean, variance };
}
```
- Extends `scoring_core.cpp` — no new build infra
- Validate: stable post type has low σ, variable post type has high σ

---

### Q8 — OLS Feature Attribution (adds to resume)
**Adds to resume:** "OLS factor attribution — normal equation solver in C++, Fama-French analogy"
**Interview:** "Which factors explain returns? Fama-French runs OLS with market/size/value as X. This runs OLS with post_type/word_count/time_of_day. Same matrix operation: β = (X'X)⁻¹X'y. At N=115 the coefficients are directional — I document the sample size caveat. Same limitation applies to any factor model with short history."

```
X = [post_type_0..N, word_count, time_of_day, has_image]
y = engagement_score
β = (X'X)⁻¹ X'y   ← Gaussian elimination in C++
```
- Python builds design matrix, C++ solves normal equations
- Unit test on synthetic data with known β before running on real archive
- Document in output: "N=[ ] — interpret directionally"

---

### Q9 — Markowitz Mean-Variance Optimizer (adds to resume)
**Adds to resume:** "Markowitz mean-variance content optimizer — Cholesky covariance inversion, efficient frontier"
**Interview:** "Literally Markowitz — each post type is an asset with mean return and variance. C++ computes the covariance matrix and solves for optimal weights via Cholesky. The efficient frontier shows risk/return tradeoff across risk-aversion levels. Different domain, identical math — interviewers recognize it immediately."

```
μ = mean engagement per post type
Σ = covariance matrix
w* = (1/λ) Σ⁻¹μ, normalized to sum to 1
```
- Build order: compute μ and Σ in Python (verify vs numpy) → port to C++ → validate weights match
- Efficient frontier: iterate λ over [0.1…10], collect (E[engagement], σ) pairs
- Document: "N=[ ] — interpret directionally"

---

## Build Order

**Gate:** ship must-ship platform work first.

**Phase 1:**
1. BullMQ job queue (platform)
2. Python Analytics Service — Phase 1 ingestion (platform)
3. Docker + deploy + GitHub Actions (platform)

**Phase 2 — Tier 1 (ship these, get numbers):**
1. Q2 — `p-limit` semaphore (2 hrs)
2. Q1 — `asyncio.gather()` (2–4 hrs)
3. Q3 — BullMQ worker pool / Rakuten (1–2 days)
4. Q4 — pybind11 C++ scoring core (1 day — `hello_world.cpp` gate first)

**Phase 2 — Tier 2:**
5. Q5 — Time-decay + cosine similarity (2–4 hrs)
6. Q6 — Monte Carlo `std::async` (1–2 days)

**Phase 2 — Tier 3 (adds to resume):**
7. Q7 — EWMA (2–4 hrs)
8. Q8 — OLS (1 day)
9. Q9 — Markowitz (1–2 days)

---

## Measurement Checklist

| Item | Before | After | Speedup |
|---|---|---|---|
| Q1 asyncio.gather — stats endpoint | `[ ] ms` | `[ ] ms` | `[ ]x` |
| Q2 p-limit — genre sync | `[ ] s` | `[ ] s` | `[ ]x` |
| Q3 BullMQ — customer response | `[ ] s` | `[ ] ms` | — |
| Q4 pybind11 — N=100k matrix | `[ ] ms` | `[ ] ms` | `[ ]x` |
| Q6 Monte Carlo — N=10k | `[ ] ms` | `[ ] ms` | `[ ]x` |

Run each benchmark 3+ times. Measure on VPS, not localhost. Add numbers to resume same day.
