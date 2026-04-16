# Quant Dev Concurrency Improvements

> Targeted upgrades to the automation ecosystem that demonstrate concurrency and parallelism
> concepts directly relevant to quant developer interviews. Each improvement maps to a specific
> pattern from the quant dev study plan — building the mental model in Node.js/Python before
> hitting the C++ memory model.

---

## C++ Prerequisites — What to Learn Before Each Tier

Currently on LearnCpp ch12. Chapters 13–17 cover the gap — structs, `std::vector`, fixed arrays.
That's the foundation for passing and operating on double arrays in C++. Everything in tiers 4, 5,
and 7 is just loops over vectors.

| Tier | What you actually need | Source |
|---|---|---|
| 4, 5, 7 | `std::vector<double>`, loops, `<cmath>` | LearnCpp ch17 sufficient |
| 6 | `std::async` + `std::future` | Docs only — 2hr read, not the full Williams book |
| 8, 9 | Gaussian elimination, Cholesky | Eigen library — learn when you get there |

**pybind11** is completely separate from LearnCpp — it's its own thing. Learn it when you start
building. Key concepts: `py::array_t<double>`, buffer protocol, releasing the GIL. The docs are good.

**Should you start the Williams concurrency book now?** No. The master plan correctly puts Williams
in Phase 2. For `std::async` over 10k simulations you just need the `<future>` header — it's
self-contained. Don't front-load the book for one function.

**Actual build-order:**

1. Finish LearnCpp through ch17 (5 chapters — close)
2. Learn pybind11 basics alongside or right after
3. Build tiers 4 → 5 → 7 first (pure array math, no concurrency, no Eigen)
4. Add `std::async` for tier 6 using docs
5. Pull in Eigen for tiers 8–9

Eigen makes tier 9 (Markowitz/Cholesky) almost trivial — it's one function call once the matrix
is set up. Don't let tiers 8–9 intimidate you into reading books prematurely.

---

## ⚠ Core Platform Work — Must Ship First

All improvements in this doc are enhancement layer. Do not start any of them until the
following core items are complete:

**Dashboard (largest open chunk):**
- [ ] Rakuten home card (catalog size, WC live count, last activity, error indicator)
- [ ] XHS detail page — schedule management, run history, post archive viewer, live log stream, manual trigger / preview / re-auth
- [ ] Scraper detail page — run history table, failed URLs, races viewer, manual trigger
- [ ] Rakuten detail page — catalog stats, import log, pricing config editor, sync trigger, run log
- [ ] Docker + deploy — Dockerfile, docker-compose, PM2 + NGINX, Lightsail provisioning

**XHS (two items):**
- [ ] `scripts/run-manualPost.js` + `scripts/run-preview.js` — prerequisite for dashboard triggers
- [ ] `xhs-login.js` headless mode — QR screenshot stream via SSE for dashboard re-auth flow

**Rakuten (one item):**
- [ ] CSS for `.product-specs` table on WordPress (2-col, bordered, `th` background)

Once these ship: start quant improvements in build order below.

---

## Why These Four

Concurrency is Track 3 in the quant dev plan (*C++ Concurrency in Action*). The core patterns —
task-based concurrency, semaphores, and producer-consumer queues — are language-agnostic. Building
them in Node.js and Python now does two things:

1. Closes the gap in the current resume (no concurrency signal from the work projects)
2. Internalises the concepts before they appear in a harder form in C++ — `asyncio.gather()` and
   `std::async` are the same pattern; `p-limit` and a semaphore are the same primitive

The honest framing for improvements 1-3: these are async concurrency patterns, not OS-level
multithreading. Node.js runs on a single thread with an event loop. Python has the GIL.
Improvement 4 (pybind11 C++ scoring core) is the exception — C++ owns the hot path with no GIL,
no interpreter overhead, true native execution. That distinction is worth knowing cold for
interviews — interviewers respect candidates who understand the difference and choose the right
tool for each layer.

---

## 1 — `asyncio.gather()` in the FastAPI Analytics Service

### What

Replace sequential `await` chains in the Python analytics service with `asyncio.gather()` for
concurrent metric computation and database queries.

**Before (sequential):**
```python
post_type_dist = await get_post_type_distribution(db)
token_usage    = await get_token_usage_30d(db)
success_rate   = await get_success_rate_30d(db)
# Each waits for the previous — total latency = sum of all three
```

**After (concurrent):**
```python
post_type_dist, token_usage, success_rate = await asyncio.gather(
    get_post_type_distribution(db),
    get_token_usage_30d(db),
    get_success_rate_30d(db),
)
# All three fire simultaneously — total latency = slowest of the three
```

### Implementation

- FastAPI endpoints are already `async def` — no framework changes needed
- Import `asyncio` from stdlib — no new dependencies
- Wrap independent coroutines in `asyncio.gather()` wherever results don't depend on each other
- Error handling: use `asyncio.gather(*coros, return_exceptions=True)` to catch per-task failures
  without cancelling the whole gather

**Where to apply:**
- Dashboard stats endpoint: post type distribution + token usage + success rate → all independent,
  all read from the same DB
- XHS performance backfill: embed multiple archive rows in parallel when performance data is
  ingested from the XHS export

### Why It Matters for Quant Dev

`asyncio.gather()` is the Python equivalent of `std::async` with futures — the same
task-based concurrency model the backtesting engine uses for Monte Carlo parallelization:

