import { getProductsByRankingGenre } from "../services/rakutenAPI";
import { categories } from "../config/genres"; // uncomment for full run
import fs from "fs";
import "dotenv/config";
import { pushProducts } from "../services/woocommerceAPI";
import { upsertProducts, getProductByUrls } from "../db/queries";

async function runRankingPopulate() {
	const config = JSON.parse(fs.readFileSync(`${process.env.DATA_DIR}/rakuten/config.json`, "utf-8"));
	const pagesPerSubcategory = Math.max(1, config.pagesPerSubcategory);

	const categoriesArr = Object.entries(categories);
	// const categoriesArr: [string, number[]][] = [
	// 	["Running Gear", [565768, 565767]], // Shoes, Wear
	// 	["Training", [201869, 565771]], // Wear, Shoes
	// 	["Nutrition & Supplements", [559936, 567603]], // Sports Drinks, Protein
	// 	["Recovery & Care", [214828, 214822]], // Massage Products, Stretching Equipment
	// 	["Sportswear", [502027, 402463]], // Women apparel, Men apparel
	// ];

	console.log("starting populating by rankings...");

	for (const category of categoriesArr) {
		const categoryName = category[0];
		const subcategoryIds = category[1];

		for (const subcategoryId of subcategoryIds) {
			console.log(`Fetching ${subcategoryId} from rakuten`);
			const rakutenRes = await getProductsByRankingGenre(subcategoryId, pagesPerSubcategory);
			if (!rakutenRes) {
				console.error(`No results for genre ${subcategoryId}, skipping`);
				continue;
			}
			console.log(`fetched ${rakutenRes.length} products`);

			const productUrls = await upsertProducts(rakutenRes);
			console.log(`upserted ${productUrls.length} new products`);

			const products = await getProductByUrls(productUrls);
			await pushProducts(products);

			console.log(`${subcategoryId} successfully stored in db and pushed to woocommerce`);

			await new Promise((res) => setTimeout(res, 1000));
		}
		console.log(`${categoryName} run successful`);
	}
	console.log("ranking populate success");
}

runRankingPopulate();
