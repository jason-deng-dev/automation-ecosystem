"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWPSubcategoryIds = exports.searchProductsByKeyword = exports.getProductTotals = exports.getProductStatsByCategory = exports.deleteProductByUrl = exports.getStaleProductsWithWcId = exports.getAllPushedProducts = exports.updateWoocommerceProductId = exports.getSubcategoryNameByProductId = exports.incrementMissedScrapes = exports.deleteStaleProducts = exports.getProductsByCategory = exports.getProductsByGenreId = exports.getProductByUrls = exports.upsertProducts = exports.upsertProduct = exports.insertImportLog = exports.upsertProductStats = exports.insertRunLog = exports.updateConfig = exports.getConfig = exports.getAllGenres = exports.getCategoryIds = exports.getSubcategoriesWithCategory = exports.appendGenreIds = exports.getSubcategoryIdByGenreId = void 0;
const pool_1 = __importDefault(require("./pool"));
const getSubcategoryIdByGenreId = async (genreId) => {
    var _a, _b;
    const res = await pool_1.default.query(`SELECT id FROM subcategories WHERE $1 = ANY(genre_ids)`, [genreId]);
    return (_b = (_a = res.rows[0]) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : null;
};
exports.getSubcategoryIdByGenreId = getSubcategoryIdByGenreId;
const appendGenreIds = async (subcategoryId, genreIds) => {
    await pool_1.default.query(`
		UPDATE subcategories
		SET genre_ids = array_cat(genre_ids, $2::integer[])
		WHERE id = $1
		
		`, [subcategoryId, genreIds]);
};
exports.appendGenreIds = appendGenreIds;
// feeds context to ClaudeAPI to assign to correct subcateogry
// should be {id, name, category name}
const getSubcategoriesWithCategory = async () => {
    const res = await pool_1.default.query(`
		SELECT subcategories.id AS "subcategoryId" , subcategories.name AS "subcategoryName", categories.name AS "categoryName"
		FROM subcategories
		LEFT JOIN categories
		ON categories.id = subcategories.category_id
		`);
    return res.rows;
};
exports.getSubcategoriesWithCategory = getSubcategoriesWithCategory;
// categories = {'category':[genre_ids]}
const getCategoryIds = async () => {
    const res = await pool_1.default.query(`
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
        }
        else {
            accumulator[name] = genre_ids;
        }
        return accumulator;
    }, {});
    return categoryIds;
};
exports.getCategoryIds = getCategoryIds;
// allGenres = {genreIds[]}
const getAllGenres = async () => {
    const res = await pool_1.default.query(`
		SELECT name, genre_ids
		FROM subcategories
		`);
    const allGenres = Object.fromEntries(res.rows.map((r) => [r.name, r.genre_ids]));
    return allGenres;
};
exports.getAllGenres = getAllGenres;
const getConfig = async () => {
    const res = await pool_1.default.query(`SELECT yen_to_yuan, markup_percent, search_fill_threshold, products_per_category FROM config WHERE id = 1`);
    const row = res.rows[0];
    return {
        yenToYuan: Number(row.yen_to_yuan),
        markupPercent: Number(row.markup_percent),
        searchFillThreshold: Number(row.search_fill_threshold),
        productsPerCategory: Number(row.products_per_category),
    };
};
exports.getConfig = getConfig;
const updateConfig = async (key, value) => {
    const colMap = {
        yenToYuan: "yen_to_yuan",
        markupPercent: "markup_percent",
        searchFillThreshold: "search_fill_threshold",
        productsPerCategory: "products_per_category",
    };
    await pool_1.default.query(`UPDATE config SET ${colMap[key]} = $1, updated_at = NOW() WHERE id = 1`, [value]);
};
exports.updateConfig = updateConfig;
const insertRunLog = async (log) => {
    await pool_1.default.query(`INSERT INTO run_logs (operation, new_products_pushed, price_updates, removed_unavailable, removed_stale, errors)
		 VALUES ($1, $2, $3, $4, $5, $6)`, [log.operation, log.newProductsPushed, log.priceUpdates, log.removedUnavailable, log.removedStale, log.errors]);
};
exports.insertRunLog = insertRunLog;
const upsertProductStats = async (stats) => {
    await pool_1.default.query(`INSERT INTO product_stats (id, total_cached, total_pushed, per_category, last_updated)
		 VALUES (1, $1, $2, $3, NOW())
		 ON CONFLICT (id) DO UPDATE SET
		 	total_cached = EXCLUDED.total_cached,
		 	total_pushed = EXCLUDED.total_pushed,
		 	per_category = EXCLUDED.per_category,
		 	last_updated = NOW()`, [stats.totalCached, stats.totalPushed, JSON.stringify(stats.perCategory)]);
};
exports.upsertProductStats = upsertProductStats;
const insertImportLog = async (log) => {
    var _a;
    await pool_1.default.query(`INSERT INTO import_logs (item_url, item_name, wc_product_id, status, error_msg)
		 VALUES ($1, $2, $3, $4, $5)`, [log.itemUrl, log.itemName, log.wcProductId, log.status, (_a = log.errorMsg) !== null && _a !== void 0 ? _a : null]);
};
exports.insertImportLog = insertImportLog;
const upsertProduct = async ({ itemName, itemPrice, itemCaption, itemUrl, smallImageUrls, mediumImageUrls, reviewCount, reviewAverage, shopName, shopCode, genreId, availability, }) => {
    const res = await pool_1.default.query(`
		INSERT INTO products (
			itemName, itemPrice, itemCaption, itemURL,
			smallImageUrls, mediumImageUrls, reviewCount, reviewAverage,
			shopName, shopCode, availability, subcategory_id
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
			(SELECT id FROM subcategories WHERE $12 = ANY(genre_ids) LIMIT 1)
		)
		ON CONFLICT (itemURL) DO UPDATE SET
			itemPrice = EXCLUDED.itemPrice,
			availability = EXCLUDED.availability,
			missed_scrapes = 0,
			last_updated_at = NOW()
		RETURNING itemURL, (xmax = 0) AS inserted
		`, [
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
    ]);
    const row = res.rows[0];
    return row.inserted ? [row.itemurl] : []; // returns products that were newly added
};
exports.upsertProduct = upsertProduct;
const upsertProducts = async (products) => {
    const urls = [];
    for (const product of products) {
        const urlArr = await (0, exports.upsertProduct)(product);
        urls.push(...urlArr);
    }
    return urls;
};
exports.upsertProducts = upsertProducts;
const getProductByUrls = async (URLs) => {
    const res = await pool_1.default.query(`
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
		`, [URLs]);
    return res.rows;
};
exports.getProductByUrls = getProductByUrls;
const getProductsByGenreId = async (genreId) => {
    const res = await pool_1.default.query(`
		SELECT * FROM products
		LEFT JOIN subcategories
		ON products.subcategory_id = subcategories.id
		WHERE $1 = ANY(subcategories.genre_ids);
		`, [genreId]);
    return res.rows;
};
exports.getProductsByGenreId = getProductsByGenreId;
const getProductsByCategory = async (category) => {
    const res = await pool_1.default.query(`
		SELECT * FROM products
		LEFT JOIN subcategories
		ON products.subcategory_id = subcategories.id
		LEFT JOIN categories
		ON subcategories.category_id = categories.id
		WHERE categories.name = $1
		`, [category]);
    return res.rows;
};
exports.getProductsByCategory = getProductsByCategory;
const deleteStaleProducts = async () => {
    const res = await pool_1.default.query(`
		DELETE FROM products 
		WHERE missed_scrapes >= 3
		`);
    return res.rowCount;
};
exports.deleteStaleProducts = deleteStaleProducts;
const incrementMissedScrapes = async () => {
    await pool_1.default.query(`
		UPDATE products
		SET missed_scrapes = missed_scrapes + 1
		`);
};
exports.incrementMissedScrapes = incrementMissedScrapes;
const getSubcategoryNameByProductId = async (product_id) => {
    const res = await pool_1.default.query(`
		SELECT name from subcategories
		WHERE subcategories.id = $1
		`, [product_id]);
    return res.rows[0];
};
exports.getSubcategoryNameByProductId = getSubcategoryNameByProductId;
const updateWoocommerceProductId = async (product_id, woocommerce_product_id) => {
    await pool_1.default.query(`
		UPDATE products
		SET wc_product_id = $1, wc_pushed_at = NOW()
		WHERE id = $2
		`, [woocommerce_product_id, product_id]);
};
exports.updateWoocommerceProductId = updateWoocommerceProductId;
const getAllPushedProducts = async () => {
    const res = await pool_1.default.query(`SELECT id, "itemPrice", wc_product_id FROM products WHERE wc_product_id IS NOT NULL`);
    return res.rows;
};
exports.getAllPushedProducts = getAllPushedProducts;
const getStaleProductsWithWcId = async () => {
    const res = await pool_1.default.query(`SELECT id, wc_product_id FROM products WHERE missed_scrapes >= 3 AND wc_product_id IS NOT NULL`);
    return res.rows;
};
exports.getStaleProductsWithWcId = getStaleProductsWithWcId;
const deleteProductByUrl = async (itemUrl) => {
    await pool_1.default.query(`DELETE FROM products WHERE itemURL = $1`, [itemUrl]);
};
exports.deleteProductByUrl = deleteProductByUrl;
const getProductStatsByCategory = async () => {
    const res = await pool_1.default.query(`
		SELECT c.name AS "categoryName", COUNT(*) AS total, COUNT(p.wc_product_id) AS pushed
		FROM products p
		LEFT JOIN subcategories s ON p.subcategory_id = s.id
		LEFT JOIN categories c ON s.category_id = c.id
		GROUP BY c.name
	`);
    return res.rows;
};
exports.getProductStatsByCategory = getProductStatsByCategory;
const getProductTotals = async () => {
    const res = await pool_1.default.query(`SELECT COUNT(*) AS total, COUNT(wc_product_id) AS pushed FROM products`);
    return res.rows[0];
};
exports.getProductTotals = getProductTotals;
const searchProductsByKeyword = async (keyword) => {
    const res = await pool_1.default.query(`SELECT id, itemurl AS "itemUrl", itemname AS "itemName", wc_product_id
		 FROM products
		 WHERE itemname ILIKE $1 AND wc_product_id IS NOT NULL`, [`%${keyword}%`]);
    return res.rows;
};
exports.searchProductsByKeyword = searchProductsByKeyword;
const getWPSubcategoryIds = async () => {
    const res = await pool_1.default.query(`
		SELECT name, wc_category_id
		FROM subcategories
		`);
    return res.rows;
};
exports.getWPSubcategoryIds = getWPSubcategoryIds;
