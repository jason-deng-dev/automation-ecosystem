import "dotenv/config";
import fs from 'fs';
import { normalizeItems, RakutenResponseItem } from "../utils";

const file = fs.readFileSync("/")

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
		const normalizedItem = normalizeItems(items);
		return normalizedItem;
		


		
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
		const normalizedItem = normalizeItems(items)
		return normalizedItem;
	} catch (err) {
		console.log(err)
	}
};

export const getProductsByRankingGenre = async (
	genreId: number,
	count: number,
) => {
	const itemSearchEndpoint = `https://openapi.rakuten.co.jp/ichibaranking/api/IchibaItem/Ranking/20220601?format=json&genreId=${genreId}&hits=${count}&applicationId=${process.env.RAKUTEN_APP_ID}`
	
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
		const normalizedItem = normalizeItems(items)
		return normalizedItem;
	} catch (err) {
		console.log(err)
	}
};

