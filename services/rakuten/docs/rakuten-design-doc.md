## 1. Problem Statement

### 1.1 Context

running.moximoxi.net serves Chinese runners interested in Japanese running products. One of the platform's four core destinations is `/shop/` — a curated store selling Japanese running nutrition and gear (FANCL, Amino Vital, Pocari Sweat, SAVAS PRO, salt tabs).

Currently, products are added to WooCommerce manually. Each product requires: finding it on Rakuten, calculating a sale price with margin and shipping, downloading images, and creating the WooCommerce listing by hand. This bottleneck limits how many products the store can carry and how quickly new products can be added.

### 1.2 The Problem

Product ingestion needs to be:

- **Automated** — fetch directly from Rakuten, no manual copy-paste
- **Translated** — product names and descriptions are in Japanese; TranslatePress + Google Translate handles JA → ZH-HANS on first customer view and caches permanently in WordPress DB
- **Priced intelligently** — sale price must account for Rakuten cost, estimated shipping, and target margin
- **Scalable** — bulk import top-ranked products per genre at launch; weekly cron keeps catalog fresh
- **Requestable** — if a customer can't find a product, they submit a request and it appears on the store within ~2 min

### 1.3 Goals

- Automate product ingestion from Rakuten Ichiba into WooCommerce — no manual copy-paste
- Translate product pages via TranslatePress + Google Translate (JA → ZH-HANS) on first customer view, cached permanently in WordPress DB
- Calculate auto-pricing using a margin formula (Rakuten price + shipping estimate + margin %)
- Pre-load top-ranked products per category at launch via Ranking API; weekly cron auto-syncs new products
- Expose a "Request a product" flow — customer submits keyword, sees a loading state while the backend fetches from Rakuten, prices, and pushes to WooCommerce (~1-2 min), then gets a confirmation and is redirected to the pre-searched WooCommerce results page
- WooCommerce handles all customer-facing browsing, cart, checkout, and payments — no custom storefront

### 1.4 Non-Goals

- Custom React SPA storefront — WooCommerce is the storefront
- Custom storefront translation pipeline — DeepL translates product names JA→ZH at ingestion time; descriptions stay Japanese and are translated lazily by TranslatePress on first page view. Keywords submitted via product request flow are translated ZH→JA via DeepL before hitting the Rakuten search API.
- Real-time price sync after initial WooCommerce import (v1 is import-only, re-scrape updates changed prices)
- Sourcing products from marketplaces other than Rakuten in v1

---

## 2. Architecture Role of Each Component

|Component|Role|
|---|---|
|**WooCommerce**|Full customer-facing storefront — product browsing, search, cart, checkout, payments (Stripe is built-in via WooCommerce)|
|**Express API**|Backend pipeline — Rakuten fetch, normalize, price, WooCommerce push, product request handler, weekly cron|
|**PostgreSQL**|Single source of truth — product store, genre/subcategory map, operator config (markup, exchange rate), pipeline run logs|
|**TranslatePress + Google Translate**|JA → ZH-HANS translation on first customer page view, cached in WordPress DB permanently|
|**TypeScript**|Implementation language for the entire Express pipeline — enforces type correctness across all pipeline stages at compile time|

See Section 8 (Technical Decisions) for rationale on TypeScript, WooCommerce, and the no-deepl.js approach.

---

## 3. System Architecture

> **Visual diagram:** [`docs/architecture/rakuten/rakuten.html`](../../../docs/architecture/rakuten/rakuten.html) — open in browser for a full visual of the pipeline and storefront flow.

### 3.1 High-Level Overview

```
FETCH → NORMALIZE → TRANSLATE → PRICE → STORE → PUSH
```

- **FETCH:** Rakuten Ranking API returns top-selling products per genre (up to 1000)
- **NORMALIZE:** Map raw Rakuten fields to internal product schema
- **TRANSLATE:** DeepL API translates `name_ja` → `name_zh` (names only — descriptions translated lazily by TranslatePress on first page view)
- **PRICE:** Auto-pricing formula calculates CNY sale price
- **STORE:** Products written to PostgreSQL (permanent — used for deduplication and re-scrape)
- **PUSH:** WooCommerce REST API receives products with Chinese names — search index is immediately queryable in Chinese

### 3.2 Component Breakdown

#### rakutenAPI.ts

- `getProductsByKeyword(keyword, count, sortMode)` — Ichiba Item Search API (used for product request flow); max `hits` = 30
- `getProductsByRankingGenre(genreId, count)` — Ichiba Ranking API — **primary fetch method** for bulk push and weekly cron
- Returns normalized + translated product objects — `normalizeItems` then `translateNames` (DeepL, names only) called internally before returning; all call sites already await these functions so no changes needed at call sites

#### genres.ts (removed)

- Genre ID map previously hardcoded here — fully migrated to DB
- `categories` export replaced by `getCategoryIds()` query — loads from `subcategories` table, groups genre IDs by category name
- `allGenres` export replaced by `getAllGenres()` query — returns `Record<string, number[]>` (subcategory name → genre IDs)
- File deleted; all imports replaced across `controller.ts`, `runRankingPopulate.ts`, `runWeeklySync.ts`

#### wpCategoryIds.ts (removed)

- Previously a hardcoded `Record<string, number>` mapping WC category/subcategory names → WC category IDs
- Replaced by `wc_category_id` column on `categories` and `subcategories` tables in PostgreSQL
- `woocommerceAPI.ts` now calls `getWPSubcategoryIds()` at startup and builds the lookup map in memory via `Object.fromEntries`
- Running Gear Shoes (446) and Wear (447) are distinct WC category IDs from Training Shoes (464) and Training Wear (463) — previously conflated in the static file

