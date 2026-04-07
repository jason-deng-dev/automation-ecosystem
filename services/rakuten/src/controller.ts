import { getProductsByKeyword } from "./services/rakutenAPI";
import { upsertProducts, getProductByUrls, getConfig, getAllGenres} from "./db/queries";
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

	let validSubcategoryId: number|null;
	if (!genreIdsExists){
		validSubcategoryId = await validateKeyword(keywordZH);
		if (validSubcategoryId == null) return { success: false };
		// add all the fetchedGenreIds to validSubcategoryId
	}

	
	


	

	// 3. Upsert to DB → get back newly inserted products
	const newProductsUrl = await upsertProducts(res);
	const newProducts = await getProductByUrls(newProductsUrl);

	// 4. Push new products to WooCommerce
	const wc_ids = await pushProducts(newProducts);

	// 5. Return { success: true, productIds: [wc_ids] }
	return { success: true, productIds: wc_ids };
}
