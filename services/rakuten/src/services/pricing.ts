import 'dotenv/config';
import fs from 'fs';

let yenToYuan: number;
let markupMultiplier: number;

function loadConfig() {
    const configs = JSON.parse(fs.readFileSync(`${process.env.DATA_DIR}/rakuten/config.json`, 'utf-8'));
    yenToYuan = configs.YenToYuan;
    markupMultiplier = 1 + (configs.markupPercent ?? 0) / 100;
}

loadConfig();

export function reloadConfig() { loadConfig(); }

export function calculatePrice(price: number) {
    const priceYuan = price * yenToYuan * markupMultiplier;
    return Math.ceil(priceYuan / 5) * 5;
}
