import { chromium } from 'playwright';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const DASHBOARD_URL = process.env.DASHBOARD_URL;
const XHS_AUTH_SECRET = process.env.XHS_AUTH_SECRET;

if (!DASHBOARD_URL || !XHS_AUTH_SECRET) {
	console.error('Missing DASHBOARD_URL or XHS_AUTH_SECRET in .env');
	process.exit(1);
}

const log = (msg) => console.log(`[xhs-login] ${msg}`);

const browser = await chromium.launch({
	headless: false,
	channel: 'chrome',
	args: ['--disable-blink-features=AutomationControlled'],
});

const context = await browser.newContext({
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

const timeoutHandle = setTimeout(async () => {
	log('Timeout after 5 minutes');
	await browser.close();
	process.exit(1);
}, 5 * 60 * 1000);

const findQr = () => page.evaluate(() => {
	const NAMED = ['img.qrcode-img', 'img.css-1lhmg90'];
	for (const sel of NAMED) {
		const img = document.querySelector(sel);
		if (img) {
			const src = img.src || img.getAttribute('data-src') || '';
			return { found: src.length > 10 };
		}
	}
	for (const img of document.querySelectorAll('img')) {
		if (img.naturalWidth > 80 && img.naturalWidth === img.naturalHeight && (img.src || '').length > 50)
			return { found: true };
	}
	return { found: false };
}).catch(() => ({ found: false }));

const waitForQrLogin = async (label, exitCheck) => {
	let qrSeen = false;
	const end = Date.now() + 5 * 60 * 1000;
	while (Date.now() < end) {
		if (exitCheck()) return;
		const { found } = await findQr();
		if (found && !qrSeen) {
			qrSeen = true;
			log(`${label}: QR visible — scan with REDNote app`);
		} else if (!found && qrSeen) {
			log(`${label}: QR gone — login detected`);
			await page.waitForTimeout(2000);
			return;
		}
		await page.waitForTimeout(2000);
	}
};

// ── Step 1: xhs.com ──────────────────────────────────────────────────────────
log('Navigating to xhs.com...');
await page.goto('https://www.xiaohongshu.com', { waitUntil: 'commit', timeout: 15000 })
	.catch(e => log(`xhs.com goto: ${e.message}`));
await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
log(`URL: ${page.url()}`);

const isLoginUrl = page.url().includes('login');
if (!isLoginUrl) await page.waitForTimeout(3000);
const hasLoginModal = !isLoginUrl && await page.locator('.captcha-modal-content, .login-container').isVisible().catch(() => false);

if (isLoginUrl || hasLoginModal) {
	log('xhs.com login required — scan QR in Chrome window');
	await waitForQrLogin('xhs.com', () => isLoginUrl && !page.url().includes('login'));
	log(`xhs.com login done — URL: ${page.url()}`);
} else {
	log('xhs.com already logged in.');
}

// ── Step 2: creator.xiaohongshu.com ──────────────────────────────────────────
log('Navigating to creator...');
await page.goto('https://creator.xiaohongshu.com/publish/publish', { waitUntil: 'commit' });
try {
	await page.locator('.login-box-container').waitFor({ state: 'visible', timeout: 15000 });
	await page.locator('.login-box-container img').click();
	log('Creator login required — scan QR in Chrome window');
	let creatorDone = false;
	page.once('framenavigated', (frame) => {
		if (frame === page.mainFrame() && !frame.url().includes('login')) creatorDone = true;
	});
	await waitForQrLogin('creator', () => creatorDone);
	log(`Creator login done — URL: ${page.url()}`);
} catch {
	log('Creator: already logged in or login box not found.');
}

// ── Step 3: verify www session ───────────────────────────────────────────────
log('Verifying www.xiaohongshu.com session...');
await page.goto('https://www.xiaohongshu.com/user/profile/68b4ecc6000000001802f0e9?tab=note&subTab=note', { waitUntil: 'commit', timeout: 15000 }).catch(() => {});
await page.waitForTimeout(4000);
const wwwLoginVisible = await page.locator('.login-container').isVisible().catch(() => true);
if (wwwLoginVisible) {
	log('www login required — scan QR in Chrome window');
	await waitForQrLogin('www-verify', () => !page.url().includes('login'));
	log('www.xiaohongshu.com login confirmed.');
} else {
	log('www.xiaohongshu.com session verified.');
}

// ── Upload to dashboard ───────────────────────────────────────────────────────
log('Capturing session state...');
const authState = await context.storageState();

log(`Uploading to ${DASHBOARD_URL}/api/xhs/auth ...`);
const res = await fetch(`${DASHBOARD_URL}/api/xhs/auth`, {
	method: 'POST',
	headers: {
		'Content-Type': 'application/json',
		'x-auth-secret': XHS_AUTH_SECRET,
	},
	body: JSON.stringify(authState),
});

if (!res.ok) {
	const body = await res.text().catch(() => '');
	log(`Upload failed: ${res.status} ${body}`);
	clearTimeout(timeoutHandle);
	await browser.close();
	process.exit(1);
}

clearTimeout(timeoutHandle);
log('auth.json uploaded — login complete. You can close this window.');
await browser.close();
