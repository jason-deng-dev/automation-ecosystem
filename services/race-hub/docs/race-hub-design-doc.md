**Project:** automation-ecosystem — Race Hub

**Platform:** running.moximoxi.net — Japanese marathon platform for Chinese runners

**GitHub:** [https://github.com/jason-deng-dev/automation-ecosystem](https://github.com/jason-deng-dev/automation-ecosystem) (`services/race-hub/`)

**Author:** Jason Deng

**Date:** March 2026

**Status:** Not started

---

## 1. What This Is

The Race Hub is a persistent Express server running as a Docker container on AWS Lightsail. It reads `races.json` from the shared Docker volume (written weekly by the Scraper container) and serves it to the WordPress site via REST API. A React SPA embedded in WordPress as a plugin fetches from this API and renders the race listings page.

The Race Hub has no scraping logic. It is a pure data server — reads a file, serves it via HTTP, applies query param filtering.

---

## 2. Architecture

```
┌──────────────── AWS Lightsail VPS (docker-compose) ────────────────┐
│                                                                     │
│  [Scraper container]              [Race Hub container]              │
│   cron: scraper.js weekly          Express :3001 (always up)        │
│   no HTTP server                   GET /api/races                   │
│   pure cron process                GET /api/races/:id               │
│          │                         GET /api/races/upcoming          │
│          │ writes                         │                         │
│          ▼                               │ reads                    │
│    scraper/races.json  ◄─────────────────┘                          │
│    (shared volume)                                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                  HTTPS
                              GET /api/races
                                    │
                                    ▼
                       [WordPress plugin on running.moximoxi.net]
                        React SPA bundled as WP plugin
                        shortcode: [race_hub]
                        fetches from Race Hub API on page load
                        renders race listing + detail views
                                    │
                                    ▼
                       running.moximoxi.net/racehub/
```

**Scraper and Race Hub are separate containers.** The Scraper is a pure cron process — no HTTP server. The Race Hub is a persistent Express server. They are decoupled: the scraper writes a file, the Race Hub serves it. Either can be restarted independently.

**How WordPress receives the data:** The React SPA is bundled (Vite) and registered as a WordPress plugin. When a visitor loads the race hub page, the browser makes a `GET /api/races` request directly to the Race Hub container on Lightsail. WordPress just hosts the shortcode and the bundled JS/CSS — all data and logic live on the VPS. CORS is configured to allow requests from `running.moximoxi.net`.

---

## 3. Express API

### 3.1 Endpoints

|Method|Endpoint|Description|
|---|---|---|
|`GET`|`/api/races`|Serves full `races.json` — optional `?lang` param|
|`GET`|`/api/races?lang=zh`|Same response, but `description_zh` and `notice_zh` fields included in output|
|`GET`|`/api/races?lang=en`|English-only response (default) — `_zh` fields stripped|

### 3.2 Implementation Notes

- Reads `races.json` from the shared Docker volume on each request (read-on-request — no cache)
- All filtering, sorting, search, and detail views are handled client-side in the React SPA
- CORS configured to allow `running.moximoxi.net` as origin
- Manual scrape trigger is handled by the Dashboard (`POST /api/scraper/trigger`) — Race Hub is a pure data server with no process-spawning logic
- `?lang` param shapes the response: `lang=zh` includes `description_zh` and `notice_zh[]`; default (`lang=en`) strips those fields. The SPA reads `?lang` from the page URL and forwards it to the API.

---

## 4. React SPA (WordPress Plugin)

### 4.1 Race Listing View

- Card grid of upcoming races, sorted by date ascending by default
- Each card shows: race name, date, location, entry status badge
- Search bar: race name substring match
- Filter by entry status: All / Open / Closed
- Filter by date range
- Click card → race detail view

### 4.2 Race Detail View

- Full race info: name, date, location, entry period, description, images
- Entry status badge
- **"Register Now" button** — links to `registrationUrl` (RunJapan signup page), opens in new tab
- CTA section linking to platform ecosystem:
  - Race Hub (full details + more races)
  - Store (Japanese running products)
  - Community (runners planning the same race)
  - Marathon Prep Tools

### 4.3 UI States

- Loading skeleton on initial fetch
- Empty state when filters return no results
- Error state if Express API is unreachable

### 4.4 Tech Stack

- **React + Vite + Tailwind CSS**
- Tailwind configured with design system tokens from `docs/design-system.md` — same colour palette, spacing, and typography as the dashboard
- Styling follows the design system: Goldwin-inspired minimal aesthetic, sharp corners, warm off-white background, deep red accent (`#C8102E`)
- No border-radius on any element per design system

### 4.5 WordPress Integration

- React app bundled with Vite, output to `wp-plugin/dist/`
- WordPress plugin registers shortcode `[race_hub]`
- Shortcode enqueues the bundled JS/CSS and renders a mount point div
- Operator adds shortcode to any WordPress page — no code changes needed
- Tailwind output is scoped via a wrapper class to avoid clashing with the active WordPress/Flatsome theme CSS

---

## 4b. Internationalisation (i18n)

The platform's live deployment targets Chinese runners — the SPA must render in Chinese. The portfolio version (English) runs from the same codebase and same deployment.

### Language Switching

Language is controlled via a URL query param: `?lang=zh` for Chinese, `?lang=en` (or no param) for English.

- The SPA reads `window.location.search` on mount to determine the active language
- The language is passed as a `?lang` query param to `GET /api/races` so the server can include or exclude `_zh` fields accordingly
- No localStorage, no cookies — language is purely URL-driven, making it shareable and predictable

### Two deployments, one codebase

| URL | Language | Use |
|---|---|---|
| `running.moximoxi.net/racehub/` | Chinese (default, `?lang=zh`) | Live deployment for users |
| `running.moximoxi.net/racehub/?lang=en` | English | Portfolio showcase |

### UI Strings

All static UI strings (labels, placeholders, section headings, CTA copy) live in locale files:

```
wp-plugin/src/locales/
    en.js   — English strings
    zh.js   — Chinese strings (simplified)
```

A `useLang()` hook reads the URL param and returns the correct locale object. Components import the hook and use `t.someKey` for all visible text — no hardcoded English strings in JSX.

### Race Data

Chinese content comes from the scraper's translation pass (DeepL EN→ZH-HANS). The following `_zh` fields are present on each race object in `races.json`:

| `_zh` field | Source field |
|---|---|
| `name_zh` | `name` |
| `date_zh` | `date` |
| `location_zh` | `location` |
| `entryStart_zh` | `entryStart` |
| `entryEnd_zh` | `entryEnd` |
| `description_zh` | `description` |
| `info_zh` | `info` (all keys + values, nested structure preserved) |
| `notice_zh[]` | `notice[]` (each item translated individually) |

The API only returns `_zh` fields when `?lang=zh` is passed — keeping the default response lean.

**Fallback:** If any `_zh` field is `null` (DeepL unavailable or untranslated), the SPA falls back to the corresponding English field silently.

---

## 5. Technical Decisions

|Decision|Choice|Alternatives Considered|Rationale|
|---|---|---|---|
|Data delivery|Express API serving races.json|WP custom post types + WP REST API|No WP DB schema needed; scraper just updates a file; any developer can understand the flow|
|Frontend embedding|React SPA as WordPress plugin|Standalone deployment, WP theme templates|Operator never leaves WordPress; maintainable by any WP developer; no separate hosting needed|
|Data store|races.json flat file (read-only for Race Hub)|PostgreSQL, SQLite|Sufficient for ~100-200 races; zero infra overhead; easy to inspect|
|Memory vs disk read|Read-on-request|In-memory cache with TTL|~50KB file, reads are instantaneous, no cache invalidation needed after scraper runs|
|Bundler|Vite|Create React App, Webpack|Fast dev server, clean static output for WordPress plugin embedding; Next.js rejected — SSR/file-based routing add complexity with no benefit for a WordPress-embedded widget|
|Styling|Tailwind CSS|Plain CSS modules, CSS-in-JS|Matches dashboard stack for consistency; design system tokens configured in tailwind.config.js; fast to build utility-heavy UI|
|i18n strategy|URL `?lang` param + locale files|Two separate repos, separate deployments, runtime language switcher|Single codebase, one deployment; `?lang=zh` for live, `?lang=en` for portfolio; no localStorage complexity|
|Chinese race content|`_zh` fields in races.json (scraper translates)|Separate races_zh.json, translate in Race Hub on-request|Single source of truth; no sync problem; translation only happens once in scraper pipeline|

---

## 6. Implementation Phases

### Phase 1 — Express API

1. Build Express server: `GET /api/races` — serves full `races.json`
2. Add CORS for `running.moximoxi.net`
3. Dockerfile + docker-compose integration

**Exit criteria:** `GET /api/races` returns the full race list from `races.json`.

### Phase 2 — React SPA WordPress Plugin

1. Build React SPA: race listing, filter panel, search, detail view with signup link and CTAs
2. Bundle with Vite, output to `wp-plugin/dist/`
3. Build WordPress plugin: register shortcode, enqueue bundled assets
4. Upload plugin to running.moximoxi.net, add shortcode to race hub page
5. Smoke test end-to-end: WordPress page loads → React SPA fetches from Lightsail API → races display

**Exit criteria:** Race hub page on running.moximoxi.net shows live races with filtering, detail view, and signup links working.

### Phase 3 — Internationalisation

1. Write `wp-plugin/src/locales/en.js` and `wp-plugin/src/locales/zh.js` — all UI strings
2. Implement `useLang()` hook — reads `?lang` from URL, returns active locale object
3. Replace all hardcoded English strings in JSX with `t.key` references
4. Add `?lang` param to the `GET /api/races` fetch in App.jsx
5. Add `?lang` handling to `server.js` — include or strip `_zh` fields from response accordingly
6. Render `description_zh` / `notice_zh` in Drawer when `lang=zh`, with fallback to English fields if `_zh` is null
7. Smoke test: `?lang=zh` shows Chinese copy + Chinese race descriptions; `?lang=en` shows English throughout

**Exit criteria:** `?lang=zh` and `?lang=en` both render correctly. Live deployment defaults to Chinese. Portfolio URL uses English.

---

## 7. Engineering Challenges

### 7.1 Distance Extraction from Unstructured Scraper Data

**Challenge:** The scraper stores distance inside `info["Event/Eligibility"]` as inconsistent natural-language strings. There is no clean `distance` field — filtering by distance requires parsing these strings client-side in `extractDistance.js`.

**Approach:**
- On page load, after fetching `races.json`, run `extractDistance(races)` which maps each race to add a `distances: []` field
- Scan the keys of `info["Event/Eligibility"]` for distance patterns
- Categorise into buckets: **10K** (≤12km), **Half** (18–23km), **Full** (40–45km), **Ultra** (>45km), **Other** (no parseable distance)
- Filter UI: quick-pick toggles (10K / Half / Full / Ultra) + custom km range input for uncategorised races

**Parsing edge cases to handle (sourced from actual races.json scan):**

*Units and spacing:*
- `"16 km"` / `"5km"` / `"5 km"` — space between number and unit is optional
- `"70k"` / `"KAI70k"` / `"14KM"` — `k` and `K` as shorthand for km
- `"100mi (161km)"` — miles shorthand; prefer km equivalent if present, else convert (×1.60934)
- `"500m"` / `"Parent-child run (500m)"` — metres, convert to km (÷1000)
- `"Mini  2KM"` — multiple spaces between parts

*Multiple values in one string:*
- `"[Advanced class] 30km (GPS 24.5km)"` — two km values; pick the first (stated) not the GPS-corrected one
- `"【50K】51.2km"` / `"【15K】16.7km"` — abbreviated label + exact value; use the exact numeric km
- `"CASJ 90k - 86.7 km"` — abbreviated then exact; prefer exact

*Named distances (no number):*
- `"Full Marathon（Start time 8:30）"` / `"Full Marathon(42.195km)"` — infer 42.195 if no number present
- `"Half Marathon"` / `"Half marathon (21.0975 km)"` — infer 21.0975 if no number present
- `"Marathon―42.195KM"` — em-dash separator

*Elevation and dates mixed in:*
- `"20km/±2100m Sky TARO / May 4"` — strip elevation (`±`, `D+`, `/+`) and date portions, extract km only
- `"3.5km/+700m Vertical TREKKING / May 3"` — same pattern
- `"42.195km\n(certified)"` — newline/whitespace inside string, strip before parsing
- `"【April 24】 FUJI100mi"` — full-width date bracket prefix, ignore date portion

*Japanese formatting:*
- Full-width brackets `【】` and parentheses `（）` — treat same as `[]` and `()`
- Japanese comma `、` and middle dot `・` used as separators — ignore
- `"15km (14.3km、D+361m)"` — Japanese comma in elevation notation

*Distance after category label:*
- `"Solo 18km"` — distance follows the category name, not precedes it
- `"14KM: Pair"` — colon between distance and category

*Time-based / non-distance keys:*
- `"4-Hours Team"` / `"4-Hours Individual"` — time-based, no distance → classify race as Other
- `"Fuji Hill Ride Tour – Plan A"` — bike event, no distance → Other
- Keys with no parseable distance at all → skip, classify race as Other

**Multi-distance races:** Show under all matching categories. `extractDistance` returns an array of all parsed distances per race; the filter uses `.some()`, so a race with both a 10K and a Full will match both buckets.

---

## 8. Resolved Decisions

- **Image handling:** Hotlink from RunJapan CDN. If RunJapan changes image URLs, the scraper gets updated at the same time — they're from the same source. Downloading and re-serving adds infra complexity for no real benefit.
- **Cache strategy:** Read-on-request. `races.json` is ~50KB for 60 races — reads are instantaneous, and there's no cache invalidation needed after a scrape runs.
- **Filtering:** Client-side in React SPA. ~60 races is trivially small — fetch once on page load, filter/sort/search in memory. No server-side query params needed.
- **Alerts:** Dashboard shows an alert if the weekly scrape returns < 30 races — already in the dashboard spec (§3).

---

## 9. Repository Structure

```
automation-ecosystem/
    └── services/
        ├── scraper/                    # Scraper container (pure cron, no HTTP)
        │   └── scraper.js              #   RunJapan scraper
        └── race-hub/                   # Race Hub container (this service)
            ├── server.js               #   Express API
            ├── wp-plugin/              #   WordPress plugin
            │   ├── race-hub.php        #     Registers [race_hub] shortcode, enqueues assets
            │   ├── src/
            │   │   ├── locales/
            │   │   │   ├── en.js       #     English UI strings
            │   │   │   └── zh.js       #     Chinese UI strings (simplified)
            │   │   └── hooks/
            │   │       └── useLang.js  #     Reads ?lang URL param, returns active locale
            │   └── dist/              #     Vite build output (bundled React SPA)
            ├── Dockerfile
            └── package.json
```
