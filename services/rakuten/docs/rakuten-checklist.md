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

- [x] Remove `cleanTitle` call in `woocommerceAPI.ts` — `itemName` is already cleaned + translated before reaching push; dropped `short_description` (promoText is Rakuten-specific noise, meaningless on WooCommerce)

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
  - [x] Translation quality upgrade — discuss DeepL Pro API with boss (see §12 Open Questions)

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

- [x] Shared volume → PostgreSQL migration → §11.16
  <!-- - [x] Add `config` table to `seed.ts` — single row: YenToYuan, markupPercent, pagesPerSubcategory, searchFillThreshold -->
  - [x] Add `getConfig()`, `updateConfig()`, `insertRunLog()`, `upsertProductStats()`, `insertImportLog()` queries in `queries.ts`
  - [x] Replace `fs.readFileSync(config.json)` in `controller.ts` + `pricing.ts` with DB config read at startup
  - [x] Replace `fs.watch` in `app.ts` with `POST /api/config` endpoint — updates DB row + triggers `reloadConfig()` + `updatePrices()`
  - [x] Add `run_logs`, `product_stats`, `import_logs` tables to `seed.ts`
  - [x] Replace JSON file writes in `runWeeklySync.ts` with DB inserts into `run_logs` + `product_stats`
  - [x] Delete `schema.sql` — `seed.ts` is the source of truth
  - [x] Remove `DATA_DIR` env var dependency — all file reads/writes replaced with DB queries; dead `fs` import removed from `rakutenAPI.ts`; vitest.config.js cleaned up; pricing.test.ts mocks `getConfig`
  - [x] Replace `logUnmappedProduct` file write in `woocommerceAPI.ts` with `insertImportLog` DB call; log push success/failure per product
  - [x] Replace `fs.readFileSync(config.json)` in `runRankingPopulate.ts` + `runRankingPopulateShowcase.ts` with `getConfig()` + `initPricing()`
  - [x] Run `npm run db` to re-seed with new tables

- [x] Migrate `wc_category_id` to DB → `seed.ts`
  - [x] Add `wc_category_id INTEGER` to `categories` table in `seed.ts` — seed values from `wpCategoryIds.ts` (Running Gear: 441, Training: 442, etc.)
  - [x] Add `wc_category_id INTEGER` to `subcategories` table in `seed.ts` — seed all subcategory WC IDs from `wpCategoryIds.ts`
  - [x] Update `woocommerceAPI.ts` — replace `wpCategoryIds[subcategoryName]` lookup with DB query
  - [x] Delete `wpCategoryIds.ts`

- [x] Dynamic genre expansion → §9.4, §11.15
  - [x] Add `getCategoryIds()` query in `queries.ts` — returns `Record<string, number[]>` (category name → all genre IDs across subcategories); replaces `categories` export from `genres.ts`
  - [x] Add `getAllGenres()` query in `queries.ts` — returns `Record<string, number[]>` (subcategory name → genre IDs); replaces `allGenres` export from `genres.ts`
  - [x] Add `getSubcategoriesWithCategory()` query in `queries.ts` — returns id, name, category name for all subcategories
  - [x] Replace `allGenres` import in `controller.ts`
  - [x] Replace `categories` import in `runRankingPopulate.ts` + `runWeeklySync.ts` — call `getCategoryIds()` instead of importing from `genres.ts`
  - [x] Add `appendGenreId(subcategoryId, genreId)` query in `queries.ts` — `array_append` + updates in-memory map
  - [x] Claude classification call in `controller.ts` — when unknown genre IDs found, pass subcategory list to Claude, get back `subcategoryId | null`
  - [x] If Claude returns null (off-theme) → `{ success: false }`; if on-theme → append to DB + proceed with push
  - [x] Remove `genres.ts` once all imports replaced

- [x] `productsPerCategory` scrape config
  - [x] Add `products_per_category INTEGER` to `config` table in `seed.ts`
  - [x] Add to `getConfig()` / `updateConfig()` in `queries.ts`
  - [x] In ranking scrape loop — divide `productsPerCategory` across genre IDs in subcategory: `ceil(productsPerCategory / subcategoryIds.length)` products per ID, slice via Ranking API page param
  - [x] Rework `runRankingPopulate.ts` + `runWeeklySync.ts` — use `productsPerCategory` from DB config

