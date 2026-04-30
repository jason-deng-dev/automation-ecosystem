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

// Poll until isLoggedIn() returns true or timeout. Browser is visible — user scans naturally.
const waitForLogin = async (label, isLoggedIn) => {
	log(`${label}: waiting for login...`);
	const end = Date.now() + 5 * 60 * 1000;
	while (Date.now() < end) {
		if (await isLoggedIn()) {
			log(`${label}: login confirmed`);
			return;
		}
		await page.waitForTimeout(2000);
	}
	throw new Error(`${label}: login timeout`);
};

// ── Step 1: xhs.com ──────────────────────────────────────────────────────────
log('Navigating to xhs.com...');
await page.goto('https://www.xiaohongshu.com', { waitUntil: 'commit', timeout: 15000 })
	.catch(e => log(`xhs.com goto: ${e.message}`));
await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(3000);
log(`URL: ${page.url()}`);

const xhsLoginNeeded = page.url().includes('login') ||
	await page.locator('#app > div:nth-child(1) > div > div.login-container').isVisible().catch(() => false) ||
	await page.locator('.captcha-modal-content').isVisible().catch(() => false);

if (xhsLoginNeeded) {
	log('xhs.com login required — scan all QR codes in Chrome window, script will proceed automatically');
	// Positive signal: login button gone = fully authenticated (past security check AND login)
	await waitForLogin('xhs.com', async () => {
		const loginBtnVisible = await page.locator('#login-btn').isVisible().catch(() => true);
		return !loginBtnVisible;
	});
} else {
	log('xhs.com already logged in.');
}

// ── Step 2: creator.xiaohongshu.com ──────────────────────────────────────────
log('Navigating to creator...');
await page.goto('https://creator.xiaohongshu.com/publish/publish', { waitUntil: 'commit' });
await page.waitForTimeout(3000);
const creatorLoginNeeded = await page.locator('.login-box-container').isVisible().catch(() => false);
if (creatorLoginNeeded) {
	await page.locator('.login-box-container img').click().catch(() => {});
	log('Creator login required — scan QR in Chrome window');
	await waitForLogin('creator', async () => {
		return !(await page.locator('.login-box-container').isVisible().catch(() => true));
	});
} else {
	log('Creator: already logged in.');
}

// ── Step 3: verify www session ───────────────────────────────────────────────
log('Verifying www.xiaohongshu.com session...');
await page.goto('https://www.xiaohongshu.com/user/profile/68b4ecc6000000001802f0e9?tab=note&subTab=note', { waitUntil: 'commit', timeout: 15000 }).catch(() => {});
await page.waitForTimeout(4000);
const wwwLoginNeeded = await page.locator('.login-container').isVisible().catch(() => false);
if (wwwLoginNeeded) {
	log('www login required — scan QR in Chrome window');
	await waitForLogin('www-verify', async () => {
		return !(await page.locator('.login-container').isVisible().catch(() => true));
	});
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
