import { chromium } from 'playwright';
import fs from 'fs';
import { insertPostArchive } from './db/queries.js';

async function publishPost({ title, hook, contents, cta, description, hashtags, comments, post_type, race_name, input_tokens, output_tokens }) {
	if (!fs.existsSync(`${process.env.DATA_DIR}/xhs/auth.json`)) {
		console.error('auth.json not found — run refresh-auth.bat to log in first');
		return false;
	}
	const browser = await chromium.launch({ headless: false });
	const context = await browser.newContext({ storageState: `${process.env.DATA_DIR}/xhs/auth.json` });
	const page = await context.newPage();

	console.log('Starting post publish...');
	try {
		await page.goto('https://creator.xiaohongshu.com/publish/publish');
		await page.getByText('写长文').click();

		await page.getByText('新的创作').click();
		// title
		await page.getByPlaceholder('输入标题').fill(title);

		// content body: hook (H1) + each section (H2 subtitle + body) + cta
		await page.locator('[data-placeholder="输入文字，内容将自动保存"]').click();
		await page.keyboard.press('Control+Alt+1');
		await page.keyboard.type(hook);
		await page.keyboard.press('Enter');
		for (const c of contents) {
			await page.keyboard.press('Control+Alt+2');
			await page.keyboard.type(c.subtitle);

			await page.keyboard.type(c.body);
			await page.keyboard.press('Enter');
		}
		await page.keyboard.press('Control+Alt+1');
		await page.keyboard.type(cta);
		await page.keyboard.press('Enter');
		await page.getByText('一键排版').click();
		await page.getByText('下一步').click();

		// description + hashtags
		await page.locator('[data-placeholder="输入正文描述，真诚有价值的分享予人温暖"]').click();
		await page.keyboard.type(`${description} `);
		await page.keyboard.press('Enter');
		await page.keyboard.press('Enter');
		for (const hashtag of hashtags) {
			await page.keyboard.type(`${hashtag}`);
			await page.waitForTimeout(1000);
			await page.keyboard.press('Enter');
		}0
		await page.waitForTimeout(1000);
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
	if (!fs.existsSync(`${process.env.DATA_DIR}/xhs/auth.json`)) {
		console.error('auth.json not found — run refresh-auth.bat to log in first');
		return false;
	}
	const browser = await chromium.launch({ headless: false });
	const context = await browser.newContext({ storageState: `${process.env.DATA_DIR}/xhs/auth.json` });
	const page = await context.newPage();

	try {
		await page.goto('https://creator.xiaohongshu.com/publish/publish');
		await page.waitForTimeout(2000);
		// error handling for auth failure on publish page
		if (await page.locator('#login-btn').isVisible()) {
			throw new Error('Authentication expired — run refresh-auth.bat to re-login');
		}

		await page.goto('https://www.xiaohongshu.com/user/profile/68b4ecc6000000001802f0e9?tab=note&subTab=note');
		await page.waitForTimeout(2000);
		// error handling for auth failure on comment add page
		if (await page.locator('#login-btn').first().isVisible()) {
			throw new Error('Authentication expired — run refresh-auth.bat to re-login');
		}
		console.log('Authentication successful');
		return true;
	} catch (err) {
		// console.error('Publish failed:', err.message);
		if (err.message.includes('Authentication')) {
			throw new Error('Authentication expired — run refresh-auth.bat to re-login');
		}
		return false;
	} finally {
		await browser.close();
	}
}

export { publishPost, checkAuth };
