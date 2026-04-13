"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initPricing = initPricing;
exports.reloadConfig = reloadConfig;
exports.calculatePrice = calculatePrice;
const queries_1 = require("../db/queries");
let yenToYuan;
let markupMultiplier;
async function initPricing() {
    var _a;
    const config = await (0, queries_1.getConfig)();
    yenToYuan = config.yenToYuan;
    markupMultiplier = 1 + ((_a = config.markupPercent) !== null && _a !== void 0 ? _a : 0) / 100;
}
async function reloadConfig() { await initPricing(); }
function calculatePrice(price) {
    const priceYuan = price * yenToYuan * markupMultiplier;
    return Math.ceil(priceYuan / 5) * 5;
}
