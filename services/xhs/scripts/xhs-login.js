import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_PATH = path.join(__dirname, '../auth.json');

const emit = (obj) => process.stdout.write(JSON.stringify(obj) + '\n');

const browser = await chromium.launch({
	headless: true,
	args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-web-fonts'],
});

const authContent = fs.existsSync(AUTH_PATH) ? fs.readFileSync(AUTH_PATH, 'utf8').trim() : '';
if (!authContent) {
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
await page.route('**/*', route =>
	route.request().resourceType() === 'font' ? route.abort() : route.continue()
);

process.on('SIGTERM', async () => {
	await browser.close();
	process.exit(0);
});

const cdp = await context.newCDPSession(page);
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 60, everyNthFrame: 3 });
cdp.on('Page.screencastFrame', ({ data, sessionId }) => {
	emit({ type: 'frame', data });
	cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
});

const timeoutHandle = setTimeout(async () => {
	emit({ type: 'error', msg: 'Login timeout after 5 minutes' });
	await new Promise(r => setTimeout(r, 500));
	await browser.close();
	process.exit(1);
}, 5 * 60 * 1000);


await page.waitForTimeout(30000);



emit({ type: 'log', msg: 'Starting login process — waiting for video feed...' });
await page.goto('https://www.xiaohongshu.com');
await page.waitForTimeout(10000);
// emit({ type: 'log', msg: 'Video feed live — starting login...' });



// emit({ type: 'log', msg: 'Starting xhs.com login process...' });
// try {
// 	emit({ type: 'log', msg: 'Navigated to xhs.com, polling for QR...' });
// 	let xhsQrReady = false;
// 	for (let i = 0; i < 20 && !xhsQrReady; i++) {
// 		await page.waitForTimeout(1000);
// 		const info = await page.evaluate(() => {
// 			const img = document.querySelector('img.qrcode-img');
// 			return img ? { w: img.naturalWidth, h: img.naturalHeight, len: img.src?.length ?? 0 } : null;
// 		}).catch(() => null);
// 		if (info && info.w > 0 && info.len > 1000) { xhsQrReady = true; }
// 		emit({ type: 'log', msg: `xhs QR poll ${i + 1}: ${info?.w}x${info?.h} src=${info?.len}` });
// 	}
// 	if (xhsQrReady) {
// 		const xhsQrSrc = await page.locator('img.qrcode-img').getAttribute('src').catch(() => null);
// 		if (xhsQrSrc) emit({ type: 'qr-src', data: xhsQrSrc });
// 		emit({ type: 'log', msg: 'xhs.com QR ready — scan with phone.' });
// 	}
// 	if (xhsQrReady) {
// 		await page.locator('img.qrcode-img').waitFor({ state: 'hidden', timeout: 5 * 60 * 1000 });
// 		emit({ type: 'qr-scanned' });
// 	}
// 	// Save again with xhs.com cookies merged in
// 	await context.storageState({ path: AUTH_PATH });
// 	emit({ type: 'log', msg: 'xhs.com auth merged into auth.json.' });
// } catch (e) {
// 	emit({ type: 'log', msg: `xhs.com step skipped — ${e?.message ?? 'timeout'}` });
// }
// emit({ type: 'log', msg: 'xhs.com done.' });

// emit({ type: 'log', msg: 'Starting creator login process...' });
// await page.goto('https://creator.xiaohongshu.com/publish/publish', { waitUntil: 'commit' });
// try {
// 	await page.locator('.login-box-container').waitFor({ state: 'visible', timeout: 15000 });
// 	await page.bringToFront();
// 	emit({ type: 'log', msg: 'Login box visible on creator, clicking QR...' });
// 	await page.locator('.login-box-container img').click();
// 	// Poll until real QR loads — naturalWidth >50 confirms decoded image, src >3000 skips tiny placeholder
// 	let qrReady = false;
// 	for (let i = 0; i < 30 && !qrReady; i++) {
// 		await page.waitForTimeout(1000);
// 		const info = await page.locator('img.css-1lhmg90').evaluate(img => ({
// 			w: img.naturalWidth, h: img.naturalHeight, len: img.src?.length ?? 0,
// 		})).catch(() => null);
// 		if (info && info.w > 50 && info.len > 3000) { qrReady = true; }
// 		emit({ type: 'log', msg: `QR poll ${i + 1}: ${info?.w}x${info?.h} src=${info?.len}` });
// 	}
// 	if (qrReady) {
// 		const qrEl = page.locator('img.css-1lhmg90');
// 		const qrSrc = await qrEl.getAttribute('src').catch(() => null);
// 		if (qrSrc) emit({ type: 'qr-src', data: qrSrc });
// 		await page.waitForTimeout(500);
// 	}
// 	emit({ type: 'log', msg: qrReady ? 'QR code ready.' : 'QR timed out — may still be loading.' });
// 	emit({ type: 'log', msg: `URL: ${page.url()}` });
// 	emit({ type: 'log', msg: 'QR code showing — scan with phone.' });



	
// 	await new Promise((resolve) => {
// 		const onNav = (frame) => {
// 			if (frame === page.mainFrame() && !frame.url().includes('login')) {
// 				page.off('framenavigated', onNav);
// 				resolve();
// 			}
// 		};
// 		page.on('framenavigated', onNav);
// 		setTimeout(resolve, 5 * 60 * 1000);
// 	});
// 	emit({ type: 'qr-scanned' });
// 	emit({ type: 'log', msg: `Login detected — URL: ${page.url()}` });
// } catch {}
// emit({ type: 'log', msg: 'Creator login process done.' });

// // Save after creator login — ensures auth.json is written even if xhs.com step hangs
// await context.storageState({ path: AUTH_PATH });
// emit({ type: 'log', msg: 'Creator auth saved.' });

// // Verify www.xiaohongshu.com session — publisher navigates here to post comments
// emit({ type: 'log', msg: 'Verifying www.xiaohongshu.com session...' });
// await page.goto('https://www.xiaohongshu.com/user/profile/68b4ecc6000000001802f0e9?tab=note&subTab=note', { waitUntil: 'commit', timeout: 15000 }).catch(() => {});
// await page.waitForTimeout(4000);
// const xhsLoginVisible = await page.locator('.login-container').isVisible().catch(() => true);
// if (xhsLoginVisible) {
// 	emit({ type: 'log', msg: 'www.xiaohongshu.com NOT logged in — waiting for login (scan QR or dismiss popup)...' });
// 	await page.locator('.login-container').waitFor({ state: 'hidden', timeout: 5 * 60 * 1000 });
// 	await context.storageState({ path: AUTH_PATH });
// 	emit({ type: 'log', msg: 'www.xiaohongshu.com login confirmed, auth saved.' });
// } else {
// 	emit({ type: 'log', msg: 'www.xiaohongshu.com session verified.' });
// }

clearTimeout(timeoutHandle);
emit({ type: 'log', msg: 'Login successful — auth.json saved.' });
emit({ type: 'done' });
await new Promise(r => setTimeout(r, 60000));
await browser.close();