```python
# Python asyncio.gather
results = await asyncio.gather(task_a(), task_b(), task_c())

# C++ equivalent (backtesting engine Monte Carlo)
vector<future<double>> futures;
for each scenario: futures.push_back(std::async(run_scenario, seed[i]));
for each future: results.push_back(f.get());
```

Same pattern: fire N independent tasks, collect results when all complete. Understanding it in
Python makes the C++ version click faster — and gives you a concrete example from production work
when an interviewer asks about concurrency experience.

**Interview talking point:** "I implemented task-based concurrency in Python before hitting the
C++ memory model — `asyncio.gather()` and `std::async` share the same design: independent tasks
launched concurrently, results collected via a join. The C++ version adds the complexity of the
memory model and explicit future types."

### Resume Signal

- "Concurrent async analytics service using `asyncio.gather()` for parallel metric computation"
- FastAPI + Python signal closes the language gap for AI/quant engineering roles
- Demonstrates you understand *when* to parallelize (independent I/O-bound queries) vs. when not
  to (dependent operations, shared mutable state)

---

## 2 — Semaphore-Bounded Concurrent Fetching in Rakuten (`p-limit`)

### What

The Rakuten weekly sync currently fetches genre rankings sequentially with a 1-second delay between
calls (Rakuten's rate limit: 1 req/sec). The design doc (§8.5) documents switching from
`Promise.all` (fully concurrent, caused rate limit errors) to a sequential `for` loop. The right
solution is in between: controlled concurrency via a semaphore.

**Before (sequential, slow):**
```js
for (const genreId of genreIds) {
  const products = await getProductsByRankingGenre(genreId, count);
  await sleep(1000); // 1 req/sec — 20 genres = 20+ seconds
}
```

**After (bounded concurrent, fast):**
```js
import pLimit from 'p-limit';

const limit = pLimit(3); // max 3 concurrent requests

const results = await Promise.all(
  genreIds.map(genreId =>
    limit(async () => {
      await sleep(1000 / 3); // distribute load across concurrent slots
      return getProductsByRankingGenre(genreId, count);
    })
  )
);
// 20 genres at concurrency 3 ≈ 7 seconds instead of 20+
```

### Implementation

- `npm install p-limit` in `services/rakuten/`
- Wrap the genre fetch loop in `Promise.all` with `p-limit(3)` as the concurrency gate
- Keep the per-request delay but scale it: `sleep(1000 / concurrency)` distributes load across
  concurrent slots while staying within the 1 req/sec limit
- Log start and end timestamp per batch — measure the actual speedup

### The Semaphore Primitive

`p-limit` is a semaphore: a counter that limits how many operations can run simultaneously. When
a slot is taken, new tasks queue behind it. When a task completes, it releases its slot and the
next queued task runs. This is the same primitive as `std::counting_semaphore<N>` in C++20 —
different syntax, identical concept.

```
slots: [taken] [taken] [taken]   ← 3 concurrent requests in-flight
queue: [waiting] [waiting] ...   ← remaining genres queued

slot released → next genre starts immediately
```

The core insight is that semaphores are the general solution to rate-limited concurrent I/O:
fully sequential wastes throughput, fully concurrent blows the rate limit, bounded concurrency
via semaphore is the production pattern.

### Why It Matters for Quant Dev

Semaphores are a core concurrent data structure — covered explicitly in *C++ Concurrency in Action*
and in the HFT context (SeqLock and SPMC queue both rely on atomic counters, which are semaphores
at a lower level). Understanding the concept in a practical context (Rakuten rate limiting) builds
the intuition before hitting the formal definition.

This also connects to a real tradeoff the design doc already captures: the switch from
`Promise.all` to sequential was the right emergency fix but left throughput on the table. Adding
`p-limit` is the correct engineering answer — not "avoid concurrency," but "control it."

**Interview talking point:** "The scraper design doc documents a concurrency bug — `Promise.all`
caused DeepL rate limit errors, so we fell back to sequential. I then introduced a semaphore via
`p-limit` to get controlled concurrency: bounded to 3 concurrent requests, stays within the rate
limit, ~3x faster than sequential. Same primitive as `std::counting_semaphore` in C++."

### Resume Signal

- "Semaphore-bounded concurrent API fetching — controlled parallelism respecting third-party rate
  limits, 3x throughput improvement over sequential"
- Demonstrates you understand concurrency bugs (unbounded `Promise.all`) and the correct fix
  (bounded semaphore), not just "I made it async"
- Directly maps to system design: rate limiting + concurrency control is a standard fintech topic

---

## 3 — BullMQ Worker Pool for Product Ingestion (Rakuten)

### What

The Rakuten product request flow currently runs inline: a customer submits a keyword, the Express
handler awaits the full Rakuten fetch → normalize → price → WooCommerce push chain (~1-2 minutes)
before responding. No retry, no visibility, no backpressure. Replace with a BullMQ job queue:
the handler enqueues a job and returns immediately; a concurrent worker pool processes jobs.

**Before (inline, blocking):**
```
POST /api/request-product
  → await rakuten.search(keyword)     // ~5s
  → await normalize(products)         // sync
  → await price(products)             // sync
  → await woocommerce.push(products)  // ~60s (image sideloading bottleneck)
  → return { productIds }             // customer waited 90+ seconds
```

**After (queued, concurrent workers):**
```
POST /api/request-product
  → queue.add('product-request', { keyword, requestId })
  → return { requestId, status: 'queued' }   // immediate

Worker pool (3 concurrent workers):
  → job dequeued
  → rakuten.search → normalize → price → woocommerce.push
  → job.updateProgress(productIds)
  → customer polls GET /api/request-status/:requestId
```

### Implementation

- `npm install bullmq ioredis` in `services/rakuten/` (Redis already running for rate limiting)
- `src/queues/productQueue.ts` — queue definition, named `product-ingestion`
- `src/workers/productWorker.ts` — worker process, `concurrency: 3`
- Configure per-job: `attempts: 3`, `backoff: { type: 'exponential', delay: 5000 }`
- Dead-letter queue (`failed` queue) for jobs that exhaust retries — visible in Bull Board
- `GET /api/request-status/:requestId` endpoint — customer polls for completion + product IDs
- Bull Board UI embedded in dashboard at `/admin/queues` — visual queue inspector

**Concurrency model:**
```
Producer (Express handler): enqueue job → return requestId
Queue (Redis-backed):       persist job, track state
Workers (3 concurrent):     pull jobs, execute pipeline, report results
Consumer (customer):        poll status endpoint until job completes
```

### Why It Matters for Quant Dev

The producer-consumer pattern with a bounded worker pool is one of the core concurrent system
designs. It appears in every trading system: market data handlers produce events, strategy workers
consume them. The BullMQ implementation here is the same pattern at a higher level of abstraction
— queue, workers, concurrency limit, retry policy.

The specific concepts this demonstrates:

| Concept | BullMQ Implementation | C++ Equivalent |
|---|---|---|
| Producer-consumer | Express handler → queue → worker | Lock-free SPMC queue |
| Bounded worker pool | `concurrency: 3` | Thread pool with fixed thread count |
| Backpressure | Queue depth limits, job rate | Ring buffer overflow handling |
| Retry with backoff | `attempts: 3, backoff: exponential` | `axios-retry` pattern at a lower level |
| Dead-letter queue | BullMQ `failed` queue | Separate error queue in HFT systems |

The Redis-backed persistence is also relevant: jobs survive container restarts. In-memory queues
lose state on crash. This is the same argument for why SPMC queues in HFT use shared memory
rather than process-local ring buffers.

**Interview talking point:** "I replaced a blocking inline handler with a Redis-backed job queue
using BullMQ. Three concurrent workers process jobs, each with exponential backoff retry. The
customer gets an immediate response with a request ID and polls for completion. This is the
producer-consumer pattern — same design as a market data handler feeding concurrent strategy
workers, just at a higher abstraction level."

### Resume Signal

- "Redis-backed concurrent job queue (BullMQ) with worker pool for async product ingestion —
  producer-consumer pattern, exponential backoff retry, dead-letter handling"
- Redis is already in the stack (rate limiting) — demonstrates you reuse infrastructure correctly
- Job queue design is a standard fintech system design interview topic
- Bull Board shows you care about operational visibility, not just implementation

---

## 4 — C++ Scoring Core via pybind11 (Analytics Service)

### What

The analytics service computes composite performance scores across XHS post metrics — views, saves,
CTR — grouped by post type, with undersampling correction and softmax normalization. Phase 1 ships
this in Python/numpy. The scoring logic is isolated in `analytics/scoring.py` from day one so C++
drops in without touching any endpoint or pipeline code.

**Phase 1 — Python/numpy (ships now):**
```python
# analytics/scoring.py
def compute_scores(metric_matrix: np.ndarray, weights: list[float]) -> np.ndarray:
    return (weights[0] * metric_matrix[:, 0]   # views
          + weights[1] * metric_matrix[:, 1]   # saves
          + weights[2] * metric_matrix[:, 2])  # CTR
```

**Phase 2 — C++ drop-in (same interface, no endpoint changes):**
```python
import xhs_analytics_core  # compiled pybind11 .so

def compute_scores(metric_matrix: np.ndarray, weights: list[float]) -> np.ndarray:
    return xhs_analytics_core.compute_scores(metric_matrix, weights)
```

**C++ implementation (`analytics/scoring_core.cpp`):**
```cpp
std::vector<double> compute_scores(
    const py::array_t<double>& metric_matrix,  // [n_posts x 3]
    const py::array_t<double>& weights
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

PYBIND11_MODULE(xhs_analytics_core, m) {
    m.def("compute_scores", &compute_scores);
    m.def("normalize_weights", &normalize_weights);
    m.def("cosine_similarity", &cosine_similarity);  // Phase 2 — semantic dedup
}
```

### Implementation

- `analytics/scoring_core.cpp` — C++ scoring functions
- `analytics/CMakeLists.txt` — build config (`pybind11_add_module(xhs_analytics_core scoring_core.cpp)`)
- `Dockerfile` — compile `.so` at image build time (`RUN cmake .. && make`)
- `analytics/scoring.py` — interface unchanged; swap one import line to activate C++
- **Key gotcha:** `.so` is compiled for a specific OS/architecture — must compile inside Docker,
  not on Mac locally

### Why It Matters for Quant Dev

This is the pattern quant research infrastructure is built on:

| Layer | Quant firm | This service |
|---|---|---|
| Orchestration | Python research environment | FastAPI (Python) |
| Data wrangling | pandas / numpy | pandas / numpy |
| Hot-path computation | C++ pricing/risk engine | C++ scoring core (pybind11) |
| Execution | Trading system | XHS pipeline (Node) |

Python owns data ingestion, API surface, and orchestration. C++ owns the numerical computation —
no GIL, no interpreter overhead, tight loops over double arrays. This is exactly what a quant
interviewer means when they ask "how does Python call into your C++ layer?"

The interface isolation is also signal: the scoring interface is defined before C++ is written,
so swapping in the C++ implementation requires no refactoring. That's engineering discipline —
design the seam first, implement behind it.

**Interview talking point:** "The analytics service follows the same Python/C++ split you'd see
in quant research infrastructure. Python orchestrates: it reads the Excel export, joins against
the post archive, handles the API surface. C++ owns the scoring math — weighted sums and
normalization across thousands of double-precision rows, no GIL contention, no interpreter
overhead. The interface is isolated in `scoring.py` so the C++ module is a drop-in — no endpoint
changes, no pipeline changes. Same pattern: Python research environment calling into a C++
computation engine."

### Resume Signal

- C++ in Languages — from work experience, not just planned projects
- pybind11 in Frameworks — the Python/C++ bridge used in production quant infra
- "C++ hot-path computation (no GIL)" — accurate and defensible
- The two-layer architecture story maps directly to quant firm infrastructure

### Benchmark Note

At current archive size (~115 posts), both Python and C++ complete in milliseconds — not because
C++ is slow, but because the dataset is too small to stress either. To produce a real benchmark:
generate a synthetic matrix of N=100,000 rows (simulating a full archive scale), run both
implementations, and record the speedup. The improvement is real; the sample size just needs to
match what the benchmark is measuring. Generate the synthetic data with numpy, feed it to both
`compute_scores` paths, time with `timeit`, report the ratio.

---

## 5 — Extend pybind11 Module: Time-Decay Scoring + Cosine Similarity

### What

Two natural extensions to `scoring_core.cpp` that deepen the C++ investment without new build
infrastructure. Both drop into the existing `PYBIND11_MODULE` block already scaffolded in
improvement 4.

**Time-decay scoring** — weight recent posts higher than older ones using exponential decay:

```cpp
// score * e^(-λ * days_ago)
// λ controls how fast old posts lose weight — same concept as alpha decay in quant signals
double time_decay_score(double raw_score, double days_ago, double lambda = 0.05) {
    return raw_score * std::exp(-lambda * days_ago);
}

std::vector<double> compute_decayed_scores(
    const py::array_t<double>& metric_matrix,
    const py::array_t<double>& weights,
    const py::array_t<double>& days_ago,
    double lambda
) {
    // weighted score per post * time-decay factor
}
```

**Cosine similarity for semantic dedup** — before publishing, check if new post content is too
similar to recent posts. Python feeds string vectors (TF-IDF computed in Python), C++ owns the
dot product:

```cpp
double cosine_similarity(
    const py::array_t<double>& vec_a,
    const py::array_t<double>& vec_b
) {
    // dot(a, b) / (||a|| * ||b||)
    // pure float array ops — no Python overhead on the inner loop
}
```

### Why Time-Decay Maps to Quant Dev

Alpha decay is one of the most common quant interview topics: "how do you handle signal staleness?"
The answer is exponential decay — the same `e^(-λt)` used here. Building it in a production
context (your own post archive, real timestamps) gives you a concrete example before hitting it in
a formal quant context.

**Interview talking point:** "The XHS scoring core applies exponential time-decay to engagement
signals — posts from 60 days ago get down-weighted by `e^(-λ*60)`. Same model as alpha decay:
the signal is real, but recent observations carry more information than stale ones."

### Why Cosine Similarity Matters

Semantic deduplication is the practical problem; cosine similarity is the primitive. It appears
in quant contexts as portfolio correlation, factor overlap detection, and signal clustering. The
implementation is identical: normalize vectors, dot product. Building it in C++ via pybind11
demonstrates you can move the numerical inner loop out of Python when it matters.

### Resume Signal

- Extends "C++ hot-path computation" with a second defensible function: time-decay + cosine
  similarity
- Time-decay maps directly to alpha signal decay — an interview talking point with domain depth
- Cosine similarity is a general primitive: posts today, factor vectors tomorrow

---

## 6 — Monte Carlo Content Optimizer (`std::async`)

### What

A C++ module that runs N=10,000 Monte Carlo simulations of "what content weight mix maximizes
expected engagement?" given historical post performance from `xhs_post_archive`. Python feeds
the historical data; C++ owns the simulation loop.

**Python side (interface unchanged):**
```python
import xhs_analytics_core

# historical: array of (post_type_id, engagement_score) from xhs_post_archive
# n_simulations: default 10_000
result = xhs_analytics_core.monte_carlo_optimize(historical, n_simulations=10_000)
# returns: {"weights": [0.4, 0.35, 0.25], "expected_score": 0.82, "ci_95": [0.76, 0.89]}
```

**C++ implementation:**
```cpp
struct SimResult { std::vector<double> weights; double expected_score; };

SimResult monte_carlo_optimize(
    const py::array_t<double>& historical,
    int n_simulations
) {
    // Sample weight vectors from Dirichlet distribution
    // Score each against historical engagement distributions
    // Track best weight set + confidence interval

    // Parallelise with std::async — embarrassingly parallel
    int n_threads = std::thread::hardware_concurrency();
    int chunk = n_simulations / n_threads;

    std::vector<std::future<SimResult>> futures;
    for (int t = 0; t < n_threads; ++t) {
        futures.push_back(std::async(std::launch::async,
            run_simulation_chunk, historical_data, chunk, seed[t]));
    }

    // Collect results
    SimResult best;
    for (auto& f : futures) {
        auto result = f.get();
        if (result.expected_score > best.expected_score) best = result;
    }
    return best;
}
```

### Why This Has a Measurable Speedup

Monte Carlo is CPU-bound and embarrassingly parallel — the ideal workload for `std::async`. At
N=10,000 simulations, the single-threaded Python baseline will be measurably slower than the
multithreaded C++ version. This is the benchmark the scoring core couldn't produce: a real
before/after number from the work project.

On a 4-core VPS:
- Python single-threaded: `[ ] ms`
- C++ 4 threads (`std::async`): `[ ] ms`
- Speedup: `[ ]x`

### Why It Matters for Quant Dev

This is the direct bridge to the backtesting engine Monte Carlo already in the quant plan:

| This module | Backtesting engine |
|---|---|
| Simulate weight vectors → score against historical engagement | Simulate price paths → score against historical returns |
| Dirichlet-sampled weights | GBM-sampled paths |
| `std::async` over N=10k simulations | `std::async` over N=100k scenarios |
| Best weight set + CI | Sharpe / drawdown across scenarios |

Same structure. Same parallelism pattern. Different domain. Building this here means the
backtesting engine is a domain substitution, not a new concept.

**Interview talking point:** "I built a Monte Carlo optimizer in C++ for the content pipeline —
10,000 simulations of content weight mixes, parallelised with `std::async` across hardware
threads. Same pattern as a backtesting engine running scenario simulations: embarrassingly
parallel workload, CPU-bound, measurable speedup over Python. The backtesting version swaps
Dirichlet weight samples for GBM price paths — the structure is identical."

### Resume Signal

- "`std::async`-parallelised Monte Carlo optimizer — `[ ]x` speedup over Python baseline at
  10k simulations"
- Real benchmark number from a work project (not a toy)
- Direct conceptual bridge to backtesting infrastructure — defensible in depth

---

## 7 — EWMA Rolling Statistics: Engagement Volatility (`scoring_core.cpp`)

### What

Exponentially weighted moving average over engagement scores per post type — outputs a rolling
mean and rolling volatility as new posts accumulate in the archive.

```cpp
struct EWMAState { double mean; double variance; };

// Single-pass streaming update — call once per new data point
EWMAState ewma_update(EWMAState prev, double new_value, double lambda) {
    double mean     = lambda * new_value + (1.0 - lambda) * prev.mean;
    double variance = lambda * std::pow(new_value - mean, 2.0)
                    + (1.0 - lambda) * prev.variance;
    return { mean, variance };
}

// Batch: process full archive, return final EWMA state per post type
std::vector<EWMAState> compute_ewma_series(
    const py::array_t<double>& scores,   // [n_posts] — chronological order
    const py::array_t<int>&    types,    // [n_posts] — post type ID per row
    double lambda,
    int    n_types
);
```

Python calls this with the full archive sorted by timestamp. C++ returns `(mean, variance)` per
post type — Python reads `sqrt(variance)` as the volatility figure.

### New Insight

Current calibration weights purely on average score. EWMA adds a second dimension: stability.

- Low-vol type: consistent performers — reliable rotation pillar
- High-vol type: high ceiling but risky — good for opportunistic use, bad to over-rotate into

A race_guide post that averages 80 engagement with σ=5 is more predictable than a
training_science post that averages 85 with σ=40. Current system would weight training_science
higher. EWMA-aware weighting would temper it.

### Quant Analogy

This is **RiskMetrics EWMA volatility** — the exact same recurrence relation used in the
industry-standard risk model for estimating time-varying volatility:

```
σ²ₜ = λ * (rₜ - μₜ)² + (1-λ) * σ²ₜ₋₁
```

Same formula, different domain. Returns series become engagement scores. The λ parameter has the
same meaning: higher λ = more weight on recent observations = faster adaptation.

**Interview talking point:** "I implemented EWMA volatility estimation on content engagement
time series — same recurrence relation as the RiskMetrics model. λ controls the decay rate:
higher λ adapts faster to regime changes. Low-vol post types are reliable rotation pillars;
high-vol types have higher ceiling but higher risk. The calibration weights both mean
performance and volatility — same logic as risk-adjusted sizing."

### Resume Signal

- "EWMA volatility-adjusted content weighting — post types scored on mean and stability, same
  recurrence as RiskMetrics σ² estimation"
- Demonstrates you know EWMA *and why it works*, not just the formula
- Natural extension of time-decay (§5) — same λ parameter, deepens an existing investment

---

## 8 — OLS Feature Attribution (`scoring_core.cpp`)

### What

Ordinary least squares regression to identify which post features drive engagement — the
factor attribution model applied to content.

```
X = [post_type_0, post_type_1, ..., word_count, time_of_day, has_image]   ← design matrix
y = engagement_score                                                         ← target
β = (X'X)⁻¹ X'y                                                             ← coefficients
```

C++ handles the matrix inversion (Gaussian elimination on a small matrix — no library needed
at this feature count). Python builds the design matrix from the post archive, feeds it as a
numpy array, gets back coefficients.

```cpp
std::vector<double> ols_fit(
    const py::array_t<double>& X,   // [n_posts x n_features] — design matrix
    const py::array_t<double>& y    // [n_posts] — engagement scores
) {
    // β = (X'X)⁻¹ X'y
    // Gaussian elimination on the (n_features x n_features) normal equations
    // n_features is small (~8) — no numerical stability issues at this size
}
```

### What It Tells You

Current calibration: "race_guide posts score 82 on average — weight them higher."
OLS attribution: "post type accounts for 38% of variance; word_count coefficient = 0.14 (each
additional 100 words → +14 engagement); posting at 8–10am adds +22 vs. afternoon."

