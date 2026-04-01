import { getProductsByRankingGenre } from "../services/rakutenAPI";
import { categories } from "../config/genres";

const categoriesArr = Object.entries(categories);

const arrReference = [
	["Running Gear", [565768, 565767, 565769, 568476, 564507, 568475]],
	["Training", [565772, 201869, 565771, 567756, 205074, 407916, 568218]],
	["Nutrition & Supplements", [559936, 567603, 567604, 201485, 302658, 402614, 567605, 402589, 208149, 567611]],
	["Recovery & Care", [214828, 214822, 204750, 565744]],
	["Sportswear", [502027, 402463, 565743, 208118, 551942]],
];

console.log("starting populating by rankings...");

for (const category of categoriesArr) {
    const categoryName = category[0]
    const subcategoryIds = category[1]
}
console.log("fetching products from Rakuten");
// RakutenAPI a genre

console.log("storing in db, getting back non-dupe products to push to woocommerce");
// store in db

console.log("pushing products to woocommerce");
// push to woocommerce
