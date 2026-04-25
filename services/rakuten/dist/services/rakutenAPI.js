"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProductsByRankingGenre = exports.getProductsByGenresId = exports.getProductsByKeyword = void 0;
require("dotenv/config");
const utils_1 = require("../utils");
const getProductsByKeyword = async (keyword, count, sortMode = 'standard') => {
    var _a;
    const itemSearchEndpoint = `https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20220601?format=json&keyword=${encodeURIComponent(keyword)}&hits=${count}&availability=1&field=0&applicationId=${process.env.RAKUTEN_APP_ID}&sort=${sortMode}`;
    try {
        const res = await fetch(itemSearchEndpoint, {
            headers: {
                Referer: process.env.RAKUTEN_REFERRER,
                Origin: process.env.RAKUTEN_REFERRER,
                accessKey: process.env.RAKUTEN_ACCESS_KEY,
            },
        });
        const resJson = await res.json();
        const items = resJson.Items;
        if (!items) {
            console.log("No items:", (_a = resJson.error_description) !== null && _a !== void 0 ? _a : resJson);
            return null;
        }
        const normalizedItems = (0, utils_1.normalizeItems)(items);
        const translatedItems = await (0, utils_1.translateNames)(normalizedItems);
        return translatedItems;
    }
    catch (err) {
        console.log(err);
    }
};
exports.getProductsByKeyword = getProductsByKeyword;
const getProductsByGenresId = async (genreId, count, sortMode = 'standard') => {
    const itemSearchEndpoint = `https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20220601?format=json&genreId=${genreId}&availability=1&hits=${count}&sort=${sortMode}&applicationId=${process.env.RAKUTEN_APP_ID}`;
    try {
        const res = await fetch(itemSearchEndpoint, {
            headers: {
                Referer: process.env.RAKUTEN_REFERRER,
                Origin: process.env.RAKUTEN_REFERRER,
                accessKey: process.env.RAKUTEN_ACCESS_KEY,
            },
        });
        const resJson = await res.json();
        const items = resJson.Items;
        if (!items)
            return null;
        const normalizedItems = (0, utils_1.normalizeItems)(items);
        const translatedItems = await (0, utils_1.translateNames)(normalizedItems);
        return translatedItems;
    }
    catch (err) {
        console.log(err);
    }
};
exports.getProductsByGenresId = getProductsByGenresId;
const getProductsByRankingGenre = async (genreId, count) => {
    const page = Math.ceil(count / 20);
    const itemSearchEndpoint = `https://openapi.rakuten.co.jp/ichibaranking/api/IchibaItem/Ranking/20220601?format=json&genreId=${genreId}&page=${page}&applicationId=${process.env.RAKUTEN_APP_ID}`;
    try {
        const res = await fetch(itemSearchEndpoint, {
            headers: {
                Referer: process.env.RAKUTEN_REFERRER,
                Origin: process.env.RAKUTEN_REFERRER,
                accessKey: process.env.RAKUTEN_ACCESS_KEY,
            },
        });
        const resJson = await res.json();
        const items = resJson.Items.slice(0, count);
        if (!items)
            return null;
        const normalizedItems = (0, utils_1.normalizeItems)(items);
        const translatedItems = await (0, utils_1.translateNames)(normalizedItems);
        return translatedItems;
    }
    catch (err) {
        console.log(err);
    }
};
exports.getProductsByRankingGenre = getProductsByRankingGenre;
