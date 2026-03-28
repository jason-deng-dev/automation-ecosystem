import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const dataDir = process.env.DATA_DIR;
const isDev = process.env.NODE_ENV === "development";

// const auth = fs.readFileSync(path.join(dataDir, "xhs/auth.json"), "utf-8");
// const postHistory = fs.readFileSync(path.join(dataDir, "xhs/post_history.json"), "utf-8");
// const runLog = fs.readFileSync(path.join(dataDir, "xhs/run_log.json"), "utf-8");
// const pipelineState = fs.readFileSync(path.join(dataDir, "xhs/pipeline_state.json"), "utf-8");
// const config = fs.readFileSync(path.join(dataDir, "xhs/config.json"), "utf-8");

// General
// Last run timestamp
export function getLastTimestamp() {
	const runLog = JSON.parse(fs.readFileSync(path.join(dataDir, "xhs/run_log.json"), "utf-8"));
	const entries = Object.entries(runLog);
	const [lastTimestamp] = entries.at(-1);
	return lastTimestamp;
}

// last run status
export function getLastRunStatus() {
	const runLog = JSON.parse(fs.readFileSync(path.join(dataDir, "xhs/run_log.json"), "utf-8"));
	const [, lastRun] = Object.entries(runLog).at(-1);
	return lastRun.outcome;
}

// last run full object
export function getLastRun() {
	const runLog = JSON.parse(fs.readFileSync(path.join(dataDir, "xhs/run_log.json"), "utf-8"));
	const [, lastRun] = Object.entries(runLog).at(-1);
	return lastRun;
}

// current pipeline state
export function getPipelineState() {
	const pipelineState = JSON.parse(fs.readFileSync(path.join(dataDir, "xhs/pipeline_state.json"), "utf-8"));
	return pipelineState.state;
}

// success rate over last 30 days
export function getSuccessRate() {
	const runLog = JSON.parse(fs.readFileSync(path.join(dataDir, "xhs/run_log.json"), "utf-8"));
	const entries = Object.entries(runLog);
	const entriesDateFiltered = entries.filter((item) => {
		const [key] = item;
		const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
		if (new Date(key) > thirtyDaysAgo) {
			return true;
		}
	});
	const total = entriesDateFiltered.length;
	const success = entriesDateFiltered.reduce((acc, [key, run]) => {
		if (run.outcome === "success") acc += 1;
		return acc;
	}, 0);
	return total === 0 ? null : { success, total };
}

// error count by errorType
export function getErrorCountByType() {
	const runLog = JSON.parse(fs.readFileSync(path.join(dataDir, "xhs/run_log.json"), "utf-8"));
	return Object.values(runLog).reduce((acc, run) => {
		if (run.errorStage) {
			acc[run.errorStage] = (acc[run.errorStage] || 0) + 1;
		}
		return acc;
	}, {});
}

// api token tracker — lifetime totals
export function getTokenTotals() {
	const runLog = JSON.parse(fs.readFileSync(path.join(dataDir, "xhs/run_log.json"), "utf-8"));
	return Object.values(runLog).reduce(
		(acc, run) => {
			acc.input += run.input_tokens || 0;
			acc.output += run.output_tokens || 0;
			return acc;
		},
		{ input: 0, output: 0 },
	);
}

// upcoming post
export function getUpcomingPost() {
	const config = JSON.parse(fs.readFileSync(path.join(dataDir, "xhs/config.json"), "utf-8"));
	const slots = Object.entries(config).flatMap(([day, slots]) => slots.map((slot) => ({ day: Number(day), ...slot })));

	const now = new Date();
	const currentDay = now.getDay(); // 0-6 for day of week
	const currentTime = now.toTimeString().slice(0, 5); // "HH:MM"
	const validSlots = slots.filter((slot) => {
		return slot.day > currentDay || (slot.day === currentDay && slot.time > currentTime);
	});
	
    // if on saturday show sunday's first post
	if (validSlots.length === 0) {
		slots.sort((a, b) => a.day - b.day || a.time.localeCompare(b.time));
		return slots[0];
	}
    
    validSlots.sort((a, b) => a.day - b.day || a.time.localeCompare(b.time));
	return validSlots[0];
}

// XHS specific

// post type distribution
export function getPostTypeDistribution() {
	const runLog = JSON.parse(fs.readFileSync(path.join(dataDir, "xhs/run_log.json"), "utf-8"));
	return Object.values(runLog).reduce((acc, run) => {
		acc[run.type] = (acc[run.type] || 0) + 1;
		return acc;
	}, {});
}

// Auth status
export function getAuthStatus() {
	const runLog = JSON.parse(fs.readFileSync(path.join(dataDir, "xhs/run_log.json"), "utf-8"));
	const [, lastRun] = Object.entries(runLog).at(-1);
	return lastRun.errorStage === "auth" ? "failed" : "ok";
}

// manual post
export function postManualPost(type) {
	const cmd = isDev
		? `node ../../services/xhs/scripts/run-manualPost.js ${type}`
		: `docker exec xhs node scripts/run-manualPost.js ${type}`;
	execSync(cmd);
}

// preview
export function runPreview(type) {
	const cmd = isDev
		? `node ../../services/xhs/scripts/run-preview.js ${type}`
		: `docker exec xhs node scripts/run-preview.js ${type}`;
	return execSync(cmd, { encoding: "utf-8" });
}

// re-authenticate
export function runReAuth() {
	const cmd = isDev ? `node ../../services/xhs/scripts/xhs-login.js` : `docker exec xhs node scripts/xhs-login.js`;
	execSync(cmd);
}

// live log
// view postArchive
// run history
// change schedule
