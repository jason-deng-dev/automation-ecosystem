import { getProductsByKeyword } from "./services/rakutenAPI";
import {
	upsertProducts,
	getProductByUrls,
	getConfig,
	getAllGenres,
	appendGenreIds,
	getSubcategoryIdByGenreId,
	searchProductsByKeyword,
	insertRunLog,
} from "./db/queries";
import { pushProducts } from "./services/woocommerceAPI";
import { validateKeyword } from "./services/claudeAPI";
import { translateKeyword } from "./utils";

// |`POST`|`/api/push/bulk`|Fetch top N per genre from Ranking API → normalize → price → push to WooCommerce|
// |`GET`|`/api/products`|Products stored in PostgreSQL (by genre or category)|
// |`GET`|`/api/products/:itemCode`|Single product detail|
// |`POST`|`/api/request-product`|Product request flow — fetch by keyword, push to WooCommerce, return wc_product_ids|

export function bulkFetch() {}

export function bulkPush() {}

export async function itemRequestByKeyword(keywordZH: string) {
	console.log(`[request] keyword received: "${keywordZH}"`);

	const log = {
		operation: `item_request:${keywordZH}`,
		newProductsPushed: 0,
		priceUpdates: 0,
		removedUnavailable: 0,
		removedStale: 0,
		errors: [] as string[],
	};

	try {
		// 0. Pre-search DB for existing products matching keyword
		const dbMatches = await searchProductsByKeyword(keywordZH);
		console.log(`[request] DB pre-search found ${dbMatches.length} existing product(s) matching "${keywordZH}"`);
		const dbMatchWcIds = dbMatches.map((p) => p.wc_product_id);

		const allGenres = await getAllGenres();
		const { searchFillThreshold } = await getConfig();
		console.log(`[request] searchFillThreshold: ${searchFillThreshold}`);

		// 1. Rakuten keyword search (count from searchFillThreshold in DB config)
		let res = await getProductsByKeyword(keywordZH, searchFillThreshold);
		if (!res || res.length === 0) {
			console.log(`[request] Rakuten returned 0 results — retrying with English translation`);
			const englishKeyword = await translateKeyword(keywordZH);
			res = await getProductsByKeyword(englishKeyword, searchFillThreshold);
		}
		if (!res || res.length === 0) {
			console.log(`[request] Rakuten returned no results — aborting`);
			log.errors.push(`Rakuten returned no results for keyword: ${keywordZH}`);
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
				log.errors.push(`Claude rejected keyword: ${keywordZH}`);
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
		log.newProductsPushed = newWcIds.length;

		// 5. Return all wc_product_ids (db pre-search + existing from fetch + newly pushed)
		const allWcIds = [...new Set([...dbMatchWcIds, ...alreadyPushedIds, ...newWcIds])];
		console.log(`[request] returning ${allWcIds.length} total product IDs (${dbMatchWcIds.length} from DB pre-search, ${alreadyPushedIds.length} already in WC, ${newWcIds.length} newly pushed)`);
		return { success: true, productIds: allWcIds };
	} catch (err) {
		const msg = `Unhandled error for keyword "${keywordZH}": ${err}`;
		console.error(`[request] ${msg}`);
		log.errors.push(msg);
		return { success: false };
	} finally {
		try {
			await insertRunLog(log);
		} catch (logErr) {
			console.error(`[request] failed to write run log: ${logErr}`);
		}
	}
}
