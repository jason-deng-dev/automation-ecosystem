x
- [x] Setup
  - [x] Initialize package.json
  - [x] Write .env.example (Rakuten API key, PostgreSQL credentials, WooCommerce credentials)
  - [x] Write .dockerignore
  - [x] Write .gitignore

- [x] Rakuten API integration (`src/services/rakutenAPI.ts`)
  - [x] Get products by keyword
  - [x] Get products by genre
  - [x] getRanking(genreId, count) — fetch top-ranked products per genre via Ranking API

- [x] Product normalization (`src/utils.ts`)
  - [x] normalizeItem(rawItem) — map Rakuten API fields to internal product schema (moved to utils.ts)
  - [x] Add `availability` field to Rakuten API response + normalizeItems — maps to `stock_status` in DB

- [x] Config (`src/config/`)
  - [x] `config.ts` — per-category margin %, shipping estimate, JPY→CNY rate, fetch count, search fill threshold
  - [x] Fill in missing genre IDs in `genres.ts`

- [x] PostgreSQL product store
  - [x] Write schema.sql — categories, subcategories, products tables
  - [x] Install pg
  - [x] `src/db/seed.ts` — creates tables + seeds categories/subcategories, runs against rakutenDB
  - [x] `src/db/pool.ts` — PostgreSQL connection pool
  - [x] `src/db/queries.ts`
    - [x] upsertProduct
    - [x] getProductByUrl
    - [x] getProductsByGenreId
    - [x] getProductsByCategory
    - [x] incrementMissedScrapes
    - [x] deleteStaleProducts

- [x] Pricing (`src/services/pricing.ts`)
  - [x] calculatePrice(price, category) — markup on cost formula: (price * yenToYuan * (1 + markup)) + shipping
  - [x] Reads per-category markup + shipping + yenToYuan from shared volume config.json at startup
  - [x] Rounds up to nearest 5 CNY

- [x] Tests (`tests/`)
  - [x] Install Vitest
  - [x] vitest.config.js — sets DATA_DIR to tests/fixtures for CI
  - [x] tests/fixtures/rakuten/config.json — test fixture with realistic markup values
  - [x] pricing.test.ts — all 5 categories, edge cases (price=0, large price), invalid category → NaN
  - [x] utils.test.ts — normalizeItems field mapping, schema shape, strips non-schema fields

- [ ] WooCommerce integration (`src/services/woocommerceAPI.ts`)
  - [x] setupCategories() — batch create parent categories then subcategories via WC REST API, returns name → WC ID map
  - [x] Category ID map hardcoded in `src/config/wpCategoryIds.ts` — generated once by running setupCategories(), IDs are stable after creation
  - [x] pushProduct(product, category) — push single product via WooCommerce REST API, assign WC category + subcategory IDs, returns WC product ID → saved to wc_product_id in DB
  - [ ] removeProduct(wcProductId) — delete product from WooCommerce by WC product ID
  - [ ] bulkPush(products) — push multiple products, log each to import_log.json
  - [ ] Idempotency check by rakuten_url (not SKU)

- [ ] Initial bulk push
  - [ ] Fetch top-ranked products per category via Ranking API
  - [ ] Normalize → price → upsert into PostgreSQL
  - [ ] Push all to WooCommerce

- [ ] Configure TranslatePress + DeepL on running.moximoxi.net
  - [ ] Install TranslatePress plugin
  - [ ] Configure DeepL API key in TranslatePress settings
  - [ ] Verify JA → ZH-HANS translation fires on first product page view and caches in WordPress DB

- [ ] Product request flow
  - [ ] POST /api/request-product endpoint — keyword → Ranking API → normalize → price → store → push
  - [ ] SSE progress stream (GET /api/request-product/status/:requestId)
  - [ ] Embed progress indicator widget on WooCommerce search results page (shortcode or plugin)

- [ ] Weekly auto-sync cron
  - [ ] Fetch top-ranked products per category via Ranking API
  - [ ] Re-scrape upsert — skip unchanged, update if price changed, insert if new URL
  - [ ] For each stale product (missed_scrapes >= 3): call removeProduct(wc_product_id) → then deleteStaleProducts from DB
  - [ ] Write run_log.json and product_stats.json to shared volume after each run

- [ ] Shared volume output
  - [ ] Write `rakuten/run_log.json` after each pipeline run (operation, category, products fetched/pushed, failures, stale products deleted)
  - [ ] Write `rakuten/product_stats.json` after each run (total cached, total pushed, per-category breakdown)
  - [ ] Write `rakuten/import_log.json` per product WooCommerce push attempt and outcome
  - [ ] Read `rakuten/config.json` at runtime — per-category margin %, shipping estimate, JPY→CNY rate, fetch count, search fill threshold

- [ ] Dashboard integration (Express :3002 — internal only)
  - [ ] POST /trigger — fetch more products (category + count)
  - [ ] POST /retry — retry failed WooCommerce imports
  - [ ] Pipeline state written to shared volume for dashboard health card (idle | running | failed)

- [ ] Deploy to AWS Lightsail
