import nodeCron from 'node-cron';
import { generatePost } from './generator.js';
import { populateRaces } from './scraper.js';
import { publishPost, checkAuth } from './publisher.js';
import fs from 'fs';
function startScheduler() {
	fs.watch('../config.json', setupAllDailyCrons);

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

	// Daily posts according to config.json
	setupAllDailyCrons();

	// Monthly: reset post_history.json
	nodeCron.schedule(
		'0 0 1 * *',
		() => {
			try {
				fs.writeFileSync('data/post_history.json', JSON.stringify([], null, 2));
				console.log('post_history.json reset successful');
			} catch (err) {
				console.error(`post_history.json reset failed`);
				return;
			}
		},
		{ timezone: 'Asia/Shanghai' },
	);
}

let postTypes = ['race', 'nutritionSupplement', 'training', 'race', 'race', 'training', 'wearable'];
function getPostTypeTest() {
	return postTypes.shift();
}

let dailyCronJobs = [];

function setupAllDailyCrons() {
	// clear existing cron jobs
	dailyCronJobs.forEach((job) => job.stop());
	dailyCronJobs = [];
	const config = Object.entries(JSON.parse(fs.readFileSync('../config.json', 'utf-8')));
	for (const day of config) {
		const dayOfWeek = day[0];
		for (const post of day[1]) {
			const [hour, minute] = post['time'].split(':');
			const type = post['type'];
			const cronTime = `${minute} ${hour} * * ${dayOfWeek}`;
			dailyCronJobs.push(nodeCron.schedule(cronTime, () => Run(type), { timezone: 'Asia/Shanghai' }));
		}
	}
}

const jobQueue = [];
let isRunning = false;

async function Run(postType) {
	let type = postType;
	let input_tokens;
	let output_tokens;
	let outcome = 'success';
	let errorStage = null;
	let errorMsg = null;
	const pipeline_state_filePath = `${process.env.DATA_DIR}/xhs/pipeline_state.json`;
	fs.writeFileSync(pipeline_state_filePath, JSON.stringify({ state: 'running'}));

	try {
		console.log('Starting Authentication check...');
		try {
			const authRes = await checkAuth();
			if (!authRes) {
				console.error(`XHS authentication failed`);
				return;
			}
		} catch (err) {
			console.error(`Publish post failed : ${err.message}`);
			outcome = 'failed';
			errorStage = 'auth';
			errorMsg = err.message;

			if (err.message.includes('Authentication')) {
				process.exit(1);
			}
		}
		let post;

		console.log('Starting XHS article generation...');
		try {
			post = await generatePost(type);
			({ input_tokens, output_tokens } = post);
		} catch (err) {
			console.error(`Generate post failed : ${err.message}`);
			outcome = 'failed';
			errorStage = 'generate';
			errorMsg = err.message;
			return;
		}
		console.log('XHS generation successful');

		try {
			const publishRes = await publishPost(post);
			if (!publishRes) {
				console.error(`Publish post failed`);
				outcome = 'failed';
				errorStage = 'publish';
				errorMsg = 'publish returned false';
				return;
			}
		} catch (err) {
			console.error(`Publish post failed : ${err.message}`);
			outcome = 'failed';
			errorStage = 'publish';
			errorMsg = err.message;
			return;
		}
	} finally {
		console.log('Process complete');
		const timestamp = new Date().toISOString();
		const log = { type, outcome, errorStage, errorMsg, input_tokens, output_tokens };
		const run_log_filePath = `${process.env.DATA_DIR}/xhs/run_log.json`;
		if (!fs.existsSync(run_log_filePath)) {
			fs.writeFileSync(run_log_filePath, JSON.stringify({}));
		}
		const run_log = JSON.parse(fs.readFileSync(run_log_filePath, 'utf-8'));
		run_log[timestamp] = log;
		fs.writeFileSync(run_log_filePath, JSON.stringify(run_log, null, 2));
		console.log(`Run Log saved as ${timestamp}`);

		fs.writeFileSync(pipeline_state_filePath, JSON.stringify({ state: outcome === 'success' ? 'idle' : 'failed' }));
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