That's actionable — you optimize inputs, not just observe outputs.

### Sample Size Caveat

At current archive size (~115 posts), OLS with one-hot post types (5 categories) plus
continuous features yields ~20 rows per type. Coefficients will have wide confidence intervals.
**Do not over-interpret individual coefficients at this scale.** The value now is:

1. The implementation is correct and tested — results become reliable as archive grows
2. The *method* is the interview talking point, not the specific numbers
3. At 8,760 posts/year (1 post/hour target), OLS becomes genuinely powerful

Document the sample size limitation explicitly in the service output — "N=115, interpret with
caution" — so the limitation is visible and honest.

### Quant Analogy

**Factor model attribution** — the identical linear algebra. "Which factors explain returns?"
becomes "which features explain engagement?" Fama-French runs OLS with market/size/value as X;
this runs OLS with post_type/word_count/time_of_day as X. The matrix operation is identical.

**Interview talking point:** "I ran OLS feature attribution on post performance — same method
as factor exposure decomposition. The design matrix has one-hot post types plus continuous
features; C++ solves the normal equations via Gaussian elimination. At current sample size the
coefficients are directional, not precise, but the architecture is in place — at 8,760 posts/year
the estimates become reliable. Same limitation applies to any factor model with short history."

### Resume Signal

- "OLS feature attribution on content performance — factor model approach to identifying
  engagement drivers; C++ normal equation solver via Gaussian elimination"
