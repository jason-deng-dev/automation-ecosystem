import "dotenv/config";
import { normalizeItems, RakutenResponseItem,translateNames } from "../utils";





export const getProductsByKeyword = async (keyword: string, count: number, sortMode: string = 'standard') => {
	const translatedKeyword = keyword;
	const itemSearchEndpoint = `https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20220601?format=json&keyword=${translatedKeyword}&hits=${count}&availability=1&applicationId=${process.env.RAKUTEN_APP_ID}&sort=${sortMode}`;
	try {
		const res = await fetch(itemSearchEndpoint, {
			headers: {
				Referer: process.env.RAKUTEN_REFERRER!,
				Origin: process.env.RAKUTEN_REFERRER!,
				accessKey: process.env.RAKUTEN_ACCESS_KEY!,
			},
		});
		const resJson = await res.json();
		const items = resJson.Items;
		if (!items) {
			console.log("No items:", resJson.error_description ?? resJson);
			return null;
		}
		const normalizedItems = normalizeItems(items);
		const translatedItems = await translateNames(normalizedItems)
		return translatedItems;
	} catch (err) {
		console.log(err);
	}
};

export const getProductsByGenresId = async (
	genreId: number,
	count: number,
	sortMode: string = 'standard',
) => {
	const itemSearchEndpoint = `https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20220601?format=json&genreId=${genreId}&availability=1&hits=${count}&sort=${sortMode}&applicationId=${process.env.RAKUTEN_APP_ID}`;
	try {
		const res = await fetch(itemSearchEndpoint, {
			headers: {
				Referer: process.env.RAKUTEN_REFERRER!,
				Origin: process.env.RAKUTEN_REFERRER!,
				accessKey: process.env.RAKUTEN_ACCESS_KEY!,
			},
		});
		const resJson = await res.json();
		const items = resJson.Items;
		if (!items) return null;
		const normalizedItems = normalizeItems(items)
		const translatedItems = await translateNames(normalizedItems)
		return translatedItems;
	} catch (err) {
		console.log(err)
	}
};

export const getProductsByRankingGenre = async (
	genreId: number,
	pageNumber: number,
) => {
	const itemSearchEndpoint = `https://openapi.rakuten.co.jp/ichibaranking/api/IchibaItem/Ranking/20220601?format=json&genreId=${genreId}&pages=${pageNumber}&applicationId=${process.env.RAKUTEN_APP_ID}`
	
	try {
		const res = await fetch(itemSearchEndpoint, {
			headers: {
				Referer: process.env.RAKUTEN_REFERRER!,
				Origin: process.env.RAKUTEN_REFERRER!,
				accessKey: process.env.RAKUTEN_ACCESS_KEY!,
			},
		});
		const resJson = await res.json();
		const items = resJson.Items;
		if (!items) return null;
		const normalizedItems = normalizeItems(items)
		const translatedItems = await translateNames(normalizedItems)
		return translatedItems;
	} catch (err) {
		console.log(err)
	}
};

