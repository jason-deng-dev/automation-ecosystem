import { mockAPICall, normalizeItems, cleanTitle, cleanDescription, extractShortDescription } from '../src/utils';
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

describe("cleanDescription", () => {
	it("returns empty string for empty input", () => {
		expect(cleanDescription("")).toBe("");
	});

	it("removes duplicate second copy of the description", () => {
		const firstHalf = "良いランニングシューズです。軽量で通気性に優れています。";
		const input = firstHalf + firstHalf;
		const result = cleanDescription(input);
		expect(result.split("良いランニングシューズです").length).toBe(2);
	});

	it("hard-cuts at メーカー希望小売価格 anchor", () => {
		const input = "優れたクッション性を持つシューズです。メーカー希望小売価格はメーカーサイトに基づいて掲載しています これ以降は削除される";
		const result = cleanDescription(input);
		expect(result).not.toContain("メーカー希望小売価格");
		expect(result).not.toContain("これ以降は削除される");
		expect(result).toContain("優れたクッション性");
	});

	it("hard-cuts at 楽天BOX受取対象商品 anchor", () => {
		const input = "高品質なシューズ。楽天BOX受取対象商品 0824楽天カード スポーツキーワード";
		const result = cleanDescription(input);
		expect(result).not.toContain("楽天BOX");
		expect(result).toContain("高品質なシューズ");
	});

	it("filters sentences containing 在庫を共有", () => {
		const input = "軽量で快適なシューズです。こちらの商品は店頭と在庫を共有しているためご注意ください。ランニングに最適です。";
		const result = cleanDescription(input);
		expect(result).not.toContain("在庫を共有");
		expect(result).toContain("軽量で快適なシューズです");
		expect(result).toContain("ランニングに最適です");
	});

	it("filters sentences containing 初期不良以外", () => {
		const input = "通気性に優れたアッパー。初期不良以外、上記の理由による返品交換は致しかねます。快適な履き心地です。";
		const result = cleanDescription(input);
		expect(result).not.toContain("初期不良以外");
		expect(result).toContain("通気性に優れたアッパー");
	});

	it("filters sentences containing モニター and 色 and 異なる", () => {
		const input = "優れた耐久性。ブラウザやお使いのモニター環境により掲載画像と実際の商品の色味が若干異なる場合があります。";
		const result = cleanDescription(input);
		expect(result).not.toContain("モニター環境");
		expect(result).toContain("優れた耐久性");
	});

	it("strips [ABCマート][ABCmart] store tag clusters", () => {
		const input = "軽量シューズ。[ABCマート][ABCmart][abcmart][エービーシーマート]";
		const result = cleanDescription(input);
		expect(result).not.toContain("[ABCマート]");
		expect(result).not.toContain("[ABCmart]");
	});

	it("strips hashtag clusters", () => {
		const input = "ランニングシューズ。#NIKE #NIKE メンズ #NIKE ランニング";
		const result = cleanDescription(input);
		expect(result).not.toContain("#NIKE");
	});

	it("strips cpn tracking codes", () => {
		const input = "快適なシューズです。cpn3000 cpn2buy cpnrunshoes";
		const result = cleanDescription(input);
		expect(result).not.toContain("cpn3000");
		expect(result).not.toContain("cpnrunshoes");
	});

	it("strips size keyword lists", () => {
		const input = "スニーカー。25cm 25.5cm 26cm 26.5cm 27cm 27.5cm 28cm";
		const result = cleanDescription(input);
		expect(result).not.toMatch(/25cm 25\.5cm 26cm/);
	});

	it("converts ◇ bullets to <ul><li>", () => {
		const input = "◇特長その1。◇特長その2。";
		const result = cleanDescription(input);
		expect(result).toContain("<ul>");
		expect(result).toContain("<li>");
		expect(result).toContain("特長その1");
		expect(result).toContain("特長その2");
	});

	it("converts ● bullets to <ul><li>", () => {
		const input = "●軽量設計。●通気性に優れたアッパー。";
		const result = cleanDescription(input);
		expect(result).toContain("<ul>");
		expect(result).toContain("<li>軽量設計");
		expect(result).toContain("<li>通気性に優れたアッパー");
	});

	it("converts ■key：value pairs to a specs table", () => {
		const input = "■カラー：ブラック■素材：合成繊維■生産国：ベトナム";
		const result = cleanDescription(input);
		expect(result).toContain('<table class="product-specs">');
		expect(result).toContain("<th>カラー</th>");
		expect(result).toContain("<td>ブラック</td>");
		expect(result).toContain("<th>素材</th>");
		expect(result).toContain("<th>生産国</th>");
	});

	it("converts ■header without colon to <p><strong>", () => {
		const input = "■商品説明";
		const result = cleanDescription(input);
		expect(result).toContain("<strong>商品説明</strong>");
		expect(result).not.toContain("<table");
	});

	it("wraps plain text in <p> tags", () => {
		const input = "バランスの良い履き心地でランを後押しします。";
		const result = cleanDescription(input);
		expect(result).toContain("<p>");
		expect(result).toContain("バランスの良い履き心地");
	});

	it("formats 【xxx】 markers as <strong> inline", () => {
		const input = "【商品特徴】軽量で快適なシューズです。";
		const result = cleanDescription(input);
		expect(result).toContain("<strong>商品特徴</strong>");
	});

	it("real-world caption: description in <ul>, spec table present, boilerplate removed", () => {
		const caption = mockAPICall()[0].Item.itemCaption;
		const result = cleanDescription(caption);
		expect(result).toContain("<ul>");
		expect(result).toContain("バランスの良い履き心地");
		expect(result).toContain('<table class="product-specs">');
		expect(result).toContain("<th>カラー(メーカー表記)</th>");
		expect(result).not.toContain("在庫を共有");
		expect(result).not.toContain("初期不良以外");
	});
});

describe("extractShortDescription", () => {
	it("returns empty string for empty input", () => {
		expect(extractShortDescription("")).toBe("");
	});

	it("strips leading ◇ marker", () => {
		const input = "◇軽量で快適なシューズです。ランニングに最適。";
		const result = extractShortDescription(input);
		expect(result).not.toMatch(/^◇/);
		expect(result).toContain("軽量で快適なシューズです");
	});

	it("strips leading ● marker", () => {
		const input = "●高反発クッションを採用。長距離に最適なシューズ。";
		const result = extractShortDescription(input);
		expect(result).not.toMatch(/^●/);
	});

	it("returns at most first 2 sentences", () => {
		const input = "文章1です。文章2です。文章3です。文章4です。";
		const result = extractShortDescription(input);
		expect(result).toContain("文章1です");
		expect(result).toContain("文章2です");
		expect(result).not.toContain("文章3です");
	});

	it("cuts before ■ spec block", () => {
		const input = "快適な履き心地。■カラー：ブラック■素材：合成繊維";
		const result = extractShortDescription(input);
		expect(result).not.toContain("■カラー");
		expect(result).toContain("快適な履き心地");
	});

	it("does not exceed 250 characters", () => {
		const longSentence = "あ".repeat(300) + "。次の文。";
		const result = extractShortDescription(longSentence);
		expect(result.length).toBeLessThanOrEqual(250);
	});

	it("real-world caption: returns opening description only, not specs", () => {
		const caption = mockAPICall()[0].Item.itemCaption;
		const result = extractShortDescription(caption);
		expect(result).toContain("バランスの良い履き心地");
		expect(result).not.toContain("■カラー");
		expect(result.length).toBeLessThanOrEqual(250);
	});
});
