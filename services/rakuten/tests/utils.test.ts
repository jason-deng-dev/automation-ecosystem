import { mockAPICall, normalizeItems } from '../src/utils';
import { describe, it, expect } from 'vitest';

describe("normalizeItems", () => {
	it("returns correct number of items", () => {
		const result = normalizeItems(mockAPICall());
		expect(result).toHaveLength(2);
	});

	it("maps first item fields correctly", () => {
		const result = normalizeItems(mockAPICall());
		expect(result[0]).toEqual({
			itemName: "ナイキ AIR WINFLO 11 エア ウィンフロー 11 FJ9509-001 メンズ 陸上/ランニング ランニングシューズ : ブラック×ホワイト NIKE imbkk",
			itemPrice: 6587,
			itemCaption: "◇バランスの良い履き心地でランを後押し。ウィンフロー 11は、ランニングのペースアップをサポートします。フルレングスのNike Airクッショニングを搭載。ウィンフロー 10よりも、前足部はゆったり、かかとは幅広のデザインで、通気性が格段に向上。毎日でも走りたくなる履き心地が絶好調の状態につながり、翌日ランニングに戻ってもさらにコンディションがアップします。■カラー(メーカー表記):ブラック×ホワイト(001:ブラック/ホワイト/アンスラサイト/クールグレー)■甲材(アッパー):合成繊維■底材(ソール):ゴム底■生産国:ベトナム■2024年モデル※ブランドやシリーズによっては甲高や幅等小さめに作られていることがあります。あくまで目安としてご判断ください。※こちらの商品は店頭と在庫を共有しているためパッケージの一部破損や試着による若干の汚損がある場合がございます。初期不良以外、上記の理由による返品交換は致しかねます。予めご了承いただけますようよろしくお願いします。アルペン alpen スポーツデポ SPORTSDEPO スポーツシューズ ランニングシューズ ランニング シューズ ジョギングシューズ マラソンシューズ エアウィンフロー11 220713runout 1222RUN43online 43RUNCL",
			itemUrl: "https://item.rakuten.co.jp/alpen/4303565814/?rafcid=wsc_i_is_a59b19a1-7865-4250-ba83-cfced1d12053",
			smallImageUrls: [
				{ imageUrl: "https://thumbnail.image.rakuten.co.jp/@0_mall/alpen/cabinet/img/757/4303565814_8.jpg" },
				{ imageUrl: "https://thumbnail.image.rakuten.co.jp/@0_mall/alpen/cabinet/img/757/4303565814_1.jpg" },
				{ imageUrl: "https://thumbnail.image.rakuten.co.jp/@0_mall/alpen/cabinet/img/757/4303565814_2.jpg" },
			],
			mediumImageUrls: [
				{ imageUrl: "https://thumbnail.image.rakuten.co.jp/@0_mall/alpen/cabinet/img/757/4303565814_8.jpg" },
				{ imageUrl: "https://thumbnail.image.rakuten.co.jp/@0_mall/alpen/cabinet/img/757/4303565814_1.jpg" },
				{ imageUrl: "https://thumbnail.image.rakuten.co.jp/@0_mall/alpen/cabinet/img/757/4303565814_2.jpg" },
			],
			reviewCount: 62,
			reviewAverage: 4.85,
			shopName: "アルペン楽天市場店",
			shopCode: "alpen",
			genreId: "509058",
			availability: 1,
		});
	});

	it("strips non-schema fields (catchcopy, itemCode, tagIds)", () => {
		const result = normalizeItems(mockAPICall());
		expect(result[0]).not.toHaveProperty('catchcopy');
		expect(result[0]).not.toHaveProperty('itemCode');
		expect(result[0]).not.toHaveProperty('tagIds');
	});

	it("each item has all required schema fields", () => {
		const required = ['itemName', 'itemPrice', 'itemCaption', 'itemUrl', 'smallImageUrls', 'mediumImageUrls', 'reviewCount', 'reviewAverage', 'shopName', 'shopCode', 'genreId', 'availability'];
		const result = normalizeItems(mockAPICall());
		for (const item of result) {
			for (const field of required) {
				expect(item).toHaveProperty(field);
			}
		}
	});
});
