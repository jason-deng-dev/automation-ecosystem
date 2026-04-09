import "dotenv/config";
import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api";
import { calculatePrice } from "../services/pricing";
import { DbItem, cleanDescription, extractShortDescription } from "../utils";
import {
	getSubcategoryNameByProductId,
	updateWoocommerceProductId,
	getAllPushedProducts,
	insertImportLog,
	getWPSubcategoryIds
} from "../db/queries";

// should be a Record<'Category name', id>
let wpCategoryIds: Record<string, number> = {};

getWPSubcategoryIds().then(rows => {
	wpCategoryIds = Object.fromEntries(rows.map(r => [r.name, r.wc_category_id]));
});

const WooCommerce = new WooCommerceRestApi({
	url: process.env.WP_URL!,
	consumerKey: process.env.WP_WOOCOMMERCE_CONSUMER_KEY!,
	consumerSecret: process.env.WP_WOOCOMMERCE_CONSUMER_SECRET!,
	version: "wc/v3",
});

const CATEGORIES = ["Running Gear", "Training", "Nutrition & Supplements", "Recovery & Care", "Sportswear"];

const SUBCATEGORIES: { name: string; parent: string }[] = [
	// Running Gear
	{ name: "Shoes", parent: "Running Gear" },
	{ name: "Wear", parent: "Running Gear" },
	{ name: "GPS/Watch", parent: "Running Gear" },
	{ name: "Running Pouch", parent: "Running Gear" },
	{ name: "Armbands/Smartphone Bands", parent: "Running Gear" },
	{ name: "Insole", parent: "Running Gear" },
	{ name: "Middle/Long Distance Running Shoes", parent: "Running Gear" },
	{ name: "Short Distance Running Shoes", parent: "Running Gear" },
	{ name: "Trail Running Shoes", parent: "Running Gear" },
	{ name: "Running Socks", parent: "Running Gear" },
	{ name: "Running Cap", parent: "Running Gear" },
	{ name: "Running Tights", parent: "Running Gear" },
	{ name: "Compression Tights", parent: "Running Gear" },
	{ name: "Running Belt", parent: "Running Gear" },
	{ name: "Leg Warmer", parent: "Running Gear" },
	{ name: "Neck Warmer", parent: "Running Gear" },
	// Training
	{ name: "Wear", parent: "Training" },
	{ name: "Shoes", parent: "Training" },
	{ name: "Protein Shaker", parent: "Training" },
	{ name: "Track & Field", parent: "Training" },
	{ name: "Yoga / Pilates", parent: "Training" },
	{ name: "Triathlon", parent: "Training" },
	{ name: "Yoga Wear", parent: "Training" },
	{ name: "Yoga Mat", parent: "Training" },
	{ name: "Resistance Band", parent: "Training" },
	{ name: "Jump Rope", parent: "Training" },
	// Nutrition & Supplements
	{ name: "Sports Drinks", parent: "Nutrition & Supplements" },
	{ name: "Protein", parent: "Nutrition & Supplements" },
	{ name: "Amino Acid", parent: "Nutrition & Supplements" },
	{ name: "Vitamin", parent: "Nutrition & Supplements" },
	{ name: "Mineral", parent: "Nutrition & Supplements" },
	{ name: "Dietary Fiber", parent: "Nutrition & Supplements" },
	{ name: "Collagen", parent: "Nutrition & Supplements" },
	{ name: "Citric Acid", parent: "Nutrition & Supplements" },
	{ name: "Probiotics", parent: "Nutrition & Supplements" },
	{ name: "Fatty Acids and Oils", parent: "Nutrition & Supplements" },
	{ name: "BCAA", parent: "Nutrition & Supplements" },
	{ name: "Energy Gel", parent: "Nutrition & Supplements" },
	{ name: "Pre-workout", parent: "Nutrition & Supplements" },
	// Recovery & Care
	{ name: "Massage Products", parent: "Recovery & Care" },
	{ name: "Stretching Equipment", parent: "Recovery & Care" },
	{ name: "Foot Care", parent: "Recovery & Care" },
	{ name: "Sports Care Products", parent: "Recovery & Care" },
	{ name: "Massage Gun", parent: "Recovery & Care" },
	{ name: "Foam Roller", parent: "Recovery & Care" },
	{ name: "Icing / Cold Therapy", parent: "Recovery & Care" },
	{ name: "Sports Taping", parent: "Recovery & Care" },
	{ name: "Knee / Joint Support", parent: "Recovery & Care" },
	// Sportswear
	{ name: "Junior Apparel", parent: "Sportswear" },
	{ name: "Women Apparel", parent: "Sportswear" },
	{ name: "Men Apparel", parent: "Sportswear" },
	{ name: "Sports Underwear", parent: "Sportswear" },
	{ name: "Sports Bag", parent: "Sportswear" },
	{ name: "Sportswear / Accessories", parent: "Sportswear" },
	{ name: "Sports Sunglasses", parent: "Sportswear" },
	{ name: "Face Cover / Neck Cover", parent: "Sportswear" },
	{ name: "Windbreaker", parent: "Sportswear" },
	{ name: "Sports Towel", parent: "Sportswear" },
	{ name: "Arm Covers", parent: "Sportswear" },
	{ name: "Sports Bra", parent: "Sportswear" },
	{ name: "Running Shorts", parent: "Sportswear" },
	{ name: "Compression Socks", parent: "Sportswear" },
	{ name: "Sports Gloves", parent: "Sportswear" },
];

