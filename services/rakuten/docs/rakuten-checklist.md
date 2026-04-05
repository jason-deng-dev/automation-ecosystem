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

- [x] Config → §4.3 Pricing Formula, §6 Genre Map, §11.6
  - [x] `shared_volume/rakuten/config.json` — per-category markup %, shipping estimate, JPY→CNY rate, pagesPerSubcategory, SearchFillThreshold
  - [x] `src/config/genres.ts` — Rakuten genre ID map; `categories` (category → genre ID[]) and `allGenres` (flat name → ID map for Claude) exported
  - [x] `src/config/wpCategoryIds.ts` — WooCommerce category name → ID map, hardcoded after setupCategories() + setupNewCategories() runs
  - Genre map stays static in genres.ts — Claude keyword flow returns a genre ID directly, runtime expansion not needed (see §11.6)

- [x] PostgreSQL product store → §4.2 Schema, §3.2 db/queries.ts
  - [x] Write schema.sql — categories, subcategories, products tables
  - [x] Install pg
  - [x] `src/db/seed.ts` — creates tables + seeds categories/subcategories, runs against rakutenDB
  - [x] `src/db/pool.ts` — PostgreSQL connection pool
  - [x] `src/db/queries.ts`
    - [x] upsertProduct(product) — returns [itemURL] if inserted, [] if updated (RETURNING itemURL, xmax=0 filter)
    - [x] upsertProducts(products[]) — loops upsertProduct, returns flat array of newly inserted URLs
    - [x] getProductByUrls(URLs: string[]) — fetch multiple products by URL array, joins categories to return categoryName
    - [x] getProductsByGenreId
    - [x] getProductsByCategory
    - [x] incrementMissedScrapes
    - [x] deleteStaleProducts
    - [x] updateWoocommerceProductId(product_id, wc_product_id) — sets wc_product_id + wc_pushed_at = NOW()

- [x] Pricing (`src/services/pricing.ts`) → §4.3 Pricing Formula
  - [x] calculatePrice(price) — formula: `price * yenToYuan`, rounded up to nearest 5 CNY; markup removed from pipeline (handled by WooCommerce plugin)
  - [x] Reads yenToYuan from shared volume config.json at startup; markup % removed from config
  - [x] Strip `?_ex=` query param from Rakuten image URLs in `normalizeItems` — serves full-res images to WooCommerce

- [x] Tests (`tests/`) → no design doc section
  - [x] Install Vitest
  - [x] vitest.config.js — sets DATA_DIR to tests/fixtures for CI
  - [x] tests/fixtures/rakuten/config.json — test fixture with realistic markup values
  - [x] pricing.test.ts — all 5 categories, edge cases (price=0, large price), invalid category → NaN
  - [x] utils.test.ts — normalizeItems field mapping, schema shape, strips non-schema fields

- [x] WooCommerce integration (`src/services/woocommerceAPI.ts`) → §5 WooCommerce Integration, §3.2
  - [x] setupCategories() — batch create parent categories + all subcategories via WC REST API, logs name → WC ID map to paste into wpCategoryIds.ts
  - [x] pushProduct(product) — push single product via WooCommerce REST API, derives category from product.categoryName, returns WC product ID
  - [x] pushProducts(products[]) — loops pushProduct, calls updateWoocommerceProductId after each successful push

---

- [x] Re-seed DB with new subcategories — run `npm run db` to apply seed.ts changes (9 new subcategories added)

- [x] WooCommerce cleanup + genre map expansion
  - [x] Manually delete all products + categories from WooCommerce admin
  - [x] `src/scripts/runKeywordScrape.ts` — scrape 68 keywords × 30 products, output genreId → keywords map
  - [x] Review output — 31 new subcategories identified and added to genres.ts, seed.ts, schema.sql, woocommerceAPI.ts
  - [x] Re-seed DB (`npm run db`)
  - [x] Run `setupCategories()` with full SUBCATEGORIES list → paste logged ID map into `wpCategoryIds.ts`
  - [x] Fix HTML-encoded `&amp;` in `wpCategoryIds.ts` — 3 keys corrected
  - [x] Fix ambiguous `Wear`/`Shoes` WC IDs — split into `Training Wear` (322) / `Wear` (305) and `Training Shoes` (323) / `Shoes` (304)

