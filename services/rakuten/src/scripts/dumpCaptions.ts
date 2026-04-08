// scrapes across genres and store items in json to analyze their captions
import "dotenv/config";
import fs from "fs";
import path from "path";
import { getCategoryIds } from "../db/queries";
import { getProductsByRankingGenre } from "../services/rakutenAPI";

async function dumpCaptions() {
	const categories = await getCategoryIds();
	const allGenreIds = Object.values(categories).flat();
	const uniqueGenreIds = [...new Set(allGenreIds)];

	console.log(`Fetching captions for ${uniqueGenreIds.length} genre IDs...`);

	const output: { genreId: number; captions: string[] }[] = [];

	for (const genreId of uniqueGenreIds) {
		console.log(`Fetching genre ${genreId}...`);
		const products = await getProductsByRankingGenre(genreId, 5);
		if (!products) continue;

		const captions = products
			.map((p) => p.itemCaption)
			.filter(Boolean) as string[];

		if (captions.length > 0) {
			output.push({ genreId, captions });
		}

		await new Promise((res) => setTimeout(res, 500));
	}

	const outDir = path.join(__dirname, "../../scrape_output");
	if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

	const outPath = path.join(outDir, "captions.json");
	fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
	console.log(`Done — ${output.length} genres written to ${outPath}`);
}

dumpCaptions();
