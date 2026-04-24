import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_PATH = path.join(__dirname, '../auth.json');

const emit = (obj) => process.stdout.write(JSON.stringify(obj) + '\n');

const browser = await chromium.launch({ headless: false });

if (!fs.existsSync(AUTH_PATH)) {
	fs.writeFileSync(AUTH_PATH, '{"cookies":[],"origins":[]}');
}

const context = await browser.newContext({ storageState: AUTH_PATH });

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
	await browser.close();
	process.exit(1);
}, 5 * 60 * 1000);

console.log('Starting login process...');
await page.goto('https://www.xiaohongshu.com');

// await page.pause()
await page.waitForTimeout(4000)
if (await page.locator('.login-container').isVisible()){
	console.log('Login container visible on xhs.com, waiting for login...');
	await page.locator('.login-container').waitFor({ state: 'hidden' })
}


await page.goto('https://creator.xiaohongshu.com/publish/publish');
await page.waitForTimeout(4000)
if (await page.locator('.login-box-container').isVisible()){
	console.log('Login box visible on creator, clicking QR...');
	await page.locator('.login-box-container img').click()
	await page.locator('.login-box-container').waitFor({ state: 'hidden' })
}
clearInterval(screenshotInterval);
clearTimeout(timeoutHandle);
await context.storageState({ path: AUTH_PATH });
console.log('Login successful — auth.json saved.');
emit({ type: 'done' });
await browser.close();