- [x] Description formatting (`cleanDescription()`) → §11.17
  - Approach: dumped captions live from Rakuten API (not DB) across all 325 genre IDs — `scrape_output/captions.json` (1594 captions)
  - [x] Write `src/scripts/dumpCaptions.ts` — fetches 5 products per genre ID via Ranking API, writes to `scrape_output/captions.json`
  - [x] Analyze output — read all 1594 captions across 325 genre IDs in 100-line chunks; patterns identified across shops: Alpen/Zebio SEO keyword dumps, Adidas official prefix block, ASICS inline spec format, iHerb import shop boilerplate, North Face `◆` bullets, supplement shops, sportswear `・` bullet lists
  - [x] Implement `cleanDescription(caption: string): string` in `utils.ts` (comprehensive rewrite):
    - Decodes HTML entities (`&nbsp;`, `&amp;`, etc.)
    - Strips `お店TOP＞` store navigation prefix
    - Strips Adidas `Brand：...スポーツブランドアディダス公式ショップ返品・交換について` prefix block
    - Removes duplicate second copy (adaptive probe length)
    - Hard-cuts at 20+ boilerplate anchors (Alpen/Zebio store tags, `関連キーワード` variants, `メーカー希望小売価格` variants, iHerb `■当店利用時のご注意`, `HOT KEYWORD`, `よくある打ち間違い`, etc.)
    - Strips inline spam: `[taxonomy/tags]`, `【color:X】`/`【size:X】` tags, parenthetical SEO blocks `(BFJBAJ NIKE...)`, `【26cc】` size tags
    - Filters 35+ boilerplate sentence patterns on `。`-split (preserves sentences containing `■◇●◆・` structural markers)
    - Routes ASICS inline format (`商品名:X ... コメント: text`) through `handleInlineSpecFormat()` → spec `<table>` + description
    - Formats as HTML: `◇/●/◆` → `<ul><li>`, `・` (whitespace-preceded) → `<ul><li>`, `■key：value` → `<table class="product-specs">`, `■header` → `<p><strong>`, `【xxx】` → `<strong>`, plain text → `<p>`; bullet boilerplate filter suppresses `商品画像について`, `掲載在庫について` etc.
  - [x] `extractShortDescription(caption)` — handles ASICS `コメント:` format and Adidas `Brand:` prefix; returns first 2 sentences ≤250 chars → WooCommerce `short_description`
  - [x] Call `cleanDescription()` + `extractShortDescription()` in `woocommerceAPI.ts` before pushing to WooCommerce
  - [x] Add `cleanDescription` + `extractShortDescription` test cases to `utils.test.ts` (20 tests covering all stripping + formatting behaviors)
  - Add CSS to WordPress for `.product-specs` table styling (2-col, bordered, `th` background)

- [x] Product request flow → §9 Product Request Flow
  - Approach: always fetch X products fresh from Rakuten — no DB fill calculation.
    Products aren't indexed by keyword so there's no reliable way to count existing matches.
  - Names already in Chinese via pipeline DeepL translation — no extra translation needed for request flow
  - Result: returns { productIds: [...] } — shortcode renders [products ids="..."] grid inline (see §11.11)
  - [x] POST /api/request-product endpoint — Chinese keyword → genre validation → upsert DB → push WC → return { success, productIds }
  <!-- - [x] Build WordPress PHP proxy endpoint (WP REST API) — registers `/wp-json/rakuten/v1/request-product`, calls Express via `wp_remote_post()`, runs `do_shortcode('[products ids="..."]')` server-side, returns rendered HTML (fixes mixed content + shortcode rendering — see §9.5) -->
  - [x] Update `product-request-page.html` — fetch to `/wp-json/rakuten/v1/request-product` instead of VPS IP directly; inject `data.html` into `#request-results`
  - [x] Embed request form widget on WooCommerce search results page

