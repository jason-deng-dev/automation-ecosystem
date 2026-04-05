import { getProductsByRankingGenre } from "../../services/rakutenAPI";
import fs from "fs";
import "dotenv/config";
import { pushProducts } from "../../services/woocommerceAPI";
import { upsertProducts, getProductByUrls } from "../../db/queries";

// ─── SHOWCASE VERSION ────────────────────────────────────────────────────────
// Uses 1 genre ID per category so the demo runs quickly and is easy to follow.
// In production, each category maps to many more genre IDs (up to 16 per
// category), pulling top-ranked products across the full Rakuten genre tree
// and covering dozens of subcategories (shoes, apparel, nutrition, gear, etc).
// ─────────────────────────────────────────────────────────────────────────────
const showcaseCategories: Record<string, number[]> = {
    'Running Gear':           [565768],   // prod: 16 genre IDs (shoes, GPS, socks, tights...)
    // 'Training':               [201869],   // prod: 10 genre IDs (gym wear, resistance bands, jump rope...)
    // 'Nutrition & Supplements':[559936],   // prod: 13 genre IDs (protein, BCAA, energy gels, vitamins...)
    // 'Recovery & Care':        [214828],   // prod: 9 genre IDs (massage guns, foam rollers, taping...)
    // 'Sportswear':             [502027],   // prod: 14 genre IDs (compression, sports bra, windbreakers...)
};

async function runRankingPopulate() {
	// ── Step 1: Load config ───────────────────────────────────────────────────
	// config.json lives on the shared volume and is written by the dashboard.
	// It holds the JPY→CNY rate and pagesPerSubcategory (how many pages of
	// 30 products to fetch per genre). Hot-reloadable — no server restart needed.
	const config = JSON.parse(fs.readFileSync(`${process.env.DATA_DIR}/rakuten/config.json`, "utf-8"));
	const pagesPerSubcategory = Math.max(1, config.pagesPerSubcategory);
	const categoriesArr = Object.entries(showcaseCategories);

	console.log("starting populating by rankings...");
	console.log("(showcase mode — 1 genre ID per category; production runs all genre IDs)");

	for (const category of categoriesArr) {
		const categoryName = category[0];
		const subcategoryIds = category[1];

		for (const subcategoryId of subcategoryIds) {
			// ── Step 2: Fetch from Rakuten ────────────────────────────────────
			// Calls the Rakuten Ichiba Ranking API — returns top-selling products
			// for this genre ID. Each page = 30 products.
			console.log(`Fetching ${subcategoryId} from rakuten`);
			const rakutenRes = await getProductsByRankingGenre(subcategoryId, pagesPerSubcategory);
			if (!rakutenRes) {
				console.error(`No results for genre ${subcategoryId}, skipping`);
				continue;
			}
			console.log(`fetched ${rakutenRes.length} products`);

			// ── Step 3: Upsert into PostgreSQL ────────────────────────────────
			// Deduplicates by Rakuten URL. New products are inserted; existing
			// ones are updated if price or availability changed. Returns only
			// the URLs of newly inserted products to avoid re-pushing to WooCommerce.
			const productUrls = await upsertProducts(rakutenRes);
			console.log(`upserted ${productUrls.length} new products`);

			// ── Step 4: Push to WooCommerce ───────────────────────────────────
			// Fetches the full product rows for newly inserted URLs, applies
			// the JPY→CNY pricing formula, and pushes to WooCommerce via REST API.
			// Idempotent — products already in WooCommerce (wc_product_id set) are skipped.
			const products = await getProductByUrls(productUrls);
			await pushProducts(products);

			console.log(`${subcategoryId} successfully stored in db and pushed to woocommerce`);

			// Small delay between genre fetches to avoid rate limiting
			await new Promise((res) => setTimeout(res, 1000));
		}
		console.log(`${categoryName} run successful`);
	}
	console.log("ranking populate success");
}

runRankingPopulate();
