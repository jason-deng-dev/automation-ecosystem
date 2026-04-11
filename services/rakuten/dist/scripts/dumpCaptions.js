"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// scrapes across genres and store items in json to analyze their captions
require("dotenv/config");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const queries_1 = require("../db/queries");
const rakutenAPI_1 = require("../services/rakutenAPI");
async function dumpCaptions() {
    const categories = await (0, queries_1.getCategoryIds)();
    const allGenreIds = Object.values(categories).flat();
    const uniqueGenreIds = [...new Set(allGenreIds)];
    console.log(`Fetching captions for ${uniqueGenreIds.length} genre IDs...`);
    const output = [];
    for (const genreId of uniqueGenreIds) {
        console.log(`Fetching genre ${genreId}...`);
        const products = await (0, rakutenAPI_1.getProductsByRankingGenre)(genreId, 5);
        if (!products)
            continue;
        const captions = products
            .map((p) => p.itemCaption)
            .filter(Boolean);
        if (captions.length > 0) {
            output.push({ genreId, captions });
        }
        await new Promise((res) => setTimeout(res, 500));
    }
    const outDir = path_1.default.join(__dirname, "../../scrape_output");
    if (!fs_1.default.existsSync(outDir))
        fs_1.default.mkdirSync(outDir, { recursive: true });
    const outPath = path_1.default.join(outDir, "captions.json");
    fs_1.default.writeFileSync(outPath, JSON.stringify(output, null, 2));
    console.log(`Done — ${output.length} genres written to ${outPath}`);
}
dumpCaptions();
