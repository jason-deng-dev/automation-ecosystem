import express from 'express';
import fs from 'fs';
import cors from 'cors';
import 'dotenv/config';

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN.split(',') }))

app.get('/api/races/', (req, res) => res.json(getAllRaces()));

function getAllRaces() {
    const races = fs.readFileSync(`${process.env.DATA_DIR}/scraper/races.json`, 'utf-8')
    return JSON.parse(races)
}


app.listen(process.env.PORT, (err) => {
	if (err) {
		throw err;
	}
	console.log(`app running on ${process.env.PORT}`);
});
