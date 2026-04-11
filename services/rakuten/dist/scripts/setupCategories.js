"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const woocommerceAPI_1 = require("../services/woocommerceAPI");
async function main() {
    console.log(await (0, woocommerceAPI_1.setupCategories)());
}
console.log('Starting to setup categories on woocommerce...');
main().then(() => console.log('Done'));
// 
