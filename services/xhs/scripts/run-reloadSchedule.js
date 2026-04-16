import 'dotenv/config';
import { setupAllDailyCrons } from '../src/scheduler.js';

await setupAllDailyCrons();
console.log('Schedule reloaded from xhs_schedule.');
process.exit(0);
