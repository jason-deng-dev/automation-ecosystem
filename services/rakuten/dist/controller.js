"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkFetch = bulkFetch;
exports.bulkPush = bulkPush;
exports.itemRequestByKeyword = itemRequestByKeyword;
const rakutenAPI_1 = require("./services/rakutenAPI");
const queries_1 = require("./db/queries");
const woocommerceAPI_1 = require("./services/woocommerceAPI");
const claudeAPI_1 = require("./services/claudeAPI");
// |`POST`|`/api/push/bulk`|Fetch top N per genre from Ranking API → normalize → price → push to WooCommerce|
// |`GET`|`/api/products`|Products stored in PostgreSQL (by genre or category)|
// |`GET`|`/api/products/:itemCode`|Single product detail|
// |`POST`|`/api/request-product`|Product request flow — fetch by keyword, push to WooCommerce, return wc_product_ids|
function bulkFetch() { }
function bulkPush() { }
async function itemRequestByKeyword(keywordZH) {
    console.log(`[request] keyword received: "${keywordZH}"`);
    const log = {
        operation: `item_request:${keywordZH}`,
        newProductsPushed: 0,
        priceUpdates: 0,
        removedUnavailable: 0,
        removedStale: 0,
        errors: [],
    };
    try {
        // 0. Pre-search DB for existing products matching keyword
        const dbMatches = await (0, queries_1.searchProductsByKeyword)(keywordZH);
        console.log(`[request] DB pre-search found ${dbMatches.length} existing product(s) matching "${keywordZH}"`);
        const dbMatchWcIds = dbMatches.map((p) => p.wc_product_id);
        const allGenres = await (0, queries_1.getAllGenres)();
        const { searchFillThreshold } = await (0, queries_1.getConfig)();
        console.log(`[request] searchFillThreshold: ${searchFillThreshold}`);
        // 1. Rakuten keyword search (count from searchFillThreshold in DB config)
        const res = await (0, rakutenAPI_1.getProductsByKeyword)(keywordZH, searchFillThreshold);
        if (!res) {
            console.log(`[request] Rakuten returned no results — aborting`);
            log.errors.push(`Rakuten returned no results for keyword: ${keywordZH}`);
            return { success: false };
        }
        console.log(`[request] Rakuten returned ${res.length} products`);
        // 2. Validate: first checking if genreIds exist in db, then calling claudeAPI to validate products
        const allGenreIds = new Set(Object.values(allGenres).flat().map(String));
        const fetchedGenreIds = [...new Set(res.map((p) => p.genreId))];
        console.log(`[request] fetched genre IDs: ${fetchedGenreIds.join(", ")}`);
        const genreIdsExists = fetchedGenreIds.some((genreId) => allGenreIds.has(genreId));
        console.log(`[request] genre IDs in DB: ${genreIdsExists}`);
        let validSubcategoryId;
        if (!genreIdsExists) {
            console.log(`[request] no known genre IDs — calling Claude to validate keyword`);
            validSubcategoryId = await (0, claudeAPI_1.validateKeyword)(keywordZH);
            if (validSubcategoryId == null) {
                console.log(`[request] Claude rejected keyword — aborting`);
                log.errors.push(`Claude rejected keyword: ${keywordZH}`);
                return { success: false };
            }
            console.log(`[request] Claude approved — subcategory ID: ${validSubcategoryId}`);
            await (0, queries_1.appendGenreIds)(validSubcategoryId, fetchedGenreIds.map((val) => Number(val)));
        }
        else {
            console.log(`[request] genre IDs already known — skipping Claude`);
            const newFetchedIds = fetchedGenreIds.filter((value) => !allGenreIds.has(value));
            if (newFetchedIds.length > 0) {
                console.log(`[request] ${newFetchedIds.length} new genre IDs — appending to DB`);
                const existingFetchedIds = fetchedGenreIds.filter((value) => allGenreIds.has(value));
                const existingSubcategoryId = Number(await (0, queries_1.getSubcategoryIdByGenreId)(Number(existingFetchedIds[0])));
                await (0, queries_1.appendGenreIds)(existingSubcategoryId, newFetchedIds.map((val) => Number(val)));
            }
        }
        // 3. Upsert to DB → fetch all products (newly inserted + already existing)
        console.log(`[request] upserting ${res.length} products to DB`);
        await (0, queries_1.upsertProducts)(res);
        const allProducts = await (0, queries_1.getProductByUrls)(res.map((p) => p.itemUrl));
        console.log(`[request] fetched ${allProducts.length} products from DB`);
        // 4. Split: already in WooCommerce vs needs push
        const alreadyPushedIds = allProducts.filter((p) => p.wc_product_id).map((p) => p.wc_product_id);
        const needsPush = allProducts.filter((p) => !p.wc_product_id);
        console.log(`[request] already in WooCommerce: ${alreadyPushedIds.length}, needs push: ${needsPush.length}`);
        const newWcIds = await (0, woocommerceAPI_1.pushProducts)(needsPush);
        console.log(`[request] pushed ${newWcIds.length} new products to WooCommerce`);
        log.newProductsPushed = newWcIds.length;
        // 5. Return all wc_product_ids (db pre-search + existing from fetch + newly pushed)
        const allWcIds = [...new Set([...dbMatchWcIds, ...alreadyPushedIds, ...newWcIds])];
        console.log(`[request] returning ${allWcIds.length} total product IDs (${dbMatchWcIds.length} from DB pre-search, ${alreadyPushedIds.length} already in WC, ${newWcIds.length} newly pushed)`);
        return { success: true, productIds: allWcIds };
    }
    catch (err) {
        const msg = `Unhandled error for keyword "${keywordZH}": ${err}`;
        console.error(`[request] ${msg}`);
        log.errors.push(msg);
        return { success: false };
    }
    finally {
        try {
            await (0, queries_1.insertRunLog)(log);
        }
        catch (logErr) {
            console.error(`[request] failed to write run log: ${logErr}`);
        }
    }
}
