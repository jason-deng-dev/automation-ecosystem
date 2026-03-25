**Project:** automation-ecosystem — Scraper

**Platform:** running.moximoxi.net — Japanese marathon platform for Chinese runners

**GitHub:** [https://github.com/jason-deng-dev/automation-ecosystem](https://github.com/jason-deng-dev/automation-ecosystem) (`services/scraper/`)

**Author:** Jason Deng

**Date:** March 2026

**Status:** In Development — `scraper.js` ported to `services/scraper/`; Dockerfile and package.json not yet created

---

## 1. What This Is

The Scraper is a pure cron process running as a Docker container. It scrapes RunJapan weekly and writes `races.json` to a shared Docker volume. No HTTP server. No persistent process. Just a file writer on a schedule.

The Race Hub container reads `races.json` from that same volume and serves it to WordPress. They are fully decoupled — the scraper just writes a file, the Race Hub just reads it.

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
scraper/races.json     (shared Docker volume)
scraper/run_log.json
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
| `url` | RunJapan detail page URL |
| `date` | Race date |
| `location` | Prefecture / city |
| `entryStart` | Entry window open date |
| `entryEnd` | Entry window close date |
| `registrationOpen` | Boolean — derived from entry window |
| `registrationUrl` | Direct signup link |
| `website` | Race official site |
| `description` | Race description text |
| `info` | Additional race info |
| `notice` | Notices / warnings |
| `images` | Array of image URLs |

---

## 4. Scraping Approach

**Two-pass scrape:**

1. **Pass 1 — listing page:** POST `runjapan.jp` search endpoint with `availableFlag=0` (include all races, not just open-entry ones). Extract all race card links. Each card contains a `raceId` param (e.g. `raceId=E335908`).
2. **Pass 2 — detail pages:** For each race link, GET the detail page and extract structured data.

**Session handling:** The listing page is paginated. Page 2+ requires a cookie set by the initial POST response. Uses `tough-cookie` + `axios-cookiejar-support` to maintain the session automatically across requests.

**Output:** Writes `scraper/races.json` only if ≥ 30 races are returned — preserves last good output if run fails or returns partial data.

---

## 5. Output Files

Both files written to the shared Docker volume:

**`scraper/races.json`**
- Array of race objects (see §3 for schema)
- Includes `last_updated` ISO timestamp at top level
- Read by Race Hub container and XHS container

**`scraper/pipeline_state.json`**

Written at run start and end so the Dashboard can poll current scraper state.

```json
{ "state": "idle | running | failed" }
```

Written as `"running"` before the scrape starts, then updated to `"idle"` or `"failed"` when the run completes. Read by Dashboard via `GET /api/pipeline-state`.

---

**`scraper/run_log.json`**

Object keyed by ISO timestamp. Each entry represents one scraper run.

```json
{
  "2026-03-25T02:00:00.000Z": {
    "outcome": "success | failed",
    "races_scraped": 87,
    "failure_count": 2,
    "failed_urls": ["https://runjapan.jp/race/E123456"],
    "error_msg": null
  }
}
```

| Field | Type | Notes |
|---|---|---|
| `outcome` | string | `"success"` or `"failed"` |
| `races_scraped` | number | Number of races successfully written to races.json |
| `failure_count` | number | Number of detail pages that failed to scrape |
| `failed_urls` | string[] | URLs of races that failed — empty array on clean run |
| `error_msg` | string \| null | Top-level error message if run aborted, `null` otherwise |

Read by Dashboard to show scraper health and last run time.

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
|Output protection|Only overwrite races.json on successful run (≥ 30 races)|Always overwrite|Preserves last good data if scraper crashes or RunJapan returns partial results|
|Language|Node.js / JavaScript|Python|Consistent with rest of stack|

---

## 7. Implementation

### 7.1 Current Status

|Component|Status|Notes|
|---|---|---|
|Core scraping logic|✅ Done|`scraper.js` ported to `services/scraper/`|
|Scraper container (standalone)|🔧 In progress|scraper.js ported; Dockerfile + package.json + cron wiring still needed|
|races.json|🔧 Partial|Exists in xhs/data/, data stale — will be regenerated|
|run_log.json|❌ Not started|New — add structured logging to scraper|
|Deploy|❌ Not started|—|

### 7.2 Phase 1 — Standalone Scraper Container

1. ~~Port `scraper.js` from `services/xhs/src/scraper.js`~~ ✅ Done
2. Add structured `run_log.json` output (timestamp, races scraped, failure count, failed URLs, outcome)
3. Validate output — abort + preserve previous `races.json` if < 30 races returned
4. Wire weekly cron (Sunday 2am JST)
5. Dockerfile + docker-compose integration

**Exit criteria:** `races.json` contains 30+ races with complete data. Cron runs cleanly weekly. `run_log.json` written on each run.

---

## 8. Engineering Challenges & Solutions

### 8.1 RunJapan Has No Public API

**Challenge:** All race data must be scraped from HTML. RunJapan's markup may change without notice.

**Solution:** Selectors isolated in config; validation aborts without overwriting `races.json` if < 30 races returned. Core scraping logic proven in production.

### 8.2 Scraper Pagination: Session-Dependent Navigation

**Challenge:** RunJapan's search results are paginated, but page 2+ URLs (e.g. `?command=page&pageIndex=2`) only return results when the server can resolve an active search session. The session is established by the initial `?command=search` request and tied to a cookie. When axios hits page 2 directly without that cookie, the server has no session context and returns an empty result set — silently, with no error.

**Symptoms:** Scraper consistently returns only 10 races (one page) regardless of the `limit` parameter. Page 2 URL is structurally correct but returns 0 cards.

**Solution:** Add a cookie jar to the axios instance using `tough-cookie` and `axios-cookiejar-support`. The jar automatically captures cookies set by the page 1 response and sends them with every subsequent request — exactly replicating the browser's session behaviour. No manual cookie extraction or header manipulation required.

### 8.3 Scraper Returns Only Enterable Races by Default

**Challenge:** RunJapan's search form submits a POST request (not GET) with a form body including `availableFlag: 1`, which filters results to currently-open-entry races only. The scraper was using a GET request to `?command=search`, which caused the server to apply this default filter — returning only ~22 enterable races and missing major races (Tokyo, Osaka, Kyoto) whose entry windows had already closed.

**Symptoms:** Scraper returns 22 races in a fresh session; browser logged-in session appeared to show 60 because the user had previously searched with the filter unchecked. Incognito browser confirmed the same 22 result count.

**Discovery:** Network tab inspection of a manual form submission (with "Enterable tournaments only" unchecked) revealed the actual POST payload. Key fields: `command=search`, `distanceClass=0`, `availableFlag=1` (the enterable-only flag).

**Solution:** Change the initial page 1 request from GET to POST with a form-encoded body matching the manual search, setting `availableFlag=0` to include all races regardless of entry status. Subsequent pagination requests (`?command=page&pageIndex=N`) remain GET requests using the session cookie established by the initial POST.

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

**Full scrape failure:** `races.json` is only overwritten on a successful run (≥ 30 races returned). If the scraper crashes or returns fewer than the threshold, the previous `races.json` is preserved.

**Manual recovery:** Re-run the scraper container manually, or trigger via `POST /api/sync` on the Race Hub.

---

## 11. Repository Structure

```
services/scraper/
    ├── scraper.js                  # RunJapan scraper (ported from services/xhs/src/scraper.js)
    ├── run-scraper.js              # Entry point — runs scraper manually
    ├── tests/
    │   ├── fixtures/
    │   │   └── sample-races.json  # Controlled race data for shape/completeness tests
    │   └── scraper.test.js        # Validates output shape, required fields, min race count
    ├── docs/
    │   ├── scraper-design-doc.md
    │   └── scraper-checklist.md
    ├── Dockerfile                  # (to be created)
    └── package.json                # (to be created)
```

`scraper/races.json` and `scraper/run_log.json` live on the shared Docker volume at runtime — not committed to the repo.
