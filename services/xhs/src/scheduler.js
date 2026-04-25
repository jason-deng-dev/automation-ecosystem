import nodeCron from 'node-cron';
import { generatePost } from './generator.js';
import { publishPost, checkAuth } from './publisher.js';
import { getSchedule, insertRunLog, upsertPipelineState, deleteOldPostHistory, getPendingDraft, saveDraft, markDraftPublished } from './db/queries.js';

async function startScheduler() {
	await setupAllDailyCrons();

	// Monthly: reset post_history (delete rows from previous months)
	nodeCron.schedule(
		'0 0 1 * *',
		async () => {
			try {
				await deleteOldPostHistory();
				console.log('xhs_post_history monthly reset successful');
			} catch (err) {
				console.error(`xhs_post_history monthly reset failed: ${err.message}`);
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

export async function setupAllDailyCrons() {
	// clear existing cron jobs
	dailyCronJobs.forEach((job) => job.stop());
	dailyCronJobs = [];

	const schedule = await getSchedule();
	for (const row of schedule) {
		const [hour, minute] = row.time.split(':');
		const cronTime = `${minute} ${hour} * * ${row.day}`;
		dailyCronJobs.push(
			nodeCron.schedule(cronTime, () => Run(row.post_type), { timezone: 'Asia/Shanghai' }),
		);
	}
	console.log(`Registered ${dailyCronJobs.length} cron job(s) from xhs_schedule`);
}

const jobQueue = [];
let isRunning = false;

async function Run(postType, { skipOffset = false } = {}) {
	let type = postType;
	let input_tokens = 0;
	let output_tokens = 0;
	let outcome = 'success';
	let errorStage = null;
	let errorMsg = null;

	await upsertPipelineState('running');

	try {
		console.log('Starting Authentication check...');
		try {
			const authRes = await checkAuth();
			if (!authRes) {
				console.error(`XHS authentication failed`);
				outcome = 'failed';
				errorStage = 'auth';
				errorMsg = 'XHS authentication failed';
				return;
			}
		} catch (err) {
			console.error(`Auth check failed: ${err.message}`);
			outcome = 'failed';
			errorStage = 'auth';
			errorMsg = err.message;
		}

		let post;
		let draft = null;

		// Reuse a pending draft if one exists for this post type — skip generation
		try {
			draft = await getPendingDraft(type);
		} catch (err) {
			console.error(`Draft lookup failed (will generate fresh): ${err.message}`);
		}

		if (draft) {
			post = draft.post;
			console.log(`Reusing draft post id=${draft.id} from previous failed run — skipping generation`);
		} else {
			console.log('Starting XHS article generation...');
			try {
				post = await generatePost(type);
				({ input_tokens, output_tokens } = post);
			} catch (err) {
				console.error(`Generate post failed: ${err.message}`);
				outcome = 'failed';
				errorStage = 'generate';
				errorMsg = err.message;
				return;
			}
			console.log('XHS generation successful');
		}

		try {
			const publishRes = await publishPost(post, { skipOffset });
			if (!publishRes) {
				console.error(`Publish post failed`);
				if (!draft) {
					try { await saveDraft(type, post); console.log('Draft saved for next run'); }
					catch (e) { console.error(`Failed to save draft: ${e.message}`); }
				}
				outcome = 'failed';
				errorStage = 'publish';
				errorMsg = 'publish returned false';
				return;
			}
			if (draft) {
				try { await markDraftPublished(draft.id); }
				catch (e) { console.error(`Failed to mark draft published: ${e.message}`); }
			}
		} catch (err) {
			console.error(`Publish post failed: ${err.message}`);
			if (!draft) {
				try { await saveDraft(type, post); console.log('Draft saved for next run'); }
				catch (e) { console.error(`Failed to save draft: ${e.message}`); }
			}
			outcome = 'failed';
			errorStage = 'publish';
			errorMsg = err.message;
			return;
		}
	} finally {
		console.log('Process complete');
		await insertRunLog({
			postType: type,
			outcome,
			errorStage,
			errorMsg,
			inputTokens: input_tokens,
			outputTokens: output_tokens,
		});
		await upsertPipelineState(outcome === 'success' ? 'idle' : 'failed');
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
		const type = getPostTypeTest();
		await Run(type);
		isRunning = false;
	}
}

export { startScheduler, testRun, Run };
