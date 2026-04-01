// |`POST`|`/api/push/bulk`|Fetch top N per genre from Ranking API → normalize → price → push to WooCommerce|
// |`GET`|`/api/products`|Products stored in PostgreSQL (by genre or category)|
// |`GET`|`/api/products/:itemCode`|Single product detail|
// |`POST`|`/api/request-product`|Product request flow — fetch by keyword, push to WooCommerce|
// |`GET`|`/api/request-product/status/:requestId`|SSE progress stream for product request|

// POST api/products/
export function bulkFetch() {}

// GET api/products/keyword/:keyword
// POST api/products/keyword/:keyword

export function bulkPush() {}

// bulkFetch (saves to postgresSQL)
// bulkPush (pushes to Woocommerce)

// fetchByKeyword(keyword, amount)
// fetchByGenre(genreId, amount)

// get itemDetails by keyword (check DB if we have enough items, if not start fetch/push)

// get item details by itemUrl

//
// update status of request product

// rescrape: upsertProduct, check if url exists in DB compare info
// rakuten_price, stock_status update if changed/skipo if not

// logImport write success/fail/skipped per prodcut to import_log table after each Woocommerce push attempt

// when rescraping, first scrape by ranking, then for items not updated increment missed_scrapes

export async function itemRequestByKeyword(keywordZH: string) {
	/*
    Called when a customer can't find a product they want.
    Always fetch X products fresh from Rakuten and push all of them to WooCommerce.
    No DB fill calculation — products aren't indexed by keyword so there's no reliable way
    to count "how many we already have" for a given search. Just always fetch fresh.

    ISSUES & SOLUTIONS:
        1. Customer keyword is in Chinese but Rakuten Search API needs Japanese.
           Solution: Translate keywordZH → JA via DeepL before calling Rakuten.

        2. How to determine if a keyword match is good enough (full vs partial)?
           Solution: Not our problem — Rakuten's search handles relevance ranking.
           We push whatever it returns.

        3. Avoid pushing duplicate WooCommerce products if customer re-requests same keyword.
           Solution: For each Rakuten result, check rakuten_url in PostgreSQL before pushing.
           Already in DB → skip. Not in DB → price → push WC → store DB.

    FLOW:
        1. Translate keywordZH → JA (DeepL)
        2. Fetch X products from Rakuten Keyword Search API
        3. For each product:
            a. Check rakuten_url in DB (idempotency)
            b. Already exists → skip
            c. New → calculatePrice → pushProduct to WooCommerce → upsertProduct to DB
            d. Emit SSE progress update after each product
        4. Return WooCommerce product URLs
    */
}
