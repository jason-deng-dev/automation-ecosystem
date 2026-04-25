"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = runWeeklySync;
require("dotenv/config");
const rakutenAPI_1 = require("../services/rakutenAPI");
const pricing_1 = require("../services/pricing");
const woocommerceAPI_1 = require("../services/woocommerceAPI");
const queries_1 = require("../db/queries");
async function runWeeklySync() {
    const log = {
        operation: "weekly_sync",
        newProductsPushed: 0,
        priceUpdates: 0,
        removedUnavailable: 0,
        removedStale: 0,
        errors: [],
    };
    const [categories, { productsPerCategory }] = await Promise.all([(0, queries_1.getCategoryIds)(), (0, queries_1.getConfig)(), (0, pricing_1.initPricing)()]);
    console.log("Starting weekly sync...");
    // Step 1: Bump missed_scrapes for all products — upsert will reset to 0 for any product seen this run
    await (0, queries_1.incrementMissedScrapes)();
    // Step 2: Fetch rankings, upsert, handle availability=0 and price changes
    for (const [categoryName, subcategoryIds] of Object.entries(categories)) {
        for (const subcategoryId of subcategoryIds) {
            try {
                const productsPerSubcategory = Math.ceil(productsPerCategory / subcategoryIds.length);
                const rakutenProducts = await (0, rakutenAPI_1.getProductsByRankingGenre)(subcategoryId, productsPerSubcategory);
                if (!rakutenProducts || rakutenProducts.length === 0)
                    continue;
                const unavailable = rakutenProducts.filter((p) => p.availability === 0);
                const available = rakutenProducts.filter((p) => p.availability !== 0);
                // Remove unavailable products from WC and DB
                for (const product of unavailable) {
                    const existing = (await (0, queries_1.getProductByUrls)([product.itemUrl]))[0];
                    if (existing === null || existing === void 0 ? void 0 : existing.wc_product_id) {
                        await (0, woocommerceAPI_1.deleteWcProduct)(existing.wc_product_id);
                        log.removedUnavailable++;
                    }
                    if (existing) {
                        await (0, queries_1.deleteProductByUrl)(product.itemUrl);
                    }
                }
                if (available.length === 0)
                    continue;
                // Pre-fetch existing DB records to detect price changes after upsert
                const urls = available.map((p) => p.itemUrl);
                const existingRecords = await (0, queries_1.getProductByUrls)(urls);
                const existingMap = new Map(existingRecords.map((r) => [r.itemUrl, r]));
                // Upsert — resets missed_scrapes=0 and updates itemPrice for seen products
                const newUrls = await (0, queries_1.upsertProducts)(available);
                // Push newly inserted products to WC
                if (newUrls.length > 0) {
                    const newProducts = await (0, queries_1.getProductByUrls)(newUrls);
                    await (0, woocommerceAPI_1.pushProducts)(newProducts);
                    log.newProductsPushed += newUrls.length;
                }
                // Re-push prices for existing products where itemPrice changed
                for (const product of available) {
                    const existing = existingMap.get(product.itemUrl);
                    if (!(existing === null || existing === void 0 ? void 0 : existing.wc_product_id))
                        continue;
                    if (existing.itemPrice !== product.itemPrice) {
                        try {
                            await (0, woocommerceAPI_1.updateWcPrice)(existing.wc_product_id, (0, pricing_1.calculatePrice)(product.itemPrice));
                            log.priceUpdates++;
                        }
                        catch (err) {
                            log.errors.push(`Price update failed for wc_product_id ${existing.wc_product_id}: ${err}`);
                        }
                    }
                }
                await new Promise((res) => setTimeout(res, 500));
            }
            catch (err) {
                const msg = `Error in ${categoryName}/${subcategoryId}: ${err}`;
                console.error(msg);
                log.errors.push(msg);
            }
        }
        console.log(`${categoryName} sync complete`);
    }
    // Step 3: Delete stale products (missed_scrapes >= 3 — not seen in 3+ weekly runs)
    const staleWithWc = await (0, queries_1.getStaleProductsWithWcId)();
    for (const { wc_product_id } of staleWithWc) {
        await (0, woocommerceAPI_1.deleteWcProduct)(wc_product_id);
    }
    const deletedCount = await (0, queries_1.deleteStaleProducts)();
    log.removedStale = deletedCount !== null && deletedCount !== void 0 ? deletedCount : 0;
    console.log(`Weekly sync complete — new: ${log.newProductsPushed}, price updates: ${log.priceUpdates}, ` +
        `removed unavailable: ${log.removedUnavailable}, removed stale: ${log.removedStale}, errors: ${log.errors.length}`);
    // Step 4: Write run log + product stats to DB
    await (0, queries_1.insertRunLog)(log);
    const [totals, byCategory] = await Promise.all([(0, queries_1.getProductTotals)(), (0, queries_1.getProductStatsByCategory)()]);
    await (0, queries_1.upsertProductStats)({
        totalCached: Number(totals.total),
        totalPushed: Number(totals.pushed),
        perCategory: Object.fromEntries(byCategory.map((r) => [r.categoryName, { cached: Number(r.total), pushed: Number(r.pushed) }])),
    });
}
runWeeklySync().catch(console.error);
