import { ecosystemPool } from './db/pool.js';

export async function getScraperMetrics() {
	const [
		lastRunRes,
		pipelineStateRes,
		successRateRes,
		totalRacesRes,
		dataFreshnessRes,
	] = await Promise.all([
		ecosystemPool.query(
			`SELECT logged_at, outcome, races_scraped, failure_count, failed_urls, error_msg
			 FROM scraper_run_logs ORDER BY logged_at DESC LIMIT 1`
		),
		ecosystemPool.query(`SELECT state FROM pipeline_state WHERE service = 'scraper'`),
		ecosystemPool.query(
			`SELECT outcome FROM scraper_run_logs WHERE logged_at > NOW() - INTERVAL '30 days'`
		),
		ecosystemPool.query(`SELECT COUNT(*) AS count FROM races`),
		ecosystemPool.query(`SELECT MAX(scraped_at) AS last_scraped FROM races`),
	]);

	const row = lastRunRes.rows[0] ?? null;
	const lastRun = row ? {
		timestamp: row.logged_at,
		outcome: row.outcome,
		races_scraped: row.races_scraped,
		failure_count: row.failure_count,
		failed_urls: row.failed_urls ?? [],
		error_msg: row.error_msg,
	} : null;

	const pipelineState = pipelineStateRes.rows[0]?.state ?? 'idle';

	const successRateRows = successRateRes.rows;
	const total = successRateRows.length;
	const success = successRateRows.filter(r => r.outcome === 'success').length;
	const successRate = total === 0 ? null : { success, total };

	const totalRaces = Number(totalRacesRes.rows[0]?.count ?? 0);

	const lastScrapedAt = dataFreshnessRes.rows[0]?.last_scraped;
	const dataFreshness = lastScrapedAt ? formatAge(new Date(lastScrapedAt)) : '—';

	const racesScraped = lastRun
		? { count: lastRun.races_scraped, belowThreshold: lastRun.races_scraped < 30 }
		: { count: 0, belowThreshold: true };

	return { lastRun, pipelineState, successRate, totalRaces, dataFreshness, racesScraped, nextScrape: getNextScrape() };
}

function formatAge(date) {
	const ageMs = Date.now() - date.getTime();
	const days = Math.floor(ageMs / (1000 * 60 * 60 * 24));
	const hours = Math.floor((ageMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
	return days > 0 ? `${days}d ${hours}h ago` : `${hours}h ago`;
}

function getNextScrape() {
	const now = new Date();
	// Scraper cron fires Sunday 02:00 JST (UTC+9)
	const nowJst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
	const daysUntilSunday = (7 - nowJst.getUTCDay()) % 7 || 7;
	const next = new Date(nowJst);
	next.setUTCDate(nowJst.getUTCDate() + daysUntilSunday);
	next.setUTCHours(2, 0, 0, 0);
	const ms = next - nowJst;
	const days = Math.floor(ms / (1000 * 60 * 60 * 24));
	const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
	const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
	return days > 0 ? `${days}d ${hours}h ${mins}m` : hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}
