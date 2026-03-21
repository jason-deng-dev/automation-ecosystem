import "dotenv/config";
import fs from "fs";
import Anthropic from "@anthropic-ai/sdk";

const defaultPrompts = JSON.parse(
	fs.readFileSync("./config/prompts.json", "utf-8"),
);
const defaultRaces = JSON.parse(fs.readFileSync("./data/races.json", "utf-8"));
const defaultClient = new Anthropic({
	apiKey: process.env["ANTHROPIC_API_KEY"],
	maxRetries: 3,
	timeout: 30000,
});
const defaultPostedRaces = fs.existsSync("data/post_history.json")
	? JSON.parse(fs.readFileSync("data/post_history.json", "utf-8"))
	: [];

async function generatePosts(
	type,
	{
		races = defaultRaces,
		postedRaces = defaultPostedRaces,
		client = defaultClient,
		prompts = defaultPrompts,
	} = {},
) {
	const systemPrompt = prompts.systemPrompt;
	const { comments, contextToUse, raceName } = await getContextPrompts(type, {
		races,
		postedRaces,
		client,
		prompts,
	});

	let message;
	let messageParsed;
	try {
		message = await client.messages.create({
			max_tokens: 4096,
			system: systemPrompt,
			messages: [{ role: "user", content: contextToUse }],
			model: "claude-sonnet-4-6",
		});
		const rawText = message.content[0].text
			.trim()
			.replace(/^```json\s*/, "")
			.replace(/```\s*$/, "");
		messageParsed = JSON.parse(rawText);
	} catch (err) {
		throw new Error(`Post generation failed: ${err.message}`);
	}

	const { title, hook, contents, cta, description } = messageParsed;

	// if message is successful add the race to post_history
	if (type == "race") {
		postedRaces.push(raceName);
		fs.writeFileSync(
			"data/post_history.json",
			JSON.stringify(postedRaces, null, 2),
		);
	}

	const hashtags = getHashtags(type);

	return { title, hook, contents, cta, description, hashtags, comments };
}

async function getContextPrompts(
	type,
	{
		races = defaultRaces,
		postedRaces = defaultPostedRaces,
		client = defaultClient,
		prompts = defaultPrompts,
	} = {},
) {
	let raceName = "";
	if (type == "race") {
		raceName = await chooseRace({ races, postedRaces, client, prompts });
	}

	const { contextToUse, comments } = buildContext(
		type,
		prompts,
		races,
		raceName,
	);

	return { comments, contextToUse, raceName };
}

async function chooseRace({
	races = defaultRaces,
	postedRaces = defaultPostedRaces,
	client = defaultClient,
	prompts = defaultPrompts,
} = {}) {
	const availableRaces = races.races.filter(
		(r) => !postedRaces.includes(r.name),
	);
	const raceStr = availableRaces.map((r) => r.name).join("|||");

	let systemRaceSelectionPrompt = prompts.systemRaceSelectionPrompt;
	let contextChooseRace = prompts.contextRaceSelection + raceStr;
	let raceSelection;
	try {
		raceSelection = await client.messages.create({
			max_tokens: 100,
			system: systemRaceSelectionPrompt,
			messages: [{ role: "user", content: contextChooseRace }],
			model: "claude-sonnet-4-6",
		});
	} catch (err) {
		throw new Error(`Choose race failed: ${err.message}`);
	}

	return raceSelection.content[0].text;
}

function getHashtags(type) {
	switch (type) {
		case "race":
			return [
				"#日本马拉松",
				"#马拉松训练",
				"#我的马拉松备赛日记",
				"#马拉松跑友请指教",
				"#跑步爱好者",
				"#记录跑步",
				"#人生需要一场马拉松",
				"#日本队",
				"#起跑就是马拉松",
				"#安全完赛就是胜利",
			];
		case "training":
			return [
				"#马拉松训练",
				"#跑步训练",
				"#跑步技巧",
				"#跑步的力量",
				"#记录跑步",
				"#跑步打卡",
				"#跑出更好的自己",
				"#跑步爱好者",
				"#我爱跑步",
				"#人生需要一场马拉松",
			];
		case "nutritionSupplement":
			return [
				"#马拉松训练",
				"#跑步训练",
				"#跑步技巧",
				"#跑出更好的自己",
				"#跑步的力量",
				"#跑步爱好者",
				"#我爱跑步",
				"#记录跑步",
				"#跑步治百病",
				"#长跑",
			];
		case "wearable":
			return [
				"#跑步训练",
				"#跑步技巧",
				"#我爱跑步",
				"#跑步爱好者",
				"#跑步的力量",
				"#长跑",
				"#跑出更好的自己",
				"#记录跑步",
				"#马拉松训练",
				"#sport",
			];
		default:
			throw new Error("Incorrect type used");
	}
}

