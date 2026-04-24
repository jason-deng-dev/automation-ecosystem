import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const DISPLAY = process.env.DISPLAY || ':99';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_PATH = path.join(__dirname, '../auth.json');

const emit = (obj) => process.stdout.write(JSON.stringify(obj) + '\n');

const browser = await chromium.launch({
	headless: false,
	args: [
		'--no-sandbox',
		'--disable-setuid-sandbox',
		'--disable-dev-shm-usage',
		'--disable-background-timer-throttling',
		'--disable-backgrounding-occluded-windows',
		'--disable-renderer-backgrounding',
		'--disable-gpu',
	],
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
	Object.defineProperty(document, 'visibilityState', { get: () => 'visible' });
	Object.defineProperty(document, 'hidden', { get: () => false });
	document.addEventListener('visibilitychange', () => {}, true);
});

const page = await context.newPage();

process.on('SIGTERM', async () => {
	clearInterval(screenshotInterval);
	await browser.close();
	process.exit(0);
});

let resolveFirstFrame;
const firstFrame = new Promise(r => { resolveFirstFrame = r; });

let screenshotInProgress = false;
const screenshotInterval = setInterval(async () => {
	if (screenshotInProgress) return;
	screenshotInProgress = true;
	try {
		const tmpPath = '/tmp/xhs-frame.jpg';
		await execFileAsync('scrot', ['-q', '60', tmpPath], { env: { ...process.env, DISPLAY } });
		const buf = fs.readFileSync(tmpPath);
		emit({ type: 'frame', data: buf.toString('base64') });
		resolveFirstFrame();
	} catch (e) {
		emit({ type: 'log', msg: `screenshot error: ${e?.message}` });
	} finally {
		screenshotInProgress = false;
	}
}, 1000);

const timeoutHandle = setTimeout(async () => {
	clearInterval(screenshotInterval);
	emit({ type: 'error', msg: 'Login timeout after 5 minutes' });
	await new Promise(r => setTimeout(r, 500));
	await browser.close();
	process.exit(1);
}, 5 * 60 * 1000);

emit({ type: 'log', msg: 'Starting login process...' });
await firstFrame;



emit({ type: 'log', msg: 'Starting creator login process...' });
await page.goto('https://creator.xiaohongshu.com/publish/publish', { waitUntil: 'commit' });
// Force continuous repaints so Xvfb compositor doesn't go idle
await page.evaluate(() => {
	const canvas = document.createElement('canvas');
	canvas.style.cssText = 'position:fixed;bottom:0;right:0;width:1px;height:1px;opacity:0.01;pointer-events:none';
	document.body.appendChild(canvas);
	const ctx = canvas.getContext('2d');
	let t = 0;
	(function paint() { ctx.fillStyle = `hsl(${t++%360},50%,50%)`; ctx.fillRect(0,0,1,1); requestAnimationFrame(paint); })();
});
try {
	await page.locator('.login-box-container').waitFor({ state: 'visible', timeout: 15000 });
	await page.bringToFront();
	emit({ type: 'log', msg: 'Login box visible on creator, clicking QR...' });
	await page.locator('.login-box-container img').click();
	await page.evaluate(() => {
		window.dispatchEvent(new Event('focus'));
		document.dispatchEvent(new Event('visibilitychange'));
	});
	emit({ type: 'log', msg: `URL after click: ${page.url()}` });
	try {
		await page.locator('img.css-1lhmg90').waitFor({ state: 'visible', timeout: 10000 });
		emit({ type: 'log', msg: 'QR code image rendered.' });
	} catch {
		emit({ type: 'log', msg: 'QR image wait timed out — may still be loading.' });
	}
	emit({ type: 'log', msg: `URL: ${page.url()}` });
	emit({ type: 'log', msg: 'QR code showing — scan with phone.' });
	await new Promise((resolve) => {
		const onNav = (frame) => {
			if (frame === page.mainFrame() && !frame.url().includes('login')) {
				page.off('framenavigated', onNav);
				resolve();
			}
		};
		page.on('framenavigated', onNav);
		setTimeout(resolve, 5 * 60 * 1000); // 5 min timeout fallback
	});
	emit({ type: 'log', msg: `Login detected — URL: ${page.url()}` });
} catch {}
emit({ type: 'log', msg: 'Creator login process done.' });

emit({ type: 'log', msg: 'Starting xhs.com login process...' });
await page.goto('https://www.xiaohongshu.com', { waitUntil: 'commit' });
await page.waitForTimeout(5000);
try {
	await page.locator('.login-container').waitFor({ state: 'visible', timeout: 15000 });
	emit({ type: 'log', msg: 'Login container visible on xhs.com, waiting for login...' });
	await page.locator('.login-container').waitFor({ state: 'hidden', timeout: 5 * 60 * 1000 });
} catch {}
emit({ type: 'log', msg: 'xhs.com done.' });

clearInterval(screenshotInterval);
clearTimeout(timeoutHandle);
await context.storageState({ path: AUTH_PATH });
emit({ type: 'log', msg: 'Login successful — auth.json saved.' });
emit({ type: 'done' });
await new Promise(r => setTimeout(r, 500)); // flush stdout before closing
await browser.close();