#### db/pool.ts (new)

- Creates and exports the PostgreSQL connection pool (pg `Pool`)
- Imported by `queries.ts` — no query logic lives here

#### db/queries.ts (new)

- PostgreSQL interface for permanent product storage — imports pool from `pool.ts`
- `getProductByUrl(url)` — check if product already exists (deduplication key)
- `upsertProduct(product)` — insert new product, or on URL conflict: update `itemPrice`, `availability`, `last_updated_at`, reset `missed_scrapes` to 0
- `getProductsByGenreId(genreId)` — return stored products for a genre via subcategories JOIN (`WHERE $1 = ANY(genre_ids)`)
- `getProductsByCategory(categoryId)` — return stored products for a category
- `incrementAllMissedScrapes()` — run before each scrape: increments `missed_scrapes` by 1 for all products
- `upsertProduct(product)` — resets `missed_scrapes = 0` for any product returned by the ranking
- `deleteStaleProducts()` — run after each scrape: deletes products where `missed_scrapes >= 3`

#### pricing.ts (new)

- `calculatePrice(price, category)` — applies markup formula: `(price * yenToYuan * (1 + markup)) + shipping`
- Configurable markup % and exchange rate read from `config` table in PostgreSQL at startup; reloaded via dashboard admin endpoint (replaces `fs.watch` on config.json)

#### woocommerceAPI.ts (new)

- Wraps WooCommerce REST API (Consumer Key + Consumer Secret auth)
- `setupCategories()` — creates parent categories + subcategories via WC REST API on first run, returns a map of name → WC category ID used when pushing products
- `pushProduct(product)` — creates single WooCommerce product, assigns WC category + subcategory IDs for filtering
- `pushBulk(products)` — sequential bulk push with per-item result logging
- `checkExists(sku)` — checks if product already exists by SKU before pushing
- Maps internal product schema to WooCommerce product fields (Japanese text — TranslatePress handles translation)

#### app.ts (exists)

- Express entry point — routes defined directly in app.ts

#### controller.ts (new)

- Handles all route logic — bulk push, product request flow, cron sync, product queries
- Orchestrates: Rakuten fetch → normalize → price → PostgreSQL store → WooCommerce push
- `POST /api/request-product` — Chinese keyword → DeepL ZH→JA translation → Rakuten keyword search → genre validation (DB check → Claude fallback) → upsert DB → push WC → return `{ success, productIds }`
- `POST /api/sync` — manually trigger `runWeeklySync()` on demand; same logic as the weekly cron, callable from dashboard
- `POST /api/trigger-category` — `{ category: string, count: number }` — fetch top `count` ranked products for the given category, upsert DB, push any new ones to WooCommerce; called by the dashboard "Add X" button per category

### 3.3 Data Flow

#### Bulk push (initial load + ranking)

**Ranking API pagination:** The Rakuten Ranking API has no `hits` parameter — volume is controlled via `productsPerCategory` in the `config` DB table. The scrape loop divides this across genre IDs in each subcategory: `productsPerSubcategory = ceil(productsPerCategory / subcategoryIds.length)`. The Ranking API `page` param (1–34, 30 products/page) is derived as `ceil(productsPerSubcategory / 20)` for buffer, then results sliced to `productsPerSubcategory`.

```
For each genre in genres.js:
    Rakuten Ranking API (top N products)
        ↓
    normalizeItems.js → pricing.js
        ↓
    PostgreSQL (upsert — skip if URL exists + unchanged)
        ↓
    WooCommerce REST API (push new products)
        ↓
    import_log (success/failed/skipped per product)
```

#### Weekly re-scrape (cron)
```
For each genre:
    Rakuten Ranking API (top N products)
        ↓
    For each product:
        ├── URL exists in PostgreSQL + price/availability unchanged → skip
        ├── URL exists in PostgreSQL + price or availability changed → update DB + update WooCommerce
        └── URL not in PostgreSQL → normalize → price → insert DB → push to WooCommerce
```

#### Product request flow
```
Customer submits keyword on WooCommerce search page
    ↓  POST /api/request-product
Express API:
  1. Search Rakuten by keyword
  2. Normalize top result
  3. Calculate price via pricing formula
  4. Push to WooCommerce (image sideloading is the bottleneck)
  5. Store in PostgreSQL
    ↓  ~1-2 minutes total
Return WooCommerce product URL
    ↓
On-page progress indicator → "Ready!" with link to product
Customer clicks through to WooCommerce product page
TranslatePress translates on first view, caches in WordPress DB
```

---

## 4. Data Design

### 4.1 Internal Product Schema

```json
{
  "item_code": "amino-vital-pro-30sticks",
  "rakuten_item_code": "amovital:10000123",
  "name_ja": "アミノバイタル プロ 30本入",
  "name_zh": "氨基活力 PRO 30支装",
  "description_ja": "...",
  "images": [
    "https://thumbnail.image.rakuten.co.jp/@0_mall/amovital/cabinet/img01.jpg"
  ],
  "rakuten_price": 3240,
  "sale_price": 4980,
  "cost_price": 3240,
  "shipping_estimate": 800,
  "margin_pct": 20,
  "genre_id": "505814",
  "genre_name": "Amino Acid",
  "category": "nutrition",
  "stock_status": "instock",
  "rakuten_url": "https://item.rakuten.co.jp/amovital/...",
  "fetched_at": "2026-03-17T02:00:00Z",
  "wc_product_id": null,
  "wc_pushed_at": null
}
```

### 4.2 PostgreSQL Schema

