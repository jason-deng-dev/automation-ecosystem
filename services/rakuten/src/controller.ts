import { getProductsByKeyword } from "./services/rakutenAPI";
import {
	upsertProducts,
	getProductByUrls,
	getConfig,
	getAllGenres,
	appendGenreIds,
	getSubcategoryIdByGenreId,
} from "./db/queries";
import { pushProducts } from "./services/woocommerceAPI";
import { validateKeyword } from "./services/claudeAPI";

// |`POST`|`/api/push/bulk`|Fetch top N per genre from Ranking API → normalize → price → push to WooCommerce|
// |`GET`|`/api/products`|Products stored in PostgreSQL (by genre or category)|
// |`GET`|`/api/products/:itemCode`|Single product detail|
// |`POST`|`/api/request-product`|Product request flow — fetch by keyword, push to WooCommerce, return wc_product_ids|

export function bulkFetch() {}

export function bulkPush() {}

export async function itemRequestByKeyword(keywordZH: string) {
	console.log(`[request] keyword received: "${keywordZH}"`);
	const allGenres = await getAllGenres();
	const { searchFillThreshold } = await getConfig();
	console.log(`[request] searchFillThreshold: ${searchFillThreshold}`);

	// 1. Rakuten keyword search (count from searchFillThreshold in DB config)
	const res = await getProductsByKeyword(keywordZH, searchFillThreshold);
	if (!res) {
		console.log(`[request] Rakuten returned no results — aborting`);
		return { success: false };
	}
	console.log(`[request] Rakuten returned ${res.length} products`);

	// 2. Validate: first checking if genreIds exist in db, then calling claudeAPI to validate products
	const allGenreIds = new Set(Object.values(allGenres).flat().map(String));
	const fetchedGenreIds = [...new Set(res.map((p) => p.genreId))];
	console.log(`[request] fetched genre IDs: ${fetchedGenreIds.join(", ")}`);
	const genreIdsExists = fetchedGenreIds.some((genreId) => allGenreIds.has(genreId));
	console.log(`[request] genre IDs in DB: ${genreIdsExists}`);

	let validSubcategoryId: number | null;
	if (!genreIdsExists) {
		console.log(`[request] no known genre IDs — calling Claude to validate keyword`);
		validSubcategoryId = await validateKeyword(keywordZH);
		if (validSubcategoryId == null) {
			console.log(`[request] Claude rejected keyword — aborting`);
			return { success: false };
		}
		console.log(`[request] Claude approved — subcategory ID: ${validSubcategoryId}`);
		await appendGenreIds(
			validSubcategoryId,
			fetchedGenreIds.map((val) => Number(val)),
		);
	} else {
		console.log(`[request] genre IDs already known — skipping Claude`);
		const newFetchedIds = fetchedGenreIds.filter((value) => !allGenreIds.has(value));
		if (newFetchedIds.length > 0) {
			console.log(`[request] ${newFetchedIds.length} new genre IDs — appending to DB`);
			const existingFetchedIds = fetchedGenreIds.filter((value) => allGenreIds.has(value));
			const existingSubcategoryId = Number(await getSubcategoryIdByGenreId(Number(existingFetchedIds[0])));
			await appendGenreIds(
				existingSubcategoryId,
				newFetchedIds.map((val) => Number(val)),
			);
		}
	}

	// 3. Upsert to DB → fetch all products (newly inserted + already existing)
	console.log(`[request] upserting ${res.length} products to DB`);
	await upsertProducts(res);
	const allProducts = await getProductByUrls(res.map((p) => p.itemUrl));
	console.log(`[request] fetched ${allProducts.length} products from DB`);

	// 4. Split: already in WooCommerce vs needs push
	const alreadyPushedIds = allProducts.filter((p) => p.wc_product_id).map((p) => p.wc_product_id);
	const needsPush = allProducts.filter((p) => !p.wc_product_id);
	console.log(`[request] already in WooCommerce: ${alreadyPushedIds.length}, needs push: ${needsPush.length}`);
	const newWcIds = await pushProducts(needsPush);
	console.log(`[request] pushed ${newWcIds.length} new products to WooCommerce`);

	// 5. Return all wc_product_ids (existing + newly pushed)
	const allWcIds = [...alreadyPushedIds, ...newWcIds];
	console.log(`[request] returning ${allWcIds.length} total product IDs`);
	return { success: true, productIds: allWcIds };
}
