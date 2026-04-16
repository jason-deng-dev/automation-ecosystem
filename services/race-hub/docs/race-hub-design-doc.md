## 1. What This Is

The Race Hub is a persistent Express server running as a Docker container on AWS Lightsail. It reads the `races` table from `ecosystemdb` (written weekly by the Scraper container) and serves it to the WordPress site via REST API. A React SPA embedded in WordPress as a plugin fetches from this API and renders the race listings page.

The Race Hub has no scraping logic. It is a pure data server — reads from DB, serves it via HTTP, applies query param filtering.

---

## 2. Architecture

```
┌──────────────── AWS Lightsail VPS (docker-compose) ────────────────┐
│                                                                     │
│  [Scraper container]              [Race Hub container]              │
│   cron: scraper.js weekly          Express :3001 (always up)        │
│   no HTTP server                   GET /api/races                   │
│   pure cron process                       │                         │
│          │ writes                         │ reads                   │
│          ▼                               ▼                          │
│         PostgreSQL: ecosystemdb → races table                       │
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

**Scraper and Race Hub share `ecosystemdb`.** The Scraper is a pure cron process — no HTTP server. The Race Hub is a persistent Express server. They are decoupled via the DB: the scraper upserts rows into `races`, the Race Hub reads them. Either can be restarted independently.

**How WordPress receives the data:** The React SPA is bundled (Vite) and registered as a WordPress plugin. When a visitor loads the race hub page, the browser makes a `GET /api/races` request directly to the Race Hub container on Lightsail. WordPress just hosts the shortcode and the bundled JS/CSS — all data and logic live on the VPS. CORS is configured to allow requests from `running.moximoxi.net`.

---

## 3. Express API

### 3.1 Endpoints

|Method|Endpoint|Description|
|---|---|---|
|`GET`|`/api/races`|Serves full `races.json` — all fields including `_zh` always included|

### 3.2 Implementation Notes

- Reads `races.json` from the shared Docker volume on each request (read-on-request — no cache)
- All filtering, sorting, search, and detail views are handled client-side in the React SPA
- CORS configured to allow `running.moximoxi.net` as origin
- Manual scrape trigger is handled by the Dashboard (`POST /api/scraper/trigger`) — Race Hub is a pure data server with no process-spawning logic
- Always returns the full race data including all `_zh` fields — language selection is handled entirely client-side in the React SPA

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

Language is controlled by a toggle button visible on the page. The active language is persisted in `localStorage` so the user's choice survives page reloads.

- Default language: `zh` (live deployment targets Chinese runners)
- `useLang()` hook reads from `localStorage` on mount, exposes `[lang, setLang]`
- Toggle button calls `setLang`, updates both state and `localStorage`
- Language state controls which fields React renders — API always returns the full payload

### UI Strings

All static UI strings (labels, placeholders, section headings, CTA copy) live in locale files:

```
wp-plugin/src/locales/
    en.js   — English strings
    zh.js   — Chinese strings (simplified)
```

Components call `useLang()` and use `t.someKey` for all visible text — no hardcoded strings in JSX.

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

The API always returns the full race payload — all `_zh` fields are included in every response. The React SPA reads `lang` from state and picks the appropriate field to render.

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
|i18n strategy|Toggle button + localStorage + locale files|URL `?lang` param, two separate repos/deployments|Single codebase, one deployment; toggle is more discoverable than URL params; localStorage persists user's choice across page loads; default `zh` for live deployment|
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
2. Implement `useLang()` hook — reads from `localStorage` (default `'zh'`), exposes `[lang, setLang]`; `setLang` updates both state and `localStorage`
3. Add language toggle button to FilterBar
4. Replace all hardcoded English strings in JSX with `t.key` references
5. Render `_zh` fields in Drawer when `lang=zh` (name, date, location, entryStart/End, description, info, notice), fallback to English fields if `_zh` is null — API always returns full data, React picks the right field
8. Smoke test: toggle to `zh` shows Chinese copy + Chinese race data; toggle to `en` shows English throughout; null `_zh` falls back gracefully

**Exit criteria:** Toggle works on live deployment. Default is Chinese. English toggle works for portfolio demo. Fallback for null `_zh` fields confirmed.

---

## 7. Engineering Challenges

### 7.1 Distance Extraction from Unstructured Scraper Data

**Challenge:** The scraper stores distance inside `info["Event/Eligibility"]` as inconsistent natural-language strings — no clean `distance` field. Filtering by distance requires parsing these strings client-side in `extractDistance.js`.

**Approach:**
- On page load, after fetching `races.json`, run `extractDistance(races)` which maps each race to add a `distances: []` field
- Scan the keys of `info["Event/Eligibility"]` for distance patterns
- Categorise into buckets: **10K** (≤12km), **Half** (18–23km), **Full** (40–45km), **Ultra** (>45km), **Other** (no parseable distance)
- Filter UI: quick-pick toggles (10K / Half / Full / Ultra) + custom km range input for uncategorised races
- Multi-distance races appear under all matching buckets — `extractDistance` returns `distances: []` array, filter uses `.some()`
- Edge cases (units, Japanese formatting, elevation mixed in, named distances) are documented in code comments inside `extractDistance.js`

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
            │   │   ├── App.jsx         #     Root — fetch, filter state, grid + drawer
            │   │   ├── main.jsx        #     React entry point
            │   │   ├── index.css       #     Tailwind + design system tokens
            │   │   ├── components/
            │   │   │   ├── Badge.jsx
            │   │   │   ├── Drawer.jsx
            │   │   │   ├── FilterBar.jsx
            │   │   │   ├── Header.jsx
            │   │   │   ├── RaceCard.jsx
            │   │   │   └── SkeletonCard.jsx
            │   │   ├── hooks/
            │   │   │   └── useLang.js  #     Reads/writes localStorage, exposes [lang, setLang]
            │   │   ├── locales/
            │   │   │   ├── en.js       #     English UI strings
            │   │   │   └── zh.js       #     Chinese UI strings (simplified)
            │   │   └── utils/
            │   │       ├── extractDate.js
            │   │       ├── extractDistance.js
            │   │       ├── extractRegion.js
            │   │       └── status.js
            │   └── dist/               #     Vite build output (bundled React SPA)
            ├── Dockerfile
            └── package.json
```

**Shared volume — local dev:** `shared_volume/` at repo root. Set `DATA_DIR=../../shared_volume` in `.env`.

**Shared volume — files this service interacts with:**

| File | Direction | Contains |
|---|---|---|
| `shared_volume/scraper/races.json` | Race Hub reads | All upcoming race data — served via `GET /api/races` |
