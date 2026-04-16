import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import pool from './db/pool.js';

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN.split(',') }))

app.get('/api/races/', async (req, res) => {
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
    res.json({ races: result.rows });
});


app.listen(process.env.PORT, (err) => {
	if (err) {
		throw err;
	}
	console.log(`app running on ${process.env.PORT}`);
});
