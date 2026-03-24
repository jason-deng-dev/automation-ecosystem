import nodeCron from "node-cron";
import { generatePost } from "./generator.js";
import { populateRaces } from "./scraper.js";
import { publishPost } from "./publisher.js";


function startScheduler() {
	// Weekly: refresh race data every Monday at 8am CST (before daily post fires)
	nodeCron.schedule(
		"0 8 * * 1",
		async () => {
			try {
				await populateRaces(25);
			} catch (err) {
				console.error(`Populate race failed : ${err.message}`);
				return;
			}
		},
		{ timezone: "Asia/Shanghai" },
	);

	// Daily: generate and publish post at 9pm CST (peak XHS engagement window)
	nodeCron.schedule(
		"* * * * *",
		async () => {
			
			const type = getPostTypeTest();
			if (type === undefined){
				console.error('Ran out of types')
				return
			}
			let post;
			try {
				post = await generatePost(type);
			} catch (err) {
				console.error(`Generate post failed : ${err.message}`);
				return;
			}

			try {
				await publishPost(post);
			} catch (err) {
				console.error(`Publish post failed : ${err.message}`);
				return;
			}
		},
		{ timezone: "Asia/Shanghai" },
	);
}

let postTypes = ["race", "nutritionSupplement", "training", "race", "race", "training", "wearable",]

function getPostTypeTest() {
	return postTypes.shift()

}

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

export { startScheduler };
