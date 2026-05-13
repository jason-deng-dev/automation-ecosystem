import { startScheduler, setupAllDailyCrons } from "../src/scheduler.js";
import { writeFileSync } from 'fs';

writeFileSync('/tmp/scheduler.pid', String(process.pid));
process.on('SIGUSR2', () => {
	console.log('Received SIGUSR2 — reloading schedule...');
	setupAllDailyCrons();
});

console.log("Starting scheduler...");
startScheduler();
console.log("Scheduler running — crons registered");
