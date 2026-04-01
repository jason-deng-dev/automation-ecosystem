import { pushProducts } from "../services/woocommerceAPI";
import { getProductsByKeyword } from "../services/rakutenAPI";
import { upsertProducts, getProductByUrls} from "../db/queries";

async function singleKeywordRun() {
	console.log("starting keyword populate single run...");

	console.log("fetching products from Rakuten");
	const rakutenRes = await getProductsByKeyword("Triathlon", 1);
	if (!rakutenRes) throw new Error("Rakuten response is empty aborting");
	console.log(rakutenRes)

	console.log("storing in db, getting back non-dupe products to push to woocommerce");
	const productUrls = await upsertProducts(rakutenRes);
	console.log(productUrls);

	console.log("pushing products to woocommerce");
    const products = await getProductByUrls(productUrls)
    await pushProducts(products)

    console.log("Run complete")
}

singleKeywordRun();
