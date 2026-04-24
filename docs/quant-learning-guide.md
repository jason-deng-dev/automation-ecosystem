# Quant Stack — Struggle Guide

**Purpose:** Force you to understand each concept before using it. No copy-paste. No tutorials. Every section has a challenge you must complete before moving on — and verification questions you must answer *from memory* before checking anything.

**Rule:** If you can't answer the verification questions without looking, you haven't learned it yet. Go back.

---

## What you're building and why each technology exists

Before diving in — understand what each piece is and how they connect. One sentence each.

| Technology | What it is | Analogy |
|---|---|---|
| **coroutine** | A function that can pause mid-execution and give control back, then resume later | Like a chef who puts a dish in the oven and starts chopping vegetables while it bakes — instead of staring at the oven |
| **asyncio** | Python's system for running many coroutines on a single thread by switching between them when they're waiting | The chef's kitchen — one chef, many dishes in progress simultaneously |
| **asyncio.gather()** | Launches N coroutines concurrently and waits for all of them to finish | Starting all your oven dishes at once instead of one after another |
| **FastAPI** | Python web framework for building APIs — like Express but Python, with automatic request validation and auto-generated docs | Express.js but you describe what the request body looks like (via Pydantic) and it validates it for free |
| **Pydantic** | Library that validates and parses data using Python type hints — if the data doesn't match, it errors with a clear message | Like a bouncer at the door: checks IDs before anything gets through |
| **async SQLAlchemy** | SQLAlchemy's async mode — DB queries return coroutines so the event loop can do other work while waiting for the DB | Same SQL you know, but `await` instead of blocking |
| **pybind11** | Lets you call C++ functions from Python — you write a thin bridge, it handles type conversion | Like a translator standing between Python and C++ — Python hands it a NumPy array, C++ gets a raw pointer |
| **CMake** | Build system for C++ — describes how to compile your code into a `.so` file Python can import | Like `npm install + webpack` but for C++ |
| **std::async / std::future** | C++ way to run a function on a new thread and collect the result later | Like dispatching a task to a worker and checking their inbox when you need the answer |
| **std::mt19937** | Mersenne Twister — a fast, high-quality pseudo-random number generator | A dice factory: you seed it once, then roll forever |

**How they connect in your stack:**

```
FastAPI (HTTP layer)
  └── asyncio.gather() — fires 3 DB queries concurrently
        └── async SQLAlchemy — queries Postgres
        └── pybind11 → C++ scoring_core.so
              └── std::async — splits Monte Carlo across CPU cores
                    └── std::mt19937 — generates random weight samples
```

---

## Resources — what to read for each concept

These are the exact pages to read. Not tutorials. Not YouTube. The official docs — the specific section listed.

