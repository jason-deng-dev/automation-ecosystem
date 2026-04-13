"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rakutenAPI_1 = require("../services/rakutenAPI");
require("dotenv/config");
const woocommerceAPI_1 = require("../services/woocommerceAPI");
const queries_1 = require("../db/queries");
const pricing_1 = require("../services/pricing");
const categories = (0, queries_1.getCategoryIds)();
async function runRankingPopulate() {
    await (0, pricing_1.initPricing)();
    const categoriesArr = Object.entries(categories);
    const { productsPerCategory } = await (0, queries_1.getConfig)();
    console.log("starting populating by rankings...");
    for (const category of categoriesArr) {
        const categoryName = category[0];
        const subcategoryIds = category[1];
        for (const subcategoryId of subcategoryIds) {
            console.log(`Fetching ${subcategoryId} from rakuten`);
            const productsPerSubcategory = Math.ceil(productsPerCategory / subcategoryIds.length);
            const rakutenRes = await (0, rakutenAPI_1.getProductsByRankingGenre)(subcategoryId, productsPerSubcategory);
            if (!rakutenRes) {
                console.error(`No results for genre ${subcategoryId}, skipping`);
                continue;
            }
            console.log(`fetched ${rakutenRes.length} products`);
            const productUrls = await (0, queries_1.upsertProducts)(rakutenRes);
            console.log(`upserted ${productUrls.length} new products`);
            const products = await (0, queries_1.getProductByUrls)(productUrls);
            await (0, woocommerceAPI_1.pushProducts)(products);
            console.log(`${subcategoryId} successfully stored in db and pushed to woocommerce`);
            await new Promise((res) => setTimeout(res, 1000));
        }
        console.log(`${categoryName} run successful`);
    }
    console.log("ranking populate success");
}
runRankingPopulate();