- [x] `genre_id` → `genre_ids INTEGER[]` migration — subcategories need multiple genre IDs (e.g. Triathlon has 568218 in seed but products return 402369)
  - [x] Update `seed.ts` — `genre_id INTEGER` → `genre_ids INTEGER[]`, all values become arrays; all 286 unmatched scrape IDs mapped to subcategories
  - [x] Update `schema.sql` — same column change + full ARRAY[] values
  - [x] Update `queries.ts` — `WHERE genre_id = $12` → `WHERE $12 = ANY(genre_ids)` and `getProductsByGenreId` query
  - [x] Re-seed DB (`npm run db`)
  - [x] Fix pg camelCase column aliasing in `getProductByUrls` — PostgreSQL lowercases unquoted identifiers, aliased back to match `DbItem`
  - [x] End-to-end pipeline verified — product pushed to WooCommerce with correct category, images, and price
  - [x] Fix image resolution — strip `?_ex=128x128` query param in `normalizeItems` so full-res images are stored and pushed to WooCommerce

- [x] Initial bulk push → §10.2 Phase 2, §3.3 Bulk Push Data Flow
  - [x] update arrReference
  - [x] Complete `runRankingPopulate.ts` loop body — fetch per genre 
  (`max(1, pagesPerSubcategory)` pages per subcategory — Ranking API returns fixed 30 products/page, no `hits` param; minimum 1 page = 30 products per subcategory), upsert, push
  - [x] Confirm markup = 0% in `shared_volume/rakuten/config.json` (operator decision — revisit later)
  - [x] Configure flat shipping rate per order in WooCommerce settings — ¥100 flat rate
  - [x] Add shipping policy note to WooCommerce cart page — per-product-type estimates + caveat for heavy orders (Chinese only)
  - [x] Run initial bulk push across all categories — WC cleared; clean run with `cleanTitle` + `_rakuten_url` meta pending; switch `runRankingPopulate.ts` back to `Object.entries(categories)` and run `npm run db` first

- [x] Product quality fixes
  - [x] Strip promotional text from titles — `cleanTitle()` in `utils.ts` strips 【...】, ★...★, date-limited promo prefixes; called at push time; promo text moved to WC `short_description`
  - [x] Audit + fix genre IDs returning off-theme products — removed Reflective Vest subcategory entirely (genre IDs were pulling industrial tools)

- [x] WooCommerce remaining → §5
  - [x] Idempotency check — skip push if wc_product_id already set in DB
  - [x] Store `_rakuten_url` as WC product meta in `pushProduct` — allows admin to trace WC product back to Rakuten source
  - [x] `functions.php` hook — displays Rakuten URL as clickable link on WP admin order detail page (`woocommerce_after_order_itemmeta`)
  - [x] Add `markupPercent` to `config.json` + apply in `calculatePrice()` — operator sets e.g. `20` for 20% markup
  - [x] `fs.watch` on `config.json` in app — when `markupPercent` or `YenToYuan` changes, recalculate + re-push prices for all products with `wc_product_id` via WC REST API (PUT /products/{id})

- [x] Configure TranslatePress + Google Translate on running.moximoxi.net → §7 Translation
  - [x] Install TranslatePress (free) plugin
  - [x] Set source language: Japanese, target: Chinese (Simplified)
  - [x] Configure Google Translate API key in TranslatePress settings
  - [x] Verified JA → ZH-HANS translation fires on first product page view and caches in WordPress DB
  - [x] Fixed category names manually in WooCommerce admin — corrected bad Google Translate guesses (跳绳, 阻力带, 跑步帽, 颈套, 蛋白粉 etc.)
  - [ ] Translation quality upgrade — discuss DeepL Pro API with boss (see §12 Open Questions)