- Quant-precise framing: you understand sample size limitations and state them — that's what
  a quant would do
- Extends `scoring_core.cpp` — no new build infra

---

## 9 — Markowitz Mean-Variance Optimizer (`scoring_core.cpp`)

### What

Instead of weighting post types purely on average score, treat the content mix as a portfolio:
each post type has an expected return (mean engagement) and risk (variance). The Markowitz
optimizer finds the allocation that maximizes expected engagement per unit of variance.

```
μ = [mean engagement per post type]          ← expected returns
Σ = covariance matrix of post type scores    ← risk / correlation structure
w* = (1/λ) * Σ⁻¹ * μ,  then normalize to sum to 1
```

Python feeds the historical engagement series per post type as a numpy matrix. C++ computes
the covariance matrix and inverts it via Cholesky decomposition, then solves for optimal weights.

```cpp
std::vector<double> markowitz_weights(
    const py::array_t<double>& returns_matrix,  // [n_posts x n_types] — engagement per post
    double risk_aversion                         // λ — higher = more conservative allocation
) {
    // 1. Compute μ (mean per column)
    // 2. Compute Σ (covariance matrix — n_types x n_types)
    // 3. Cholesky decompose Σ → solve Σw = μ
    // 4. Scale by 1/λ, normalize to sum to 1
    // Returns: optimal weight per post type
}
```

