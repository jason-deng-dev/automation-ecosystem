import 'dotenv/config';
import fs from 'fs';

const configs = JSON.parse(fs.readFileSync(`${process.env.DATA_DIR}/rakuten/config.json`, 'utf-8'));
const yenToYuan = configs.YenToYuan;

export function calculatePrice(price: number) {
    const priceYuan = price * yenToYuan;
    return Math.ceil(priceYuan / 5) * 5;
}
