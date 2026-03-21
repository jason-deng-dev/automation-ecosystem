import nodeCron from "node-cron";
import { generatePost } from "./generator.js";
import { populateRaces } from "./scraper";
import { publishPost }

nodeCron.schedule("0 9 * * *", () => {}, { timezone: "Asia/Shanghai" });

function getPostType() {
	const dayOfWeek = new Date().getDay();
	const dayTypeMap = {
		1: "race",
		2: "nutritionSupplement",
		3: "training",
		4: "race",
		5: "race",
		6: "training",
		0: "wearable",
	};
	return dayTypeMap[dayOfWeek];
}

export { getPostType };