Output also includes the **efficient frontier** — a set of (expected_engagement,
engagement_volatility) pairs showing the risk/return tradeoff across different `λ` values.
Python iterates over a range of λ and calls C++ once per value; the set of outputs traces
the frontier.

### Why This Is Better Than Raw Score Weighting

Current calibration: weight = normalized average score. Problem: a high-average but
high-variance post type gets over-weighted — the scheduler over-rotates into it and hits the
bad days as often as the good ones.

Markowitz: weight = risk-adjusted allocation. A lower-variance type that's slightly less
profitable gets a larger allocation because it's more predictable. Same logic as preferring
a lower-Sharpe but lower-drawdown strategy in a portfolio.

### Quant Analogy

This is **literally Markowitz mean-variance optimization** — the foundational model of modern
portfolio theory. The math is identical:

| Portfolio | This service |
|---|---|
| Asset returns `rᵢ` | Post type engagement scores |
| Expected return `μ` | Mean engagement per type |
| Covariance matrix `Σ` | Engagement covariance across types |
| Optimal weights `w*` | Content allocation |
| Risk aversion `λ` | How much to penalize variance |
| Efficient frontier | Risk/return tradeoff across λ values |

The C++ implementation (Cholesky decomposition, matrix solve) is the same numerical method
used in risk systems to invert covariance matrices for portfolio optimization.

