## 1. What This Is

The Scraper is a pure cron process running as a Docker container. It scrapes RunJapan weekly and writes race data to the `races` table in PostgreSQL. No HTTP server. No persistent process. Just a DB writer on a schedule.

The Race Hub container reads from the `races` table and serves it to WordPress. They are fully decoupled — the scraper just writes to DB, the Race Hub just reads it.

For Race Hub design (Express API + React SPA), see `services/race-hub/docs/race-hub-design-doc.md`.

---

## 2. Architecture

```
[Scraper container]
  cron: scraper.js weekly (Sunday 2am JST)
  no HTTP server — pure cron process
       │
       │ writes
       ▼
PostgreSQL (ecosystemdb): races, scraper_run_logs, pipeline_state
       │
       │ reads
       ▼
[Race Hub container]   [XHS container]
  Express :3001          generator.js
  serves to WordPress    injects race context into prompts
```

---

## 3. What It Scrapes

RunJapan (runjapan.jp) — the most complete Japanese marathon listing source.

**Fields extracted per race:**

| Field | Notes |
|---|---|
| `name` | Race name |
| `name_zh` | Chinese translation of name (DeepL EN→ZH-HANS) |
| `url` | RunJapan detail page URL |
| `date` | Race date |
| `date_zh` | Chinese translation of date string (DeepL EN→ZH-HANS) |
| `location` | Prefecture / city |
| `location_zh` | Chinese translation of location (DeepL EN→ZH-HANS) |
| `entryStart` | Entry window open date |
| `entryStart_zh` | Chinese translation of entryStart (DeepL EN→ZH-HANS) |
| `entryEnd` | Entry window close date |
| `entryEnd_zh` | Chinese translation of entryEnd (DeepL EN→ZH-HANS) |
| `registrationOpen` | Boolean — derived from entry window |
| `registrationUrl` | Direct signup link |
| `website` | Race official site |
| `description` | Race description text |
| `description_zh` | Chinese translation of description (DeepL EN→ZH-HANS) |
| `info` | Additional race info (structured key-value — keys are section labels, values are text or nested objects) |
| `info_zh` | Chinese translation of all keys and values in `info`, preserving nested structure (DeepL EN→ZH-HANS) |
| `notice` | Notices / warnings (English) |
| `notice_zh` | Chinese translations of notice items (DeepL EN→ZH-HANS) |
| `images` | Array of image URLs |

---

## 4. Scraping Approach

**Two-pass scrape:**

1. **Pass 1 — listing page:** POST `runjapan.jp` search endpoint with `availableFlag=0` (include all races, not just open-entry ones). Extract all race card links. Each card contains a `raceId` param (e.g. `raceId=E335908`).
2. **Pass 2 — detail pages:** For each race link, GET the detail page and extract structured data.

**Session handling:** The listing page is paginated. Page 2+ requires a cookie set by the initial POST response. Uses `tough-cookie` + `axios-cookiejar-support` to maintain the session automatically across requests.

**Output:** Upserts all races to `ecosystemdb.races` via `ON CONFLICT (url) DO UPDATE`. Aborts upsert (but still logs) if fewer than 30 races are returned — preserves existing DB rows.

---

## 5. Database Output

All output goes to `ecosystemdb` (PostgreSQL). No JSON files written.

**`races` table**
- One row per race, keyed by `url` (UNIQUE)
- Contains all English and Chinese fields per race
- Shared with XHS (reads race context for content generation) and Race Hub (serves to WordPress)
- Upserted via `ON CONFLICT (url) DO UPDATE` — incremental, safe to re-run

**`pipeline_state` table**

Written at run start and end so the Dashboard can poll current scraper state.

| Column | Value |
|---|---|
| `service` | `'scraper'` |
| `state` | `'idle'` \| `'running'` \| `'failed'` |
| `updated_at` | timestamp |

Set to `'running'` before scrape starts, updated to `'idle'` or `'failed'` on completion. Shared with XHS service (each service has its own row).

