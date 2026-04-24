-- Migration 001: support legacy (pre-system) posts + performance backfill columns
-- Legacy rows: hook/contents/cta/description/hashtags/comments will be NULL
-- Performance columns: backfilled from XHS Creator Studio Excel export via analytics service

ALTER TABLE xhs_post_archive
    ALTER COLUMN hook        DROP NOT NULL,
    ALTER COLUMN contents    DROP NOT NULL,
    ALTER COLUMN cta         DROP NOT NULL,
    ALTER COLUMN description DROP NOT NULL,
    ALTER COLUMN hashtags    DROP NOT NULL,
    ALTER COLUMN comments    DROP NOT NULL;

ALTER TABLE xhs_post_archive
    ADD COLUMN IF NOT EXISTS impressions      INTEGER,
    ADD COLUMN IF NOT EXISTS views            INTEGER,
    ADD COLUMN IF NOT EXISTS ctr              NUMERIC(6,4),
    ADD COLUMN IF NOT EXISTS likes            INTEGER,
    ADD COLUMN IF NOT EXISTS comments_count   INTEGER,
    ADD COLUMN IF NOT EXISTS saves            INTEGER,
    ADD COLUMN IF NOT EXISTS shares           INTEGER,
    ADD COLUMN IF NOT EXISTS followers_gained INTEGER,
    ADD COLUMN IF NOT EXISTS avg_watch_time   NUMERIC(8,2);