**Interview talking point:** "The content calibration uses Markowitz mean-variance optimization
— same model as modern portfolio theory. Each post type is an asset with a mean engagement
return and variance. C++ computes the covariance matrix and solves for optimal weights via
Cholesky decomposition. The efficient frontier shows the risk/return tradeoff across risk
aversion levels. At an interview it's a different domain but identical math — interviewers
recognize it immediately."

### Sample Size Caveat

Same caveat as OLS: at ~115 posts across 5 types, covariance estimates are noisy. The
optimizer will work but the weights should be interpreted directionally, not as precise
allocations. Document this in the service output. The value is the architecture and method —
at 8,760 posts/year the estimates stabilize.

### Resume Signal

- "Markowitz mean-variance content optimizer — covariance matrix inversion via Cholesky, same
  model as modern portfolio theory applied to content allocation"
- The analogy is exact and instantly recognizable to any quant interviewer
- Extends `scoring_core.cpp` — no new build infra

---

## How These Map to the Quant Dev Plan

| This Project | Quant Plan Concept | C++ Equivalent |
|---|---|---|
| `asyncio.gather()` | Task-based concurrency | `std::async` + `future::get()` |
| `p-limit` semaphore | Semaphore primitive | `std::counting_semaphore<N>` |
| BullMQ worker pool | Producer-consumer + bounded parallelism | SPMC queue + thread pool |
| pybind11 C++ scoring core | Python/C++ two-layer architecture | Research env → pricing engine |
| Time-decay scoring | Alpha signal decay | `e^(-λt)` on factor vectors |
| Cosine similarity (pybind11) | Factor correlation / signal clustering | Portfolio overlap detection |
| Monte Carlo optimizer (`std::async`) | Scenario simulation + parallelism | Backtesting engine |
| EWMA volatility | RiskMetrics σ² estimation | Time-varying vol, VaR inputs |
| OLS feature attribution | Factor model (Fama-French style) | Normal equations, factor exposure |
| Markowitz mean-variance optimizer | Modern portfolio theory | Covariance matrix inversion, Cholesky |
| Scraper `Promise.all` bug | Concurrency hazard identification | Data race / false sharing |
| DeepL sequential fallback | Tradeoff: throughput vs. correctness | Lock vs. lock-free tradeoff |

