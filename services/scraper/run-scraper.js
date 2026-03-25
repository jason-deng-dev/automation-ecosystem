import { populateRaces } from "./scraper.js";

console.log("Starting scrape...");
await populateRaces();
console.log("Scrape complete. Output written to data/races.json");
