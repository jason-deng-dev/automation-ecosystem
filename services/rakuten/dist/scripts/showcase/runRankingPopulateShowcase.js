"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rakutenAPI_1 = require("../../services/rakutenAPI");
require("dotenv/config");
const woocommerceAPI_1 = require("../../services/woocommerceAPI");
const queries_1 = require("../../db/queries");
const pricing_1 = require("../../services/pricing");
// ─── SHOWCASE VERSION ────────────────────────────────────────────────────────
// Uses 1 genre ID per category so the demo runs quickly and is easy to follow.
// In production, each category maps to many more genre IDs (up to 16 per
// category), pulling top-ranked products across the full Rakuten genre tree
// and covering dozens of subcategories (shoes, apparel, nutrition, gear, etc).
// ─────────────────────────────────────────────────────────────────────────────
const showcaseCategories = {
    'Running Gear': [565768], // prod: 16 genre IDs (shoes, GPS, socks, tights...)
    // 'Training':               [201869],   // prod: 10 genre IDs (gym wear, resistance bands, jump rope...)
    // 'Nutrition & Supplements':[559936],   // prod: 13 genre IDs (protein, BCAA, energy gels, vitamins...)
    // 'Recovery & Care':        [214828],   // prod: 9 genre IDs (massage guns, foam rollers, taping...)
    // 'Sportswear':             [502027],   // prod: 14 genre IDs (compression, sports bra, windbreakers...)
};
async function runRankingPopulate() {
    // ── Step 1: Load config from DB ───────────────────────────────────────────
    await (0, pricing_1.initPricing)();
    const categoriesArr = Object.entries(showcaseCategories);
    const { productsPerCategory } = await (0, queries_1.getConfig)();
    console.log("starting populating by rankings...");
    console.log("(showcase mode — 1 genre ID per category; production runs all genre IDs)");
    for (const category of categoriesArr) {
        const categoryName = category[0];
        const subcategoryIds = category[1];
        for (const subcategoryId of subcategoryIds) {
            // ── Step 2: Fetch from Rakuten ────────────────────────────────────
            // Calls the Rakuten Ichiba Ranking API — returns top-selling products
            // for this genre ID. Each page = 30 products.
            console.log(`Fetching ${subcategoryId} from rakuten`);
            const productsPerSubcategory = Math.ceil(productsPerCategory / subcategoryIds.length);
            const rakutenRes = await (0, rakutenAPI_1.getProductsByRankingGenre)(subcategoryId, productsPerSubcategory);
            if (!rakutenRes) {
                console.error(`No results for genre ${subcategoryId}, skipping`);
                continue;
            }
            console.log(`fetched ${rakutenRes.length} products`);
            // ── Step 3: Upsert into PostgreSQL ────────────────────────────────
            // Deduplicates by Rakuten URL. New products are inserted; existing
            // ones are updated if price or availability changed. Returns only
            // the URLs of newly inserted products to avoid re-pushing to WooCommerce.
            const productUrls = await (0, queries_1.upsertProducts)(rakutenRes);
            console.log(`upserted ${productUrls.length} new products`);
            // ── Step 4: Push to WooCommerce ───────────────────────────────────
            // Fetches the full product rows for newly inserted URLs, applies
            // the JPY→CNY pricing formula, and pushes to WooCommerce via REST API.
            // Idempotent — products already in WooCommerce (wc_product_id set) are skipped.
            const products = await (0, queries_1.getProductByUrls)(productUrls);
            await (0, woocommerceAPI_1.pushProducts)(products);
            console.log(`${subcategoryId} successfully stored in db and pushed to woocommerce`);
            // Small delay between genre fetches to avoid rate limiting
            await new Promise((res) => setTimeout(res, 1000));
        }
        console.log(`${categoryName} run successful`);
    }
    console.log("ranking populate success");
}
runRankingPopulate();
