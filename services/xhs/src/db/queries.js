import pool from './pool.js';

// ── races ─────────────────────────────────────────────────────────────────────

export const getRaces = async () => {
	const res = await pool.query(`SELECT data FROM races ORDER BY scraped_at DESC LIMIT 1`);
	return res.rows[0]?.data ?? { races: [] };
};

// ── xhs_post_history ──────────────────────────────────────────────────────────

export const getPostedRaces = async () => {
	const month = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
	const res = await pool.query(
		`SELECT race_name FROM xhs_post_history WHERE month = $1`,
		[month],
	);
	return res.rows.map((r) => r.race_name);
};

export const insertPostedRace = async (raceName) => {
	const month = new Date().toISOString().slice(0, 7);
	await pool.query(
		`INSERT INTO xhs_post_history (race_name, month) VALUES ($1, $2)`,
		[raceName, month],
	);
};

export const deleteOldPostHistory = async () => {
	const month = new Date().toISOString().slice(0, 7);
	await pool.query(`DELETE FROM xhs_post_history WHERE month != $1`, [month]);
};

// ── xhs_schedule ─────────────────────────────────────────────────────────────

export const getSchedule = async () => {
	const res = await pool.query(`SELECT day, time, post_type FROM xhs_schedule ORDER BY day, time`);
	// returns array of { day, time, post_type }
	return res.rows;
};

// ── xhs_run_logs ─────────────────────────────────────────────────────────────

export const insertRunLog = async ({ postType, outcome, errorStage, errorMsg, inputTokens, outputTokens }) => {
	await pool.query(
		`INSERT INTO xhs_run_logs (post_type, outcome, error_stage, error_msg, input_tokens, output_tokens)
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		[postType, outcome, errorStage ?? null, errorMsg ?? null, inputTokens, outputTokens],
	);
};

// ── pipeline_state ────────────────────────────────────────────────────────────

export const upsertPipelineState = async (state) => {
	await pool.query(
		`INSERT INTO pipeline_state (service, state, updated_at)
		 VALUES ('xhs', $1, NOW())
		 ON CONFLICT (service) DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()`,
		[state],
	);
};

// ── xhs_post_archive ─────────────────────────────────────────────────────────

export const insertPostArchive = async ({
	postType,
	raceName,
	title,
	hook,
	contents,
	cta,
	description,
	hashtags,
	comments,
	inputTokens,
	outputTokens,
	published,
}) => {
	await pool.query(
		`INSERT INTO xhs_post_archive
		 (post_type, race_name, title, hook, contents, cta, description, hashtags, comments, input_tokens, output_tokens, published)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
		[
			postType,
			raceName ?? null,
			title,
			hook,
			JSON.stringify(contents),
			cta,
			description,
			hashtags,
			comments,
			inputTokens,
			outputTokens,
			published,
		],
	);
};