Building these patterns in a production context before the C++ track means the mental model is
already formed when the formal treatment appears in *C++ Concurrency in Action*. The C++ version
adds: memory model, atomics, cache line alignment, and true parallelism. The pattern is the same.

---

## Build Order

### Tier 1 — Core (build these, ship these, get the numbers)

1. **`p-limit` in Rakuten scraper** — 2 hours. Highest throughput gain, lowest risk. No new
   infrastructure. Immediate measurable result (time the sync before and after).

2. **`asyncio.gather()` in analytics service** — 2-4 hours. FastAPI is already async, stdlib
   only. Measure latency of the stats endpoint before and after.

3. **BullMQ worker pool** — 1-2 days. Requires customer-facing UX change (polling pattern),
   Bull Board integration, and new worker process. Most architectural change of the three.

4. **pybind11 C++ scoring core** — 1 day. Read pybind11 "First steps" + "Buffer protocol" docs
   (~1 hour), write `hello_world.cpp` to confirm the bridge works, then write `scoring_core.cpp`
   (~15 lines of C++). CMakeLists.txt is copy-paste from pybind11 docs. Main gotcha: compile
   inside Docker, not locally. Benchmark with synthetic N=100,000 matrix to produce a real speedup
   number.

These four are the resume signal. All have measurable before/after numbers. Ship all four.

### Tier 2 — Strong additions (build after Tier 1, deepen the C++ story)

5. **Time-decay + cosine similarity extensions** — 2-4 hours. Extends `scoring_core.cpp` with
   two new functions; no new build infra. `time_decay_score` first (pure float math, ~20 lines),
   then `cosine_similarity` (dot product + norm, ~15 lines). Both added to existing
   `PYBIND11_MODULE` block.

6. **Monte Carlo content optimizer** — 1-2 days. CPU-bound, embarrassingly parallel — the first
   C++ module with a real measurable speedup from the work project. Build single-threaded first,
   verify correctness against Python baseline, then add `std::async` parallelism and benchmark.
   Target N=10,000 simulations. Record before/after on VPS.

### Tier 3 — Nice to have (if time, deepens quant vocabulary)

7. **EWMA rolling statistics** — 2-4 hours. Extends `scoring_core.cpp`. Implement `ewma_update()`
   first (single-step, trivial to unit test against manual calculation), then `compute_ewma_series()`
   over the full archive. Validate: volatility for a stable post type should be low; a post type
   with variable performance should be high. Integrate into calibration output alongside raw scores.

8. **OLS feature attribution** — 1 day. Implement Gaussian elimination for `(X'X)⁻¹ X'y` in C++.
   Test on synthetic data where ground-truth coefficients are known before running on real archive.
   Document sample size caveat in service output — "N=[ ], interpret directionally." Build order:
   Gaussian elimination → unit test → plug into scoring_core.cpp → Python builds design matrix →
   validate coefficients are directionally sensible.

9. **Markowitz mean-variance optimizer** — 1-2 days. Most quant-recognizable model in the doc.
   Build order: compute μ and Σ in Python first (verify against numpy), then port covariance +
   Cholesky solve to C++, validate weights match numpy baseline. Add efficient frontier endpoint:
   iterate λ over [0.1 … 10], collect (expected_engagement, volatility) pairs, return as frontier
   array. Document sample size caveat.

**What to measure and document for each:**
- Before and after latency (or throughput)
- Why the previous approach was wrong (the failure mode)
- Why this approach is correct (the principle)
- What you'd do differently in C++ (the bridge)

This documentation is the resume signal — not the code alone.

---

## Measurement Checklist — Update Resume Bullets After Building

For each improvement: time it before and after, drop the real number into the resume bullet.
Measured results beat claimed results. Placeholder values marked with `[ ]` — fill in after build.

### 1 — `asyncio.gather()` (FastAPI analytics service)