### Python
| Concept | Resource | What to read |
|---|---|---|
| Coroutines + asyncio | [Python docs — Coroutines and Tasks](https://docs.python.org/3/library/asyncio-task.html) | The whole page — it's short. Focus on the "Coroutines" and "Running coroutines" sections first |
| asyncio.gather | [Python docs — asyncio.gather](https://docs.python.org/3/library/asyncio-task.html#asyncio.gather) | The function signature + the note about exception handling |
| FastAPI basics | [FastAPI Tutorial — First Steps](https://fastapi.tiangolo.com/tutorial/first-steps/) | First Steps → Path Parameters → Request Body → stop there |
| Pydantic models | [FastAPI Tutorial — Request Body](https://fastapi.tiangolo.com/tutorial/body/) | Just this one page |
| Async SQLAlchemy | [SQLAlchemy — Using AsyncSession](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html) | "Synopsis - Core" and "Synopsis - ORM" sections |

### C++
| Concept | Resource | What to read |
|---|---|---|
| `<random>` header | [cppreference — pseudo-random number generation](https://en.cppreference.com/w/cpp/numeric/random) | The overview table at the top, then `std::mt19937` and `std::uniform_real_distribution` pages |
| `std::random_device` | [cppreference — std::random_device](https://en.cppreference.com/w/cpp/numeric/random/random_device) | Full page — it's short |
| `std::async` | [cppreference — std::async](https://en.cppreference.com/w/cpp/thread/async) | Full page — read the launch policy section carefully |
| `std::future` | [cppreference — std::future](https://en.cppreference.com/w/cpp/thread/future) | `.get()`, `.wait()`, and the exception propagation note |
| `std::thread::hardware_concurrency` | [cppreference](https://en.cppreference.com/w/cpp/thread/thread/hardware_concurrency) | One-liner — just know it exists and what it returns |
| pybind11 basics | [pybind11 — First steps](https://pybind11.readthedocs.io/en/stable/basics.html) | Full page |
| pybind11 buffer protocol | [pybind11 — Buffer protocol](https://pybind11.readthedocs.io/en/stable/advanced/pycpp/numpy.html) | "Buffer protocol" section — stop before "Structured data types" |
| CMake + pybind11 | [pybind11 — Building with CMake](https://pybind11.readthedocs.io/en/stable/compiling.html#building-with-cmake) | Just the CMake section |

---

## How to use this doc

1. Read the "Why it matters" — understand the goal before touching code
2. Write the challenge from scratch — no copy-paste from anywhere
3. Make it run
4. Answer ALL verification questions out loud before moving on
5. Check off the box

If you skip a challenge because "you get it," you don't get it.

---

## Part 1 — Python Layer

### P1 — asyncio mental model

**Why it matters:** `asyncio.gather()` is the core of the 3× latency win. If you don't understand the event loop, you will misuse it and wonder why it's not faster.

**Before you write anything — answer these:**

- What is the difference between a coroutine and a function?
- When does a coroutine actually run?
- What does `await` do? What does it yield control back to?
- Can two coroutines ever run at the *exact same moment* in pure asyncio?

Write your answers in comments at the top of your file. If you can't answer, read Python docs: "Coroutines and Tasks" — that section only, no tutorials.

**Challenge P1:**

```python
import asyncio
import time

# Your job:
# 1. Write a coroutine called fake_query(name, delay)
#    - prints f"{name} starting"
#    - waits `delay` seconds (asyncio sleep, not time.sleep)
#    - prints f"{name} done"
#    - returns name

# 2. Write main() that does this SEQUENTIALLY (no gather yet):
#    - calls fake_query("views", 0.3)
#    - calls fake_query("tokens", 0.2)  
#    - calls fake_query("ctr", 0.4)
#    - prints total elapsed time

# 3. Predict the output order and total time BEFORE running.
#    Write your prediction as a comment.

# 4. Run it. Were you right?

# 5. Now rewrite main() using asyncio.gather() on the same three calls.
#    Predict output order and time again BEFORE running.

# 6. Run it. Were you right?
```

**Verification — answer before moving on:**

- [ ] Why did sequential take ~0.9s but gather took ~0.4s?
- [ ] What would happen if you used `time.sleep(delay)` instead of `asyncio.sleep(delay)` inside a coroutine and ran it with gather?
- [ ] Can you swap the order of results from `asyncio.gather()`? Does the return order depend on which finishes first?
- [ ] What is `asyncio.run(main())`  actually doing?

---

### P2 — FastAPI routing + Pydantic

**Why it matters:** The analytics service is a FastAPI app. You need to understand how requests flow before you hook in DB and async logic.

**Challenge P2:**

Build a tiny FastAPI app from scratch — no analytics logic, just structure:

```
GET /health          → { "status": "ok" }
GET /stats/summary   → { "post_count": 42, "avg_score": 8.7 }   (hardcoded for now)
POST /stats/ingest   → accepts JSON body: { "filename": "export.xlsx" }
                     → returns { "accepted": true, "filename": "..." }
```

Rules:
- Use Pydantic model for the POST body — don't accept raw dict
- Use `async def` for all route handlers
- Run with `uvicorn` — confirm all three routes work via curl or browser

**Before you write anything:**

- What is Pydantic doing that `dict` can't do?
- Why does FastAPI care whether your handler is `async def` vs `def`?

**Verification:**

- [ ] What does FastAPI do when a POST body doesn't match the Pydantic model? Test it.
- [ ] What happens if you `await asyncio.sleep(1)` inside an `async def` handler — does the server block other requests?
- [ ] Where does Uvicorn fit — what is it actually doing relative to FastAPI?

---

### P3 — asyncio.gather() with real DB queries

**Why it matters:** This is the actual 3× win. Chaining three sequential `await db.execute(...)` is the slow version. Gathering them is the fast version.

**Before you write anything:**

- Sketch on paper: what does sequential DB calls look like on a timeline? What does gather look like?
- If query A takes 80ms and query B takes 60ms, what does sequential total? What does gather total?

**Challenge P3:**

Extend your P2 app:

```python
# In GET /stats/summary:
# 1. Write 3 async functions that simulate DB queries:
#    - get_post_count(db)  → await asyncio.sleep(0.08), return 42
#    - get_avg_score(db)   → await asyncio.sleep(0.06), return 8.7
#    - get_top_type(db)    → await asyncio.sleep(0.05), return "recipe"

# 2. First implement the handler sequentially. Measure response time.
# 3. Then implement with asyncio.gather(). Measure response time.
# 4. Record both numbers in a comment.

# 5. Now swap back to sequential — using time.time() inside the handler,
#    confirm the gap you measured.
```

**Verification:**

- [ ] What is the actual wall-clock improvement you measured?
- [ ] If one of the three queries raises an exception inside gather, what happens to the other two?
- [ ] What's `asyncio.gather(*[...])` — what does the `*` do and when would you need it?

---

### P4 — Async SQLAlchemy

**Why it matters:** Real DB queries, not `asyncio.sleep()` stubs. You need to understand the async session lifecycle.

**Read:** SQLAlchemy async docs — "Using AsyncSession" section. Not a tutorial. The docs.

**Challenge P4:**

- Set up an async SQLAlchemy engine pointed at a local SQLite file (easier to test than Postgres)
- Write one table: `posts(id, post_type, score, created_at)`
- Seed 10 rows
- Write an async function `get_avg_score_by_type(session)` that returns a dict of `{post_type: avg_score}`
- Call it from your `/stats/summary` handler using gather alongside two other fake queries

**Verification:**

- [ ] What is `AsyncSession` vs `Session`? What changes under the hood?
- [ ] Why do you need `async with AsyncSession(engine) as session` — what breaks if you don't use context manager?
- [ ] What is `await session.execute(select(Post))` returning — what type is it, and what do you call on it to get rows?

---

## Part 2 — C++ Layer

### C1 — `<random>` — dice simulator

**Why it matters:** Monte Carlo runs thousands of Dirichlet weight samples. If you don't understand how C++ generates random numbers — seeding, engines, distributions — your simulations will be wrong or secretly deterministic.

**Before you write anything — answer these:**

- What is a seed? Why does `std::mt19937 rng(42)` always produce the same sequence?
- What's the difference between the *engine* and the *distribution*?
- If you seed with `42` and run the program twice, do you get the same numbers? Why?

**Challenge C1:**

Write `dice.cpp` — no includes except `<random>`, `<iostream>`, `<vector>`:

```
// Your job:
// 1. Create a Mersenne Twister engine seeded from std::random_device
// 2. Create a uniform_int_distribution<int>(1, 6)
// 3. Roll the dice 100,000 times, count how many times each face appears
// 4. Print the counts — they should be roughly equal (~16,666 each)
// 5. Run it twice — are the counts the same both times? Why or why not?
// 6. Now hardcode the seed to 42. Run twice. Same? Why?
```

**Verification:**

- [ ] Why `std::random_device` for the seed but `std::mt19937` for the engine?
- [ ] What does "distribution" mean here — what math is it doing?
- [ ] If you need a `double` between 0.0 and 1.0, what distribution do you use?
- [ ] How would you generate a Dirichlet sample from three categories? (Hint: gamma distribution. Look it up — don't answer yet, just know where to look.)

---

### C2 — `<future>` + `std::async` — parallel array sum

**Why it matters:** The Monte Carlo engine splits 10,000 simulations across hardware threads using `std::async`. If you don't understand how futures and async work, you won't know if you've actually parallelized anything or just created threads that block each other.

**Before you write anything:**

- What is a `std::future<T>`? What does `.get()` do?
- What is `std::launch::async` vs `std::launch::deferred`?
- If you call `.get()` on a future before the async task is done, what happens?

**Challenge C2:**

Write `parallel_sum.cpp`:

```
// Your job:
// 1. Create a std::vector<double> of 10,000,000 elements, all set to 1.0
// 2. Write a function: double sum_range(const std::vector<double>& v, size_t start, size_t end)
//    - returns the sum of v[start..end)
//    - single-threaded, just a loop

// 3. Implement sequential_sum(v) — calls sum_range on the full vector
//    Measure time with std::chrono.

// 4. Implement parallel_sum(v) — splits into N chunks where N = hardware_concurrency()
//    Launches each chunk with std::async(std::launch::async, ...)
//    Collects results with .get()
//    Measure time.

// 5. Print: sequential time, parallel time, speedup ratio
// 6. Do both produce the same result? (they must — check with assert)
```

**Verification:**

- [ ] What does `std::thread::hardware_concurrency()` return on your machine?
- [ ] Why might the speedup be less than 4× even on a 4-core machine?
- [ ] What happens if an exception is thrown inside the async task? How do you catch it?
- [ ] What is a data race? Does `parallel_sum` have one? Prove it doesn't.

---

### C3 — pybind11 hello world (the gate)

**Why it matters:** The roadmap says "hello_world.cpp must compile and be callable from Python before writing scoring core." This isn't optional. If you can't get pybind11 working, none of Q4–Q6 ships.

**Read:** pybind11 docs — "First steps" only. Don't skip to buffer protocol yet.

**Challenge C3:**

Write `hello_world.cpp` and `CMakeLists.txt`:

```cpp
// hello_world.cpp
// Your job: create a pybind11 module called "hello_core" with:
// - a function add(a: int, b: int) -> int
// - a function greet(name: str) -> str  (returns "Hello, {name}!")
// No buffer protocol yet. Just basic type passing.
```

```cmake
# CMakeLists.txt
# Your job: wire up pybind11_add_module for hello_core
# Use find_package(pybind11 REQUIRED)
# Minimum CMake version: 3.14
```

Then in Python:
```python
import hello_core
print(hello_core.add(3, 4))       # must print 7
print(hello_core.greet("Jason"))  # must print Hello, Jason!
```

**Verification:**

- [ ] What is the `.so` file that CMake produces? Why can't you copy it to a different OS?
- [ ] What does `PYBIND11_MODULE(hello_core, m)` do — what are `hello_core` and `m`?
- [ ] Why does pybind11 not need you to write a `setup.py` or `pyproject.toml`?
- [ ] Where does Python look for the `.so` when you `import hello_core`?

---

### C4 — pybind11 buffer protocol

**Why it matters:** The scoring core takes a NumPy matrix as input. The buffer protocol is how C++ reads NumPy array memory directly — no copy, no conversion. If you get this wrong, you corrupt memory.

**Read:** pybind11 docs — "Buffer protocol" section. Then read it again.

**Challenge C4:**

Extend your `hello_core` module (or a new `buffer_test.cpp`):

```cpp
// Write a function: double array_sum(py::array_t<double> arr)
// - request the buffer: auto buf = arr.request()
// - get the raw pointer: double* ptr = static_cast<double*>(buf.ptr)
// - sum all elements using buf.size
// - return the sum

// IMPORTANT: do NOT write this function yet.
// First answer: what is buf.shape? buf.strides? buf.ndim?
// Read the buffer protocol docs until you can answer these.
```

Then in Python:
```python
import numpy as np
import hello_core   # or buffer_test

a = np.array([1.0, 2.0, 3.0, 4.0])
print(hello_core.array_sum(a))   # must print 10.0

b = np.zeros((3, 4))             # 2D array
# What do you need to change to sum a 2D array?
# Figure it out. Don't look it up first.
```

**Verification:**

- [ ] What is `buf.shape[0]` for a matrix with 5 rows and 3 columns?
- [ ] What does `data[i*3+0]` mean for a row-major 2D array? Why multiply by 3?
- [ ] What happens if Python passes a non-contiguous array (e.g., a slice)? How do you guard against it?
- [ ] What is `py::array_t<double, py::array::c_style | py::array::forcecast>` — when would you need the flags?

---

## Part 3 — Integration Challenges

These only start after all P1–P4 and C1–C4 are checked off.

### I1 — C++ scoring core

You've done parallel array sum. You've done buffer protocol. Now combine them:

```
Write scoring_core.cpp:
- compute_scores(metric_matrix: np.ndarray[N×3], weights: np.ndarray[3]) -> list[float]
- Matrix layout: each row is [views, saves, ctr] for one post
- Result: dot product of each row with weights vector
- No std::async yet — single-threaded first
- Verify against numpy: np.dot(matrix, weights) must match your output exactly
```

Do not move to parallel until single-threaded version passes the numpy check.

---

### I2 — Monte Carlo weight optimizer

You've done `<random>` (C1) and `std::async` (C2) and scoring core (I1). Now:

```
Write monte_carlo.cpp:
- Input: metric_matrix (N posts × 3 metrics), n_simulations=10000
- Each simulation: sample random weights from Dirichlet(alpha=[1,1,1])
  (Hint: use gamma distribution — look up how Dirichlet sampling works from gammas)
- Score all posts with those weights using compute_scores
- Track which weight vector produced the highest mean score
- Output: best_weights [w0, w1, w2] and expected_score

Single-threaded first. Verify it returns sensible weights.
Then parallelize with std::async — same pattern as parallel_sum (C2).
Benchmark before/after. Record numbers.
```

**Before writing Dirichlet sampling — answer:**
- What is a Dirichlet distribution? What does it constrain?
- Why is "sample K gammas then normalize" equivalent to sampling from Dirichlet?

---

## Progress Tracker

### Python
- [ ] P1 — asyncio mental model + gather challenge
- [ ] P2 — FastAPI routing + Pydantic
- [ ] P3 — asyncio.gather() with simulated DB queries + timing
- [ ] P4 — Async SQLAlchemy with real DB

### C++
- [ ] C1 — `<random>` dice simulator
- [ ] C2 — `<future>` + `std::async` parallel array sum
- [ ] C3 — pybind11 hello world (gate — don't skip)
- [ ] C4 — pybind11 buffer protocol

### Integration
- [ ] I1 — C++ scoring core (matches numpy baseline)
- [ ] I2 — Monte Carlo optimizer (single-threaded → parallel → benchmarked)

---

## When you're stuck

**Allowed:**
- Official docs: Python docs, cppreference.com, pybind11 docs, FastAPI docs, SQLAlchemy docs
- Reading a concept explanation (not a tutorial that builds the same thing)
- Asking Claude what a specific concept means — NOT asking Claude to write the code

**Not allowed:**
- Copying a working example and modifying it
- Asking Claude to write the solution
- Skipping a verification question because you "basically get it"

**The rule:** if you don't understand why something works, you can't debug it when it breaks in production. The struggle is the point.
