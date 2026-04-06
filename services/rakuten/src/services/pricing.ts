import { getConfig } from '../db/queries';

let yenToYuan: number;
let markupMultiplier: number;

export async function initPricing() {
    const config = await getConfig();
    yenToYuan = config.yenToYuan;
    markupMultiplier = 1 + (config.markupPercent ?? 0) / 100;
}

export async function reloadConfig() { await initPricing(); }

export function calculatePrice(price: number) {
    const priceYuan = price * yenToYuan * markupMultiplier;
    return Math.ceil(priceYuan / 5) * 5;
}
