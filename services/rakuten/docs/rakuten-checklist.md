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

- [ ] PostgreSQL product store
  - [x] Write schema.sql — categories, subcategories, products tables
  - [x] Install pg
  - [x] `src/db/seed.ts` — creates tables + seeds categories/subcategories, runs against rakutenDB
  - [x] `src/db/pool.ts` — PostgreSQL connection pool
  - [ ] `src/db/queries.ts` — upsertProduct, getProductByUrl, getProductsByGenre, incrementAllMissedScrapes, deleteStaleProducts

- [ ] Pricing (`src/services/pricing.ts`)
  - [ ] calculatePrice(product, category) — apply margin formula per design doc Section 4.3
  - [ ] Load per-category config from pricing_config.ts

- [ ] WooCommerce integration (`src/services/woocommerce.ts`)
  - [ ] pushProduct(product) — push single product via WooCommerce REST API
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
  - [ ] Write run_log.json and product_stats.json to shared volume after each run

- [ ] Shared volume output
  - [ ] Write `rakuten/run_log.json` after each pipeline run (operation, category, products fetched/pushed, failures)
  - [ ] Write `rakuten/product_stats.json` after each run (total cached, total pushed, per-category breakdown)
  - [ ] Write `rakuten/import_log.json` per product WooCommerce push attempt and outcome
  - [ ] Read `rakuten/config.json` at runtime — per-category margin %, shipping estimate, JPY→CNY rate, fetch count, search fill threshold

- [ ] Dashboard integration (Express :3002 — internal only)
  - [ ] POST /trigger — fetch more products (category + count)
  - [ ] POST /retry — retry failed WooCommerce imports
  - [ ] Pipeline state written to shared volume for dashboard health card (idle | running | failed)

- [ ] Deploy to AWS Lightsail
