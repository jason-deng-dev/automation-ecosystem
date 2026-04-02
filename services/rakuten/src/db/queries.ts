import pool from "./pool";
import { RakutenDbQueryItem } from "../utils";
import { categories } from "../config/genres";



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
	return row.inserted ? [row.itemurl]:[];
};

export const upsertProducts = async(products: RakutenDbQueryItem[]) => {
	const urls:string[] = []
	for (const product of products){
		const urlArr = await upsertProduct(product)
		urls.push(...urlArr)
	}
	return urls
}

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

export const updateWoocommerceProductId = async (product_id:number, woocommerce_product_id:number)=> {
	await pool.query(
		`
		UPDATE products
		SET wc_product_id = $1, wc_pushed_at = NOW()
		WHERE id = $2
		`, [woocommerce_product_id, product_id]
	)
}