export async function setupCategories(): Promise<Record<string, number>> {
	// Step 1 — create parent categories
	const parentRes = await WooCommerce.post("products/categories/batch", {
		create: CATEGORIES.map((name) => ({ name })),
	});

	const decodeHtml = (str: string) => str.replace(/&amp;/g, "&");

	const categoryIdMap: Record<string, number> = {};
	for (const cat of parentRes.data.create) {
		categoryIdMap[decodeHtml(cat.name)] = cat.id;
	}

	// Step 2 — create subcategories with parent IDs
	const subRes = await WooCommerce.post("products/categories/batch", {
		create: SUBCATEGORIES.map(({ name, parent }) => ({
			name,
			parent: categoryIdMap[parent],
		})),
	});

	for (const sub of subRes.data.create) {
		categoryIdMap[decodeHtml(sub.name)] = sub.id;
	}

	// { "Running Gear": 12, "Shoes": 34, ... }
	return categoryIdMap;
}

async function pushProduct(product: DbItem) {
	const price = calculatePrice(product.itemPrice);
	const subcategory = await getSubcategoryNameByProductId(product.subcategory_id);
	if (!subcategory) {
		await insertImportLog({
			itemUrl: product.itemUrl,
			itemName: product.itemName,
			wcProductId: null,
			status: "skipped",
			errorMsg: `unmapped subcategory_id: ${product.subcategory_id}`,
		});
		return null;
	}
	const subcategoryName = subcategory.name;

	const data = {
		name: product.itemName,
		type: "simple",
		regular_price: String(price),
		description: cleanDescription(product.itemCaption),
		short_description: extractShortDescription(product.itemCaption),
		categories: [
			{
				id: wpCategoryIds[subcategoryName],
			},
		],
		images: product.mediumImageUrls.map(({ imageUrl }) => ({ src: imageUrl })),
		meta_data: [{ key: "_rakuten_url", value: product.itemUrl }],
	};
	try {
		const res = await WooCommerce.post("products", data);
		return res.data.id;
	} catch (err: any) {
		if (err?.response?.data?.code === "woocommerce_product_image_upload_error") {
			data.images = data.images.slice(0, 1);
			const res = await WooCommerce.post("products", data);
			return res.data.id;
		}
		throw err;
	}
}

export async function pushProducts(products: DbItem[]) {
	const wc_ids = [];
	for (const product of products) {
		if (product.wc_product_id) {
			console.log(`skipped ${product.itemUrl} — already in WooCommerce (wc_product_id: ${product.wc_product_id})`);
			continue;
		}
		try {
			const wcId = await pushProduct(product);
			if (wcId === null) {
				console.log(`skipped ${product.itemUrl} — unmapped subcategory_id ${product.subcategory_id}`);
				continue;
			}
			wc_ids.push(wcId);
			await updateWoocommerceProductId(product.id, wcId);
			await insertImportLog({
				itemUrl: product.itemUrl,
				itemName: product.itemName,
				wcProductId: wcId,
				status: "success",
			});
		} catch (err) {
			console.log(err);
			await insertImportLog({
				itemUrl: product.itemUrl,
				itemName: product.itemName,
				wcProductId: null,
				status: "failed",
				errorMsg: String(err),
			});
		}
	}
	return wc_ids;
}

export async function deleteWcProduct(wcProductId: number) {
	try {
		await WooCommerce.delete(`products/${wcProductId}`, { force: true });
	} catch (err) {
		console.error(`Failed to delete WC product ${wcProductId}:`, err);
	}
}

export async function updateWcPrice(wcProductId: number, price: number) {
	await WooCommerce.put(`products/${wcProductId}`, {
		regular_price: String(price),
	});
}

export async function updatePrices() {
	const products = await getAllPushedProducts();
	console.log(`Updating prices for ${products.length} products...`);
	for (const product of products) {
		try {
			await WooCommerce.put(`products/${product.wc_product_id}`, {
				regular_price: String(calculatePrice(product.itemPrice)),
			});
		} catch (err) {
			console.error(`Failed to update price for wc_product_id ${product.wc_product_id}:`, err);
		}
	}
	console.log("Price update complete");
}
