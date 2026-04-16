# Quant Dev Concurrency Improvements

> Targeted upgrades to the automation ecosystem that demonstrate concurrency and parallelism
> concepts directly relevant to quant developer interviews. Each improvement maps to a specific
> pattern from the quant dev study plan — building the mental model in Node.js/Python before
> hitting the C++ memory model.

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

At current archive size (~115 posts), the Python→C++ speedup is negligible — both complete in
milliseconds. **Do not fabricate a benchmark.** The signal here is the architecture pattern and
the interface isolation discipline, not a speedup number. The speedup story belongs to the
backtesting engine Monte Carlo (CPU-bound, embarrassingly parallel, measurable at 100k scenarios).

---

## How These Map to the Quant Dev Plan

| This Project | Quant Plan Concept | C++ Equivalent |
|---|---|---|
| `asyncio.gather()` | Task-based concurrency | `std::async` + `future::get()` |
| `p-limit` semaphore | Semaphore primitive | `std::counting_semaphore<N>` |
| BullMQ worker pool | Producer-consumer + bounded parallelism | SPMC queue + thread pool |
| pybind11 C++ scoring core | Python/C++ two-layer architecture | Research env → pricing engine |
| Scraper `Promise.all` bug | Concurrency hazard identification | Data race / false sharing |
| DeepL sequential fallback | Tradeoff: throughput vs. correctness | Lock vs. lock-free tradeoff |

Building these patterns in a production context before the C++ track means the mental model is
already formed when the formal treatment appears in *C++ Concurrency in Action*. The C++ version
adds: memory model, atomics, cache line alignment, and true parallelism. The pattern is the same.

---

## Build Order

1. **`p-limit` in Rakuten scraper** — 2 hours. Highest throughput gain, lowest risk. No new
   infrastructure. Immediate measurable result (time the sync before and after).

2. **`asyncio.gather()` in analytics service** — 2-4 hours. FastAPI is already async, stdlib
   only. Measure latency of the stats endpoint before and after.

3. **BullMQ worker pool** — 1-2 days. Requires customer-facing UX change (polling pattern),
   Bull Board integration, and new worker process. Most architectural change of the three.

4. **pybind11 C++ scoring core** — 1 day. Read pybind11 "First steps" + "Buffer protocol" docs
   (~1 hour), write `hello_world.cpp` to confirm the bridge works, then write `scoring_core.cpp`
   (~15 lines of C++). CMakeLists.txt is copy-paste from pybind11 docs. Main gotcha: compile
   inside Docker, not locally. No benchmark needed — architecture pattern is the signal.

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
- [ ] **No speedup benchmark needed** — archive too small; signal is architecture, not number
- [ ] Resume/skills update: add C++ to Languages, pybind11 to Frameworks

### Notes

- Run each benchmark 3+ times and take the average — single runs are noisy
- Measure on the actual VPS (Lightsail), not localhost — network latency and hardware differ
- Add the numbers to the resume the same day you measure them — don't leave placeholders in
- pybind11 exception: no number needed, architecture pattern is the talking point
