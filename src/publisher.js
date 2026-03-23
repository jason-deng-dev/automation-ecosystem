import { chromium } from 'playwright';

async function publishPost({ title, hook, contents, cta, description, hashtags, comments }) {
	const browser = await chromium.launch({ headless: false });
	const context = await browser.newContext({ storageState: 'auth.json' });
	const page = await context.newPage();
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

	// await page.pause();
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
	}

	await page.getByRole('button', { name: '发布' }).click();
	await page.waitForURL('**/success?source&bind_status=not_bind&__debugger__=&proxy=');

	await page.goto('https://www.xiaohongshu.com/user/profile/68b4ecc6000000001802f0e9?tab=note&subTab=note');
	await page.waitForSelector('#userPostedFeeds .note-item');
	await page.locator('#userPostedFeeds .note-item').first().click();

	// post each comment sequentially
	for (const comment of comments) {
		await page.locator('.not-active.inner-when-not-active').waitFor();
		await page.locator('.not-active.inner-when-not-active').click();
		await page.locator('#content-textarea').click();
		await page.keyboard.type(comment);
		await page.getByRole('button', { name: '发送' }).click();
		await page.waitForTimeout(4000);
	}

	return true;
}

export { publishPost };
