import pool from "./pool";
import { RakutenDbQueryItem } from "../utils";

export interface Config {
	yenToYuan: number;
	markupPercent: number;
	pagesPerSubcategory: number;
	searchFillThreshold: number;
}

export const getSubcategoryIdByGenreId = async (genreId: number): Promise<number | null> => {
	const res = await pool.query(
		`SELECT id FROM subcategories WHERE $1 = ANY(genre_ids)`,
		[genreId],
	);
	return res.rows[0]?.id ?? null;
};

export const appendGenreIds = async (subcategoryId: number, genreIds: number[]) => {
	await pool.query(
		`
		UPDATE subcategories
		SET genre_ids = array_cat(genre_ids, $2::integer[])
		WHERE id = $1
		
		`,
		[subcategoryId, genreIds],
	);
};

// feeds context to ClaudeAPI to assign to correct subcateogry
// should be {id, name, category name}
export const getSubcategoriesWithCategory = async () => {
	const res = await pool.query(`
		SELECT subcategories.id AS "subcategoryId" , subcategories.name AS "subcategoryName", categories.name AS "categoryName"
		FROM subcategories
		LEFT JOIN categories
		ON categories.id = subcategories.category_id
		`);
	return res.rows as { subcategoryId: number; subcategoryName: string; categoryName: string }[];
};

// categories = {'category':[genre_ids]}
export const getCategoryIds = async (): Promise<Record<string, number[]>> => {
	const res = await pool.query(`
		SELECT categories.name, subcategories.genre_ids
		FROM categories 
		LEFT JOIN subcategories
		ON categories.id = subcategories.category_id
		`);
	const categoryIds = res.rows.reduce((accumulator, currentValue) => {
		const name = currentValue.name;
		const genre_ids = currentValue.genre_ids;
		if (accumulator.hasOwnProperty(name)) {
			accumulator[name] = accumulator[name].concat(genre_ids);
		} else {
			accumulator[name] = genre_ids;
		}
		return accumulator;
	}, {});
	return categoryIds;
};

// allGenres = {genreIds[]}
export const getAllGenres = async (): Promise<Record<string, number[]>> => {
	const res = await pool.query(`
		SELECT name, genre_ids
		FROM subcategories
		`);

	const allGenres = Object.fromEntries(res.rows.map((r) => [r.name, r.genre_ids]));
	return allGenres;
};

export const getConfig = async (): Promise<Config> => {
	const res = await pool.query(
		`SELECT yen_to_yuan, markup_percent, pages_per_subcategory, search_fill_threshold FROM config WHERE id = 1`,
	);
	const row = res.rows[0];
	return {
		yenToYuan: Number(row.yen_to_yuan),
		markupPercent: Number(row.markup_percent),
		pagesPerSubcategory: Number(row.pages_per_subcategory),
		searchFillThreshold: Number(row.search_fill_threshold),
	};
};

export const updateConfig = async (key: keyof Config, value: number) => {
	const colMap: Record<keyof Config, string> = {
		yenToYuan: "yen_to_yuan",
		markupPercent: "markup_percent",
		pagesPerSubcategory: "pages_per_subcategory",
		searchFillThreshold: "search_fill_threshold",
	};
	await pool.query(`UPDATE config SET ${colMap[key]} = $1, updated_at = NOW() WHERE id = 1`, [value]);
};

