import * as deepl from "deepl-node";
import 'dotenv/config'

// Strips boilerplate/SEO junk from Rakuten captions and returns clean HTML
export function cleanDescription(raw: string): string {
	if (!raw) return '';

	let text = raw;

	// 0. Decode HTML entities
	text = text
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&emsp;/g, ' ');

	// 0b. Strip leading store navigation prefix ("お店TOP＞カテゴリ＞...")
	text = text.replace(/^お店TOP＞[^\n]*\n?/, '').trim();

	// 0c. Strip Adidas official shop prefix block (everything up to the actual description)
	text = text.replace(/^Brand：[\s\S]*?スポーツブランドアディダス公式ショップ返品・交換について/, '').trim();

	// 1. Remove duplicate second copy (many listings paste description twice)
	const probeLen = Math.min(80, Math.floor(text.length / 3));
	if (probeLen > 5) {
		const probe = text.slice(0, probeLen);
		const dupeStart = text.indexOf(probe, probeLen);
		if (dupeStart > probeLen) text = text.slice(0, dupeStart).trim();
	}

	// 2. Hard-cut at boilerplate anchors — everything from this point on is junk
	const hardCuts = [
		'メーカー希望小売価格はメーカーサイトに基づいて掲載しています',
		'メーカー希望小売価格はメーカーカタログに基づいて掲載しています',
		'メーカー希望小売価格はメーカー商品タグに基づいて掲載しています',
		'楽天BOX受取対象商品',
		'smtb-m',
		'【商品の購入にあたっての注意事項】',
		'アルペン alpen スポーツデポ SPORTSDEPO',
		'スーパースポーツゼビオ ゼビオ Super Sports XEBIO',
		'関連キーワード',   // covers 【関連キーワード】, ※関連キーワード※, etc.
		'検索ワード：',
		'商品キーワード',
		'関連ワード',       // covers ■関連ワード／用途
		'関連商品はこちら',
		'Other Color',
		'■当店利用時のご注意',
		'参考検索キーワード',
		'HOT KEYWORD',
		'様々なシーンで利用できます',
		'様々なシーンで活用いただけます',
		'検索関連ワード',
		'よくある打ち間違い',
	];
	for (const cut of hardCuts) {
		const idx = text.indexOf(cut);
		if (idx !== -1) text = text.slice(0, idx).trim();
	}

	// 3. Strip inline spam patterns
	text = text
		.replace(/(\[[\w\uFF00-\uFFEF\u3040-\u9FFF\s]+\]){2,}/g, '')   // [店名][店名]... tag clusters
		.replace(/\[[^\]]*\/[^\]]*\]/g, '')                               // [スポーツ/ブランド：X/] taxonomy tags
		.replace(/#[\w\u3040-\u9FFF]+/g, '')                             // hashtags
		.replace(/(\d{2}\.?\d?cm[\s\u3000]){3,}/g, '')                  // size keyword lists (25cm 25.5cm...)
		.replace(/\bcpn[\w]+([\s\u3000]+cpn[\w]+)*/g, '')               // cpn tracking codes
		.replace(/\d+%OFF[\s\S]*?23:59/g, '')                           // coupon block
		.replace(/カラーバリエーション\s*$/, '')                          // trailing marker
		.replace(/【(?:color|size):[^】]*】\s*/gi, '')                   // 【color:X】 【size:X】 Adidas tags
		.replace(/【\d{2}[a-z]+】\s*/gi, '')                            // 【26cc】 size tags
		.replace(/\([A-Z]{4}[A-Z0-9]{2,}[^)]{0,80}\)/g, '');          // (BFJBAJ NIKE 靴 クツ...) SEO blocks

	// 4. Filter boilerplate sentences (split on 。)
	const boilerplatePatterns: RegExp[] = [
		/在庫を共有/,
		/お荷物伝票/,
		/お使いのモニター/,
		/ブラウザ.{0,40}(色|異なる)/,
		/モニター.{0,40}色.{0,20}異なる/,
		/モニタにより実際/,
		/モニターの発色/,
		/ディスプレイ.{0,40}(色|異なる)/,
		/掲載画像と実際/,
		/実際の商品と色味が異なる/,
		/在庫反映.{0,20}時間/,
		/楽天\(株\)/,
		/先着順/,
		/あす楽/,
		/ラッピング.*お受けする/,
		/実店舗.*他ショッピングモール/,
		/初期不良以外/,
		/返品交換は致しかねます/,
		/ご了承の上.*ご注文/,
		/メール便.*配送/,
		/送料無料.*対象商品/,
		/掲載の価格.*予告なく変更/,
		/シューズの製造過程で.*接着剤/,
		/靴ひもの長さについては/,
		/一部商品において弊社カラー表記/,
		/ブランドやシリーズによっては甲高/,
		/足のサイズは甲高.*個人差/,
		/ワイズを確認の上お買い求め/,
		/システム上在庫の反映/,
		/弊社独自の採寸/,
		/個人輸入.*お取り扱い/,
		/第三者への譲渡.*転売/,
		/通関時.*関税/,
		/代引きはご利用いただけません/,
		/日時指定は出来ません/,
		/ポスト投函.*お届け/,
		/LINE友だち登録/,
		/クリックすると.*一覧/,
		/商品価格は為替変動/,
		/広告文責/,
	];
	const sentences = text.split('。');
	// Preserve sentences that contain structural markers (■ specs, ◇●◆ bullets, ・ lists)
	// even if they also contain boilerplate phrases embedded in the same chunk
	text = sentences.filter(s =>
		/[■◇●◆・]/.test(s) || !boilerplatePatterns.some(re => re.test(s))
	).join('。').trim();

	// 5. Route to correct formatter
	if (/^商品名[:：]/.test(text)) {
		return handleInlineSpecFormat(text);
	}
	return formatDescriptionHtml(text);
}

