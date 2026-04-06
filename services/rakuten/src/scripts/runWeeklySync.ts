import "dotenv/config";
import { getProductsByRankingGenre } from "../services/rakutenAPI";
import { categories } from "../config/genres";
import { calculatePrice } from "../services/pricing";
import { pushProducts, deleteWcProduct, updateWcPrice } from "../services/woocommerceAPI";
import {
	upsertProducts,
	getProductByUrls,
	incrementMissedScrapes,
	getStaleProductsWithWcId,
	deleteStaleProducts,
	deleteProductByUrl,
	getProductStatsByCategory,
	getProductTotals,
	getConfig,
	insertRunLog,
	upsertProductStats,
} from "../db/queries";

export default async function runWeeklySync() {
	const log = {
		operation: "weekly_sync",
		newProductsPushed: 0,
		priceUpdates: 0,
		removedUnavailable: 0,
		removedStale: 0,
		errors: [] as string[],
	};

	const config = await getConfig();
	const pagesPerSubcategory = Math.max(1, config.pagesPerSubcategory);

	console.log("Starting weekly sync...");

	// Step 1: Bump missed_scrapes for all products — upsert will reset to 0 for any product seen this run
	await incrementMissedScrapes();

	// Step 2: Fetch rankings, upsert, handle availability=0 and price changes
	for (const [categoryName, subcategoryIds] of Object.entries(categories)) {
		for (const subcategoryId of subcategoryIds) {
			try {
				const rakutenProducts = await getProductsByRankingGenre(subcategoryId, pagesPerSubcategory);
				if (!rakutenProducts || rakutenProducts.length === 0) continue;

				const unavailable = rakutenProducts.filter((p) => p.availability === 0);
				const available = rakutenProducts.filter((p) => p.availability !== 0);

				// Remove unavailable products from WC and DB
				for (const product of unavailable) {
					const existing = (await getProductByUrls([product.itemUrl]))[0];
					if (existing?.wc_product_id) {
						await deleteWcProduct(existing.wc_product_id);
						log.removedUnavailable++;
					}
					if (existing) {
						await deleteProductByUrl(product.itemUrl);
					}
				}

				if (available.length === 0) continue;

				// Pre-fetch existing DB records to detect price changes after upsert
				const urls = available.map((p) => p.itemUrl);
				const existingRecords = await getProductByUrls(urls);
				const existingMap = new Map(existingRecords.map((r) => [r.itemUrl, r]));

				// Upsert — resets missed_scrapes=0 and updates itemPrice for seen products
				const newUrls = await upsertProducts(available);

				// Push newly inserted products to WC
				if (newUrls.length > 0) {
					const newProducts = await getProductByUrls(newUrls);
					await pushProducts(newProducts);
					log.newProductsPushed += newUrls.length;
				}

				// Re-push prices for existing products where itemPrice changed
				for (const product of available) {
					const existing = existingMap.get(product.itemUrl);
					if (!existing?.wc_product_id) continue;
					if (existing.itemPrice !== product.itemPrice) {
						try {
							await updateWcPrice(existing.wc_product_id, calculatePrice(product.itemPrice));
							log.priceUpdates++;
						} catch (err) {
							log.errors.push(`Price update failed for wc_product_id ${existing.wc_product_id}: ${err}`);
						}
					}
				}

				await new Promise((res) => setTimeout(res, 500));
			} catch (err) {
				const msg = `Error in ${categoryName}/${subcategoryId}: ${err}`;
				console.error(msg);
				log.errors.push(msg);
			}
		}
		console.log(`${categoryName} sync complete`);
	}

	// Step 3: Delete stale products (missed_scrapes >= 3 — not seen in 3+ weekly runs)
	const staleWithWc = await getStaleProductsWithWcId();
	for (const { wc_product_id } of staleWithWc) {
		await deleteWcProduct(wc_product_id);
	}
	const deletedCount = await deleteStaleProducts();
	log.removedStale = deletedCount ?? 0;

	console.log(
		`Weekly sync complete — new: ${log.newProductsPushed}, price updates: ${log.priceUpdates}, ` +
		`removed unavailable: ${log.removedUnavailable}, removed stale: ${log.removedStale}, errors: ${log.errors.length}`
	);

	// Step 4: Write run log + product stats to DB
	await insertRunLog(log);
	const [totals, byCategory] = await Promise.all([getProductTotals(), getProductStatsByCategory()]);
	await upsertProductStats({
		totalCached: Number(totals.total),
		totalPushed: Number(totals.pushed),
		perCategory: Object.fromEntries(
			byCategory.map((r) => [r.categoryName, { cached: Number(r.total), pushed: Number(r.pushed) }])
		),
	});
}