**`scraper_run_logs` table**

One row per scraper run.

| Column | Type | Notes |
|---|---|---|
| `outcome` | string | `'success'` or `'failed'` |
| `races_scraped` | number | New races scraped this run (not total in DB) |
| `failure_count` | number | Detail pages that failed to scrape |
| `failed_urls` | TEXT[] | URLs of races that failed — empty on clean run |
| `error_msg` | string \| null | Top-level error if run aborted, null otherwise |
| `logged_at` | TIMESTAMPTZ | Auto-set on insert |

---

## 6. Technical Decisions

|Decision|Choice|Alternatives Considered|Rationale|
|---|---|---|---|
|Scrape target|RunJapan only|JogNote, marathon-link.com|RunJapan has the most complete race data; single source reduces complexity|
|Scrape cadence|Weekly|Daily, real-time|Race data changes slowly; weekly is fresh enough; reduces RunJapan request load|
|HTTP requests|axios|node-fetch, native fetch|More reliable for scraping; better error handling and timeout support|
|HTML parsing|cheerio|jsdom, regex|Lightweight jQuery-style API; purpose-built for server-side HTML parsing|
|Session handling|tough-cookie + axios-cookiejar-support|Manual cookie extraction|Jar captures cookies automatically — replicates browser session behaviour with no manual work|
|Error handling|Log and continue per race|Abort on first failure|One bad detail page should not abort the full run — partial data is better than no data|
|Retries|axios-retry: 3 retries, exponential backoff, network errors + 5xx only|Manual retry loop|axios has no built-in retry; axios-retry is a one-liner; only retries transient failures|
|Output protection|Abort upsert if < 30 races returned; existing DB rows preserved|Always overwrite|Preserves last good data if scraper crashes or RunJapan returns partial results|
|Storage|PostgreSQL (ecosystemdb)|Shared volume JSON files|Shared volume created tight coupling between containers; DB decouples writer (scraper) from readers (Race Hub, XHS)|
|Language|Node.js / JavaScript|Python|Consistent with rest of stack|

---

## 7. Implementation

### 7.1 Current Status

|Component|Status|Notes|
|---|---|---|
|Core scraping logic|✅ Done|`scraper.js` in `src/`|
|Cron scheduling|✅ Done|`scheduler.js` — Sunday 2am JST|
|PostgreSQL migration|✅ Done|All file I/O replaced with DB queries; `src/db/` layer added|
|Dockerfile|✅ Done|`node:22-alpine`, `CMD node scripts/run-scheduler.js`|
|CI/CD|✅ Done|`cicd-scraper.yml` — vitest on push, deploy to Lightsail on main|
|Deploy|✅ Done|Container running on Lightsail, 69 races in `ecosystemdb.races`|

### 7.2 Phase 1 — Standalone Scraper Container

1. ~~Port `scraper.js` from `services/xhs/src/scraper.js`~~ ✅
2. ~~Add structured run log output~~ ✅ — `scraper_run_logs` table
3. ~~Validate output — abort if < 30 races returned~~ ✅
4. ~~Wire weekly cron (Sunday 2am JST)~~ ✅
5. ~~Dockerfile + deploy~~ ✅

### 7.3 Phase 2 — Incremental Scraping

1. ~~On startup, load existing races from DB and build `Map<url, race>` for O(1) lookup~~ ✅
2. Scrape RunJapan listing pages to get current set of race URLs
3. For each URL: if already in map, reuse existing race object — skip detail page re-scrape
4. For new URLs: scrape detail page, add to output set
5. Drop races no longer appearing in RunJapan listing (stale races filtered by `cleanRaces`)
6. Merge and proceed to translation pass

### 7.4 Phase 3 — Chinese Translation

After the full scrape is complete, run a translation pass using DeepL API (EN → ZH-HANS).