// ASICS inline format: "商品名:X カラー:X アッパー:X ... コメント: actual description text"
function handleInlineSpecFormat(text: string): string {
	const commentMatch = text.match(/コメント[:：]\s*([\s\S]+)$/);
	if (!commentMatch) return formatDescriptionHtml(text);

	const descPart = commentMatch[1].trim();
	const specPart = text.slice(0, text.indexOf(commentMatch[0])).trim();

	// Parse "Key:Value Key:Value ..." from the spec portion
	const specRows: [string, string][] = [];
	const keyPattern = /([^\s:：]{1,15})[:：]([^:：]+?)(?=\s+[^\s:：]{1,15}[:：]|$)/g;
	let m: RegExpExecArray | null;
	while ((m = keyPattern.exec(specPart)) !== null) {
		const key = m[1].trim();
		const val = m[2].replace(/※[^\s][^※\n]*/, '').trim(); // strip ※disclaimer from values
		if (key && val) specRows.push([key, val]);
	}

	let html = '';
	if (specRows.length > 0) {
		const rows = specRows.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('');
		html += `<table class="product-specs">${rows}</table>\n`;
	}
	html += formatDescriptionHtml(descPart);
	return html;
}

function formatDescriptionHtml(text: string): string {
	// Normalize ・ bullets: only when preceded by whitespace (not inline like メンズ・レディース)
	text = text.replace(/(?<!\S)・/g, '\n・');

	// Insert newline before section markers so we can split cleanly
	text = text.replace(/([◇●◆])/g, '\n$1').replace(/(■)/g, '\n■');

	const segments = text.split('\n').map(s => s.trim()).filter(Boolean);

	const parts: string[] = [];
	const bulletBuffer: string[] = [];
	const specRows: [string, string][] = [];

	// Bullet content that is boilerplate — suppress these even as bullets
	const bulletBoilerplate: RegExp[] = [
		/商品画像について/,
		/掲載在庫について/,
		/弊社独自の採寸/,
		/モニター.*異なる/,
		/ご了承/,
	];

	const flushBullets = () => {
		if (bulletBuffer.length > 0) {
			parts.push('<ul>' + bulletBuffer.map(b => `<li>${b}</li>`).join('') + '</ul>');
			bulletBuffer.length = 0;
		}
	};
	const flushSpecs = () => {
		if (specRows.length > 0) {
			const rows = specRows.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('');
			parts.push(`<table class="product-specs">${rows}</table>`);
			specRows.length = 0;
		}
	};

	for (const seg of segments) {
		if (seg.startsWith('◇') || seg.startsWith('●') || seg.startsWith('◆')) {
			const content = seg.replace(/^[◇●◆]/, '').trim();
			if (!bulletBoilerplate.some(re => re.test(content))) {
				flushSpecs();
				bulletBuffer.push(content);
			}
		} else if (seg.startsWith('・')) {
			const content = seg.replace(/^・/, '').trim();
			if (!bulletBoilerplate.some(re => re.test(content))) {
				flushSpecs();
				bulletBuffer.push(content);
			}
		} else if (seg.startsWith('■')) {
			flushBullets();
			const content = seg.replace(/^■/, '').replace(/■$/, '').trim();
			const specMatch = content.match(/^(.{1,20})[：:](.+)$/);
			if (specMatch) {
				specRows.push([specMatch[1].trim(), specMatch[2].trim()]);
			} else {
				flushSpecs();
				parts.push(`<p><strong>${content}</strong></p>`);
			}
		} else {
			flushBullets();
			flushSpecs();
			const subSentences = seg.split('。').map(s => s.trim()).filter(Boolean);
			for (const s of subSentences) {
				const formatted = s.replace(/【(.+?)】/g, '<strong>$1</strong>');
				parts.push(`<p>${formatted}。</p>`);
			}
		}
	}
	flushBullets();
	flushSpecs();

	return parts.join('\n');
}

// First 1–2 sentences before any ■ spec block — used for WooCommerce short_description
export function extractShortDescription(raw: string): string {
	if (!raw) return '';

	let text = raw;

	// ASICS inline format: extract description part after コメント:
	if (/^商品名[:：]/.test(text)) {
		const m = text.match(/コメント[:：]\s*([\s\S]+)$/);
		if (m) text = m[1].trim();
	}

	// Adidas prefix block: extract after the boilerplate header
	if (text.startsWith('Brand：')) {
		const marker = 'スポーツブランドアディダス公式ショップ返品・交換について';
		const idx = text.indexOf(marker);
		if (idx !== -1) text = text.slice(idx + marker.length).trim();
	}

	const beforeSpecs = text.split('■')[0].replace(/^[◇●◆]/, '').trim();
	const sentences = beforeSpecs.split('。').filter(Boolean);
	return (sentences.slice(0, 2).join('。') + '。').slice(0, 250);
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
	const hasChinese = /[\u4e00-\u9fff]/.test(keyword);
	if (!hasChinese) {
		console.log(`[translateKeyword] no Chinese detected — using keyword as-is: "${keyword}"`);
		return keyword;
	}
	const deeplClient = new deepl.DeepLClient(process.env.DEEPL_API_KEY!);
	const result = await deeplClient.translateText(keyword, "zh", "ja");
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
