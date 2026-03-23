import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ storageState: 'auth.json' });
const page = await context.newPage();
const post = {
	race: {
		title: '富士山女子越野跑值得去吗',
		hook: '富士山脚下跑步 🗻\n边跑边看河口湖 🏞️\n这不是普通比赛\n\n这是专为女生办的\n越野跑赛事 🌸\n而且明确欢迎新手\n\n现在是三月 🗓️\n距离比赛还有14个月\n报名窗口已经开了 ✅\n\n很多人不知道\n这场赛事其实是\nMt.FUJI100的友谊赛 🤝\n官方背书，不是小活动\n\n但有一件事\n很多人报名前都没想清楚 🤔\n这趟日本行到底值不值得规划',
		contents: [
			{
				subtitle: '🗻 这场比赛是什么',
				body: '全名第5届富士山麓\n女子越野跑 🌿\n\n只限女性参赛 👩\n赛场在山梨县\n富士河口湖町\n\n比赛日：2026年5月10日\n现在报名已经开放 ✅\n截止日：2026年4月12日\n\n赛道在富士山脚下\n沿途可以看到 🗻\n河口湖全景 🏞️\n\n官方定位很清晰：\n欢迎越野跑初体验\n不是精英赛，是体验赛 🎉\n适合第一次跑越野的你',
			},
			{
				subtitle: '🌤️ 五月富士山啥天气',
				body: '5月上旬的河口湖 🗓️\n白天约15–20°C 🌡️\n早晨可能降到8°C左右\n\n富士山还有残雪 ❄️\n山脚赛道不会太冷\n但早晨出发要注意保暖\n\n现在是三月 🌱\n正是备赛的黄金期\n还有14个月可以训练 💪\n\n建议准备：\n轻薄防风外套 🧥\n越野跑鞋（防滑底）👟\n压缩腿套保温护膝 🦵\n\n五月日本是旅行旺季 ✈️\n机票酒店要早点看',
			},
			{
				subtitle: '✈️ 值得专程去吗',
				body: '这场比赛适合你如果 👇\n\n你是女生想试越野跑\n又不想第一场太难 🌿\n\n你想要一个理由\n去富士山周边旅行 🗻\n\n你想在日本本土赛事\n感受真实跑步文化 🎌\n\n河口湖离东京约2小时 🚌\n可以结合东京行程\n赛前赛后都好玩 🛍️\n\n五月黄金周刚过\n人流稍减，天气很好 ☀️\n是去日本的好时机\n\n这趟行程性价比很高 💯',
			},
		],
		cta: '想了解报名流程和\n完整赛事信息 📋\n我们的日本马拉松资讯站\n帮你整理好了一切 🗻\n链接在评论区👇',
		description: '2026年5月富士山脚下的女子越野跑，风景绝美还对新手友好，这篇帮你判断要不要规划这趟日本行。',
		hashtags: [
			'#日本马拉松',
			'#马拉松训练',
			'#我的马拉松备赛日记',
			'#马拉松跑友请指教',
			'#跑步爱好者',
			'#记录跑步',
			'#人生需要一场马拉松',
			'#日本队',
			'#起跑就是马拉松',
			'#安全完赛就是胜利',
		],
		comments: [
			'想了解更多关于这场比赛的详细信息和报名攻略？👇 https://running.moximoxi.net/racehub/',
			'加入我们的跑步社区，和其他计划去日本跑马的小伙伴一起交流👇 https://running.moximoxi.net/community/',
		],
	},
};

async function publishPost({ title, hook, contents, cta, description, hashtags, comments }) {
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

	return true
}

await publishPost(post['race']);

export { publishPost };