export const insertRunLog = async (log: {
	operation: string;
	newProductsPushed: number;
	priceUpdates: number;
	removedUnavailable: number;
	removedStale: number;
	errors: string[];
}) => {
	await pool.query(
		`INSERT INTO run_logs (operation, new_products_pushed, price_updates, removed_unavailable, removed_stale, errors)
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		[log.operation, log.newProductsPushed, log.priceUpdates, log.removedUnavailable, log.removedStale, log.errors],
	);
};

export const upsertProductStats = async (stats: {
	totalCached: number;
	totalPushed: number;
	perCategory: Record<string, { cached: number; pushed: number }>;
}) => {
	await pool.query(
		`INSERT INTO product_stats (id, total_cached, total_pushed, per_category, last_updated)
		 VALUES (1, $1, $2, $3, NOW())
		 ON CONFLICT (id) DO UPDATE SET
		 	total_cached = EXCLUDED.total_cached,
		 	total_pushed = EXCLUDED.total_pushed,
		 	per_category = EXCLUDED.per_category,
		 	last_updated = NOW()`,
		[stats.totalCached, stats.totalPushed, JSON.stringify(stats.perCategory)],
	);
};

export const insertImportLog = async (log: {
	itemUrl: string;
	itemName: string;
	wcProductId: number | null;
	status: "success" | "failed" | "skipped";
	errorMsg?: string;
}) => {
	await pool.query(
		`INSERT INTO import_logs (item_url, item_name, wc_product_id, status, error_msg)
		 VALUES ($1, $2, $3, $4, $5)`,
		[log.itemUrl, log.itemName, log.wcProductId, log.status, log.errorMsg ?? null],
	);
};

export const upsertProduct = async ({
	itemName,
	itemPrice,
	itemCaption,
	itemUrl,
	smallImageUrls,
	mediumImageUrls,
	reviewCount,
	reviewAverage,
	shopName,
	shopCode,
	genreId,
	availability,
}: RakutenDbQueryItem) => {
	const res = await pool.query(
		`
		INSERT INTO products (
			itemName, itemPrice, itemCaption, itemURL,
			smallImageUrls, mediumImageUrls, reviewCount, reviewAverage,
			shopName, shopCode, availability, subcategory_id
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
			(SELECT id FROM subcategories WHERE $12 = ANY(genre_ids))
		)
		ON CONFLICT (itemURL) DO UPDATE SET
			itemPrice = EXCLUDED.itemPrice,
			availability = EXCLUDED.availability,
			missed_scrapes = 0,
			last_updated_at = NOW()
		RETURNING itemURL, (xmax = 0) AS inserted
		`,
		[
			itemName,
			itemPrice,
			itemCaption,
			itemUrl,
			JSON.stringify(smallImageUrls),
			JSON.stringify(mediumImageUrls),
			reviewCount,
			reviewAverage,
			shopName,
			shopCode,
			availability,
			genreId,
		],
	);
	const row = res.rows[0];
	return row.inserted ? [row.itemurl] : []; // returns products that were newly added
};

export const upsertProducts = async (products: RakutenDbQueryItem[]) => {
	const urls: string[] = [];
	for (const product of products) {
		const urlArr = await upsertProduct(product);
		urls.push(...urlArr);
	}
	return urls;
};

export const getProductByUrls = async (URLs: string[]) => {
	const res = await pool.query(
		`
		SELECT
			products.id, products.itemprice AS "itemPrice", products.itemname AS "itemName",
			products.itemcaption AS "itemCaption", products.itemurl AS "itemUrl",
			products.smallimageurls AS "smallImageUrls", products.mediumimageurls AS "mediumImageUrls",
			products.reviewcount AS "reviewCount", products.reviewaverage AS "reviewAverage",
			products.shopname AS "shopName", products.shopcode AS "shopCode",
			products.availability, products.wc_product_id, products.wc_pushed_at,
			products.created_at, products.last_updated_at, products.missed_scrapes,
			products.subcategory_id, categories.name AS "categoryName"
		FROM products
		LEFT JOIN subcategories
		ON products.subcategory_id = subcategories.id
		LEFT JOIN categories
		ON subcategories.category_id = categories.id
		WHERE itemURL = ANY($1)
		`,
		[URLs],
	);

	return res.rows;
};

export const getProductsByGenreId = async (genreId: number) => {
	const res = await pool.query(
		`
		SELECT * FROM products
		LEFT JOIN subcategories
		ON products.subcategory_id = subcategories.id
		WHERE $1 = ANY(subcategories.genre_ids);
		`,
		[genreId],
	);
	return res.rows;
};

export const getProductsByCategory = async (category: string) => {
	const res = await pool.query(
		`
		SELECT * FROM products
		LEFT JOIN subcategories
		ON products.subcategory_id = subcategories.id
		LEFT JOIN categories
		ON subcategories.category_id = categories.id
		WHERE categories.name = $1
		`,
		[category],
	);
	return res.rows;
};

export const deleteStaleProducts = async () => {
	const res = await pool.query(`
		DELETE FROM products 
		WHERE missed_scrapes >= 3
		`);
	return res.rowCount;
};

export const incrementMissedScrapes = async () => {
	await pool.query(`
		UPDATE products
		SET missed_scrapes = missed_scrapes + 1
		`);
};

export const getSubcategoryNameByProductId = async (product_id: number) => {
	const res = await pool.query(
		`
		SELECT name from subcategories
		WHERE subcategories.id = $1
		`,
		[product_id],
	);
	return res.rows[0];
};

export const updateWoocommerceProductId = async (product_id: number, woocommerce_product_id: number) => {
	await pool.query(
		`
		UPDATE products
		SET wc_product_id = $1, wc_pushed_at = NOW()
		WHERE id = $2
		`,
		[woocommerce_product_id, product_id],
	);
};

export const getAllPushedProducts = async () => {
	const res = await pool.query(`SELECT id, "itemPrice", wc_product_id FROM products WHERE wc_product_id IS NOT NULL`);
	return res.rows as { id: number; itemPrice: number; wc_product_id: number }[];
};

export const getStaleProductsWithWcId = async () => {
	const res = await pool.query(
		`SELECT id, wc_product_id FROM products WHERE missed_scrapes >= 3 AND wc_product_id IS NOT NULL`,
	);
	return res.rows as { id: number; wc_product_id: number }[];
};

export const deleteProductByUrl = async (itemUrl: string) => {
	await pool.query(`DELETE FROM products WHERE itemURL = $1`, [itemUrl]);
};

export const getProductStatsByCategory = async () => {
	const res = await pool.query(`
		SELECT c.name AS "categoryName", COUNT(*) AS total, COUNT(p.wc_product_id) AS pushed
		FROM products p
		LEFT JOIN subcategories s ON p.subcategory_id = s.id
		LEFT JOIN categories c ON s.category_id = c.id
		GROUP BY c.name
	`);
	return res.rows as { categoryName: string; total: string; pushed: string }[];
};

export const getProductTotals = async () => {
	const res = await pool.query(`SELECT COUNT(*) AS total, COUNT(wc_product_id) AS pushed FROM products`);
	return res.rows[0] as { total: string; pushed: string };
};

export const getWPSubcategoryIds = async () => {
	const res = await pool.query(`
		SELECT name, wc_category_id
		FROM subcategories
		`);
	return res.rows as { name: string; wc_category_id: number }[];
};
