import { getProductsByKeyword } from "./services/rakutenAPI";
import { allGenres } from "./config/genres";
import { upsertProducts, getProductByUrls, getConfig } from "./db/queries";
import { pushProducts } from "./services/woocommerceAPI";
// |`POST`|`/api/push/bulk`|Fetch top N per genre from Ranking API → normalize → price → push to WooCommerce|
// |`GET`|`/api/products`|Products stored in PostgreSQL (by genre or category)|
// |`GET`|`/api/products/:itemCode`|Single product detail|
// |`POST`|`/api/request-product`|Product request flow — fetch by keyword, push to WooCommerce, return wc_product_ids|

export function bulkFetch() {}

export function bulkPush() {}

export async function itemRequestByKeyword(keywordZH: string) {
	const { searchFillThreshold } = await getConfig();

	// 1. Rakuten keyword search (count from searchFillThreshold in DB config)
	const res = await getProductsByKeyword(keywordZH, searchFillThreshold);
	if (!res) return { success: false };

	// 2. Validate: at least one product's genreId must be in allGenres — else return { success: false }
	const allGenreIds = new Set(Object.values(allGenres).map(String));
	const returnedGenreIds = [...new Set(res.map((p) => p.genreId))];
	console.log("returned genreIds:", returnedGenreIds);
	console.log("in allGenreIds:", returnedGenreIds.filter((id) => allGenreIds.has(id)));
	const validKeyword = res.some((product) => allGenreIds.has(product.genreId));
	if (!validKeyword) return { success: false };

	// 3. Upsert to DB → get back newly inserted products
	const newProductsUrl = await upsertProducts(res);
	const newProducts = await getProductByUrls(newProductsUrl);

	// 4. Push new products to WooCommerce
	const wc_ids = await pushProducts(newProducts);

	// 5. Return { success: true, productIds: [wc_ids] }
	return { success: true, productIds: wc_ids };
}