- [x] DeepL translation (`src/utils.ts`) → §11.12
  - Translate product `name_ja` → `name_zh` via DeepL API before DB store + WooCommerce push
  - Names only — descriptions stay Japanese (TranslatePress handles lazily on first page view)
  - Translation wired inside `rakutenAPI.ts` — `getProductsByKeyword` and `getRanking` translate before returning; all call sites already await them, no other changes needed
  - [x] Add DEEPL_API_KEY to .env.example
  - [x] `translateNames(products[])` in `src/utils.ts` — one DeepL API call per batch: collect all `itemName` values into array, send single request, zip translations back onto products by index
  - [x] Call `translateNames` inside `getProductsByKeyword` and `getRanking` in `rakutenAPI.ts` after `normalizeItems`
  - [x] No separate `name_zh` field needed — `translateNames` overwrites `itemName` in place; Chinese name flows through as `itemName` to DB and WooCommerce unchanged

- [x] Weekly auto-sync cron → §3.3 Weekly Re-scrape Data Flow, §11.8 Stale Product Refresh
  - [x] Fetch top-ranked products per category via Ranking API
  - [x] If scraped product URL already in DB and price changed → update DB + re-push to WC (PUT product price)
  - [x] If scraped product has availability=0 → remove from WC (DELETE) + remove from DB immediately
  - [x] For each stale product (missed_scrapes >= 3, i.e. not seen in last 3 weekly scrapes) → remove from WC + delete from DB
  - [x] Write run_log.json and product_stats.json to shared volume after each run
  - [x] Wire up to node-cron in app.ts (schedule: every Monday 3am JST)

- [ ] Product request flow → §9 Product Request Flow
  - Approach: always fetch X products fresh from Rakuten — no DB fill calculation.
    Products aren't indexed by keyword so there's no reliable way to count existing matches.
  - Names already in Chinese via pipeline DeepL translation — no extra translation needed for request flow
  - Result: returns { productIds: [...] } — shortcode renders [products ids="..."] grid inline (see §11.11)
  - [x] POST /api/request-product endpoint — Chinese keyword → genre validation → upsert DB → push WC → return { success, productIds }
  - [ ] Embed request form widget on WooCommerce search results page (shortcode) — show loading state on submit, render inline product grid on success via [products ids="..."]

- [ ] Dashboard integration (Express :3002 — internal only) → §2 Architecture, §3.2
  - [ ] POST /trigger — fetch more products (category + count)
  - [ ] POST /retry — retry failed WooCommerce imports
  - [ ] Pipeline state written to shared volume for dashboard health card (idle | running | failed)

- [ ] Shared volume output → §13 Shared Volume
  - [x] Write `rakuten/run_log.json` after each pipeline run (operation, category, products fetched/pushed, failures, stale products deleted)
  - [x] Write `rakuten/product_stats.json` after each run (total cached, total pushed, per-category breakdown)
  - [ ] Write `rakuten/import_log.json` per product WooCommerce push attempt and outcome

- [ ] Deploy to AWS Lightsail → §10.3 Phase 3
  - [ ] `pg_dump rakutenDB > dump.sql` locally → copy to server → `psql rakutenDB < dump.sql` inside postgres container — preserves `wc_product_id` so idempotency check prevents duplicate WC pushes

---

## Handoff Document — TODO

- [ ] Write handoff doc covering operator-managed configuration:
  - **Markup:** Discount Rules for WooCommerce plugin — how to install, create a percentage markup rule globally or per category, and verify it's applying correctly on product pages
  - **Flat shipping rate:** WooCommerce → Settings → Shipping → Shipping Zones — how to set a flat rate per order and update it when shipping costs change
  - **Shipping policy note:** where the checkout page note lives and how to edit the category-based estimates
  - **Exchange rate:** how to update `YenToYuan` in `shared_volume/rakuten/config.json` when the JPY→CNY rate changes significantly
  - **Running the pipeline:** how to trigger a manual bulk push or re-scrape

---

## Nice to Have (if time allows after launch)

- [ ] Claude quality check on keyword request flow → §9.4
  - [ ] Stage 1 — validate keyword relevance (yes/no), abort early if off-theme
  - [ ] Stage 2 — feed `allGenres` map, return best-fit genre ID as fallback for unknown genres