**Timing:** Translate after all new races are scraped — not per-race during scraping. Races may be deduplicated or dropped during the scrape pass; translating only the final set avoids wasting DeepL quota on discarded records.

**Fields translated per race:**

| Source field | Translated field | Notes |
|---|---|---|
| `name` | `name_zh` | Full race name |
| `date` | `date_zh` | Date string as scraped |
| `location` | `location_zh` | Prefecture / city string |
| `entryStart` | `entryStart_zh` | Entry open date string |
| `entryEnd` | `entryEnd_zh` | Entry close date string |
| `description` | `description_zh` | Full description text |
| `info` (all keys + values) | `info_zh` | Translate keys and values recursively — preserve nested structure |
| `notice[]` | `notice_zh[]` | Translate each item individually |

**Failure handling:**
- If DeepL is unavailable or quota exceeded: upsert races with `_zh` fields set to `null` — UI falls back to English fields gracefully

**Technical decisions:**
- DeepL API key stored in scraper `.env`
- Translation runs as a post-scrape pass in the same process, before DB upsert

---

## 8. Engineering Challenges & Solutions

### 8.1 RunJapan Has No Public API

**Challenge:** All race data must be scraped from HTML. RunJapan's markup may change without notice.

**Solution:** Selectors isolated in config; validation aborts upsert (preserving existing DB rows) if < 30 races returned. Core scraping logic proven in production.

### 8.2 Scraper Pagination: Session-Dependent Navigation

**Challenge:** RunJapan's search results are paginated, but page 2+ URLs (e.g. `?command=page&pageIndex=2`) only return results when the server can resolve an active search session. The session is established by the initial `?command=search` request and tied to a cookie. When axios hits page 2 directly without that cookie, the server has no session context and returns an empty result set — silently, with no error.

**Symptoms:** Scraper consistently returns only 10 races (one page) regardless of the `limit` parameter. Page 2 URL is structurally correct but returns 0 cards.

**Solution:** Add a cookie jar to the axios instance using `tough-cookie` and `axios-cookiejar-support`. The jar automatically captures cookies set by the page 1 response and sends them with every subsequent request — exactly replicating the browser's session behaviour. No manual cookie extraction or header manipulation required.

### 8.3 Scraper Returns Only Enterable Races by Default

**Challenge:** RunJapan's search form submits a POST request (not GET) with a form body including `availableFlag: 1`, which filters results to currently-open-entry races only. The scraper was using a GET request to `?command=search`, which caused the server to apply this default filter — returning only ~22 enterable races and missing major races (Tokyo, Osaka, Kyoto) whose entry windows had already closed.

**Symptoms:** Scraper returns 22 races in a fresh session; browser logged-in session appeared to show 60 because the user had previously searched with the filter unchecked. Incognito browser confirmed the same 22 result count.

**Discovery:** Network tab inspection of a manual form submission (with "Enterable tournaments only" unchecked) revealed the actual POST payload. Key fields: `command=search`, `distanceClass=0`, `availableFlag=1` (the enterable-only flag).

**Solution:** Change the initial page 1 request from GET to POST with a form-encoded body matching the manual search, setting `availableFlag=0` to include all races regardless of entry status. Subsequent pagination requests (`?command=page&pageIndex=N`) remain GET requests using the session cookie established by the initial POST.

### 8.4 Full Re-Scrape Every Run Wastes DeepL Quota

**Challenge:** The scraper originally rebuilt the race set from scratch on every weekly run. With translation added, this would re-translate all ~60 races every run even when nothing changed — burning DeepL quota on identical content and adding unnecessary latency.

**Solution:** Incremental scraping. On startup, load existing races from DB (`SELECT * FROM races`) and build a `Map<url, race>` in memory. During the listing scrape, check each race URL against the map — if already present, reuse the existing object (including all `_zh` fields) and skip re-scraping the detail page. Only new URLs trigger a detail-page fetch. Translation pass then only runs on races missing `_zh` fields.

