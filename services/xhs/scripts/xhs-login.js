import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_PATH = path.join(__dirname, '../auth.json');

const browser = await chromium.launch({ headless: false });

if (!fs.existsSync(AUTH_PATH)) {
	fs.writeFileSync(AUTH_PATH, '{"cookies":[],"origins":[]}');
}

const context = await browser.newContext({ storageState: AUTH_PATH });

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
await context.storageState({ path: AUTH_PATH }); // saves cookies/session to file
console.log('Login successful — auth.json saved.')
await browser.close();
