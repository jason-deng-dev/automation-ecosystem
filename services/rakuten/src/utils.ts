import * as deepl from "deepl-node";
import 'dotenv/config'

export function cleanDescription(description: string) {
	

}



export function cleanTitle(name: string): { title: string; promoText: string } {
	const promoMatches: string[] = [];

	// Extract and remove 【...】 and ★...★ patterns
	const cleaned = name
		.replace(/【[^】]*】/g, (match) => {
			promoMatches.push(match.slice(1, -1));
			return "";
		})
		.replace(/《[^》]*》/g, (match) => {
			promoMatches.push(match.slice(1, -1));
			return "";
		})
		.replace(/＜[^＞]*＞/g, (match) => {
			promoMatches.push(match.slice(1, -1));
			return "";
		})
		.replace(/＼[^／]*／/g, (match) => {
			promoMatches.push(match.slice(1, -1));
			return "";
		})
		.replace(/★[^★]*★/g, (match) => {
			promoMatches.push(match.slice(1, -1));
			return "";
		})
		.replace(/^[▽▼◆◇■□●○◎][^\s]*\s*/g, (match) => {
			promoMatches.push(match.trim());
			return "";
		})
		.replace(/^お買い得[^\s]*\s*/g, (match) => {
			promoMatches.push(match.trim());
			return "";
		})
		.replace(/^.*?(?:Pバック|円OFF|%OFF|ポイント[0-9０-９倍]+)\s+/g, (match) => {
			promoMatches.push(match.trim());
			return "";
		})
		.replace(/^[^。\n]*?まで[！!]\s*/g, (match) => {
			promoMatches.push(match.trim());
			return "";
		})
		.replace(/^[^。\n]*?あす楽\s*/g, (match) => {
			promoMatches.push(match.trim());
			return "";
		})
		.replace(/\[[^\]]*\]/g, "") // strip [Rakuten Fashion], [amz] etc
		.replace(/送料(込み|無料|込)/g, "") // strip shipping notices
		.replace(/メール便[^\s]*/g, "") // strip メール便/ネコポス shipping method mentions
		.replace(/(imbkk|cat-run)\s*$/g, "") // strip store tracking tags
		.replace(/[0-9]{2}SS\s*$/g, "") // strip season codes (25SS, 26SS, TOKYO26SS)
		.replace(/\s+/g, " ")
		.trim();

	return {
		title: cleaned,
		promoText: promoMatches.join(" ").trim(),
	};
}

export async function translateKeyword(keyword: string): Promise<string> {
	const deeplClient = new deepl.DeepLClient(process.env.DEEPL_API_KEY!);
	const result = await deeplClient.translateText(keyword, null, "ja");
	return result.text;
}

export async function translateNames(normalizedItems: RakutenDbQueryItem[]): Promise<RakutenDbQueryItem[]> {
	const names = normalizedItems.map((product) => cleanTitle(product.itemName).title);

	console.log(`translating ${names.length} product names via DeepL...`);
	const deeplClient = new deepl.DeepLClient(process.env.DEEPL_API_KEY!);
	const results = await deeplClient.translateText(names, null, "zh");
	console.log(`translated ${results.length} product names`);

	return normalizedItems.map((item, i) => ({ ...item, itemName: results[i].text }));
}

export function normalizeItems(items: RakutenResponseItem[]): RakutenDbQueryItem[] {
	return items.map(
		({
			Item: {
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
			},
		}) => ({
			itemName,
			itemPrice: Number(itemPrice),
			itemCaption,
			itemUrl,
			smallImageUrls: smallImageUrls.map(({ imageUrl }) => ({ imageUrl: imageUrl.split("?")[0] })),
			mediumImageUrls: mediumImageUrls.map(({ imageUrl }) => ({ imageUrl: imageUrl.split("?")[0] })),
			reviewCount: Number(reviewCount),
			reviewAverage: Number(reviewAverage),
			shopName,
			shopCode,
			genreId,
			availability,
		}),
	);
}

