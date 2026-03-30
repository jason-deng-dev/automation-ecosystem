import pool from "./pool";
import { RakutenDbQueryItem } from "../utils";
import { categories } from "../config/genres";


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
    const c = categories;
    // find out what category its in
    




};

export const getProductByUrl = () => {};

export const getProductsByGenre = () => {};

export const deleteStaleProducts = () => {}
