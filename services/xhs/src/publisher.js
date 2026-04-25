import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { insertPostArchive } from './db/queries.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_PATH = path.join(__dirname, '../auth.json');

function humanDelay(min, max) {
	return new Promise(resolve => setTimeout(resolve, min + Math.random() * (max - min)));
}

async function publishPost({ title, hook, contents, cta, description, hashtags, comments, post_type, race_name, input_tokens, output_tokens }, { skipOffset = false } = {}) {
	if (!fs.existsSync(AUTH_PATH)) {
		console.error('auth.json not found — run refresh-auth.bat to log in first');
		return false;
	}

	if (skipOffset) {
		console.log('Manual post: skipping random offset, posting immediately');
	} else {
		// Random offset to avoid predictable posting time. Cron should be set 30 min early;
		// publisher delays 0–60 min so the post lands in a ±30 min window around the target time.
		const offsetMin = Math.round(Math.random() * 60);
		console.log(`Random post offset: waiting ${offsetMin} min`);
		await humanDelay(0, 60 * 60 * 1000);
	}

	const browser = await chromium.launch({
		headless: true,
		args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
	});
	const context = await browser.newContext({
		storageState: AUTH_PATH,
		userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
	});
	await context.addInitScript(() => {
		Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
		Object.defineProperty(document, 'visibilityState', { get: () => 'visible' });
		Object.defineProperty(document, 'hidden', { get: () => false });
	});
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	const page = await context.newPage();

	const screenshot = async () => {
		const buf = await page.screenshot({ type: 'jpeg', quality: 15 });
		console.log(`SCREENSHOT:${buf.toString('base64')}`);
	};

	const waitForImageGeneration = async (timeout = 90000) => {
		const end = Date.now() + timeout;
		while (Date.now() < end) {
			await screenshot();
			const loading = await page.locator('text=笔记图片生成中').count();
			if (loading === 0) {
				console.log('Image generation complete');
				return;
			}
			await page.waitForTimeout(1000);
		}
		console.log('Image generation timed out — proceeding anyway');
	};

	console.log('Starting post publish...');
	try {
		await page.goto('https://creator.xiaohongshu.com/publish/publish');
		console.log(`URL after goto: ${page.url()}`);
		await humanDelay(3000, 8000);
		console.log('Clicking 写长文 tab...');
		await page.locator('.creator-tab:not([aria-hidden])', { hasText: '写长文' }).click();
		console.log(`URL after 写长文 click: ${page.url()}`);

		console.log('Clicking 新的创作...');
		await page.getByText('新的创作').click();
		await humanDelay(5000, 8000);
		console.log(`URL after 新的创作 click: ${page.url()}`);
		await screenshot();

		console.log('Filling title...');
		await page.getByPlaceholder('输入标题').click();
		await page.keyboard.type(title);
		const titleValue = await page.getByPlaceholder('输入标题').inputValue().catch(() => 'N/A');
		console.log(`Title field value: "${titleValue}"`);

		// content body — dispatch ClipboardEvent directly into ProseMirror (more reliable than
		// navigator.clipboard + Ctrl+V in headless, where clipboard permissions are unreliable)
		const pasteText = async (text) => {
			await page.evaluate((t) => {
				const dt = new DataTransfer();
				dt.setData('text/plain', t);
				document.activeElement.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
			}, text);
			await page.waitForTimeout(200);
		};

		console.log('Filling body...');
		await page.locator('div.tiptap.ProseMirror[contenteditable="true"]').first().click();
		await humanDelay(500, 1000);
		await page.keyboard.press('Control+Alt+1');
		await pasteText(hook);
		await page.keyboard.press('Enter');
		for (const c of contents) {
			await page.keyboard.press('Control+Alt+2');
			await pasteText(c.subtitle);
			await pasteText(c.body);
			await page.keyboard.press('Enter');
		}
		await page.keyboard.press('Control+Alt+1');
		await pasteText(cta);
		await page.keyboard.press('Enter');

		const charCount = await page.locator('text=/字数/').first().textContent().catch(() => 'unknown');
		console.log(`Body char count: ${charCount}`);
		await screenshot();
		console.log('Clicking 一键排版...');
		await page.getByText('一键排版').click();
		await waitForImageGeneration();
		console.log(`URL after 一键排版: ${page.url()}`);
		const frameUrls = page.frames().map(f => f.url());
		console.log(`Frames after 一键排版: ${JSON.stringify(frameUrls)}`);
		for (const frame of page.frames()) {
			const count = await frame.locator('text=下一步').count();
			if (count > 0) console.log(`Found 下一步 in frame: ${frame.url()}`);
		}
		console.log('Clicking 下一步...');
		await page.locator('text=下一步').first().click();
		await humanDelay(10000, 10000);
		await screenshot();
		console.log(`After 下一步 — URL: ${page.url()}`);
		console.log('Waiting for description field...');
		await page.locator('[data-placeholder="输入正文描述，真诚有价值的分享予人温暖"]').waitFor({ timeout: 60000 });

		// description + hashtags
		console.log('Filling description...');
		await page.locator('[data-placeholder="输入正文描述，真诚有价值的分享予人温暖"]').click();
		await page.keyboard.type(`${description} `);
		await page.keyboard.press('Enter');
		await page.keyboard.press('Enter');
		for (const hashtag of hashtags) {
			await page.keyboard.type(`${hashtag}`);
			await page.waitForTimeout(1000);
			await page.keyboard.press('Enter');
		}
		await humanDelay(500, 1500);
		await page.getByRole('button', { name: '发布' }).click();
		await page.waitForURL('**/success?source&bind_status=not_bind&__debugger__=&proxy=');
		console.log('Post published successfully');
		await insertPostArchive({
			postType: post_type,
			raceName: race_name ?? null,
			title,
			hook,
			contents,
			cta,
			description,
			hashtags,
			comments,
			inputTokens: input_tokens ?? 0,
			outputTokens: output_tokens ?? 0,
			published: true,
		});
		await page.waitForTimeout(3000);
		await page.goto('https://www.xiaohongshu.com/user/profile/68b4ecc6000000001802f0e9?tab=note&subTab=note');
		await humanDelay(3000, 8000);
		await page.waitForSelector('#userPostedFeeds .note-item');
		await page.locator('#userPostedFeeds .note-item').first().click();

		console.log('Posting comments...');
		for (const [i, comment] of comments.entries()) {
			try {
				await page.locator('.not-active.inner-when-not-active').waitFor();
				await page.locator('.not-active.inner-when-not-active').click();
				await page.locator('#content-textarea').click();
				await page.keyboard.type(comment);
				await page.getByRole('button', { name: '发送' }).click();
				await page.waitForTimeout(4000);
			} catch (err) {
				console.error(`Comment ${i + 1} failed: ${err.message}`);
			}
		}

		console.log('Comments posted successfully');
	} catch (err) {
		console.error('Publish failed:', err.message);
		return false;
	} finally {
		await browser.close();
	}

	return true;
}