```sql
CREATE DATABASE rakutenDB;

CREATE TABLE categories (
  id             SERIAL PRIMARY KEY,
  name           TEXT,
  wc_category_id INTEGER
);

CREATE TABLE subcategories (
  id             SERIAL PRIMARY KEY,
  name           TEXT,
  genre_ids      INTEGER[],
  category_id    INTEGER REFERENCES categories(id),
  wc_category_id INTEGER
);

CREATE TABLE products (
  id             SERIAL PRIMARY KEY,
  itemName       TEXT,
  itemPrice      INTEGER,
  itemCaption    TEXT,
  itemURL        TEXT UNIQUE,
  smallImageUrls JSONB,
  mediumImageUrls JSONB,
  reviewCount    INTEGER,
  reviewAverage  DECIMAL(3,2),
  shopName       TEXT,
  shopCode       TEXT,
  availability   INTEGER,
  wc_product_id  INTEGER,
  wc_pushed_at   TIMESTAMP,
  created_at     TIMESTAMP DEFAULT NOW(),
  last_updated_at TIMESTAMP DEFAULT NOW(),
  missed_scrapes INTEGER DEFAULT 0,
  subcategory_id INTEGER REFERENCES subcategories(id)
);
```

**Note:** No `name_zh`, `description_zh`, or `translated_at` columns — translation is handled entirely by TranslatePress in WordPress DB (MySQL), not in PostgreSQL.

**Note:** `shipping_estimate` and `margin_pct` are not stored in PostgreSQL — they are calculated at push time via `pricing.ts` using per-category config and never need to be read back from the DB.

### 4.3 Pricing Formula

```
sale_price = rakuten_price * yenToYuan
```

**Currency:** All sale prices are stored and displayed in CNY (Chinese Yuan). Rakuten prices are in JPY — conversion applies at calculation time using a configurable exchange rate stored in the `config` DB table.

**Markup:** Handled entirely in WooCommerce via the **Discount Rules for WooCommerce** plugin — not in the pipeline. The pipeline pushes the raw JPY→CNY conversion as `regular_price`. The operator applies a percentage markup globally or per category in the WooCommerce admin UI. This keeps markup management independent of the pipeline — changing margins never requires a re-scrape or re-push.

**Shipping:** Handled separately at WooCommerce checkout — not baked into sticker price. Baking shipping per-product overcharges customers who buy multiple items (they pay one shipment, not one per product). Instead:
- WooCommerce is configured with a flat shipping rate per order
- Checkout page includes a shipping policy note: estimated shipping by category (e.g. shoes ~¥X, supplements ~¥Y), with a caveat that actual shipping may require follow-up if order weight is high
- Operator contacts customer to collect additional shipping if actual cost exceeds estimate

**Example:**

```
Rakuten price: ¥3,240 JPY
Exchange rate: 0.043
sale_price = 3240 * 0.043 = ¥140 CNY (rounded up to nearest 5)
Markup applied separately in WooCommerce plugin (e.g. +20% → ¥168 CNY displayed to customer)
```

### 4.4 Express API Endpoints

|Method|Endpoint|Description|
|---|---|---|
|`POST`|`/api/push/bulk`|Fetch top N per genre from Ranking API → normalize → price → push to WooCommerce|
|`GET`|`/api/products`|Products stored in PostgreSQL (by genre or category)|
|`GET`|`/api/products/:itemCode`|Single product detail|
|`POST`|`/api/request-product`|Product request flow — fetch by keyword, push to WooCommerce, return redirect URL|
|`POST`|`/api/cron/sync`|Trigger weekly re-scrape manually|
|`DELETE`|`/api/products/:wcProductId`|Remove product from WooCommerce + delete from DB by `wc_product_id` — dashboard use only|

---

## 5. WooCommerce Integration — Technical Decision

### 5.1 Options Considered

|Approach|Pros|Cons|
|---|---|---|
|**WooCommerce REST API (Consumer Key/Secret)**|Official, documented, safe, works over HTTPS|Slightly more setup than direct DB|
|Direct DB insert|Fast, no HTTP overhead|Bypasses WooCommerce hooks, pricing logic, stock management — dangerous for a live store|
|WP CLI|Simple for one-off runs|Requires SSH, not callable from Node API|

### 5.2 Decision: WooCommerce REST API

Use the WooCommerce REST API (`/wp-json/wc/v3/products`) authenticated with Consumer Key and Consumer Secret.

### 5.3 WooCommerce Product Field Mapping

|Internal field|WooCommerce field|
|---|---|
|`name_zh`|`name` (Chinese — immediately searchable; TranslatePress leaves it untouched)|
|`description_ja`|`description` (Japanese — TranslatePress translates on first customer view)|
|`sale_price`|`regular_price`|
|`images`|`images` (array of `{ src }`)|
|`category`|`categories` (mapped to WC category ID)|
|`stock_status`|`stock_status`|
|`item_code`|`sku`|
|`rakuten_url`|`external_url` (product source attribution)|

### 5.4 Idempotency / Re-scrape Strategy

Before every push:

1. Check `rakuten_url` in PostgreSQL — this is the deduplication key
2. If URL **not in DB** → normalize → price → `POST` create WooCommerce product → insert to PostgreSQL
3. If URL **in DB** and price/availability **unchanged** → skip
4. If URL **in DB** and price or `stock_status` **changed** → update PostgreSQL + `PUT` update WooCommerce product
5. Log result to `import_log` table (success / failed / skipped)

---

## 6. Product Categories & Genre Map

### 6.1 Category Structure

```
🏃 Running Gear
  ├── Shoes
  ├── Apparel
  ├── GPS / Watch
  └── Accessories (pouches, armbands, insoles)

💪 Training
  ├── Fitness Machines
  ├── Yoga / Pilates
  └── Track & Field

🥤 Nutrition & Supplements
  ├── Sports Drinks
  ├── Protein
  ├── Amino Acid
  ├── Vitamins & Minerals
  └── Recovery (Collagen, Citric Acid, Probiotics)

🧴 Recovery & Care
  ├── Massage Products
  ├── Stretching Equipment
  ├── Foot Care
  └── Sports Care Products

👕 Sportswear
  ├── Men's
  ├── Women's
  ├── Underwear
  └── Bags & Accessories
```

