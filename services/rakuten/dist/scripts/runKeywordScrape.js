"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const fs_1 = __importDefault(require("fs"));
const rakutenAPI_1 = require("../services/rakutenAPI");
const keywords = [
    // Running Gear
    "ランニングシューズ",
    "マラソンシューズ",
    "トレイルランニングシューズ",
    "ランニングウェア",
    "ランニングタイツ",
    "ランニングソックス",
    "ランニングキャップ",
    "GPSウォッチ",
    "ランニングポーチ",
    "アームバンド スマホ",
    "インソール ランニング",
    "長距離 シューズ",
    "短距離 スパイク",
    "反射ベスト",
    "ランニングベルト",
    // Training
    "トレーニングマシン",
    "トレーニングウェア",
    "トレーニングシューズ",
    "プロテインシェイカー",
    "陸上",
    "ヨガ",
    "ヨガウェア",
    "ヨガマット",
    "トライアスロン",
    "ダンベル",
    "縄跳び",
    "バランスボール",
    "チューブトレーニング",
    "トレッドミル",
    // Nutrition & Supplements
    "プロテイン",
    "アミノ酸",
    "BCAA",
    "スポーツドリンク",
    "エネルギーゲル",
    "補給食",
    "ビタミン サプリ",
    "ミネラル サプリ",
    "食物繊維",
    "コラーゲン サプリ",
    "クエン酸",
    "乳酸菌 サプリ",
    "オメガ3",
    "マルトデキストリン",
    "プレワークアウト",
    // Recovery & Care
    "マッサージ用品",
    "マッサージガン",
    "フォームローラー",
    "ストレッチ器具",
    "フットケア",
    "テーピング",
    "アイシング",
    "サポーター 膝",
    "コンプレッションソックス",
    // Sportswear
    "スポーツウェア",
    "スポーツブラ",
    "ランニングパンツ",
    "スポーツ インナー",
    "スポーツバッグ",
    "スポーツサングラス",
    "フェイスカバー ランニング",
    "ウィンドブレーカー",
    "スポーツタオル",
    "アームカバー",
    "スポーツグローブ",
    "ネックウォーマー",
    "レッグウォーマー",
    "コンプレッションタイツ",
    "ジュニア スポーツウェア",
];
const PRODUCTS_PER_KEYWORD = 30;
async function runKeywordScrape() {
    const knownGenreIds = new Set();
    const genreIdToKeywords = {};
    for (const keyword of keywords) {
        console.log(`Scraping: ${keyword}`);
        const products = await (0, rakutenAPI_1.getProductsByKeyword)(keyword, PRODUCTS_PER_KEYWORD);
        if (!products) {
            console.log(`  No results`);
            continue;
        }
        for (const product of products) {
            const id = product.genreId;
            if (!knownGenreIds.has(id))
                knownGenreIds.add(id);
            if (!genreIdToKeywords[id])
                genreIdToKeywords[id] = [];
            if (!genreIdToKeywords[id].includes(keyword))
                genreIdToKeywords[id].push(keyword);
        }
        console.log(`  Found ${products.length} products`);
        await new Promise(res => setTimeout(res, 1000));
    }
    fs_1.default.writeFileSync("scrape_output.json", JSON.stringify(genreIdToKeywords, null, 2), "utf-8");
    console.log(`\nDone. ${Object.keys(genreIdToKeywords).length} unique genre IDs found.`);
    console.log("Output written to scrape_output.json");
}
runKeywordScrape();
