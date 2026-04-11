"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const woocommerceAPI_1 = require("../services/woocommerceAPI");
const rakutenAPI_1 = require("../services/rakutenAPI");
const queries_1 = require("../db/queries");
async function runKeywordPopulate() {
    console.log("starting keyword populate single run...");
    console.log("fetching products from Rakuten");
    const rakutenRes = await (0, rakutenAPI_1.getProductsByKeyword)("Triathlon", 1);
    if (!rakutenRes)
        throw new Error("Rakuten response is empty aborting");
    console.log(rakutenRes);
    console.log("storing in db, getting back non-dupe products to push to woocommerce");
    const productUrls = await (0, queries_1.upsertProducts)(rakutenRes);
    console.log(productUrls);
    console.log("pushing products to woocommerce");
    const products = await (0, queries_1.getProductByUrls)(productUrls);
    await (0, woocommerceAPI_1.pushProducts)(products);
    console.log("Run complete");
}
runKeywordPopulate();
