import express from 'express';
import cors from 'cors';
import compression from 'compression';
import 'dotenv/config';
import pool from './db/pool.js';

const app = express();
app.use(compression());
app.use(cors({ origin: process.env.CORS_ORIGIN.split(',') }))

// In-memory cache — races change at most once per day (scraper schedule)
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
let cache = { data: null, ts: 0 };

app.get('/api/races/', async (req, res) => {
    const now = Date.now();
    if (cache.data && now - cache.ts < CACHE_TTL_MS) {
        res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
        res.set('X-Cache', 'HIT');
        return res.json(cache.data);
    }

    const result = await pool.query(`
        SELECT
            name, url, date, location,
            entry_start AS "entryStart",
            entry_end AS "entryEnd",
            website, description,
            registration_open AS "registrationOpen",
            registration_url AS "registrationUrl",
            images, info, notice,
            name_zh, date_zh, location_zh,
            entry_start_zh AS "entryStart_zh",
            entry_end_zh AS "entryEnd_zh",
            description_zh, info_zh, notice_zh
        FROM races
        ORDER BY scraped_at DESC
    `);
    cache = { data: { races: result.rows }, ts: now };
    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    res.set('X-Cache', 'MISS');
    res.json(cache.data);
});


app.listen(process.env.PORT, (err) => {
	if (err) {
		throw err;
	}
	console.log(`app running on ${process.env.PORT}`);
});
