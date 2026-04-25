"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const node_path_1 = __importDefault(require("node:path"));
const express_1 = __importDefault(require("express"));
const pricing_1 = require("./services/pricing");
const woocommerceAPI_1 = require("./services/woocommerceAPI");
const queries_1 = require("./db/queries");
const runWeeklySync_1 = __importDefault(require("./scripts/runWeeklySync"));
const node_cron_1 = __importDefault(require("node-cron"));
const controller_1 = require("./controller");
const rateLimiter_1 = require("./middleware/rateLimiter");
const app = (0, express_1.default)();
node_cron_1.default.schedule("0 2 * * 1", async () => {
    try {
        await (0, runWeeklySync_1.default)();
    }
    catch (err) {
        console.error(`weekly sync failed`);
        return;
    }
}, { timezone: "Asia/Shanghai" });
const assetsPath = node_path_1.default.join(__dirname, "public");
app.use(express_1.default.static(assetsPath));
app.use(express_1.default.urlencoded({ extended: true }));
app.use(express_1.default.json());
app.get("/", (_req, res) => res.send("Running"));
app.post("/api/request-product", rateLimiter_1.productRequestLimiter, async (req, res) => {
    var _a;
    console.log(`[api] POST /api/request-product — keyword: "${req.body.keyword}"`);
    const result = await (0, controller_1.itemRequestByKeyword)(req.body.keyword);
    console.log(`[api] /api/request-product response: success=${result.success}, productIds=${JSON.stringify((_a = result.productIds) !== null && _a !== void 0 ? _a : [])}`);
    res.json(result);
});
app.post("/api/config", async (req, res) => {
    var _a;
    const snakeToCamel = {
        yen_to_yuan: 'yenToYuan',
        markup_percent: 'markupPercent',
        search_fill_threshold: 'searchFillThreshold',
        products_per_category: 'productsPerCategory',
    };
    const rawKey = req.body.key;
    const key = (_a = snakeToCamel[rawKey]) !== null && _a !== void 0 ? _a : rawKey;
    const value = req.body.value;
    console.log(`[api] POST /api/config — ${key} = ${value}`);
    await (0, queries_1.updateConfig)(key, value);
    await (0, pricing_1.reloadConfig)();
    await (0, woocommerceAPI_1.updatePrices)();
    res.json({ success: true });
});
// triggers runWeeklySync()
app.post("/api/sync", async (req, res) => {
    await (0, runWeeklySync_1.default)();
    res.json({ success: true });
});
async function start() {
    await (0, pricing_1.initPricing)();
    app.listen(process.env.PORT, () => {
        console.log(`Server running on port ${process.env.PORT}`);
    });
}
start();
