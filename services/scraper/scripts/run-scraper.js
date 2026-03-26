import { populateRaces } from "../src/scraper.js";

console.log("Starting scrape...");
const races = await populateRaces(1);
if (races) console.log("Scrape complete. Output written to data/races.json");
else console.log('Scrape failed — check run_log.json')
