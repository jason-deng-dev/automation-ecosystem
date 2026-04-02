import {setupCategories} from "../services/woocommerceAPI"

async function main() {
    console.log(await setupCategories())
}

console.log('Starting to setup categories on woocommerce...')
main().then(() => console.log('Done'))
// 
