import "dotenv/config";
import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api";
import fs from "fs";
import { calculatePrice } from "../services/pricing";
import { DbItem } from "../utils";
import { getSubcategoryNameByProductId, updateWoocommerceProductId} from "../db/queries";
import wpCategoryIds from "../config/wpCategoryIds";

const WooCommerce = new WooCommerceRestApi({
	url: process.env.WP_URL!,
	consumerKey: process.env.WP_WOOCOMMERCE_CONSUMER_KEY!,
	consumerSecret: process.env.WP_WOOCOMMERCE_CONSUMER_SECRET!,
	version: "wc/v3",
});

const CATEGORIES = ["Running Gear", "Training", "Nutrition & Supplements", "Recovery & Care", "Sportswear"];

const SUBCATEGORIES: { name: string; parent: string }[] = [
	{ name: "Shoes", parent: "Running Gear" },
	{ name: "Wear", parent: "Running Gear" },
	{ name: "GPS/Watch", parent: "Running Gear" },
	{ name: "Running Pouch", parent: "Running Gear" },
	{ name: "Armbands/Smartphone Bands", parent: "Running Gear" },
	{ name: "Insole", parent: "Running Gear" },
	{ name: "Fitness Machines", parent: "Training" },
	{ name: "Wear", parent: "Training" },
	{ name: "Shoes", parent: "Training" },
	{ name: "Protein Shaker", parent: "Training" },
	{ name: "Track & Field", parent: "Training" },
	{ name: "Yoga / Pilates", parent: "Training" },
	{ name: "Triathlon", parent: "Training" },
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
	{ name: "Massage Products", parent: "Recovery & Care" },
	{ name: "Stretching Equipment", parent: "Recovery & Care" },
	{ name: "Foot Care", parent: "Recovery & Care" },
	{ name: "Sports Care Products", parent: "Recovery & Care" },
	{ name: "Junior Apparel", parent: "Sportswear" },
	{ name: "Women Apparel", parent: "Sportswear" },
	{ name: "Men Apparel", parent: "Sportswear" },
	{ name: "Sports Underwear", parent: "Sportswear" },
	{ name: "Sports Bag", parent: "Sportswear" },
	{ name: "Sportswear / Accessories", parent: "Sportswear" },
];

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
	try {
		const res = await WooCommerce.post("products", data);
		return res.data.id;
	} catch(err) {

	}
	
	
}

export async function pushProducts(products: DbItem[]) {
	for (const product of products){
		try 
		const wcId = await pushProduct(product)
		await updateWoocommerceProductId(product.id, wcId)
	}
	
}
