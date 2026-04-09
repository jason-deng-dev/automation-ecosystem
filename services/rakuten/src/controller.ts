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
	const allGenres = await getAllGenres();
	const { searchFillThreshold } = await getConfig();

	// 1. Rakuten keyword search (count from searchFillThreshold in DB config)
	const res = await getProductsByKeyword(keywordZH, searchFillThreshold);
	if (!res) return { success: false };

	// 2. Validate: first checking if genreIds exist in db, then calling claudeAPI to validate products
	const allGenreIds = new Set(Object.values(allGenres).flat().map(String));
	// all unqiue fetchedGenreIds
	const fetchedGenreIds = [...new Set(res.map((p) => p.genreId))];
	const genreIdsExists = fetchedGenreIds.some((genreId) => allGenreIds.has(genreId));

	let validSubcategoryId: number | null;
	if (!genreIdsExists) {
		validSubcategoryId = await validateKeyword(keywordZH);
		if (validSubcategoryId == null) return { success: false };
		// add all the fetchedGenreIds to validSubcategoryId
		await appendGenreIds(
			validSubcategoryId,
			fetchedGenreIds.map((val) => Number(val)),
		);
	} else {
		// find out which fetchedGenreIds is not in allGenreIds
		const newFetchedIds = fetchedGenreIds.filter((value) => !allGenreIds.has(value));
		if (newFetchedIds.length > 0) {
			// find for the fetchedGenreIds that exists in db, which category they belong to
			const existingFetchedIds = fetchedGenreIds.filter((value) => allGenreIds.has(value));
			const existingSubcategoryId = Number(await getSubcategoryIdByGenreId(Number(existingFetchedIds[0])));
			// add the new fetchedGenreIds to db to the category we got
			await appendGenreIds(
				existingSubcategoryId,
				newFetchedIds.map((val) => Number(val)),
			);
		}
	}

	// 3. Upsert to DB → fetch all products (newly inserted + already existing)
	await upsertProducts(res);
	const allProducts = await getProductByUrls(res.map((p) => p.itemUrl));

	// 4. Split: already in WooCommerce vs needs push
	const alreadyPushedIds = allProducts.filter((p) => p.wc_product_id).map((p) => p.wc_product_id);
	const needsPush = allProducts.filter((p) => !p.wc_product_id);
	const newWcIds = await pushProducts(needsPush);

	// 5. Return all wc_product_ids (existing + newly pushed)
	const allWcIds = [...alreadyPushedIds, ...newWcIds];
	return { success: true, productIds: allWcIds };
}
