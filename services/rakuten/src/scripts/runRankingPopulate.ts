import { getProductsByRankingGenre } from "../services/rakutenAPI";
import "dotenv/config";
import { pushProducts } from "../services/woocommerceAPI";
import { upsertProducts, getProductByUrls, getCategoryIds, getConfig } from "../db/queries";
import { initPricing } from "../services/pricing";

const categories = getCategoryIds();


async function runRankingPopulate() {
	await initPricing();
	const categoriesArr = Object.entries(categories);
	const { productsPerCategory } = await getConfig();

	console.log("starting populating by rankings...");

	for (const category of categoriesArr) {
		const categoryName = category[0];
		const subcategoryIds = category[1];

		for (const subcategoryId of subcategoryIds) {
			console.log(`Fetching ${subcategoryId} from rakuten`);
			const productsPerSubcategory = Math.ceil(productsPerCategory / subcategoryIds.length);
			const rakutenRes = await getProductsByRankingGenre(subcategoryId, productsPerSubcategory);
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
