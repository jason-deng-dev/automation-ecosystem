import 'dotenv/config';
import { chromium } from 'playwright';
import fs from 'fs';

const browser = await chromium.launch({ headless: false });

if (!fs.existsSync(`${process.env.DATA_DIR}/xhs/auth.json`)) {
	fs.writeFileSync(`${process.env.DATA_DIR}/xhs/auth.json`, '{"cookies":[],"origins":[]}');
}

const context = await browser.newContext({ storageState: `${process.env.DATA_DIR}/xhs/auth.json` });

const page = await context.newPage();
console.log('Starting login process...')
await page.goto('https://www.xiaohongshu.com');

// await page.pause()
await page.waitForTimeout(4000)
if (await page.locator('.login-container').isVisible()){
	await page.locator('.login-container').waitFor({ state: 'hidden' })
}


await page.goto('https://creator.xiaohongshu.com/publish/publish');
await page.waitForTimeout(4000)
if (await page.locator('.login-box-container').isVisible()){
	await page.locator('.login-box-container img').click()
	await page.locator('.login-box-container').waitFor({ state: 'hidden' })
}
await context.storageState({ path: `${process.env.DATA_DIR}/xhs/auth.json` }); // saves cookies/session to file
console.log('Login successful — auth.json saved.')
await browser.close();
