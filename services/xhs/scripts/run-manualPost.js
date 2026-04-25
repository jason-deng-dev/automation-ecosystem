import { Run } from "../src/scheduler.js"; 
const type = process.argv[2] ? process.argv[2]:'race';

// docker exec xhs node scripts/run-manualPost.js race

console.log("Starting manual post...");
await Run(type, { skipOffset: true });
console.log("Manual post complete");
