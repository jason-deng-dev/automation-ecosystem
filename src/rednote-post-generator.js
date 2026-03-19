import 'dotenv/config';
import fs from 'fs';
import Anthropic from '@anthropic-ai/sdk';

const prompts = JSON.parse(fs.readFileSync('./config/prompts.json', 'utf-8'));
const races = JSON.parse(fs.readFileSync('./data/races.json', 'utf-8'));
const client = new Anthropic({
	apiKey: process.env['ANTHROPIC_API_KEY'],
});

async function generatePosts(type) {
	const systemPrompt = prompts.systemPrompt;
	const { comments, contextToUse } = await getContextPrompts(type);

	const message = await client.messages.create({
		max_tokens: 1024,
		system: systemPrompt,
		messages: [{ role: 'user', content: contextToUse }],
		model: 'claude-sonnet-4-6',
	});

	console.log(message);
	return message;
}

async function getContextPrompts(type) {
	let contextToUse;
	let comments;
	let ctaDescription;

	switch (type) {
		case 'race': {
			let raceContext = prompts.postTypes.raceGuide;
			const raceChosen = await chooseRaceMock();
			const race = races.races.find((item) => item.name === raceChosen);
			const fields = [
				'name',
				'date',
				'location',
				'entryStart',
				'entryEnd',
				'registrationOpen',
				'registrationUrl',
				'website',
				'description',
			];
			for (const field of fields) {
				raceContext = raceContext.replace(`race.${field}`, race[field]);
			}
			contextToUse = raceContext;
			ctaDescription =
				'our marathon hub where readers can find full race details, registration timelines, and sign-up links for Japanese marathons';
			comments = [
				'想了解更多关于这场比赛的详细信息和报名攻略？👇 https://running.moximoxi.net/racehub/',
				'加入我们的跑步社区，和其他计划去日本跑马的小伙伴一起交流👇 https://running.moximoxi.net/community/',
			];
			break;
		}
		case 'training': {
			contextToUse = prompts.postTypes.training;
			ctaDescription =
				'our free marathon preparation toolkit — tools that help runners find their realistic marathon time range, convert their goal into a required pace, check whether their goal is achievable in the time they have, and track progress over a training build';
			comments = [
				'🛠️ 免费工具：预测完赛时间范围、算出目标配速、检查训练计划可行性👇 https://running.moximoxi.net/mara-prep-tools/',
				'📈 训练进度追踪工具——记录每次训练数据，看清自己的进步趋势👇 https://running.moximoxi.net/progress-trendline/',
				'和其他备战日本马拉松的跑者交流备赛心得👇 https://running.moximoxi.net/community/',
			];

			break;
		}
		case 'nutritionSupplement': {
			contextToUse = prompts.postTypes.nutritionSupplement;
			ctaDescription =
				'our online store offering authentic Japanese running nutrition and supplements, available for import to China';
			comments = [
				'想购买正品日本跑步营养品？👇  https://running.moximoxi.net/',
				'加入我们的跑步社区，和其他计划去日本跑马的小伙伴一起交流👇 https://running.moximoxi.net/community/',
			];
			break;
		}
		case 'wearable': {
			contextToUse = prompts.postTypes.wearables;
			ctaDescription =
				'our online store stocking a wide range of running products sourced directly from Japan — shoes, apparel, GPS watches, recovery gear, nutrition and supplements, and sportswear, all authentic Japanese products available for import to China';
			comments = [
				'正品日本跑步装备、营养品、运动服饰，日本本地直采👇 https://running.moximoxi.net/',
				'加入我们的跑步社区，和其他计划去日本跑马的小伙伴一起交流👇 https://running.moximoxi.net/community/',
			];
			break;
		}
		default:
			throw new Error('Incorrect type used');
	}

	contextToUse += `\n\nCTA: Direct readers to ${ctaDescription}. Tell them the link is in the comments.`;

	const month = new Date().toLocaleString('en-US', { month: 'long' });
	const monthToSeason = {
		December: 'Winter',
		January: 'Winter',
		February: 'Winter',
		March: 'Spring',
		April: 'Spring',
		May: 'Spring',
		June: 'Summer',
		July: 'Summer',
		August: 'Summer',
		September: 'Autumn',
		October: 'Autumn',
		November: 'Autumn',
	};
	const season = monthToSeason[month];

	contextToUse = contextToUse.replace(': month', `: ${month}`).replace(': season', `: ${season}`);


	return { comments, contextToUse };
}

async function chooseRace() {
	let raceStr = '';
	for (const race of races.races) {
		raceStr += race.name + '|||';
	}
	// const post_history = JSON.parse(fs.readFileSync('./data/post_history.json', 'utf-8'));
	// filter races that are in post_history

	let systemRaceSelectionPrompt = prompts.systemRaceSelectionPrompt;
	let contextChooseRace = prompts.contextRaceSelection + raceStr;
	const raceSelection = await client.messages.create({
		max_tokens: 1024,
		system: systemRaceSelectionPrompt,
		messages: [{ role: 'user', content: contextChooseRace }],
		model: 'claude-sonnet-4-6',
	});
	return raceSelection.content[0].text;
}

async function chooseRaceMock() {
	return "The 5th Mt. Fuji Sanroku Women's Trail Run";
}


// (async () => {
// 	console.log(await getContextPrompts('race'));
// })();
