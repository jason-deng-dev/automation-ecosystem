**Project:** automation-ecosystem — Rakuten Pipeline

**Platform:** running.moximoxi.net — Japanese marathon platform for Chinese runners

**GitHub:** [https://github.com/jason-deng-dev/automation-ecosystem](https://github.com/jason-deng-dev/automation-ecosystem) (`services/rakuten/`)

**Author:** Jason Deng

**Date:** March 2026

**Status:** In Development

---

## 1. Problem Statement

### 1.1 Context

running.moximoxi.net serves Chinese runners interested in Japanese running products. One of the platform's four core destinations is `/shop/` — a curated store selling Japanese running nutrition and gear (FANCL, Amino Vital, Pocari Sweat, SAVAS PRO, salt tabs).

Currently, products are added to WooCommerce manually. Each product requires: finding it on Rakuten, calculating a sale price with margin and shipping, downloading images, and creating the WooCommerce listing by hand. This bottleneck limits how many products the store can carry and how quickly new products can be added.

### 1.2 The Problem

Product ingestion needs to be:

- **Automated** — fetch directly from Rakuten, no manual copy-paste
- **Translated** — product names and descriptions are in Japanese; TranslatePress + DeepL handles JA → ZH-HANS on first customer view and caches permanently in WordPress DB
- **Priced intelligently** — sale price must account for Rakuten cost, estimated shipping, and target margin
- **Scalable** — bulk import top-ranked products per genre at launch; weekly cron keeps catalog fresh
- **Requestable** — if a customer can't find a product, they submit a request and it appears on the store within ~2 min

### 1.3 Goals

- Automate product ingestion from Rakuten Ichiba into WooCommerce — no manual copy-paste
- Translate product pages via TranslatePress + DeepL (JA → ZH-HANS) on first customer view, cached permanently in WordPress DB
- Calculate auto-pricing using a margin formula (Rakuten price + shipping estimate + margin %)
- Pre-load top-ranked products per category at launch via Ranking API; weekly cron auto-syncs new products
- Expose a "Request a product" flow — customer submits keyword, backend fetches from Rakuten, prices, and pushes to WooCommerce while they wait (~1-2 min) with an on-page progress indicator
- WooCommerce handles all customer-facing browsing, cart, checkout, and payments — no custom storefront

### 1.4 Non-Goals

- Custom React SPA storefront — WooCommerce is the storefront
- Pipeline-level translation (deepl.js) — TranslatePress handles this on the WordPress side
- Real-time price sync after initial WooCommerce import (v1 is import-only, re-scrape updates changed prices)
- Sourcing products from marketplaces other than Rakuten in v1

---

## 2. Architecture Role of Each Component

|Component|Role|
|---|---|
|**WooCommerce**|Full customer-facing storefront — product browsing, search, cart, checkout, payments (Stripe is built-in via WooCommerce)|
|**Express API**|Backend pipeline — Rakuten fetch, normalize, price, WooCommerce push, product request handler, weekly cron|
|**PostgreSQL**|Permanent product store — rate limit protection, re-scrape deduplication, price change tracking|
|**TranslatePress + DeepL**|JA → ZH-HANS translation on first customer page view, cached in WordPress DB permanently|
|**TypeScript**|Implementation language for the entire Express pipeline — enforces type correctness across all pipeline stages at compile time|

### Why TypeScript

The entire Express pipeline (server, services, config, DB layer) is written in TypeScript.

**1. Type safety through multi-stage data transformation**

The pipeline moves product data through five distinct transformation stages:

```
Rakuten API response → normalize → price → PostgreSQL → WooCommerce
```

Each stage mutates or reshapes the product object. Without types, a misnamed field, a missing property, or a wrong unit (JPY vs CNY, integer vs string) produces a silent runtime bug that only surfaces when a product lands in WooCommerce with a wrong price or a broken image. TypeScript catches these at compile time — before they ever reach production.

This matters most in the pricing layer: `rakuten_price`, `shipping_estimate`, `margin_pct`, and `sale_price` are all numeric fields that feed the formula. TypeScript enforces that each stage passes the right shape and the right types, so the formula always receives what it expects.

**2. Explicit product schema as the source of truth**

The internal product schema (Section 4.1) is defined once as a TypeScript interface and referenced by every module — `rakutenAPI`, `pricing`, `store`, `woocommerce`. If the schema changes (e.g. a field is renamed or a new field added), TypeScript surfaces every call site that needs to be updated. In plain JavaScript, those mismatches are silent until runtime.

**3. IDE autocomplete on API responses**

Rakuten returns deeply nested JSON. With TypeScript interfaces defined for the API response shape, every downstream consumer gets full autocomplete when accessing fields — instead of guessing field names and cross-referencing docs.

**4. Refactoring safety**

When a field in the product schema is renamed (e.g. `sale_price` → `price_cny`), TypeScript surfaces every call site that breaks at compile time. In JavaScript, that's a find-and-replace with no guarantee of completeness.

**5. Self-documenting function signatures**

```ts
calculatePrice(rakutenPrice: number, options: PricingOptions): PricedProduct
```

The signature tells you what goes in and comes out without reading the implementation. For a pipeline with this many transformation stages, that readability compounds across every module.

**6. Catches unit mismatches at the type level**

JPY and CNY are both `number` at runtime — TypeScript can enforce the distinction via branded types or clear interface field naming, preventing a raw Rakuten JPY price from silently flowing into a CNY field.

**7. Resume and professional context**

TypeScript is the production standard for Node.js backend services. Having a deployed pipeline written in TypeScript is a concrete talking point when job searching — not just "I know TypeScript" but "I built and deployed a production service in it."

### Why WooCommerce as the storefront (not a custom React SPA)

A custom React SPA was considered and rejected for the following reasons:

1. **Zero support after handoff.** This platform will be operated by a non-technical operator after the original developer leaves. WooCommerce has 24/7 support, a massive plugin ecosystem, and any WordPress developer can maintain it.
2. **Security.** WooCommerce is battle-tested against fraud, injection attacks, and payment security edge cases.
3. **Complexity without proportionate benefit.** A large pre-loaded catalog + weekly auto-sync covers the vast majority of customer demand. The edge case of a missing product is handled by the "Request a product" flow.
4. **TranslatePress handles translation on the storefront.** Since the storefront is WordPress, TranslatePress + DeepL translates product pages on first customer view and caches permanently in WordPress DB — no custom translation pipeline needed.

### Why no pipeline-level translation (no deepl.js)

The pipeline pushes Japanese product names and descriptions directly to WooCommerce. TranslatePress translates them on first customer view and caches the result in WordPress DB (MySQL) forever. This is entirely separate from PostgreSQL — the two stores do not share data.

Removing deepl.js from the pipeline:
- Simplifies the pipeline (fetch → normalize → price → push)
- Eliminates the DeepL API key dependency from the Express service
- Lets TranslatePress manage translations as a maintainable WordPress plugin
- Tradeoff: PostgreSQL only stores Japanese text; if the admin UI ever needs Chinese names, it must query WordPress, not PostgreSQL

---

## 3. System Architecture

> **Visual diagram:** [`docs/architecture/rakuten/rakuten.html`](../../../docs/architecture/rakuten/rakuten.html) — open in browser for a full visual of the pipeline and storefront flow.

### 3.1 High-Level Overview

```
FETCH → NORMALIZE → PRICE → STORE → PUSH
```

- **FETCH:** Rakuten Ranking API returns top-selling products per genre (up to 1000)
- **NORMALIZE:** Map raw Rakuten fields to internal product schema
- **PRICE:** Auto-pricing formula calculates CNY sale price
- **STORE:** Products written to PostgreSQL (permanent — used for deduplication and re-scrape)
- **PUSH:** WooCommerce REST API receives products; TranslatePress handles translation on first customer view

### 3.2 Component Breakdown

#### rakutenAPI.ts

- `getProductsByKeyword(keyword, count, sortMode)` — Ichiba Item Search API (used for product request flow)
- `getProductsByRankingGenre(genreId, count)` — Ichiba Ranking API — **primary fetch method** for bulk push and weekly cron
- Returns normalized product objects (normalization handled internally)

#### genres.ts (exists — curated genre ID map)

- Maps internal category names to Rakuten genre IDs
- Used by rakutenAPI.ts to target specific product categories for ranking fetch
- See Section 6 for full category structure

#### db/store.ts (new)

- PostgreSQL interface for permanent product storage
- `getProductByUrl(url)` — check if product already exists (deduplication key)
- `upsertProduct(product)` — insert new or update price/availability if changed
- `getProductsByGenre(genreId)` — return stored products for a genre

#### pricing.ts (new)

- `calculatePrice(rakutenPrice, options)` — applies margin formula
- Returns `{ sale_price, cost_price, margin_pct, shipping_estimate }`
- Configurable margin % and shipping estimate per category

#### woocommerce.ts (new)

- Wraps WooCommerce REST API (Consumer Key + Consumer Secret auth)
- `pushProduct(product)` — creates single WooCommerce product
- `pushBulk(products)` — sequential bulk push with per-item result logging
- `checkExists(sku)` — checks if product already exists by SKU before pushing
- Maps internal product schema to WooCommerce product fields (Japanese text — TranslatePress handles translation)

#### app.ts (exists)

- Express entry point — routes defined directly in app.ts

#### controller.ts (new)

- Handles all route logic — bulk push, product request flow, cron sync, product queries
- Orchestrates: Rakuten fetch → normalize → price → PostgreSQL store → WooCommerce push

### 3.3 Data Flow

#### Bulk push (initial load + ranking)
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
CREATE TABLE products (
  id               SERIAL PRIMARY KEY,
  item_code        VARCHAR(255) UNIQUE NOT NULL,
  rakuten_item_code VARCHAR(255),
  name_ja          TEXT,
  description_ja   TEXT,
  images           JSONB,
  rakuten_price    INTEGER,
  sale_price       INTEGER,
  cost_price       INTEGER,
  shipping_estimate INTEGER,
  margin_pct       DECIMAL(5,2),
  genre_id         VARCHAR(50),
  genre_name       VARCHAR(100),
  category         VARCHAR(50),
  stock_status     VARCHAR(20) DEFAULT 'instock',
  rakuten_url      TEXT UNIQUE,
  fetched_at       TIMESTAMP,
  wc_product_id    INTEGER,
  wc_pushed_at     TIMESTAMP,
  created_at       TIMESTAMP DEFAULT NOW(),
  updated_at       TIMESTAMP DEFAULT NOW()
);

CREATE TABLE import_log (
  id            SERIAL PRIMARY KEY,
  item_code     VARCHAR(255),
  wc_product_id INTEGER,
  status        VARCHAR(20), -- 'success', 'failed', 'skipped'
  error_message TEXT,
  imported_at   TIMESTAMP DEFAULT NOW()
);
```

**Note:** No `name_zh`, `description_zh`, or `translated_at` columns — translation is handled entirely by TranslatePress in WordPress DB (MySQL), not in PostgreSQL.

### 4.3 Pricing Formula

```
sale_price = ceil((rakuten_price + shipping_estimate) / (1 - margin_pct))
```

**Currency:** All sale prices are stored and displayed in CNY (Chinese Yuan). Rakuten prices are in JPY — conversion applies at calculation time using a configurable exchange rate.

**Shipping estimate covers two legs:** Japan domestic (Rakuten → company) + international (Japan → China). Rakuten provides no weight data, so estimates are flat per category.

**Default values (placeholder — to be confirmed by operator):**

|Category|Shipping Estimate (CNY)|Target Margin|
|---|---|---|
|Nutrition / Supplements|¥65|20%|
|Running Gear|¥120|22%|
|Recovery & Care|¥65|20%|
|Sportswear|¥150|25%|
|Training Equipment|¥150|22%|

**Example:**

```
Rakuten price: ¥3,240 JPY → ~¥160 CNY (at ~0.049 rate)
Shipping estimate: ¥65 CNY
Margin: 20%

sale_price = ceil((160 + 65) / (1 - 0.20))
           = ceil(225 / 0.80)
           = ¥282 CNY
```

### 4.4 Express API Endpoints

|Method|Endpoint|Description|
|---|---|---|
|`POST`|`/api/push/bulk`|Fetch top N per genre from Ranking API → normalize → price → push to WooCommerce|
|`GET`|`/api/products`|Products stored in PostgreSQL (by genre or category)|
|`GET`|`/api/products/:itemCode`|Single product detail|
|`POST`|`/api/request-product`|Product request flow — fetch by keyword, push to WooCommerce|
|`GET`|`/api/request-product/status/:requestId`|SSE progress stream for product request|
|`POST`|`/api/cron/sync`|Trigger weekly re-scrape manually|

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
|`name_ja`|`name` (Japanese — TranslatePress translates on first customer view)|
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

### 6.2 genres.js Structure

```javascript
module.exports = {
  nutrition: {
    label: "🥤 Nutrition & Supplements",
    subgenres: {
      sports_drinks: { label: "Sports Drinks", genreId: "XXXXXX" },
      protein:       { label: "Protein",        genreId: "XXXXXX" },
      amino_acid:    { label: "Amino Acid",      genreId: "505814" },
      vitamins:      { label: "Vitamins & Minerals", genreId: "XXXXXX" },
      recovery:      { label: "Recovery",        genreId: "XXXXXX" }
    }
  },
  gear: {
    label: "🏃 Running Gear",
    subgenres: {
      shoes:       { label: "Shoes",       genreId: "XXXXXX" },
      apparel:     { label: "Apparel",     genreId: "XXXXXX" },
      gps_watch:   { label: "GPS / Watch", genreId: "XXXXXX" },
      accessories: { label: "Accessories", genreId: "XXXXXX" }
    }
  },
  // ... recovery, training, sportswear
}
```

---

## 7. Translation — TranslatePress

Translation is handled entirely by TranslatePress + DeepL on the WordPress side. The Express pipeline pushes Japanese product text to WooCommerce as-is.

**Flow:**
1. Product pushed to WooCommerce with `name_ja` and `description_ja` (Japanese)
2. First customer visits the product page
3. TranslatePress detects the page hasn't been translated → calls DeepL (JA → ZH-HANS)
4. Translation cached permanently in WordPress DB (MySQL)
5. All subsequent visitors get the cached Chinese translation instantly

**Why not translate in the pipeline (no deepl.js):**
- TranslatePress is a maintained WordPress plugin — operator can manage translations without touching code
- Translations stored in WordPress DB alongside the product — no sync problem between PostgreSQL and WordPress
- Removes DeepL API key dependency from the Express service
- Tradeoff: PostgreSQL only has Japanese text; admin UIs querying PostgreSQL will see Japanese product names

**TranslatePress config required:**
- Install TranslatePress + DeepL extension on running.moximoxi.net
- Set source language: Japanese, target language: Simplified Chinese (ZH-HANS)
- Configure DeepL API key in TranslatePress settings

---

## 8. Technical Decisions

|Decision|Choice|Alternatives Considered|Rationale|
|---|---|---|---|
|Product store|PostgreSQL permanent storage|In-memory only, Redis, 24h TTL cache|Permanent store enables re-scrape deduplication by URL; price change tracking; no TTL needed since re-scrape logic handles freshness|
|Translation|TranslatePress + DeepL on first customer view (WordPress)|Custom deepl.js in Express pipeline|TranslatePress is a maintained plugin; caches in WordPress DB; operator-manageable; removes DeepL dependency from Express service|
|Primary fetch|Rakuten Ranking API (top N per genre)|Genre search, keyword search|Ranking API returns proven top-sellers — higher product quality for initial catalog; supports up to top 1000|
|WooCommerce integration|WooCommerce REST API|Direct DB insert, WP CLI|Official path; hooks fire correctly; no SSH dependency; revocable auth|
|Pricing|Formula-based (configurable per category)|Manual per-product, flat markup|Configurable margins per category reflects real shipping cost differences; formula is auditable|
|Deduplication key|`rakuten_url`|`item_code`, `sku`|URL is stable and unique per Rakuten listing; also used as canonical product identity for re-scrape|
|Re-scrape strategy|Check URL → compare price/availability → update if changed|Full re-fetch, ignore existing|Minimizes Rakuten API calls; only pushes WooCommerce updates when something actually changed|
|Frontend|WooCommerce storefront + TranslatePress|Custom React SPA|WooCommerce has 24/7 support, built-in security, maintainable by any WordPress developer after handoff|
|Shipping at checkout|Preset per genre with adjustment caveat|Calculated at push time|Rakuten provides no weight data; category-based estimate shown with caveat that actual shipping may differ|

---

## 9. Product Request Flow

### 9.1 Overview

When a customer searches the WooCommerce store and can't find a product, a prominent "Didn't find what you're looking for? Request it here" button is shown. The customer submits a product name or keyword, the backend fetches from Rakuten, prices, and pushes to WooCommerce — all while the customer waits on-page with a progress indicator. TranslatePress translates on first customer view after the product is live.

### 9.2 Flow

```
Customer submits product request (keyword)
    ↓  POST /api/request-product
Express API:
  1. Search Rakuten by keyword
  2. Normalize top result
  3. Calculate price via pricing formula
  4. Push to WooCommerce via REST API (image sideloading is the bottleneck)
  5. Store in PostgreSQL
    ↓  ~1-2 minutes total
Return WooCommerce product URL
    ↓
On-page progress indicator → "Ready!" with link to product
Customer clicks through to WooCommerce product page
TranslatePress translates on first view, caches in WordPress DB
```

### 9.3 On-Page Progress Indicator

- Shown immediately after form submission — customer stays on the page
- Steps: Searching Rakuten → Calculating price → Adding to store → Ready!
- Progress streamed from backend via SSE (`GET /api/request-product/status/:requestId`)
- On completion: "Your product is ready — [View Product]" link to WooCommerce product page
- On failure: "We couldn't find that product on Rakuten. Try a different search term."

### 9.4 Implementation Notes

- WordPress shortcode added to WooCommerce search results page — no custom storefront needed
- The progress indicator is a small embedded JS snippet that connects to the SSE stream

---

## 10. Implementation Phases

### 10.1 Current Status

|Component|Status|Notes|
|---|---|---|
|rakutenAPI.js|🔧 Partial|Keyword search + genre search working; ranking not yet implemented|
|normalizeItems|✅ Done|Normalization handled internally in rakutenAPI.ts — no separate module|
|genres.js|🔧 Partial|Structure exists, some genre IDs missing|
|config.js|🔧 In Progress|Per-category margin %, shipping estimate, JPY→CNY rate — being built now|
|db/store.js|❌ Not started|PostgreSQL permanent product store|
|pricing.js|❌ Not started|Formula defined, not implemented|
|woocommerce.js|❌ Not started|WooCommerce REST API integration|
|Express API|🔧 Partial|MVC structure set up, endpoints not fully implemented|
|Product request flow|❌ Not started|SSE-based progress indicator + Express endpoint|
|TranslatePress config|❌ Not started|WordPress plugin setup + DeepL API key|
|Weekly auto-sync cron|❌ Not started|Scheduled Ranking API fetch + re-scrape logic|
|Deployment|❌ Not started|—|

### 10.2 Phase 1 — Data Pipeline

1. Add `getRanking()` to rakutenAPI.ts
2. Build `pricing.ts` — formula implementation with per-category config
4. Build `db/store.js` — PostgreSQL product store with upsert + URL deduplication
5. Test full fetch → normalize → price → store pipeline end-to-end

**Exit criteria:** Express API fetches top N products from Ranking API, normalizes, prices, and stores in PostgreSQL. Re-run skips unchanged products, updates changed ones.

### 10.3 Phase 2 — WooCommerce Integration + Bulk Push

1. Set up WooCommerce REST API credentials on running.moximoxi.net
2. Build `woocommerce.js` with push, bulk push, and SKU existence check
3. Implement `POST /api/push/bulk` — fetch ranking → normalize → price → push
4. Run initial bulk push of top-ranked products per category
5. Install and configure TranslatePress + DeepL on running.moximoxi.net
6. Verify TranslatePress translates product pages correctly on first view

**Exit criteria:** Products appear in WooCommerce in Japanese. TranslatePress translates to Chinese on first customer view and caches. Prices match formula.

### 10.4 Phase 3 — Product Request Flow + Cron + Deploy

1. Build product request flow: `POST /api/request-product` + SSE progress stream
2. Embed progress indicator widget on WooCommerce search results page via shortcode
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

---

## 12. Open Questions & Resolved Decisions

### Resolved
- **Currency:** CNY. Sale prices stored and displayed in Chinese Yuan. JPY → CNY conversion applied at pricing calculation time.
- **Translation:** TranslatePress + DeepL on WordPress side. No deepl.js in the Express pipeline. PostgreSQL stores Japanese only.
- **WooCommerce role:** Full storefront — browsing, cart, checkout, payments. Express pipeline is ingestion-only.
- **Deduplication key:** `rakuten_url` — stable, unique per Rakuten listing.
- **Primary fetch method:** Ranking API (top N per genre) — replaces genre search for bulk push.
- **Re-scrape logic:** URL-based upsert — skip if unchanged, update if price/availability changed, insert if new.

### Still Open
- **Missing genre IDs in genres.js:** Need to populate incomplete entries before launch.
- **WooCommerce REST API credentials:** Consumer Key + Secret not yet generated on running.moximoxi.net.
- **Top N per genre:** How many products to pull per genre for initial bulk push — not yet decided.
- **Exchange rate source:** JPY → CNY rate — hardcoded in config or fetched from an exchange rate API?
- **Image sideloading:** WooCommerce's automatic image sideloading needs testing — some CDN images may block hotlink requests.

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
│   │   └── woocommerce.ts        # WooCommerce REST API wrapper
│   ├── db/
│   │   ├── store.ts              # PostgreSQL product store
│   │   └── schema.sql            # Table definitions
│   └── config/
│       └── genres.ts             # Rakuten genre ID map
├── dist/                         # Compiled JS output (tsc)
├── tsconfig.json
└── package.json
```

**Shared volume — local dev:** `shared_volume/` at repo root. Set `DATA_DIR=../../shared_volume` in `.env`.

| File | Direction | Contains |
|---|---|---|
| `shared_volume/rakuten/config.json` | Dashboard writes → Rakuten reads | Per-category margin %, shipping estimate, JPY→CNY rate, fetch count, search fill threshold |
| `shared_volume/rakuten/pipeline_state.json` | Rakuten writes → Dashboard reads | `{ state: "idle \| running \| failed" }` |
| `shared_volume/rakuten/run_log.json` | Rakuten writes → Dashboard reads | Per-run: operation, category, products fetched/pushed, failures |
| `shared_volume/rakuten/product_stats.json` | Rakuten writes → Dashboard reads | Total cached, total pushed, per-category breakdown |
| `shared_volume/rakuten/import_log.json` | Rakuten writes → Dashboard reads | Per-product WooCommerce push attempt and outcome |
