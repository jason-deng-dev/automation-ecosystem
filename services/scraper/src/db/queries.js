import pool from './pool.js';

// ── races ─────────────────────────────────────────────────────────────────────
// Returns Map<url, race> for O(1) dedup lookup in incremental scrape logic
export const getExistingRaces = async () => {
	const res = await pool.query(`
		SELECT
			name, url, date, location,
			entry_start AS "entryStart", entry_end AS "entryEnd",
			website, description, registration_open AS "registrationOpen",
			registration_url AS "registrationUrl",
			images, info, notice,
			name_zh, date_zh, location_zh,
			entry_start_zh AS "entryStart_zh", entry_end_zh AS "entryEnd_zh",
			description_zh, info_zh, notice_zh
		FROM races
	`);
	return new Map(res.rows.map((race) => [race.url, race]));
};

export const upsertRace = async (race) => {
	await pool.query(
		`INSERT INTO races (
			url, name, date, location,
			entry_start, entry_end, website, description,
			registration_open, registration_url,
			images, info, notice,
			name_zh, date_zh, location_zh,
			entry_start_zh, entry_end_zh, description_zh,
			info_zh, notice_zh,
			scraped_at
		) VALUES (
			$1, $2, $3, $4,
			$5, $6, $7, $8,
			$9, $10,
			$11, $12, $13,
			$14, $15, $16,
			$17, $18, $19,
			$20, $21,
			NOW()
		)
		ON CONFLICT (url) DO UPDATE SET
			name               = EXCLUDED.name,
			date               = EXCLUDED.date,
			location           = EXCLUDED.location,
			entry_start        = EXCLUDED.entry_start,
			entry_end          = EXCLUDED.entry_end,
			website            = EXCLUDED.website,
			description        = EXCLUDED.description,
			registration_open  = EXCLUDED.registration_open,
			registration_url   = EXCLUDED.registration_url,
			images             = EXCLUDED.images,
			info               = EXCLUDED.info,
			notice             = EXCLUDED.notice,
			name_zh            = EXCLUDED.name_zh,
			date_zh            = EXCLUDED.date_zh,
			location_zh        = EXCLUDED.location_zh,
			entry_start_zh     = EXCLUDED.entry_start_zh,
			entry_end_zh       = EXCLUDED.entry_end_zh,
			description_zh     = EXCLUDED.description_zh,
			info_zh            = EXCLUDED.info_zh,
			notice_zh          = EXCLUDED.notice_zh,
			scraped_at         = NOW()`,
		[
			race.url,
			race.name ?? null,
			race.date ?? null,
			race.location ?? null,
			race.entryStart ?? null,
			race.entryEnd ?? null,
			race.website ?? null,
			race.description ?? null,
			race.registrationOpen ?? null,
			race.registrationUrl ?? null,
			JSON.stringify(race.images ?? null),
			JSON.stringify(race.info ?? null),
			JSON.stringify(race.notice ?? null),
			race.name_zh ?? null,
			race.date_zh ?? null,
			race.location_zh ?? null,
			race.entryStart_zh ?? null,
			race.entryEnd_zh ?? null,
			race.description_zh ?? null,
			JSON.stringify(race.info_zh ?? null),
			JSON.stringify(race.notice_zh ?? null),
		],
	);
};

// ── scraper_run_logs ──────────────────────────────────────────────────────────

export const insertRunLog = async ({ outcome, racesScraped, failureCount, failedUrls, errorMsg }) => {
	await pool.query(
		`INSERT INTO scraper_run_logs (outcome, races_scraped, failure_count, failed_urls, error_msg)
		 VALUES ($1, $2, $3, $4, $5)`,
		[outcome, racesScraped, failureCount, failedUrls ?? [], errorMsg ?? null],
	);
};

// ── pipeline_state ────────────────────────────────────────────────────────────

export const upsertPipelineState = async (state) => {
	await pool.query(
		`INSERT INTO pipeline_state (service, state, updated_at)
		 VALUES ('scraper', $1, NOW())
		 ON CONFLICT (service) DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()`,
		[state],
	);
};
