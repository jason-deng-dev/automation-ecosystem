import { populateRaces } from "../src/scraper.js";

console.log("Starting scrape...");
const races = await populateRaces();
if (races) console.log("Scrape complete. Races upserted to ecosystemdb.");
else console.log('Scrape failed — check scraper_run_logs table')