- [ ] Time stats endpoint **before** (sequential awaits): `[ ] ms` average response
- [ ] Time stats endpoint **after** (`asyncio.gather()`): `[ ] ms` average response
- [ ] Calculated speedup: `[ ]x` faster
- [ ] Resume bullet update: add "reducing stats endpoint latency from `[ ]ms` to `[ ]ms`"

### 2 — `p-limit` semaphore (Rakuten genre sync)

- [ ] Time full genre sync **before** (sequential `for` loop): `[ ] seconds` for `[ ]` genres
- [ ] Time full genre sync **after** (`p-limit(3)`): `[ ] seconds`
- [ ] Calculated speedup: `[ ]x` faster (expected ~3x for concurrency=3)
- [ ] Resume bullet update: replace "semaphore-bounded concurrent fetching" with
      "semaphore-bounded concurrent fetching (`[ ]s` → `[ ]s` for `[ ]` genres, `[ ]x` speedup)"

### 3 — BullMQ worker pool (Rakuten product request flow)

- [ ] Measure inline handler response time **before**: `[ ] seconds` (customer waits)
- [ ] Measure handler response time **after** (enqueue + return): `[ ] ms` (immediate)
- [ ] Resume bullet update: add "reducing customer-facing response from `[ ]s` to `[ ]ms`"

### 4 — pybind11 C++ scoring core

- [ ] `hello_world.cpp` compiles and is callable from Python — confirm bridge works
- [ ] `scoring_core.cpp` written and compiled into `.so` inside Docker
- [ ] `scoring.py` updated to call `xhs_analytics_core.compute_scores()`
- [ ] End-to-end test: `/analyze/xhs` returns same results as numpy baseline
- [ ] Benchmark: generate synthetic N=100,000 matrix, time Python vs C++ (`timeit`, 3+ runs, average)
- [ ] Record speedup: `[ ]x` at N=100,000 rows
- [ ] Resume/skills update: add C++ to Languages, pybind11 to Frameworks

### 5 — Time-decay scoring + cosine similarity (pybind11 extension)

- [ ] `time_decay_score()` implemented in `scoring_core.cpp` — unit test against Python `e^(-λt)` baseline
- [ ] `compute_decayed_scores()` implemented — processes full metric matrix with per-row timestamps
- [ ] `cosine_similarity()` implemented — verified against `numpy.dot` / `numpy.linalg.norm` baseline
- [ ] All three functions exported in `PYBIND11_MODULE` block
- [ ] `scoring.py` updated with `compute_decayed_scores` and `cosine_similarity` wrappers
- [ ] End-to-end test: decayed scores differ from raw scores for posts with varying ages
- [ ] Resume bullet update: add "exponential time-decay scoring (alpha decay pattern) + cosine similarity dedup"

### 6 — Monte Carlo content optimizer (`std::async`)

- [ ] Single-threaded C++ baseline implemented and verified against Python simulation
- [ ] `std::async` parallelism added — splits N simulations across `hardware_concurrency()` threads
- [ ] Benchmark **before** (Python single-threaded, N=10,000): `[ ] ms`
- [ ] Benchmark **after** (C++ multithreaded, N=10,000): `[ ] ms`
- [ ] Speedup: `[ ]x` at N=10,000
- [ ] Result validated: optimal weights from C++ match Python within floating-point tolerance
- [ ] Resume bullet update: add "`std::async`-parallelised Monte Carlo optimizer — `[ ]x` speedup at 10k simulations"

### 7 — EWMA rolling statistics

- [ ] `ewma_update()` implemented — unit tested against manual step-by-step calculation
- [ ] `compute_ewma_series()` implemented — processes full archive per post type
- [ ] Validated: stable post type has low σ, variable post type has high σ (check with real archive)
- [ ] Integrated into `/analyze/xhs` calibration response: `{ mean, volatility }` per type
- [ ] Resume bullet update: add "EWMA volatility-adjusted content weighting — RiskMetrics recurrence"

### 8 — OLS feature attribution

- [ ] Gaussian elimination implemented in C++ — unit tested on synthetic data with known β
- [ ] `ols_fit()` exported via `PYBIND11_MODULE`
- [ ] Python builds design matrix: one-hot post types + word_count + time_of_day + has_image
- [ ] Validated: coefficients directionally sensible (e.g., word_count positive, plausible magnitude)
- [ ] Sample size documented in service output: "N=[ ] — interpret directionally"
- [ ] Resume bullet update: add "OLS factor attribution — normal equation solver in C++, Fama-French analogy"

### 9 — Markowitz mean-variance optimizer

- [ ] Python baseline: compute μ and Σ via numpy, verify weights sum to 1
- [ ] `markowitz_weights()` implemented in C++ — Cholesky decompose Σ, solve for w*
- [ ] Validated: C++ weights match numpy baseline within floating-point tolerance
- [ ] Efficient frontier: iterate λ over [0.1 … 10], collect (E[engagement], σ) pairs
- [ ] Exported via `PYBIND11_MODULE`, wired into `/analyze/xhs` calibration response
- [ ] Sample size caveat documented in output: "N=[ ] — interpret directionally"
- [ ] Resume bullet update: add "Markowitz mean-variance content optimizer — Cholesky covariance inversion, efficient frontier"

### Notes

- Run each benchmark 3+ times and take the average — single runs are noisy
- Measure on the actual VPS (Lightsail), not localhost — hardware differs
- Add the numbers to the resume the same day you measure them — don't leave placeholders in