function buildContext(type, prompts, races, raceName) {
	let contextToUse;
	let comments;
	let ctaDescription;
	switch (type) {
		case "race": {
			let raceContext = prompts.postTypes.raceGuide;
			const race = races.races.find((item) => item.name === raceName);
			const fields = [
				"name",
				"date",
				"location",
				"entryStart",
				"entryEnd",
				"registrationOpen",
				"registrationUrl",
				"website",
				"description",
			];
			for (const field of fields) {
				if (race[field] == null) {
					raceContext = raceContext.replaceAll(
						`race.${field}`,
						"missing from the website",
					);
				} else {
					raceContext = raceContext.replaceAll(`race.${field}`, race[field]);
				}
			}
			contextToUse = raceContext;
			ctaDescription =
				"our marathon hub where readers can find full race details, registration timelines, and sign-up links for Japanese marathons";
			comments = [
				"想了解更多关于这场比赛的详细信息和报名攻略？👇 https://running.moximoxi.net/racehub/",
				"加入我们的跑步社区，和其他计划去日本跑马的小伙伴一起交流👇 https://running.moximoxi.net/community/",
			];
			break;
		}
		case "training": {
			contextToUse = prompts.postTypes.training;
			ctaDescription =
				"our free marathon preparation toolkit — tools that help runners find their realistic marathon time range, convert their goal into a required pace, check whether their goal is achievable in the time they have, and track progress over a training build";
			comments = [
				"🛠️ 免费工具：预测完赛时间范围、算出目标配速、检查训练计划可行性👇 https://running.moximoxi.net/mara-prep-tools/",
				"📈 训练进度追踪工具——记录每次训练数据，看清自己的进步趋势👇 https://running.moximoxi.net/progress-trendline/",
				"和其他备战日本马拉松的跑者交流备赛心得👇 https://running.moximoxi.net/community/",
			];

			break;
		}
		case "nutritionSupplement": {
			contextToUse = prompts.postTypes.nutritionSupplement;
			ctaDescription =
				"our online store offering authentic Japanese running nutrition and supplements, available for import to China";
			comments = [
				"想购买正品日本跑步营养品？👇  https://running.moximoxi.net/",
				"加入我们的跑步社区，和其他计划去日本跑马的小伙伴一起交流👇 https://running.moximoxi.net/community/",
			];
			break;
		}
		case "wearable": {
			contextToUse = prompts.postTypes.wearables;
			ctaDescription =
				"our online store stocking a wide range of running products sourced directly from Japan — shoes, apparel, GPS watches, recovery gear, nutrition and supplements, and sportswear, all authentic Japanese products available for import to China";
			comments = [
				"正品日本跑步装备、营养品、运动服饰，日本本地直采👇 https://running.moximoxi.net/",
				"加入我们的跑步社区，和其他计划去日本跑马的小伙伴一起交流👇 https://running.moximoxi.net/community/",
			];
			break;
		}
		default:
			throw new Error("Incorrect type used");
	}

	contextToUse += `\n\nCTA: Direct readers to ${ctaDescription}. Tell them the link is in the comments.`;

	const month = new Date().toLocaleString("en-US", { month: "long" });
	const monthToSeason = {
		December: "Winter",
		January: "Winter",
		February: "Winter",
		March: "Spring",
		April: "Spring",
		May: "Spring",
		June: "Summer",
		July: "Summer",
		August: "Summer",
		September: "Autumn",
		October: "Autumn",
		November: "Autumn",
	};
	const season = monthToSeason[month];

	contextToUse = contextToUse
		.replace(": month", `: ${month}`)
		.replace(": season", `: ${season}`);

	return { contextToUse, comments };
}

export {
	generatePosts,
	getContextPrompts,
	chooseRace,
	getHashtags,
	buildContext,
};
