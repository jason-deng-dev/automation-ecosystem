import { getProductsByRankingGenre } from "../src/services/rakutenAPI";

console.log("Starting to populate 100 items from Shoes:565768 ...");
try {
	const items = await getProductsByRankingGenre(565768, 100);
    


} catch (err) {
	console.log(err);
} finally{
    console.log("populate done")
}