**Why URL as key, not name:** Each RunJapan URL contains a unique `raceId` (e.g. `raceId=E335908`). Names can repeat across years. URL is guaranteed unique for the lifetime of a listing.

**Why Map in memory, not re-query per race:** The Map is built once at startup from the full DB read. O(1) lookup per race URL during the scrape loop — no per-race DB queries needed.

### 8.5 Concurrent DeepL Requests Trigger Rate Limiting

**Challenge:** The initial translation implementation used `Promise.all` to translate all races concurrently. Each race made one DeepL API call per field (name, date, location, entryStart, entryEnd, description, each info key, each info value, each notice item) — resulting in hundreds of simultaneous requests. DeepL rejected these with a "Too many requests" error.

**Solution:** Two changes. First, batch all translatable strings for a race into a single array and make one `translateText` call per race (DeepL accepts an array of strings and returns results in order). Second, process races sequentially with a `for` loop instead of `Promise.all` — one batched call at a time, no concurrent requests.

**Tradeoff:** Sequential processing is slower than concurrent, but translation only runs on new races (existing races reuse cached `_zh` fields from incremental scraping). In practice, most weekly runs translate zero races.

---

## 9. Testing Strategy

The scraper is tested against live output — we can't guarantee which races appear, so tests validate shape and completeness, not exact content.

**`scraper.test.js`:**

- All required fields present on every race object (`name`, `date`, `location`, `entryStart`, `entryEnd`, `registrationOpen`, `registrationUrl`, `website`, `description`)
- No `null` or `undefined` values on required fields
- Minimum race count threshold (≥ 30)
- Date fields match expected format

---

## 10. Failure Handling

**Per-race failure:** The inner loop wraps each `getInfo()` call in try/catch. If a single race detail page times out, 404s, or has malformed HTML, the error is logged and the scraper continues to the next race.

**Retry behaviour:** `axios-retry` wraps the axios instance with 3 retries and exponential backoff (1s → 2s → 4s). Only retries transient failures (network errors, 5xx). 404s and 400s are not retried.

**Full scrape failure:** Upsert is skipped if fewer than 30 races are returned. Existing rows in `ecosystemdb.races` are preserved. Outcome logged to `scraper_run_logs` with `outcome: 'failed'`.

**Manual recovery:** SSH to Lightsail and run:
```bash
docker exec scraper node scripts/run-scraper.js
```

---

## 11. Repository Structure

```
services/scraper/
    ├── src/
    │   ├── scraper.js              # RunJapan scraper (two-pass, session cookie handling)
    │   ├── scheduler.js            # node-cron — Sunday 2am JST
    │   └── db/
    │       ├── pool.js             # pg Pool — DATABASE_URL from .env
    │       ├── queries.js          # getExistingRaces, upsertRace, insertRunLog, upsertPipelineState
    │       └── schema.sql          # races, pipeline_state, scraper_run_logs (all IF NOT EXISTS)
    ├── scripts/
    │   ├── run-scheduler.js        # Container entry point — starts cron daemon
    │   └── run-scraper.js          # Manual trigger — runs one scrape immediately
    ├── tests/
    │   ├── fixtures/
    │   │   └── sample-races.json   # Controlled race data for shape/completeness tests
    │   └── scraper.test.js         # Validates output shape, required fields, min race count
    ├── docs/
    │   ├── scraper-design-doc.md
    │   └── scraper-checklist.md
    ├── Dockerfile                  # node:22-alpine, CMD node scripts/run-scheduler.js
    ├── .dockerignore
    ├── .env.example
    └── package.json
```

**PostgreSQL — tables this service interacts with:**

| Table | Direction | Contains |
|---|---|---|
| `races` | Scraper writes | All upcoming race data from RunJapan |
| `scraper_run_logs` | Scraper writes | Per-run: timestamp, races scraped, failure count, failed URLs, outcome |
| `pipeline_state` | Scraper writes | `{ service: "scraper", state: "idle \| running \| failed" }` |
