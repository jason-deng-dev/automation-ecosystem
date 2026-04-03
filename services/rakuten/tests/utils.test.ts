import { mockAPICall, normalizeItems, cleanTitle } from '../src/utils';
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

describe("cleanTitle", () => {
	it("strips 【...】 brackets and moves to promoText", () => {
		const { title, promoText } = cleanTitle("【公式】ナイキ エアズーム ランニングシューズ");
		expect(title).toBe("ナイキ エアズーム ランニングシューズ");
		expect(promoText).toBe("公式");
	});

	it("strips ★...★ patterns and moves to promoText", () => {
		const { title, promoText } = cleanTitle("★送料無料★アシックス ゲルカヤノ 31 メンズ");
		expect(title).toBe("アシックス ゲルカヤノ 31 メンズ");
		expect(promoText).toContain("送料無料");
	});

	it("strips date-limited promo prefix with single ★", () => {
		const { title, promoText } = cleanTitle("4/1限定★抽選で最大100％Pバック ナイキ ZOOM RIVAL FLY メンズ");
		expect(title).toBe("ナイキ ZOOM RIVAL FLY メンズ");
		expect(promoText).toContain("Pバック");
	});

	it("strips [square bracket] tags", () => {
		const { title } = cleanTitle("ナイキ ランニングシューズ メンズ [Rakuten Fashion]");
		expect(title).toBe("ナイキ ランニングシューズ メンズ");
	});

	it("strips 送料込み prefix", () => {
		const { title } = cleanTitle("送料込み ミズノ ウェーブライダー 27 メンズ");
		expect(title).toBe("ミズノ ウェーブライダー 27 メンズ");
	});

	it("returns empty promoText when no promo patterns present", () => {
		const { title, promoText } = cleanTitle("アシックス NOVABLAST 5 メンズ ランニングシューズ");
		expect(title).toBe("アシックス NOVABLAST 5 メンズ ランニングシューズ");
		expect(promoText).toBe("");
	});

	it("handles multiple promo patterns in one title", () => {
		const { title, promoText } = cleanTitle("【楽天1位】★期間限定★アシックス ゲルニンバス 25 メンズ");
		expect(title).toBe("アシックス ゲルニンバス 25 メンズ");
		expect(promoText).toContain("楽天1位");
		expect(promoText).toContain("期間限定");
	});

	it("strips 《...》 double angle brackets", () => {
		const { title, promoText } = cleanTitle("《受注生産》《》ミズノ カスタムオーダー レーシングショーツ");
		expect(title).toBe("ミズノ カスタムオーダー レーシングショーツ");
		expect(promoText).toContain("受注生産");
	});

	it("strips ＼...／ fullwidth slash patterns", () => {
		const { title, promoText } = cleanTitle("＼今だけ新発売特価！！／シャクティマット 指圧マット");
		expect(title).toBe("シャクティマット 指圧マット");
		expect(promoText).toContain("今だけ新発売特価");
	});

	it("strips ＜...＞ fullwidth angle brackets", () => {
		const { title, promoText } = cleanTitle("＜10%OFFクーポン発行中＞ On ランニングシューズ メンズ");
		expect(title).toBe("On ランニングシューズ メンズ");
		expect(promoText).toContain("10%OFFクーポン発行中");
	});

	it("strips ▽ triangle prefix", () => {
		const { title } = cleanTitle("▽10%OFFクーポン コカ・コーラ アクエリアス 500ml");
		expect(title).toBe("コカ・コーラ アクエリアス 500ml");
	});

	it("strips date-limited promo ending with まで！", () => {
		const { title, promoText } = cleanTitle("最大6000円OFFクーポン配布中！4/3 23:59まで！アシックス ゲルカヤノ 31");
		expect(title).toBe("アシックス ゲルカヤノ 31");
		expect(promoText).toContain("まで！");
	});

	it("strips メール便 shipping method mentions", () => {
		const { title } = cleanTitle("メール便でもネコポスだから速い ミズノ ウェーブライダー 27");
		expect(title).toBe("ミズノ ウェーブライダー 27");
	});

	it("strips お買い得スペシャルプライス prefix", () => {
		const { title, promoText } = cleanTitle("お買い得スペシャルプライス ナイキ アンクル ソックス 3足組 靴下 メンズ");
		expect(title).toBe("ナイキ アンクル ソックス 3足組 靴下 メンズ");
		expect(promoText).toContain("お買い得スペシャルプライス");
	});

	it("strips P5倍 coupon prefix ending with あす楽", () => {
		const { title, promoText } = cleanTitle("P5倍＆まとめ買いクーポン 5点セット あす楽 選べる7カラー スポーツウェア メンズ");
		expect(title).toBe("選べる7カラー スポーツウェア メンズ");
		expect(promoText).toContain("あす楽");
	});

	it("strips trailing imbkk store tag", () => {
		const { title } = cleanTitle("ナイキ REVOLUTION 8 HJ9198-100 メンズ ランニングシューズ NIKE imbkk");
		expect(title).toBe("ナイキ REVOLUTION 8 HJ9198-100 メンズ ランニングシューズ NIKE");
	});

	it("strips trailing cat-run store tag", () => {
		const { title } = cleanTitle("アシックス ランニングシューズ ノヴァブラスト 5 スタンダード 1011B974.002 asics NOVABLAST 5 cat-run");
		expect(title).toBe("アシックス ランニングシューズ ノヴァブラスト 5 スタンダード 1011B974.002 asics NOVABLAST 5");
	});

	it("strips concatenated cat-run (v14cat-run)", () => {
		const { title } = cleanTitle("ニューバランス ランニングシューズ フレッシュフォーム v14 new balance Fresh Foam X 1080 v14cat-run");
		expect(title).toBe("ニューバランス ランニングシューズ フレッシュフォーム v14 new balance Fresh Foam X 1080 v14");
	});

	it("strips trailing season codes (25SS, 26SS)", () => {
		const { title } = cleanTitle("On（オン） ランニングシューズ メンズ Cloud クラウド 6 25SS");
		expect(title).toBe("On（オン） ランニングシューズ メンズ Cloud クラウド 6");
	});

	it("strips concatenated season code (TOKYO26SS)", () => {
		const { title } = cleanTitle("アシックス ランニングシューズ メタスピード エッジ トウキョウ スタンダード 1013A163.101 asics METASPEED EDGE TOKYO26SS");
		expect(title).toBe("アシックス ランニングシューズ メタスピード エッジ トウキョウ スタンダード 1013A163.101 asics METASPEED EDGE TOKYO");
	});
});