export interface RakutenResponseItem {
	Item: {
		itemName: string;
		itemPrice: number | string;
		itemCaption: string;
		itemUrl: string;
		smallImageUrls: Array<{ imageUrl: string }>;
		mediumImageUrls: Array<{ imageUrl: string }>;
		reviewCount: number | string;
		reviewAverage: number | string;
		shopName: string;
		shopCode: string;
		genreId: string;
		availability: number;
	};
}

export interface RakutenDbQueryItem {
	itemName: string;
	itemPrice: number;
	itemCaption: string;
	itemUrl: string;
	smallImageUrls: Array<{ imageUrl: string }>;
	mediumImageUrls: Array<{ imageUrl: string }>;
	reviewCount: number;
	reviewAverage: number;
	shopName: string;
	shopCode: string;
	genreId: string;
	availability: number;
}

export interface DbItem {
	id: number;
	itemName: string;
	itemPrice: number;
	itemCaption: string;
	itemUrl: string;
	smallImageUrls: Array<{ imageUrl: string }>;
	mediumImageUrls: Array<{ imageUrl: string }>;
	reviewCount: number;
	reviewAverage: number;
	shopName: string;
	shopCode: string;
	availability: number;
	wc_product_id: number | null;
	wc_pushed_at: Date | null;
	created_at: Date;
	last_updated_at: Date;
	missed_scrapes: number;
	subcategory_id: number;
	categoryName: string;
}

