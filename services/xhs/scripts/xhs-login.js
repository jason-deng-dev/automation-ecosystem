import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_PATH = path.join(__dirname, '../auth.json');

const emit = (obj) => process.stdout.write(JSON.stringify(obj) + '\n');

const browser = await chromium.launch({
	headless: true,
	args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled'],
});

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

process.on('SIGTERM', async () => {
	clearInterval(screenshotInterval);
	await browser.close();
	process.exit(0);
});

const screenshotInterval = setInterval(async () => {
	try {
		const buf = await page.screenshot({ type: 'jpeg', quality: 60 });
		emit({ type: 'frame', data: buf.toString('base64') });
	} catch {}
}, 1000);

const timeoutHandle = setTimeout(async () => {
	clearInterval(screenshotInterval);
	emit({ type: 'error', msg: 'Login timeout after 5 minutes' });
	await new Promise(r => setTimeout(r, 500));
	await browser.close();
	process.exit(1);
}, 5 * 60 * 1000);

emit({ type: 'log', msg: 'Starting login process...' });

emit({ type: 'log', msg: 'Starting xhs.com login process...' });
await page.goto('https://www.xiaohongshu.com', { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(3000)
if (await page.locator('.login-container').isVisible()){
	emit({ type: 'log', msg: 'Login container visible on xhs.com, waiting for login...' });
	await page.locator('.login-container').waitFor({ state: 'hidden' })
}
emit({ type: 'log', msg: 'xhs.com login process done.' });


emit({ type: 'log', msg: 'Starting creator login process...' });
await page.goto('https://creator.xiaohongshu.com/publish/publish', { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(3000)
if (await page.locator('.login-box-container').isVisible()){
	emit({ type: 'log', msg: 'Login box visible on creator, clicking QR...' });
	await page.locator('.login-box-container img').click()
	await page.locator('.login-box-container').waitFor({ state: 'hidden' })
}
emit({ type: 'log', msg: 'Creator login process done.' });



clearInterval(screenshotInterval);
clearTimeout(timeoutHandle);
await context.storageState({ path: AUTH_PATH });
emit({ type: 'log', msg: 'Login successful — auth.json saved.' });
emit({ type: 'done' });
await new Promise(r => setTimeout(r, 500)); // flush stdout before closing
await browser.close();
