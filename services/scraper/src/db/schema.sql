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

-- Pipeline state: shared with other services; one row per service
CREATE TABLE IF NOT EXISTS pipeline_state (
	service     VARCHAR(32) PRIMARY KEY,
	state       VARCHAR(16) NOT NULL,  -- 'idle' | 'running' | 'failed'
	updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Scraper run logs: replaces scraper/run_log.json
CREATE TABLE IF NOT EXISTS scraper_run_logs (
	id             SERIAL PRIMARY KEY,
	logged_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	outcome        VARCHAR(16) NOT NULL,  -- 'success' | 'failed'
	races_scraped  INTEGER NOT NULL DEFAULT 0,
	failure_count  INTEGER NOT NULL DEFAULT 0,
	failed_urls    TEXT[],
	error_msg      TEXT
);