- [x] Deploy to AWS Lightsail → §10.3 Phase 3
  - Note: DB already on VPS (dev connects via SSH tunnel) — no dump/restore needed
  - [x] Write `Dockerfile` for rakuten — single-stage: `npm ci`, `npm run build` (tsc), `node dist/app.js`
  - [x] Write `.dockerignore` for rakuten
  - [x] Transfer `.env` to VPS — `scp services/rakuten/.env lightsail:~/rakuten/.env` (one-time manual step)
  - Note: VPS `.env` uses `DATABASE_URL=...@localhost:5432/rakutendb` (port 5432 direct); local `.env` uses `5433` (SSH tunnel mapping)
  - [x] Write `ci-rakuten.yml` — run `npm test` on push to `services/rakuten/**`
  - [x] Rename `ci-rakuten.yml` → `cicd-rakuten.yml` — combine CI + CD; test job on push/PR, deploy job on push to main only
  - [x] Add deploy job to `cicd-rakuten.yml` — docker build → push to Docker Hub → SSH into Lightsail → pull + restart container
  - [x] Add GitHub Secrets — `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, `VPS_HOST` (13.192.170.85), `VPS_SSH_KEY` (~/.ssh/automation-ecosystem.pem)
  - [x] Verify rakuten container connects to DB and pipeline runs on Lightsail
  - [x] Paste `wp/rakuten-proxy.php` into WordPress `functions.php` — replace `YOUR_VPS_IP` with `13.192.170.85`

- [ ] Product request flow bug fixes & improvements (found during live testing)
  - [x] Fix `upsertProduct` subquery — `SELECT id FROM subcategories WHERE $12 = ANY(genre_ids)` returns multiple rows when a genre ID matches multiple subcategories; add `LIMIT 1`
  - [x] Fix empty `productIds` when products already exist in DB — fetch all product URLs from Rakuten result, split by `wc_product_id` presence, return existing + newly pushed IDs combined
  - [x] Fix WooCommerce image 404 — catch `woocommerce_product_image_upload_error` in `pushProduct`, retry with only first image
  - [x] Fix keyword translation — skip DeepL if keyword has no Chinese characters (brand names like "Nike", "ASICS" pass through as-is); hardcode source lang to `"zh"` to prevent misdetection
  - [x] Add extensive pipeline logging — `[api]`, `[request]`, `[push]`, `[translateKeyword]` tags across `app.ts`, `controller.ts`, `woocommerceAPI.ts`, `rakutenAPI.ts`
  - [ ] DB keyword pre-search — before Rakuten fetch, query DB for products with `itemName ILIKE '%keyword%'`; include matching `wc_product_id`s in return alongside newly pushed ones
  - [ ] Pipeline run logging — write keyword, translated keyword, genre validation result, Claude result, products pushed, and errors to `run_logs` for every `itemRequestByKeyword` operation (same pattern as `runWeeklySync`)

- [ ] Rate limiting → §11.14
  - [ ] Identify all public-facing endpoints that need protection (Rakuten quota, DeepL quota, WooCommerce writes)
  - [ ] Install `express-rate-limit` (+ Redis store for production-grade persistence)
  - [ ] Apply per-IP limits on public endpoints
  - [ ] Hide VPS IP behind WordPress PHP proxy — IP never exposed to client

- [ ] Dashboard integration (Express :3002 — internal only) → §2 Architecture, §3.2
  - [ ] POST /api/sync — manually trigger `runWeeklySync()` on demand (same logic as cron, callable from dashboard)
  - [ ] POST /api/trigger-category — `{ category: string, count: number }` — fetch top X ranked products for the given category, upsert DB, push new ones to WooCommerce; called by dashboard "Add X" button → §3.2 controller.ts
  - [ ] POST /retry — retry failed WooCommerce imports
  - [ ] POST /api/config — update config row in DB + reload pricing + re-push prices
  - [ ] Dashboard reads pipeline state, run logs, product stats from DB directly

---

## Handoff Document — TODO

- [ ] Write handoff doc covering operator-managed configuration:
  - **Markup:** Discount Rules for WooCommerce plugin — how to install, create a percentage markup rule globally or per category, and verify it's applying correctly on product pages
  - **Flat shipping rate:** WooCommerce → Settings → Shipping → Shipping Zones — how to set a flat rate per order and update it when shipping costs change
  - **Shipping policy note:** where the checkout page note lives and how to edit the category-based estimates
  - **Exchange rate:** how to update `YenToYuan` via the dashboard admin UI when the JPY→CNY rate changes significantly
  - **Running the pipeline:** how to trigger a manual bulk push or re-scrape
  - **AWS account access:** transfer MFA to boss — add them as IAM user with MFA, or transfer root MFA device (authenticator app handoff)
  - **Stripe account access:** transfer MFA to boss — reassign authenticator app or switch to SMS-based MFA before handoff

---

- [ ] Size/color preference capture on product page → §8, §11.13
  - [ ] Install WooCommerce Product Add-Ons (free plugin)
  - [ ] Add size dropdown + color text field to all products
  - [ ] Verify preferences appear in order line items in WooCommerce admin

---

## Nice to Have (if time allows after launch)

- [ ] Claude quality check on keyword request flow → §9.4
  - [ ] Stage 1 — validate keyword relevance (yes/no), abort early if off-theme
  - [ ] Stage 2 — feed `allGenres` map, return best-fit genre ID as fallback for unknown genres