export function mockAPICall() {
	return [
		{
			Item: {
				itemName:
					"ナイキ AIR WINFLO 11 エア ウィンフロー 11 FJ9509-001 メンズ 陸上/ランニング ランニングシューズ : ブラック×ホワイト NIKE imbkk",
				catchcopy: "",
				itemCode: "alpen:10467589",
				itemPrice: 6587,
				itemPriceBaseField: "item_price_min3",
				itemPriceMax1: 6587,
				itemPriceMax2: 6587,
				itemPriceMax3: 6587,
				itemPriceMin1: 6587,
				itemPriceMin2: 6587,
				itemPriceMin3: 6587,
				itemCaption:
					"◇バランスの良い履き心地でランを後押し。ウィンフロー 11は、ランニングのペースアップをサポートします。フルレングスのNike Airクッショニングを搭載。ウィンフロー 10よりも、前足部はゆったり、かかとは幅広のデザインで、通気性が格段に向上。毎日でも走りたくなる履き心地が絶好調の状態につながり、翌日ランニングに戻ってもさらにコンディションがアップします。■カラー(メーカー表記):ブラック×ホワイト(001:ブラック/ホワイト/アンスラサイト/クールグレー)■甲材(アッパー):合成繊維■底材(ソール):ゴム底■生産国:ベトナム■2024年モデル※ブランドやシリーズによっては甲高や幅等小さめに作られていることがあります。あくまで目安としてご判断ください。※こちらの商品は店頭と在庫を共有しているためパッケージの一部破損や試着による若干の汚損がある場合がございます。初期不良以外、上記の理由による返品交換は致しかねます。予めご了承いただけますようよろしくお願いします。アルペン alpen スポーツデポ SPORTSDEPO スポーツシューズ ランニングシューズ ランニング シューズ ジョギングシューズ マラソンシューズ エアウィンフロー11 220713runout 1222RUN43online 43RUNCL",
				itemUrl: "https://item.rakuten.co.jp/alpen/4303565814/?rafcid=wsc_i_is_a59b19a1-7865-4250-ba83-cfced1d12053",
				shopUrl: "https://www.rakuten.co.jp/alpen/?rafcid=wsc_i_is_a59b19a1-7865-4250-ba83-cfced1d12053",
				smallImageUrls: [
					{
						imageUrl: "https://thumbnail.image.rakuten.co.jp/@0_mall/alpen/cabinet/img/757/4303565814_8.jpg?_ex=64x64",
					},
					{
						imageUrl: "https://thumbnail.image.rakuten.co.jp/@0_mall/alpen/cabinet/img/757/4303565814_1.jpg?_ex=64x64",
					},
					{
						imageUrl: "https://thumbnail.image.rakuten.co.jp/@0_mall/alpen/cabinet/img/757/4303565814_2.jpg?_ex=64x64",
					},
				],
				mediumImageUrls: [
					{
						imageUrl:
							"https://thumbnail.image.rakuten.co.jp/@0_mall/alpen/cabinet/img/757/4303565814_8.jpg?_ex=128x128",
					},
					{
						imageUrl:
							"https://thumbnail.image.rakuten.co.jp/@0_mall/alpen/cabinet/img/757/4303565814_1.jpg?_ex=128x128",
					},
					{
						imageUrl:
							"https://thumbnail.image.rakuten.co.jp/@0_mall/alpen/cabinet/img/757/4303565814_2.jpg?_ex=128x128",
					},
				],
				affiliateUrl: "",
				shopAffiliateUrl: "",
				imageFlag: 1,
				availability: 1,
				taxFlag: 0,
				postageFlag: 1,
				creditCardFlag: 1,
				shopOfTheYearFlag: 0,
				shipOverseasFlag: 0,
				shipOverseasArea: "",
				asurakuFlag: 0,
				asurakuClosingTime: "",
				asurakuArea: "",
				affiliateRate: 4,
				startTime: "",
				endTime: "",
				reviewCount: 62,
				reviewAverage: 4.85,
				pointRate: 5,
				pointRateStartTime: "2026-03-13 19:00",
				pointRateEndTime: "2026-03-19 13:59",
				giftFlag: 0,
				shopName: "アルペン楽天市場店",
				shopCode: "alpen",
				genreId: "509058",
				tagIds: [],
			},
		},
		{
			Item: {
				itemName:
					"【セール】サッカニー Saucony SPECIAL PRICE メンズ KINVARA 15 キンバラ15 ランニング マラソン ジョギング トレーニング ジム フィットネス スポーツ 運動靴 日常ラン 負担軽減 サポート S20967",
				catchcopy:
					"1898年創業 100年以上にわたりランニングに携わってきた私たちは、ボストン郊外の地元の工場からグローバルブランドへと成長し、世界中でランニングの楽しさを発信しています",
				itemCode: "saucony:10000049",
				itemPrice: 8800,
				itemPriceBaseField: "item_price_min3",
				itemPriceMax1: 8800,
				itemPriceMax2: 8800,
				itemPriceMax3: 8800,
				itemPriceMin1: 8800,
				itemPriceMin2: 8800,
				itemPriceMin3: 8800,
				itemCaption:
					"商品情報 ITEM DETAILS まるで羽のように軽い履き心地。KINVARA 15は、柔軟性とクッション性を兼ね備えた、デイリーランに最適なランニングシューズです。軽量で無駄のないデザインに、PWRRUNクッションとSRSソックライナーを搭載し、長距離でも快適に走れるサポート力を発揮します。",
				itemUrl: "https://item.rakuten.co.jp/saucony/mens-kin-15/?rafcid=wsc_i_is_a59b19a1-7865-4250-ba83-cfced1d12053",
				shopUrl: "https://www.rakuten.co.jp/saucony/?rafcid=wsc_i_is_a59b19a1-7865-4250-ba83-cfced1d12053",
				smallImageUrls: [],
				mediumImageUrls: [],
				affiliateUrl: "",
				shopAffiliateUrl: "",
				imageFlag: 1,
				availability: 1,
				taxFlag: 0,
				postageFlag: 1,
				creditCardFlag: 1,
				shopOfTheYearFlag: 0,
				shipOverseasFlag: 0,
				shipOverseasArea: "",
				asurakuFlag: 0,
				asurakuClosingTime: "",
				asurakuArea: "",
				affiliateRate: 4,
				startTime: "",
				endTime: "",
				reviewCount: 0,
				reviewAverage: 0,
				pointRate: 1,
				pointRateStartTime: "",
				pointRateEndTime: "",
				giftFlag: 0,
				shopName: "Sauconyサッカニー公式楽天市場店",
				shopCode: "saucony",
				genreId: "509058",
				tagIds: [],
			},
		},
	];
}
