// |`POST`|`/api/push/bulk`|Fetch top N per genre from Ranking API → normalize → price → push to WooCommerce|
// |`GET`|`/api/products`|Products stored in PostgreSQL (by genre or category)|
// |`GET`|`/api/products/:itemCode`|Single product detail|
// |`POST`|`/api/request-product`|Product request flow — fetch by keyword, push to WooCommerce|
// |`GET`|`/api/request-product/status/:requestId`|SSE progress stream for product request|

// POST api/products/
export function bulkFetch(){
}

// GET api/products/keyword/:keyword
// POST api/products/keyword/:keyword

export function bulkPush(){

}

// bulkFetch (saves to postgresSQL)
// bulkPush (pushes to Woocommerce)

// fetchByKeyword(keyword, amount)
// fetchByGenre(genreId, amount)

// get itemDetails by keyword (check DB if we have enough items, if not start fetch/push)

// get item details by itemUrl 

// 
// update status of request product