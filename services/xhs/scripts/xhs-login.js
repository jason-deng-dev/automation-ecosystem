import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_PATH = path.join(__dirname, '../auth.json');

const emit = (obj) => process.stdout.write(JSON.stringify(obj) + '\n');

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });

if (!fs.existsSync(AUTH_PATH)) {
	fs.writeFileSync(AUTH_PATH, '{"cookies":[],"origins":[]}');
}

const context = await browser.newContext({ storageState: AUTH_PATH });
const page = await context.newPage();

const screenshotInterval = setInterval(async () => {
	try {
		const buf = await page.screenshot({ type: 'jpeg', quality: 60 });
		emit({ type: 'frame', data: buf.toString('base64') });
	} catch {}
}, 2000);

const timeoutHandle = setTimeout(async () => {
	clearInterval(screenshotInterval);
	emit({ type: 'error', msg: 'Login timeout after 5 minutes' });
	await browser.close();
	process.exit(1);
}, 5 * 60 * 1000);

await page.goto('https://www.xiaohongshu.com');
await page.waitForTimeout(4000);
if (await page.locator('.login-container').isVisible()) {
	await page.locator('.login-container').waitFor({ state: 'hidden' });
}

await page.goto('https://creator.xiaohongshu.com/publish/publish');
await page.waitForTimeout(4000);
if (await page.locator('.login-box-container').isVisible()) {
	await page.locator('.login-box-container img').click();
	await page.locator('.login-box-container').waitFor({ state: 'hidden' });
}

clearInterval(screenshotInterval);
clearTimeout(timeoutHandle);
await context.storageState({ path: AUTH_PATH });
emit({ type: 'done' });
await browser.close();
