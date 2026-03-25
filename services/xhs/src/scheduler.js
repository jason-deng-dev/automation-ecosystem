import nodeCron from 'node-cron';
import { generatePost } from './generator.js';
import { populateRaces } from './scraper.js';
import { publishPost, checkAuth } from './publisher.js';

function startScheduler() {
	// Weekly: refresh race data every Monday at 8am CST (before daily post fires)
	nodeCron.schedule(
		'0 8 * * 1',
		async () => {
			try {
				await populateRaces(25);
			} catch (err) {
				console.error(`Populate race failed : ${err.message}`);
				return;
			}
		},
		{ timezone: 'Asia/Shanghai' },
	);

	// Daily: generate and publish post at 9pm CST (peak XHS engagement window)
	nodeCron.schedule('* * * * *', Run, { timezone: 'Asia/Shanghai' });
}

let postTypes = ['race', 'nutritionSupplement', 'training', 'race', 'race', 'training', 'wearable'];
function getPostTypeTest() {
	return postTypes.shift();
}

function getPostType() {
	const dayOfWeek = new Date().getDay();
	const dayTypeMap = {
		1: 'race',
		2: 'nutritionSupplement',
		3: 'training',
		4: 'race',
		5: 'race',
		6: 'training',
		0: 'wearable',
	};
	return dayTypeMap[dayOfWeek];
}

const jobQueue = [];
let isRunning = false;

async function Run() {
	try {
		const type = getPostType();
		if (type === undefined) {
			console.error('Ran out of types');
			return;
		}

		console.log('Starting Authentication check...');
		try {
			const authRes = await checkAuth();
			if (!authRes) {
				console.error(`XHS authentication failed`);
				return;
			}
		} catch (err) {
			console.error(`Publish post failed : ${err.message}`);
			if (err.message.includes('Authentication')) {
				process.exit(1);
			}
		}
		let post;
		let input_tokens;
		let output_tokens;
		console.log('Starting XHS article generation...');
		try {
			post = await generatePost(type);
			({ input_tokens, output_tokens } = post);
		} catch (err) {
			console.error(`Generate post failed : ${err.message}`);
			return;
		}
		console.log('XHS generation successful');

		try {
			const publishRes = await publishPost(post);
			if (!publishRes) {
				console.error(`Publish post failed`);
				return;
			}
		} catch (err) {
			console.error(`Publish post failed : ${err.message}`);
			return;
		}
	} finally {
		console.log('Process complete');
	}
}

async function testRun() {
	jobQueue.push(1);
	jobQueue.push(1);
	jobQueue.push(1);
	jobQueue.push(1);
	jobQueue.push(1);
	jobQueue.push(1);
	jobQueue.push(1);
	if (isRunning) return;
	while (jobQueue.length > 0) {
		jobQueue.shift();
		isRunning = true;

		try {
			const type = getPostTypeTest();
			if (type === undefined) {
				console.error('Ran out of types');
				return;
			}

			console.log('Starting Authentication check...');
			try {
				const authRes = await checkAuth();
				if (!authRes) {
					console.error(`XHS authentication failed`);
					return;
				}
			} catch (err) {
				console.error(`Publish post failed : ${err.message}`);
				if (err.message.includes('Authentication')) {
					process.exit(1);
				}
			}
			let post;
			let input_tokens;
			let output_tokens;
			console.log('Starting XHS article generation...');
			try {
				post = await generatePost(type);
				({ input_tokens, output_tokens } = post);
			} catch (err) {
				console.error(`Generate post failed : ${err.message}`);
				return;
			}
			console.log('XHS generation successful');

			try {
				const publishRes = await publishPost(post);
				if (!publishRes) {
					console.error(`Publish post failed`);
					return;
				}
			} catch (err) {
				console.error(`Publish post failed : ${err.message}`);
				return;
			}
		} finally {
			isRunning = false;
			console.log('Process complete');
		}
	}
}

export { startScheduler };
