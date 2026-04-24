import { ecosystemPool } from './db/pool.js';
import { spawn } from 'child_process';

let reAuthProc = null;
let eventBuffer = [];
const subscribers = new Set();

function broadcast(line) {
	eventBuffer.push(line);
	if (eventBuffer.length > 200) eventBuffer.shift();
	for (const sub of subscribers) sub(line);
}

export function runReAuth() {
	if (reAuthProc) return;
	eventBuffer = [];
	reAuthProc = spawn('docker', ['exec', 'xhs', 'node', 'scripts/xhs-login.js'], {
		stdio: ['ignore', 'pipe', 'pipe'],
	});
	reAuthProc.stdout.on('data', (chunk) => {
		chunk.toString().split('\n').filter(Boolean).forEach(broadcast);
	});
	reAuthProc.stderr.on('data', (d) => console.error('[xhs-login stderr]', d.toString()));
	reAuthProc.on('exit', (code) => { console.log('[xhs-login exit]', code); reAuthProc = null; });
}

export function subscribeReAuth(callback) {
	subscribers.add(callback);
	eventBuffer.forEach(callback);
	return () => subscribers.delete(callback);
}

export function getReAuthProc() {
	return reAuthProc;
}

export function killReAuth() {
	if (reAuthProc) { reAuthProc.kill(); reAuthProc = null; }
}

export async function getXhsMetrics() {
	const [
		lastRunRes,
		pipelineStateRes,
		successRateRes,
		errorByTypeRes,
		tokenTotalsRes,
		postTypeDistRes,
		scheduleRes,
	] = await Promise.all([
		ecosystemPool.query(
			`SELECT published_at, post_type, outcome, error_stage, error_msg
			 FROM xhs_run_logs ORDER BY published_at DESC LIMIT 1`
		),
		ecosystemPool.query(`SELECT state FROM pipeline_state WHERE service = 'xhs'`),
		ecosystemPool.query(
			`SELECT outcome FROM xhs_run_logs WHERE published_at > NOW() - INTERVAL '30 days'`
		),
		ecosystemPool.query(
			`SELECT error_stage, COUNT(*) AS count FROM xhs_run_logs
			 WHERE error_stage IS NOT NULL GROUP BY error_stage`
		),
		ecosystemPool.query(
			`SELECT SUM(input_tokens) AS input, SUM(output_tokens) AS output FROM xhs_run_logs`
		),
		ecosystemPool.query(
			`SELECT post_type, COUNT(*) AS count FROM xhs_run_logs GROUP BY post_type`
		),
		ecosystemPool.query(
			`SELECT day, time, post_type FROM xhs_schedule ORDER BY day, time`
		),
	]);

	const row = lastRunRes.rows[0] ?? null;
	const lastRun = row ? {
		timestamp: row.published_at,
		outcome: row.outcome,
		errorStage: row.error_stage,
		errorMsg: row.error_msg,
	} : null;

	const pipelineState = pipelineStateRes.rows[0]?.state ?? 'idle';

	const successRateRows = successRateRes.rows;
	const total = successRateRows.length;
	const success = successRateRows.filter(r => r.outcome === 'success').length;
	const successRate = total === 0 ? null : { success, total };

	const errorCountByType = Object.fromEntries(
		errorByTypeRes.rows.map(r => [r.error_stage, Number(r.count)])
	);

	const tokenRow = tokenTotalsRes.rows[0];
	const tokenTotals = {
		input: Number(tokenRow?.input ?? 0),
		output: Number(tokenRow?.output ?? 0),
	};

	const postTypeDistribution = Object.fromEntries(
		postTypeDistRes.rows.map(r => [r.post_type, Number(r.count)])
	);

	const authStatus = lastRun?.errorStage === 'auth' ? 'failed' : 'ok';

	const slots = scheduleRes.rows;
	const now = new Date();
	const currentDay = now.getDay();
	const currentTime = now.toTimeString().slice(0, 5);
	const validSlots = slots
		.filter(s => s.day > currentDay || (s.day === currentDay && s.time > currentTime))
		.sort((a, b) => a.day - b.day || a.time.localeCompare(b.time));
	const fallback = [...slots].sort((a, b) => a.day - b.day || a.time.localeCompare(b.time));
	const upcomingSlot = validSlots[0] ?? fallback[0] ?? null;
	const upcomingPost = upcomingSlot ? {
		day: upcomingSlot.day,
		time: upcomingSlot.time,
		type: upcomingSlot.post_type,
	} : null;

	return { lastRun, pipelineState, successRate, errorCountByType, tokenTotals, postTypeDistribution, authStatus, upcomingPost };
}
