import pool from "./pool";
import { RakutenDbQueryItem } from "../utils";
import { categories } from "../config/genres";

const category = {
	"Running Gear": [565768, 565767, 565769, 568476, 564507, 568475],
	Training: [565772, 201869, 565771, 567756, 205074, 407916, 568218],
	"Nutrition & Supplements": [559936, 567603, 567604, 201485, 302658, 402614, 567605, 402589, 208149, 567611],
	"Recovery & Care": [214828, 214822, 204750, 565744],
	Sportswear: [502027, 402463, 565743, 208118, 551942],
};

// pool is connection to our db
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
	await pool.query(
		`
		INSERT INTO products (
			itemName, itemPrice, itemCaption, itemURL,
			smallImageUrls, mediumImageUrls, reviewCount, reviewAverage,
			shopName, shopCode, availability, subcategory_id
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
			(SELECT id FROM subcategories WHERE genre_id = $12)
		)
		ON CONFLICT (itemURL) DO UPDATE SET
			itemPrice = EXCLUDED.itemPrice,
			availability = EXCLUDED.availability,
			missed_scrapes = 0,
			last_updated_at = NOW()
		`,
		[
			itemName, itemPrice, itemCaption, itemUrl,
			JSON.stringify(smallImageUrls), JSON.stringify(mediumImageUrls),
			reviewCount, reviewAverage, shopName, shopCode, availability, genreId,
		]
	);
};

export const getProductByUrl = () => {};

export const getProductsByGenre = () => {};

export const deleteStaleProducts = () => {};
