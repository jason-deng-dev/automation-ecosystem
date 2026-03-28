import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const dataDir = process.env.DATA_DIR;
const isDev = process.env.NODE_ENV === "development";

// current pipeline state
export function getPipelineState() {
	const pipelineState = JSON.parse(fs.readFileSync(path.join(dataDir, "scraper/pipeline_state.json"), "utf-8"));
	return pipelineState.state;
}

// last run timestamp
export function getLastTimestamp() {
	const runLog = JSON.parse(fs.readFileSync(path.join(dataDir, "scraper/run_log.json"), "utf-8"));
	const [lastTimestamp] = Object.entries(runLog).at(-1);
	return lastTimestamp;
}

// last run full object
export function getLastRun() {
	const runLog = JSON.parse(fs.readFileSync(path.join(dataDir, "scraper/run_log.json"), "utf-8"));
	const [, lastRun] = Object.entries(runLog).at(-1);
	return lastRun;
}

// last run status
export function getLastRunStatus() {
	const runLog = JSON.parse(fs.readFileSync(path.join(dataDir, "scraper/run_log.json"), "utf-8"));
	const [, lastRun] = Object.entries(runLog).at(-1);
	return lastRun.outcome;
}

// success rate over last 30 days
export function getSuccessRate() {
	const runLog = JSON.parse(fs.readFileSync(path.join(dataDir, "scraper/run_log.json"), "utf-8"));
	const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
	const filtered = Object.entries(runLog).filter(([key]) => new Date(key) > thirtyDaysAgo);
	const total = filtered.length;
	const success = filtered.reduce((acc, [, run]) => run.outcome === "success" ? acc + 1 : acc, 0);
	return total === 0 ? null : { success, total };
}

// data freshness — age of races.json
export function getDataFreshness() {
	const stat = fs.statSync(path.join(dataDir, "scraper/races.json"));
	const ageMs = Date.now() - stat.mtimeMs;
	const days = Math.floor(ageMs / (1000 * 60 * 60 * 24));
	const hours = Math.floor((ageMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
	return days > 0 ? `${days}d ${hours}h ago` : `${hours}h ago`;
}

// races scraped on last run
export function getRacesScraped() {
	const runLog = JSON.parse(fs.readFileSync(path.join(dataDir, "scraper/run_log.json"), "utf-8"));
	const [, lastRun] = Object.entries(runLog).at(-1);
	return { count: lastRun.races_scraped, belowThreshold: lastRun.races_scraped < 30 };
}

// failed urls from last run
export function getFailedUrls() {
	const runLog = JSON.parse(fs.readFileSync(path.join(dataDir, "scraper/run_log.json"), "utf-8"));
	const [, lastRun] = Object.entries(runLog).at(-1);
	return lastRun.failed_urls || [];
}

// manual trigger
export function runScraper() {
	const cmd = isDev
		? `node ../../services/scraper/scraper.js`
		: `docker exec scraper node scraper.js`;
	execSync(cmd);
}
