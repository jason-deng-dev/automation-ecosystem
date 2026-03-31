// read from shared_volume/rakuten/config.json
import 'dotenv/config';
import fs from 'fs';
import { categories } from '../config/genres';


// if file exists, postHistoryRaw = file content, empty otherwise
const configs = JSON.parse(fs.readFileSync(`${process.env.DATA_DIR}/rakuten/config.json`, 'utf-8'));
const margins = configs.markup
const yenToYuan = configs.YenToYuan
const shipping = configs.shipping

export function calculatePrice(price:number, category:string) {
    const price_yen = ((price) * (1 + margins[category])) 
    const price_shipping_yuan = price_yen * yenToYuan + shipping[category]
    return Math.ceil(price_shipping_yuan/5)*5 
}
