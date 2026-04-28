import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_PATH = path.join(__dirname, '../auth.json');

const emit = (obj) => process.stdout.write(JSON.stringify(obj) + '\n');

const browser = await chromium.launch({
	headless: true,
	args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
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
await page.route(/\.(woff2?|ttf|otf|eot)(\?.*)?$/, route => route.abort());

process.on('SIGTERM', async () => {
	await browser.close();
	process.exit(0);
});

const timeoutHandle = setTimeout(async () => {
	emit({ type: 'error', msg: 'Login timeout after 5 minutes' });
	await new Promise(r => setTimeout(r, 500));
	await browser.close();
	process.exit(1);
}, 5 * 60 * 1000);

// Poll DOM for QR image. Returns { src } or { src: null, debug } for diagnostics.
const findQr = () => page.evaluate(() => {
	const NAMED = ['img.qrcode-img', 'img.css-1lhmg90'];
	for (const sel of NAMED) {
		const img = document.querySelector(sel);
		if (img) {
			const src = img.src || img.getAttribute('data-src') || '';
			if (src.length > 10) return { src };
			return { src: null, debug: `${sel} found: w=${img.naturalWidth} srcLen=${src.length}` };
		}
	}
	// Fallback: any visible square img (QR codes are square)
	for (const img of document.querySelectorAll('img')) {
		const src = img.src || '';
		if (img.naturalWidth > 80 && img.naturalWidth === img.naturalHeight && src.length > 50)
			return { src };
	}
	const totalImgs = document.querySelectorAll('img').length;
	return { src: null, debug: `no qr — ${totalImgs} imgs on page` };
}).catch(() => ({ src: null, debug: 'evaluate error' }));

// Poll for QR, emit qr-src whenever it changes, resolve when page leaves login URL.
// For creator (no URL change on login), resolves via framenavigated.
const waitForQrLogin = async (label, exitCheck) => {
	let lastSrc = null;
	let pollCount = 0;
	const end = Date.now() + 5 * 60 * 1000;
	while (Date.now() < end) {
		if (exitCheck()) return;
		const { src, debug } = await findQr();
		pollCount++;
		if (debug && pollCount % 3 === 1) emit({ type: 'log', msg: `${label} poll ${pollCount}: ${debug}` });
		if (src && src !== lastSrc) {
			lastSrc = src;
			emit({ type: 'qr-src', data: src });
			emit({ type: 'log', msg: `${label}: QR ready — scan with REDNote app` });
		} else if (!src && lastSrc) {
			emit({ type: 'qr-scanned' });
			emit({ type: 'log', msg: `${label}: QR gone — done` });
			await page.waitForTimeout(2000);
			return;
		}
		await page.waitForTimeout(2000);
	}
};

// ── Step 1: xhs.com ──────────────────────────────────────────────────────────
emit({ type: 'log', msg: 'Navigating to xhs.com...' });
await page.goto('https://www.xiaohongshu.com', { waitUntil: 'commit', timeout: 15000 })
	.catch(e => emit({ type: 'log', msg: `xhs.com goto: ${e.message}` }));
await page.waitForTimeout(3000);
emit({ type: 'log', msg: `URL: ${page.url()}` });

// XHS always lands on /explore — check for login/security modal instead of URL
const xhsNeedsLogin = await page.locator('.captcha-modal-content, .login-container').isVisible().catch(() => false);
if (xhsNeedsLogin) {
	emit({ type: 'log', msg: 'xhs.com login required — polling for QR...' });
	await waitForQrLogin('xhs.com', () => false); // exits when QR disappears
	emit({ type: 'qr-scanned' });
	emit({ type: 'log', msg: `xhs.com login done — URL: ${page.url()}` });
} else {
	emit({ type: 'log', msg: 'xhs.com already logged in.' });
}
await context.storageState({ path: AUTH_PATH });
emit({ type: 'log', msg: 'xhs.com auth saved.' });

// ── Step 2: creator.xiaohongshu.com ──────────────────────────────────────────
emit({ type: 'log', msg: 'Navigating to creator...' });
await page.goto('https://creator.xiaohongshu.com/publish/publish', { waitUntil: 'commit' });
try {
	await page.locator('.login-box-container').waitFor({ state: 'visible', timeout: 15000 });
	await page.locator('.login-box-container img').click();
	emit({ type: 'log', msg: 'Creator login box visible — polling for QR...' });
	let creatorDone = false;
	page.once('framenavigated', (frame) => {
		if (frame === page.mainFrame() && !frame.url().includes('login')) creatorDone = true;
	});
	await waitForQrLogin('creator', () => creatorDone);
	emit({ type: 'qr-scanned' });
	emit({ type: 'log', msg: `Creator login done — URL: ${page.url()}` });
} catch {
	emit({ type: 'log', msg: 'Creator: already logged in or login box not found.' });
}
await context.storageState({ path: AUTH_PATH });
emit({ type: 'log', msg: 'Creator auth saved.' });

// ── Step 3: verify www session (needed for publisher comment posting) ─────────
emit({ type: 'log', msg: 'Verifying www.xiaohongshu.com session...' });
await page.goto('https://www.xiaohongshu.com/user/profile/68b4ecc6000000001802f0e9?tab=note&subTab=note', { waitUntil: 'commit', timeout: 15000 }).catch(() => {});
await page.waitForTimeout(4000);
const wwwLoginVisible = await page.locator('.login-container').isVisible().catch(() => true);
if (wwwLoginVisible) {
	emit({ type: 'log', msg: 'www login required — polling for QR...' });
	await waitForQrLogin('www-verify', () => !page.url().includes('login') && !wwwLoginVisible);
	emit({ type: 'qr-scanned' });
	await context.storageState({ path: AUTH_PATH });
	emit({ type: 'log', msg: 'www.xiaohongshu.com login confirmed, auth saved.' });
} else {
	emit({ type: 'log', msg: 'www.xiaohongshu.com session verified.' });
}

clearTimeout(timeoutHandle);
emit({ type: 'log', msg: 'Login successful — auth.json saved.' });
emit({ type: 'done' });
await new Promise(r => setTimeout(r, 60000));
await browser.close();
