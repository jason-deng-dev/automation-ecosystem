import { populateRaces } from "../src/scraper.js";

console.log("Starting scrape...");
await populateRaces(25);
console.log("Scrape complete. Output written to data/races.json");
