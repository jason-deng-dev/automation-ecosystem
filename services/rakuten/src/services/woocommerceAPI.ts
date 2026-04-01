import "dotenv/config";
import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api";
import fs from "fs";
import { calculatePrice } from "../services/pricing";
import { DbItem } from "../utils";
import { getSubcategoryNameByProductId, updateWoocommerceProductId } from "../db/queries";
import wpCategoryIds from "../config/wpCategoryIds";

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
	{ name: "Reflective Vest", parent: "Running Gear" },
	{ name: "Running Belt", parent: "Running Gear" },
	{ name: "Leg Warmer", parent: "Running Gear" },
	{ name: "Neck Warmer", parent: "Running Gear" },
	// Training
	{ name: "Fitness Machines", parent: "Training" },
	{ name: "Wear", parent: "Training" },
	{ name: "Shoes", parent: "Training" },
	{ name: "Protein Shaker", parent: "Training" },
	{ name: "Track & Field", parent: "Training" },
	{ name: "Yoga / Pilates", parent: "Training" },
	{ name: "Triathlon", parent: "Training" },
	{ name: "Yoga Wear", parent: "Training" },
	{ name: "Yoga Mat", parent: "Training" },
	{ name: "Dumbbell", parent: "Training" },
	{ name: "Treadmill", parent: "Training" },
	{ name: "Balance Ball", parent: "Training" },
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

// Parent category WC IDs — stable after initial setupCategories() run
const PARENT_CATEGORY_IDS: Record<string, number> = {
	"Running Gear": 252,
	"Training": 253,
	"Nutrition & Supplements": 254,
	"Recovery & Care": 255,
	"Sportswear": 256,
};

const NEW_SUBCATEGORIES: { name: string; parent: string }[] = [
	{ name: "Sports Sunglasses", parent: "Sportswear" },
	{ name: "Face Cover / Neck Cover", parent: "Sportswear" },
	{ name: "Windbreaker", parent: "Sportswear" },
	{ name: "Sports Towel", parent: "Sportswear" },
	{ name: "Arm Covers", parent: "Sportswear" },
	{ name: "Middle/Long Distance Running Shoes", parent: "Running Gear" },
	{ name: "Short Distance Running Shoes", parent: "Running Gear" },
	{ name: "Yoga Wear", parent: "Training" },
	{ name: "Yoga Mat", parent: "Training" },
	// From keyword scrape
	{ name: "Trail Running Shoes", parent: "Running Gear" },
	{ name: "Running Socks", parent: "Running Gear" },
	{ name: "Running Cap", parent: "Running Gear" },
	{ name: "Running Tights", parent: "Running Gear" },
	{ name: "Compression Tights", parent: "Running Gear" },
	{ name: "Reflective Vest", parent: "Running Gear" },
	{ name: "Running Belt", parent: "Running Gear" },
	{ name: "Leg Warmer", parent: "Running Gear" },
	{ name: "Neck Warmer", parent: "Running Gear" },
	{ name: "Dumbbell", parent: "Training" },
	{ name: "Treadmill", parent: "Training" },
	{ name: "Balance Ball", parent: "Training" },
	{ name: "Resistance Band", parent: "Training" },
	{ name: "Jump Rope", parent: "Training" },
	{ name: "BCAA", parent: "Nutrition & Supplements" },
	{ name: "Energy Gel", parent: "Nutrition & Supplements" },
	{ name: "Pre-workout", parent: "Nutrition & Supplements" },
	{ name: "Massage Gun", parent: "Recovery & Care" },
	{ name: "Foam Roller", parent: "Recovery & Care" },
	{ name: "Icing / Cold Therapy", parent: "Recovery & Care" },
	{ name: "Sports Taping", parent: "Recovery & Care" },
	{ name: "Knee / Joint Support", parent: "Recovery & Care" },
	{ name: "Sports Bra", parent: "Sportswear" },
	{ name: "Running Shorts", parent: "Sportswear" },
	{ name: "Compression Socks", parent: "Sportswear" },
	{ name: "Sports Gloves", parent: "Sportswear" },
];

async function setupNewCategories(): Promise<Record<string, number>> {
	const res = await WooCommerce.post("products/categories/batch", {
		create: NEW_SUBCATEGORIES.map(({ name, parent }) => ({
			name,
			parent: PARENT_CATEGORY_IDS[parent],
		})),
	});

	const idMap: Record<string, number> = {};
	for (const sub of res.data.create) {
		idMap[sub.name] = sub.id;
	}
	// Copy these IDs into wpCategoryIds.ts
	console.log(idMap);
	return idMap;
}

async function setupCategories(): Promise<Record<string, number>> {
	// Step 1 — create parent categories
	const parentRes = await WooCommerce.post("products/categories/batch", {
		create: CATEGORIES.map((name) => ({ name })),
	});

	const categoryIdMap: Record<string, number> = {};
	for (const cat of parentRes.data.create) {
		categoryIdMap[cat.name] = cat.id;
	}

	// Step 2 — create subcategories with parent IDs
	const subRes = await WooCommerce.post("products/categories/batch", {
		create: SUBCATEGORIES.map(({ name, parent }) => ({
			name,
			parent: categoryIdMap[parent],
		})),
	});

	for (const sub of subRes.data.create) {
		categoryIdMap[sub.name] = sub.id;
	}

	// { "Running Gear": 12, "Shoes": 34, ... }
	return categoryIdMap;
}

async function pushProduct(product: DbItem) {
	const price = calculatePrice(product.itemPrice, product.categoryName);
	const { name: subcategoryName } = await getSubcategoryNameByProductId(product.subcategory_id);

	const data = {
		name: product.itemName,
		type: "simple",
		regular_price: String(price),
		description: product.itemCaption,
		short_description: product.itemCaption,
		categories: [
			{
				id: wpCategoryIds[subcategoryName],
			},
		],
		images: product.mediumImageUrls.map(({ imageUrl }) => ({ src: imageUrl })),
	};
	const res = await WooCommerce.post("products", data);
	return res.data.id;
}

export async function pushProducts(products: DbItem[]) {
	for (const product of products) {
		try {
			const wcId = await pushProduct(product);
			await updateWoocommerceProductId(product.id, wcId);
		} catch (err) {
			console.log(err);
		}
	}
}