The full genre ID map lives in the `subcategories` table in PostgreSQL — loaded at startup via `getCategoryIds()` and `getAllGenres()` queries. `genres.ts` is being removed.

---

## 7. Translation — TranslatePress

Translation is handled entirely by TranslatePress + Google Translate on the WordPress side. The Express pipeline pushes Japanese product text to WooCommerce as-is.

**Flow:**
1. Product pushed to WooCommerce with Japanese name and description
2. First customer visits the product page
3. TranslatePress detects the page hasn't been translated → calls Google Translate API (JA → ZH-HANS)
4. Translation cached permanently in WordPress DB (MySQL)
5. All subsequent visitors get the cached Chinese translation instantly

**Scope:** TranslatePress translates everything it encounters on the page — product names, descriptions, category names, breadcrumbs, navigation. Category names (e.g. "Training / Triathlon") are translated on first customer view and cached. No need to push Chinese category names from the pipeline.

**Why Google Translate over DeepL:**
- TranslatePress free tier + Google Translate API (bring your own key) covers the full use case at near-zero cost
- DeepL integration requires a £17/month TranslatePress Pro plan — unnecessary for a single-language (ZH-HANS) store
- Translation quality tested on product descriptions — output is accurate and natural for technical sports content

**Why not translate in the pipeline:**
- TranslatePress is a maintained WordPress plugin — operator can manage translations without touching code
- Translations stored in WordPress DB alongside the product — no sync problem between PostgreSQL and WordPress
- Removes any translation API dependency from the Express service
- Tradeoff: PostgreSQL only has Japanese text; admin UIs querying PostgreSQL will see Japanese product names

**TranslatePress config required:**
- Install TranslatePress (free) on running.moximoxi.net
- Set source language: Japanese, target language: Simplified Chinese (ZH-HANS)
- Configure Google Translate API key in TranslatePress settings

---

## 8. Technical Decisions

|Decision|Choice|Alternatives Considered|Rationale|
|---|---|---|---|
|Product store|PostgreSQL permanent storage|In-memory only, Redis, 24h TTL cache|Permanent store enables re-scrape deduplication by URL; price change tracking; no TTL needed since re-scrape logic handles freshness|
|Translation|TranslatePress (free) + Google Translate API on first customer view (WordPress)|DeepL via TranslatePress Pro (£17/mo), custom pipeline translation|Free tier covers full use case; caches in WordPress DB; no pipeline dependency; DeepL Pro unnecessary for single-language store|
|Primary fetch|Rakuten Ranking API (top N per genre)|Genre search, keyword search|Ranking API returns proven top-sellers — higher product quality for initial catalog; supports up to top 1000|
|WooCommerce integration|WooCommerce REST API|Direct DB insert, WP CLI|Official path; hooks fire correctly; no SSH dependency; revocable auth|
|Pricing|Pipeline applies raw JPY→CNY; markup via WooCommerce plugin|Baking markup into pipeline formula|Decouples margin management from scraping — operator changes markup in WooCommerce admin without re-running the pipeline|
|Deduplication key|`rakuten_url`|`item_code`, `sku`|URL is stable and unique per Rakuten listing; also used as canonical product identity for re-scrape|
|Re-scrape strategy|Check URL → compare price/availability → update if changed|Full re-fetch, ignore existing|Minimizes Rakuten API calls; only pushes WooCommerce updates when something actually changed|
|Frontend|WooCommerce storefront + TranslatePress|Custom React SPA|WooCommerce has 24/7 support, built-in security, maintainable by any WordPress developer after handoff|
|Shipping at checkout|Flat rate per order in WooCommerce + policy note at checkout|Baked into sticker price per product|Per-product shipping overcharges multi-item orders; flat rate + transparent policy is fairer and simpler|
|Product variants (size/color)|Not modeled — single product per listing with Add-Ons plugin for preference capture|WooCommerce variable products with parsed variants|Rakuten descriptions embed size/color in inconsistent Japanese formats — reliable parsing is not feasible; WooCommerce Product Add-Ons (free) adds a size dropdown + color text field on the product page, captured in order line item; operator communicates if preference is unavailable|
|Pipeline name translation|DeepL API in pipeline (`translateNames` in `utils.ts`) overwrites `itemName` in place|Separate `name_zh` field, TranslatePress Pro|Single field keeps schema simple; WooCommerce search index has Chinese text immediately on push; no separate DB column or sync needed|

---

## 9. Product Request Flow

### 9.1 Overview

When a customer searches the WooCommerce store and can't find a product, a prominent "Didn't find what you're looking for? Request it here" button is shown. The customer submits a product name or keyword, sees a generic loading state, and when all products are ready gets a confirmation message with a product grid rendered inline on the same page. TranslatePress translates on first customer view after the product is live.

### 9.2 Flow

**Approach:** Always fetch X products fresh from Rakuten — no DB fill calculation. Products aren't indexed by keyword in PostgreSQL so there's no reliable way to count existing matches for a given search term. Rakuten's search handles relevance; we push whatever it returns.

**Translation:** No pipeline translation needed. Rakuten's search API accepts Chinese keywords natively — no ZH→JA conversion required. Products are pushed to WooCommerce with Japanese names; TranslatePress handles JA→ZH lazily on first page view, same as bulk products.

