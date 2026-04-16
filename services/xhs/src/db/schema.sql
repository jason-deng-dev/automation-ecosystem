-- Shared: races — written by scraper, read by XHS + Race Hub
-- IF NOT EXISTS so scraper seed and XHS seed can both run safely against ecosystemdb
CREATE TABLE IF NOT EXISTS races (
	id                 SERIAL PRIMARY KEY,
	url                TEXT UNIQUE NOT NULL,
	name               TEXT,
	date               TEXT,
	location           TEXT,
	entry_start        TEXT,
	entry_end          TEXT,
	website            TEXT,
	description        TEXT,
	registration_open  BOOLEAN,
	registration_url   TEXT,
	images             JSONB,
	info               JSONB,
	notice             JSONB,
	name_zh            TEXT,
	date_zh            TEXT,
	location_zh        TEXT,
	entry_start_zh     TEXT,
	entry_end_zh       TEXT,
	description_zh     TEXT,
	info_zh            JSONB,
	notice_zh          JSONB,
	scraped_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- XHS schedule: replaces xhs/config.json
-- day: 0=Sun, 1=Mon ... 6=Sat (matches node-cron day-of-week)
CREATE TABLE IF NOT EXISTS xhs_schedule (
	id         SERIAL PRIMARY KEY,
	day        INTEGER NOT NULL CHECK (day BETWEEN 0 AND 6),
	time       VARCHAR(5) NOT NULL,  -- "HH:MM" in Asia/Shanghai
	post_type  VARCHAR(32) NOT NULL
);

-- XHS run logs: replaces xhs/run_log.json
CREATE TABLE IF NOT EXISTS xhs_run_logs (
	id            SERIAL PRIMARY KEY,
	published_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	post_type     VARCHAR(32),
	outcome       VARCHAR(16) NOT NULL,  -- 'success' | 'failed'
	error_stage   VARCHAR(32),           -- 'auth' | 'generate' | 'publish' | NULL
	error_msg     TEXT,
	input_tokens  INTEGER NOT NULL DEFAULT 0,
	output_tokens INTEGER NOT NULL DEFAULT 0
);

-- XHS post history: replaces xhs/post_history.json
-- month stored as 'YYYY-MM' for monthly reset query
CREATE TABLE IF NOT EXISTS xhs_post_history (
	id         SERIAL PRIMARY KEY,
	race_name  TEXT NOT NULL,
	posted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	month      VARCHAR(7) NOT NULL  -- 'YYYY-MM'
);

-- XHS post archive: replaces xhs/post_archive/ weekly JSON files
-- analytics source of truth, one row per published post
CREATE TABLE IF NOT EXISTS xhs_post_archive (
	id            SERIAL PRIMARY KEY,
	published_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	post_type     VARCHAR(32) NOT NULL,
	race_name     TEXT,                    -- NULL for non-race posts
	title         TEXT NOT NULL,
	hook          TEXT NOT NULL,
	contents      JSONB NOT NULL,          -- array of {subtitle, body}
	cta           TEXT NOT NULL,
	description   TEXT NOT NULL,
	hashtags      TEXT[] NOT NULL,
	comments      TEXT[] NOT NULL,
	input_tokens  INTEGER NOT NULL DEFAULT 0,
	output_tokens INTEGER NOT NULL DEFAULT 0,
	published     BOOLEAN NOT NULL DEFAULT TRUE  -- FALSE = preview run
);

-- Pipeline state: replaces xhs/pipeline_state.json
-- shared with other services; one row per service
CREATE TABLE IF NOT EXISTS pipeline_state (
	service     VARCHAR(32) PRIMARY KEY,
	state       VARCHAR(16) NOT NULL,  -- 'idle' | 'running' | 'failed'
	updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
