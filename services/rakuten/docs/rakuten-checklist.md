x
- [x] Setup → §13 Repo Structure
  - [x] Initialize package.json
  - [x] Write .env.example (Rakuten API key, PostgreSQL credentials, WooCommerce credentials)
  - [x] Write .dockerignore
  - [x] Write .gitignore

- [x] Rakuten API integration (`src/services/rakutenAPI.ts`) → §3.2, §3.3
  - [x] Get products by keyword
  - [x] Get products by genre
  - [x] getRanking(genreId, count) — fetch top-ranked products per genre via Ranking API

- [x] Product normalization (`src/utils.ts`) → §4.1
  - [x] normalizeItem(rawItem) — map Rakuten API fields to internal product schema (moved to utils.ts)
  - [x] Add `availability` field to Rakuten API response + normalizeItems — maps to `stock_status` in DB

- [x] Config (`src/config/`) → §4.3 Pricing Formula, §6 Genre Map
  - [x] `config.ts` — per-category margin %, shipping estimate, JPY→CNY rate, fetch count, search fill threshold
  - [x] Fill in missing genre IDs in `genres.ts`

- [x] PostgreSQL product store → §4.2 Schema, §3.2 db/queries.ts
  - [x] Write schema.sql — categories, subcategories, products tables
  - [x] Install pg
  - [x] `src/db/seed.ts` — creates tables + seeds categories/subcategories, runs against rakutenDB
  - [x] `src/db/pool.ts` — PostgreSQL connection pool
  - [x] `src/db/queries.ts`
    - [x] upsertProduct — returns array of newly inserted itemURLs (RETURNING itemURL, xmax=0 filter)
    - [x] getProductByUrls(URLs: string[]) — fetch multiple products by URL array (WHERE itemURL = ANY($1))
    - [x] getProductsByGenreId
    - [x] getProductsByCategory
    - [x] incrementMissedScrapes
    - [x] deleteStaleProducts

- [x] Pricing (`src/services/pricing.ts`) → §4.3 Pricing Formula
  - [x] calculatePrice(price, category) — markup on cost formula: (price * yenToYuan * (1 + markup)) + shipping
  - [x] Reads per-category markup + shipping + yenToYuan from shared volume config.json at startup
  - [x] Rounds up to nearest 5 CNY

- [x] Tests (`tests/`) → no design doc section
  - [x] Install Vitest
  - [x] vitest.config.js — sets DATA_DIR to tests/fixtures for CI
  - [x] tests/fixtures/rakuten/config.json — test fixture with realistic markup values
  - [x] pricing.test.ts — all 5 categories, edge cases (price=0, large price), invalid category → NaN
  - [x] utils.test.ts — normalizeItems field mapping, schema shape, strips non-schema fields

- [ ] WooCommerce integration (`src/services/woocommerceAPI.ts`) → §5 WooCommerce Integration, §3.2
  - [x] setupCategories() — batch create parent categories then subcategories via WC REST API, returns name → WC ID map
  - [x] Category ID map hardcoded in `src/config/wpCategoryIds.ts` — generated once by running setupCategories(), IDs are stable after creation
  - [x] pushProduct(product, category) — push single product via WooCommerce REST API, assign WC category + subcategory IDs, returns WC product ID → saved to wc_product_id in DB
  - [ ] removeProduct(wcProductId) — delete product from WooCommerce by WC product ID
  - [ ] bulkPush(products) — push multiple products, log each to import_log.json
  - [ ] Idempotency check by rakuten_url (not SKU)

- [ ] Initial bulk push → §10.2 Phase 2, §3.3 Bulk Push Data Flow
  - [ ] Fetch top-ranked products per category via Ranking API
  - [ ] Normalize → price → upsert into PostgreSQL
  - [ ] Push all to WooCommerce

- [ ] Configure TranslatePress + DeepL on running.moximoxi.net → §7 Translation
  - [ ] Install TranslatePress plugin
  - [ ] Configure DeepL API key in TranslatePress settings
  - [ ] Verify JA → ZH-HANS translation fires on first product page view and caches in WordPress DB

- [ ] Product request flow → §9 Product Request Flow
  - Approach: always fetch X products fresh from Rakuten — no DB fill calculation.
    Products aren't indexed by keyword so there's no reliable way to count existing matches.
  - Products are pipeline-translated via DeepL (name + description JA → ZH) before WooCommerce push —
    unlike bulk products (TranslatePress lazy), these are guaranteed to be viewed immediately.
    This also means WooCommerce search by Chinese keyword works natively without any TranslatePress search integration.
  - Result: SSE "done" event sends `/shop/?s={keywordZH}` — customer lands on pre-searched results page.
  - [ ] DeepL ZH → JA keyword translation (customer searches in Chinese, Rakuten needs Japanese)
  - [ ] DeepL JA → ZH translation of product name + description before WooCommerce push
  - [ ] POST /api/request-product endpoint — translate keyword → Keyword Search API → for each result: check rakuten_url in DB (skip if exists) → normalize → price → translate name+desc → push WC → store DB → emit SSE progress
  - [ ] SSE progress stream (GET /api/request-product/status/:requestId) — emit after each product pushed
  - [ ] Embed progress indicator widget on WooCommerce search results page (shortcode or plugin)

- [ ] Weekly auto-sync cron → §3.3 Weekly Re-scrape Data Flow, §11.6 Stale Product Refresh
  - [ ] Fetch top-ranked products per category via Ranking API
  - [ ] Re-scrape upsert — skip unchanged, update if price changed, insert if new URL
  - [ ] For each stale product (missed_scrapes >= 3): call removeProduct(wc_product_id) → then deleteStaleProducts from DB
  - [ ] Write run_log.json and product_stats.json to shared volume after each run

- [ ] Shared volume output → §13 Shared Volume
  - [ ] Write `rakuten/run_log.json` after each pipeline run (operation, category, products fetched/pushed, failures, stale products deleted)
  - [ ] Write `rakuten/product_stats.json` after each run (total cached, total pushed, per-category breakdown)
  - [ ] Write `rakuten/import_log.json` per product WooCommerce push attempt and outcome
  - [ ] Read `rakuten/config.json` at runtime — per-category margin %, shipping estimate, JPY→CNY rate, fetch count, search fill threshold

- [ ] Dashboard integration (Express :3002 — internal only) → §2 Architecture, §3.2
  - [ ] POST /trigger — fetch more products (category + count)
  - [ ] POST /retry — retry failed WooCommerce imports
  - [ ] Pipeline state written to shared volume for dashboard health card (idle | running | failed)

- [ ] Deploy to AWS Lightsail → §10.3 Phase 3
