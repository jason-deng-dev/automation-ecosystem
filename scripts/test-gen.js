import { generatePosts } from "../src/generator.js";
import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const types = ["race", "training", "nutritionSupplement", "wearable"];

async function main() {
	console.log(`Starting API calls for types: ${types.join(", ")}`);
	const results = await Promise.all(
		types.map((type) => {
			console.log(`  → calling generatePosts("${type}")`);
			return generatePosts(type);
		}),
	);
	console.log("All responses received.");

	const res = Object.fromEntries(types.map((type, i) => [type, results[i]]));

	const outPath = path.resolve(__dirname, "../tests/fixtures/mock-api-response.json");
	fs.writeFileSync(outPath, JSON.stringify(res, null, 2));
	console.log(`Written to ${outPath}`);
}

main();