async function checkAuth() {
	if (!fs.existsSync(AUTH_PATH)) {
		console.error('auth.json not found — run xhs-login.js to log in first');
		return false;
	}
	const browser = await chromium.launch({
		headless: true,
		args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
	});
	const context = await browser.newContext({
		storageState: AUTH_PATH,
		userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
	});
	await context.addInitScript(() => {
		Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
		Object.defineProperty(document, 'visibilityState', { get: () => 'visible' });
		Object.defineProperty(document, 'hidden', { get: () => false });
	});
	const page = await context.newPage();
	await page.route(/\.(woff2?|ttf|otf|eot)(\?.*)?$/, route => route.abort());

	try {
		console.log('checkAuth: navigating to creator.xiaohongshu.com...');
		await page.goto('https://creator.xiaohongshu.com/publish/publish', { waitUntil: 'commit' });
		console.log(`checkAuth: creator page loaded — URL: ${page.url()}`);
		await humanDelay(2000, 4000);
		const creatorLoginVisible = await page.locator('.login-box-container').isVisible();
		console.log(`checkAuth: creator login-box-container visible: ${creatorLoginVisible}`);
		if (creatorLoginVisible) {
			throw new Error('Authentication expired — re-login required');
		}

		console.log('checkAuth: navigating to www.xiaohongshu.com profile...');
		await page.goto('https://www.xiaohongshu.com/user/profile/68b4ecc6000000001802f0e9?tab=note&subTab=note', { waitUntil: 'commit' });
		console.log(`checkAuth: xhs.com page loaded — URL: ${page.url()}`);
		await humanDelay(2000, 4000);
		const xhsLoginVisible = await page.locator('.login-container').isVisible();
		console.log(`checkAuth: xhs.com login-container visible: ${xhsLoginVisible}`);
		if (xhsLoginVisible) {
			throw new Error('Authentication expired — re-login required');
		}
		console.log('checkAuth: authentication successful');
		return true;
	} catch (err) {
		console.error(`checkAuth error: ${err.message}`);
		if (err.message.includes('Authentication')) {
			throw new Error('Authentication expired — re-login required');
		}
		return false;
	} finally {
		await browser.close();
	}
}

export { publishPost, checkAuth };
