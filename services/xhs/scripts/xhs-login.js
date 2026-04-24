import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_PATH = path.join(__dirname, '../auth.json');

const emit = (obj) => process.stdout.write(JSON.stringify(obj) + '\n');

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled'] });

if (!fs.existsSync(AUTH_PATH)) {
	fs.writeFileSync(AUTH_PATH, '{"cookies":[],"origins":[]}');
}

const context = await browser.newContext({
	storageState: AUTH_PATH,
	userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
});
await context.addInitScript(() => {
	Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
});
const page = await context.newPage();

let screenshotBusy = false;
const screenshotInterval = setInterval(async () => {
	if (screenshotBusy) return;
	screenshotBusy = true;
	try {
		const buf = await page.screenshot({ type: 'jpeg', quality: 60 });
		emit({ type: 'frame', data: buf.toString('base64') });
	} catch {}
	screenshotBusy = false;
}, 1000);

const timeoutHandle = setTimeout(async () => {
	clearInterval(screenshotInterval);
	emit({ type: 'error', msg: 'Login timeout after 5 minutes' });
	await browser.close();
	process.exit(1);
}, 5 * 60 * 1000);

await page.goto('https://creator.xiaohongshu.com/publish/publish', { waitUntil: 'commit' });
try {
	await page.locator('.login-box-container').waitFor({ state: 'visible', timeout: 30000 });
	// NEED THIS CLICK TO GO TO QR CODE PAGE
	await page.locator('.login-box-container img').click();
	await page.waitForTimeout(5000);
	await page.locator('.login-box-container').waitFor({ state: 'hidden', timeout: 5 * 60 * 1000 });
} catch { /* already logged in */ }

clearInterval(screenshotInterval);
clearTimeout(timeoutHandle);
try {
	await page.goto('https://www.xiaohongshu.com', { waitUntil: 'commit', timeout: 10000 });
	await page.waitForTimeout(3000);
} catch { /* skip if unreachable */ }
await context.storageState({ path: AUTH_PATH });
emit({ type: 'done' });
await browser.close();