```
Customer submits product request (keyword in Chinese)
    ↓  POST /api/request-product
Frontend shows generic "Loading..." state
Express API:
  1. Fetch X products from Rakuten Keyword Search API (Chinese keyword passed directly)
  2. For each product:
      a. Check rakuten_url in PostgreSQL (idempotency — skip if already exists)
      b. New product → normalize → calculate price
      c. Push to WooCommerce (Japanese name/description)
      d. Store in PostgreSQL
    ↓  ~1-2 minutes total
Returns { productIds: [123, 456, 789] }
    ↓
Frontend shortcode renders [products ids="123,456,789"] → WooCommerce product grid shown inline
```

### 9.3 On-Page Loading State

- Generic "Loading..." shown immediately after form submission — customer stays on the page
- No per-product SSE updates — the POST resolves when all products are done
- On completion: shortcode receives `productIds` array, renders `[products ids="..."]` grid inline on the same page
- On failure: "We couldn't find that product on Rakuten. Try a different search term."

### 9.4 Dynamic Genre Expansion via Claude

When a keyword search returns products whose genre IDs are not in the `subcategories` table, Claude is used to classify the unknown IDs and expand the catalogue dynamically — rather than rejecting the request.

**Flow:**

1. Keyword search returns products with one or more unknown genre IDs (not in any subcategory's `genre_ids[]`)
2. Query DB for current subcategory structure (id, name, category name)
3. Call Claude API: "Given these subcategories, which one does genre ID `X` belong to? Return `subcategoryId` or `null` if off-theme."
4. If Claude returns a valid subcategory → `UPDATE subcategories SET genre_ids = array_append(genre_ids, X) WHERE id = $subcategoryId`
5. Update in-memory genre map and proceed with upsert + WooCommerce push
6. If Claude returns `null` (off-theme) → return `{ success: false }`

**Why this approach:** The Keyword Search API returns deeper subcategory-level genre IDs that weren't captured during the initial Ranking API scrape. Rather than maintaining a static map that requires code changes to expand, Claude classifies new IDs at runtime against the live DB structure. This makes the catalogue self-expanding for on-theme products.

See §11.15 for the engineering detail.

### 9.5 Implementation Notes

- WordPress shortcode added to WooCommerce search results page — form + loading state, renders inline product grid on completion via `[products ids="..."]`, no SSE
- No translation API needed in the pipeline — Rakuten search accepts Chinese natively; TranslatePress handles JA→ZH lazily for all products including request flow
- **Mixed content constraint:** WordPress runs on HTTPS. Direct `fetch()` calls from the form to `http://VPS_IP:3000` are blocked by browsers as mixed content. The PHP proxy (§11.14) is required before the form can be embedded in production — the client posts to a WordPress AJAX endpoint, which proxies internally to the Express API. The VPS IP is never exposed to the browser.
- **Shortcode rendering:** `do_shortcode` is a PHP function — it does not exist in browser JS. The form sets `results.innerHTML` to the raw shortcode string as a stopgap for testing, but actual rendering requires the PHP proxy response to return pre-rendered HTML (WordPress executes `do_shortcode` server-side before responding).

---

## 10. Implementation Phases

See `docs/rakuten-checklist.md` for current build status.

### 10.1 Phase 1 — Data Pipeline

1. Add `getRanking()` to rakutenAPI.ts
2. Build `pricing.ts` — formula implementation with per-category config
4. Build `db/store.js` — PostgreSQL product store with upsert + URL deduplication
5. Test full fetch → normalize → price → store pipeline end-to-end

**Exit criteria:** Express API fetches top N products from Ranking API, normalizes, prices, and stores in PostgreSQL. Re-run skips unchanged products, updates changed ones.

### 10.2 Phase 2 — WooCommerce Integration + Bulk Push

1. Set up WooCommerce REST API credentials on running.moximoxi.net
2. Build `woocommerce.js` with push, bulk push, and SKU existence check
3. Implement `POST /api/push/bulk` — fetch ranking → normalize → price → push
4. Run initial bulk push of top-ranked products per category
5. Install and configure TranslatePress + DeepL on running.moximoxi.net
6. Verify TranslatePress translates product pages correctly on first view

**Exit criteria:** Products appear in WooCommerce in Japanese. TranslatePress translates to Chinese on first customer view and caches. Prices match formula.

### 10.3 Phase 3 — Product Request Flow + Cron + Deploy

1. Build product request flow: `POST /api/request-product` — fetch all products, return `{ redirectUrl }` when done
2. Embed request form widget on WooCommerce search results page via shortcode (loading state + confirmation + redirect)
3. Set up weekly auto-sync cron: Ranking API fetch → re-scrape logic (skip/update/add)
4. Deploy Express API to AWS Lightsail
5. Smoke test: browse WooCommerce → translation correct → request missing product → appears in ~2 min → weekly sync runs

**Exit criteria:** WooCommerce store live with ranked products per category, all translated via TranslatePress. Product request flow works end-to-end. Weekly sync running.

---

## 11. Engineering Challenges & Solutions

### 11.1 Rakuten API Rate Limits

**Challenge:** Rakuten Ichiba APIs are limited to 1 request per second per Application ID. The bulk fetch and weekly cron make one API call per category — exceeding this rate causes request failures.

**Solution:** Add a 1-second delay between each Rakuten API call during bulk fetch and cron runs. The Ranking API returns up to 30 products per request — to fetch more, paginate using the `page` parameter (page=1 → 1–30, page=2 → 31–60, etc.). At 1 req/sec, fetching 200 products per category costs 7 requests × 5 categories = 35 seconds total — negligible for a weekly job. Rate limit errors are caught, logged, and the sync job resumes on the next run without losing already-processed products. Note: PostgreSQL deduplication reduces redundant WooCommerce pushes but does not reduce Rakuten API call volume — the delay is the actual rate limit protection.

### 11.2 Translation Quality

**Challenge:** Running product descriptions contain technical terms (amino acid types, supplement compounds, shoe technology names) that translate poorly with generic services.

**Solution:** TranslatePress uses DeepL, which produces significantly better results for Japanese technical product text. Since TranslatePress caches translations permanently in WordPress DB, any poor translation can be manually corrected once in the WordPress admin and the fix persists for all future visitors.

### 11.3 Price Accuracy

**Challenge:** Rakuten prices change. A product stored at ¥3,240 yesterday might be ¥3,580 today.

**Solution:** Weekly re-scrape compares `rakuten_price` and `stock_status` against current Rakuten data. If price has changed, PostgreSQL is updated and WooCommerce product is updated via `PUT` before the next customer sees it.

### 11.4 WooCommerce Push Failures

**Challenge:** WooCommerce REST API calls can fail mid-bulk-import (auth error, timeout, malformed image URL).

**Solution:** Bulk push is sequential with per-product try/catch, not a single transaction. Each result (success/failed/skipped) is written to `import_log` immediately. If 8 of 10 products succeed and 2 fail, the 8 are in WooCommerce and the 2 failures are logged for retry.

### 11.5 Image Handling

**Challenge:** Rakuten product images are hotlinked from Rakuten's CDN. If Rakuten removes the image or changes the URL, WooCommerce product images break.

**Solution:** On import, images are passed via WooCommerce's `images[].src` field — WooCommerce sideloads them into the WordPress media library automatically. Product images become self-contained in WordPress.

**Note:** Rakuten's API returns image URLs with a `?_ex=128x128` query param that caps resolution at 128×128. The `?_ex=...` param is stripped in `normalizeItems` before the URL is stored or pushed — this gives WooCommerce the full-resolution image from Rakuten's CDN.

### 11.6 Genre Map Migrated from genres.ts to DB

**Original decision:** Genre map hardcoded in `genres.ts` — static, required code changes to expand.

**Revised decision:** `genres.ts` is removed. The `subcategories` table in PostgreSQL becomes the single source of truth for genre IDs. At startup, the app loads the full subcategory/genre structure from DB into memory. When the keyword request flow encounters an unknown genre ID, Claude classifies it and `array_append` adds it to the appropriate subcategory row at runtime — no redeploy needed.

**Why revised:** The Keyword Search API returns genre IDs that were never captured during the Ranking API scrape. A static file can't handle this without constant manual updates. The DB-driven approach makes the catalogue self-expanding for on-theme products while keeping off-theme requests blocked via Claude's classification step.

See §9.4 for the full dynamic expansion flow and §11.15 for the engineering detail.

### 11.7 Genre Map Expansion via Keyword Scrape

**Challenge:** Before the initial bulk push, the genre map in `genres.ts` needs to be as comprehensive as possible so the Claude quality check on the keyword flow is a safety net rather than the primary path.

**Solution:** Run a one-off keyword scrape across a large list of store-relevant keywords (running shoes, protein, compression socks, etc.) before the initial bulk push. A processing script collects all unique `genreId` values returned by Rakuten, cross-references against existing genres in `genres.ts`, and outputs unknown IDs grouped by the keywords that surfaced them. This makes it easy to name and categorize new genre IDs from context. The updated `genres.ts` and `seed.ts` are committed, the DB is re-seeded, and WooCommerce categories are recreated fresh from the complete list.

**Why before initial bulk push:** Doing this after products are already in WooCommerce would require deleting and re-pushing everything when categories change. Doing it first means the category structure is stable before any product data is committed to WooCommerce.

**Claude as fallback:** After the scrape, `allGenres` in `genres.ts` covers the vast majority of keyword requests. The Claude quality check (stage 2 — genre assignment) only fires for keywords that surface a genre ID not yet in the map, acting as a graceful fallback rather than the primary routing mechanism.

### 11.8 Subcategories Need Multiple Genre IDs

**Challenge:** Rakuten's genre tree is deep — each subcategory we defined maps to one "canonical" genre ID (e.g. Triathlon = 568218), but Rakuten products actually live in deeper sub-genre nodes (e.g. Triathlon goggles = 402369). When a product's `genreId` doesn't match the seeded `genre_id`, `upsertProduct` sets `subcategory_id = NULL` via the subquery `(SELECT id FROM subcategories WHERE genre_id = $N)`, causing `pushProduct` to crash trying to look up a NULL subcategory.

**Discovery:** A keyword scrape across 79 Japanese keywords × 30 products surfaced 327 unique genre IDs from Rakuten. Only 41 of these matched our seeded IDs — leaving 286 unmatched sub-genre nodes.

**Solution:** Migrate `genre_id INTEGER` → `genre_ids INTEGER[]` on the subcategories table. All lookup queries use `WHERE $N = ANY(genre_ids)` instead of `WHERE genre_id = $N`. The seed populates each subcategory with all known genre IDs that belong to it (sourced from `scrape_output.json`).

**Files changed:** `seed.ts`, `schema.sql`, `queries.ts` (upsertProduct subquery + getProductsByGenreId).

### 11.9 Stale Product Refresh at Scale

**Challenge:** The weekly re-scrape uses the Ranking API, which only returns the current top N products per genre. Products already in the DB that fall off the ranking have no scalable way to get their price/availability refreshed — calling the Search API one-by-one per stored product becomes untenable at hundreds or thousands of products (1 req/sec rate limit, blocking the weekly job).

**Solution (§11.9):** Add a `missed_scrapes` counter to each product in PostgreSQL. Each weekly ranking run increments the counter for any product not returned by the ranking. At 3 consecutive missed scrapes, the product is hard-deleted from both PostgreSQL and WooCommerce. No separate refresh pass is needed — if a product is popular enough to return to stock, it will re-appear in the Ranking API results and be re-imported naturally as a new product.

### 11.12 WooCommerce Search Can't Find Japanese Products by Chinese Keyword

**Challenge:** WooCommerce search queries `post_title` and `post_content` in MySQL. Products are pushed with Japanese names — TranslatePress only writes Chinese text to the DB after a customer visits the product page. Until that first visit, a Chinese search term returns zero results even if the product exists in the store. This means customers trigger the product request flow unnecessarily, and the search experience is broken for the entire catalog until every product has been manually visited once.

**Solution:** Translate product `name_ja` to `name_zh` via DeepL API in the pipeline before pushing to WooCommerce. Product names are pushed in Chinese — WooCommerce search index has Chinese text immediately. TranslatePress sees the name is already in the target language and leaves it untouched. Only product names are translated (not descriptions) — descriptions are long, expensive, and not needed for search. The pipeline data flow becomes:

```
FETCH → NORMALIZE → TRANSLATE (DeepL, name only) → PRICE → STORE → PUSH
```

**Why DeepL over Google Translate:** Product names are short, high-visibility text — quality matters for first impressions and search relevance. DeepL produces more natural JA → ZH-HANS output than Google Translate for product copy. DeepL free tier (500k chars/month) covers product names comfortably.

**Implementation:** `translateNames(items[])` in `utils.ts` overwrites `itemName` in place — no separate field needed. Chinese name flows through the pipeline as `itemName` to PostgreSQL and WooCommerce unchanged.

### 11.11 Product Request Redirect — Chinese Search Can't Find Japanese Titles

**Challenge:** The original plan redirected customers to `/shop/?s={keywordZH}` after a product request completed. WooCommerce search queries `post_title` and `post_content` in MySQL — which contain Japanese text. A Chinese keyword produces zero results because TranslatePress only translates on first page view and does not affect WooCommerce's search index.

**Solution:** API returns `{ productIds: [123, 456, 789] }` — the WooCommerce product IDs of everything just pushed. The WordPress shortcode receives these IDs and dynamically renders a `[products ids="123,456,789"]` shortcode, which WooCommerce natively converts into a product grid. Customer sees all matched products on the same page without a redirect.

### 11.13 Size/Color Variant Extraction Not Feasible

**Challenge:** Rakuten product descriptions embed size and color information in inconsistent formats — structured fields like `■カラー(メーカー表記):ブラック`, tag-style like `【size:24.5cm】`, and full size chart tables as raw text. No reliable parser can extract this across all listings without significant error rate.

**Solution:** Do not model variants in WooCommerce. Products are pushed as simple single listings. WooCommerce Product Add-Ons (free plugin) adds a size dropdown and color text field directly on the product page — preferences are captured in the order line item. Operator communicates manually if the requested size/color is unavailable.

### 11.14 Rate Limiting & API Protection

**Challenge:** Public-facing endpoints trigger third-party API calls (Rakuten, DeepL) and WooCommerce writes. Without rate limiting, anyone who discovers the endpoint can exhaust API quota or spam product imports.

**Solution:** Apply per-IP rate limiting via `express-rate-limit` on all public endpoints. Use a Redis store for production-grade persistence across restarts. VPS IP hidden behind a WordPress PHP proxy — the client never sees the VPS address directly, all requests route through `wp-admin/admin-ajax.php`.

### 11.16 Shared Volume → PostgreSQL Migration

**Challenge:** Config, run logs, and product stats were written to `shared_volume/` JSON files. The dashboard read these files directly. `fs.watch` on `config.json` triggered price recalculation when the operator changed markup or exchange rate. This created a file-system dependency between services that complicates deployment and removes the ability to update config at runtime without file access.

**Solution:** Migrate everything to PostgreSQL:

- **`config` table** — single row storing `YenToYuan`, `markupPercent`, `pagesPerSubcategory`, `searchFillThreshold`. Dashboard exposes an admin UI (input fields + Apply button) that POSTs to an endpoint, updates the DB row, and triggers price recalculation in the rakuten service. Replaces `fs.watch`.
- **`run_logs` table** — one row per pipeline run, written at end of each weekly sync or manual trigger
- **`product_stats` table** — updated after each run with total/per-category counts
- **`import_logs` table** — one row per WooCommerce push attempt
- **`subcategories` table** — already the genre ID source of truth (see §11.15)

**Result:** No shared volume dependency. Dashboard reads all state from DB. Config updates flow through an admin endpoint, not file edits.

### 11.15 Dynamic Genre Expansion — DB as Source of Truth

**Challenge:** The Keyword Search API returns genre IDs at a deeper subcategory level than what the Ranking API surfaces. A static `genres.ts` file can't keep up — any new genre ID requires a code change and redeploy.

**Solution:** Remove `genres.ts` entirely. At app startup, load the full `subcategories` structure (id, name, genre_ids[], category name) from PostgreSQL into an in-memory map. When the keyword request flow encounters a genre ID not in the map:

1. Query DB for the current subcategory list (id + name + parent category name)
2. Call Claude API: given this list, which subcategory does the unknown genre ID belong to? Return `subcategoryId` or `null` if off-theme.
3. If on-theme: `UPDATE subcategories SET genre_ids = array_append(genre_ids, $newId) WHERE id = $subcategoryId` — persists immediately, updates in-memory map
4. If off-theme: return `{ success: false }` — no products pushed

**Result:** The catalogue expands automatically as customers request products in genres we haven't seen before, while off-theme requests are blocked by Claude. No redeploying to add genre IDs.

### 11.17 Description Formatting — itemCaption Cleanup

**Challenge:** Rakuten `itemCaption` fields are raw promotional text — unstructured walls of text that render poorly on WooCommerce product pages. Common issues:
- The same description is repeated twice in the same string (Rakuten API behaviour)
- Key-value product specs (`商品名：X 色：Y 素材：Z`) are inline with sentences rather than in a structured format
- `・`-prefixed lines and `。`-terminated sentences are mixed together with no visual separation

**Approach:** Analyze real `itemCaption` values from the DB across all categories before writing the formatter — patterns vary by product type. A `dumpCaptions.ts` script pulls a sample and writes to JSON for inspection.

**Solution:** `cleanDescription(caption: string): string` in `utils.ts`:
1. **Dedup** — detect and remove repeated blocks (compare halves; if similar, keep one)
2. **Key-value extraction** — find segments matching `短いラベル：値` (short label + full-width colon + value) and render as an HTML `<table>`
3. **Sentence bullets** — split remaining text on `。`, strip `・` prefixes, render as `<ul><li>` list
4. Returns an HTML string pushed directly as WooCommerce `description`

**Why HTML output:** WooCommerce stores and renders description as HTML. Returning a formatted HTML string from `cleanDescription` means no post-processing needed on the WordPress side — TranslatePress still translates the inner text lazily on first page view.

### 11.10 Ranking API Has No `hits` Parameter

**Challenge:** The Rakuten Ranking API does not accept a `hits` parameter — passing it is silently ignored. Initial implementation passed `count` as `hits`, resulting in the API returning its default page size (30 products) regardless of the requested count.

**Solution:** Switch to the `page` parameter (1–34), where each page returns exactly 30 products. Config key renamed to `pagesPerSubcategory` — directly sets how many pages to fetch per subcategory. Minimum granularity is 30 products per subcategory.

---

## 12. Open Questions & Resolved Decisions

### Resolved
- **Currency:** CNY. Sale prices stored and displayed in Chinese Yuan. JPY → CNY conversion applied at pricing calculation time.
- **Translation:** Product names translated JA → ZH-HANS via DeepL API in the pipeline before WooCommerce push — enables Chinese keyword search immediately. Descriptions remain Japanese and are translated lazily by TranslatePress on first page view. PostgreSQL stores both `name_ja` and `name_zh`.
- **WooCommerce role:** Full storefront — browsing, cart, checkout, payments. Express pipeline is ingestion-only.
- **Deduplication key:** `rakuten_url` — stable, unique per Rakuten listing.
- **Primary fetch method:** Ranking API (top N per genre) — replaces genre search for bulk push.
- **Re-scrape logic:** URL-based upsert — skip if unchanged, update if price/availability changed, insert if new.
- **Genre map location:** Migrated from `genres.ts` to PostgreSQL `subcategories` table. Loaded into memory at startup. Unknown genre IDs classified by Claude at runtime and appended via `array_append` — no redeploy needed. See §11.6, §11.15.

### Still Open
- **WooCommerce REST API credentials:** Consumer Key + Secret not yet generated on running.moximoxi.net.
- **Top N per genre:** How many products to pull per genre for initial bulk push — not yet decided.
- **Exchange rate source:** JPY → CNY rate — hardcoded in config or fetched from an exchange rate API?
- **Image sideloading:** WooCommerce's automatic image sideloading needs testing — some CDN images may block hotlink requests.
- **Translation quality upgrade — needs boss approval:** Current setup uses Google Translate v2 via TranslatePress (free tier). Translation quality is functional but not natural-sounding for Chinese readers. DeepL Pro API (paid monthly) would significantly improve JA → ZH-HANS quality, especially for product names and descriptions. TranslatePress supports DeepL as a drop-in replacement engine. Needs discussion with boss — involves ongoing monthly cost. Flag this when reviewing store conversion rates.

---

## 13. Repository Structure

```
automation-ecosystem/rakuten/
├── src/
│   ├── app.ts                    # Express entry point — routes defined directly here
│   ├── controller.ts             # All route handler logic
│   ├── services/
│   │   ├── rakutenAPI.ts         # Rakuten API wrapper
│   │   ├── pricing.ts            # Margin formula
│   │   └── woocommerceAPI.ts        # WooCommerce REST API wrapper
│   ├── db/
│   │   ├── pool.ts               # PostgreSQL connection pool
│   │   ├── queries.ts            # PostgreSQL product queries
│   │   ├── seed.ts               # Creates tables + seeds categories/subcategories (replaces schema.sql)
│   │   └── schema.sql            # Original table definitions (superseded by seed.ts)
│   └── config/
│       └── genres.ts             # Rakuten genre ID map
├── dist/                         # Compiled JS output (tsc)
├── tsconfig.json
└── package.json
```

**Shared volume — removed.** All data previously written to `shared_volume/` is migrated to PostgreSQL. The dashboard reads from DB directly.

| DB Table | Previously | Contains |
|---|---|---|
| `config` | `shared_volume/rakuten/config.json` | YenToYuan, markupPercent, pagesPerSubcategory, searchFillThreshold — updated via dashboard admin UI |
| `run_logs` | `shared_volume/rakuten/run_log.json` | Per-run: operation, category, products fetched/pushed, failures, stale products deleted |
| `product_stats` | `shared_volume/rakuten/product_stats.json` | Total cached, total pushed, per-category breakdown — updated after each run |
| `import_logs` | `shared_volume/rakuten/import_log.json` | Per-product WooCommerce push attempt and outcome |
| `subcategories` | `src/config/genres.ts` | Genre ID map — dynamically expandable at runtime via Claude classification |

`src/config/wpCategoryIds.ts` stays static — WooCommerce category IDs are stable after initial setup and don't need runtime updates.
