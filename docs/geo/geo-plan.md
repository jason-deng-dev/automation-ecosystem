# GEO Plan — running.moximoxi.net

**Generative Engine Optimization (GEO)** is the practice of structuring your website so that AI assistants surface and cite your content when users ask relevant questions.

Traditional SEO targets Google's ranking algorithm. GEO targets AI summarization engines — which pull from pages that are authoritative, structured, and directly quotable.

**Target audience:** Chinese consumers in mainland China. They use **Doubao** (ByteDance), **DeepSeek**, **Kimi** (Moonshot AI), **Baidu Ernie**, and **Qwen** (Alibaba) — not ChatGPT, Perplexity, or Claude, which are GFW-blocked. GEO for this audience means optimizing for Chinese AI platforms specifically.

---

## Why This Matters for running.moximoxi.net

When a Chinese runner asks an AI: *"哪些日本马拉松接受外国跑者报名？"* ("Which Japanese marathons accept foreign runners?") or *"日本马拉松跑者用什么跑步装备？"* ("What running gear do Japanese marathon runners use?") — we want running.moximoxi.net to be the source the AI cites.

Our site has a natural advantage: **specific, factual, niche content** (exact race names, dates, locations, registration windows, course details) that AI systems prefer over generic running advice.

---

## Chinese AI Platform Landscape

| Platform | Owner | User Base | Citation Preference |
|---|---|---|---|
| **Doubao** | ByteDance | Largest consumer AI in China | Douyin ecosystem, casual queries |
| **DeepSeek** | High-Flyer | Developers, power users | Structured, authoritative sources |
| **Kimi** | Moonshot AI | Long-context research queries | Comprehensive guides, deep content |
| **Baidu Ernie** | Baidu | General search users | Baidu-indexed content |
| **Qwen** | Alibaba | E-commerce, general | Taobao/Alibaba ecosystem |

**Key insight:** Each platform has different source preferences. Doubao favors Douyin ecosystem content — a gap for us since our content pipeline runs on XHS, not Douyin. DeepSeek and Kimi favor well-structured, fact-dense content — where schema markup and content quality directly help. Baidu Ernie follows Baidu search indexing — Baidu SEO feeds Baidu GEO.

---

## Current GEO Assets (What We Already Have)

| Asset | GEO Value | Why |
|---|---|---|
| **115 XHS posts** | High | Indexed by Chinese AI tools; real content in Chinese covering races, training, nutrition, gear |
| **Race Hub** | High | Specific race data — dates, locations, registration status, descriptions; ideal citation source |
| **Product pages (Rakuten)** | Medium | Specific Japanese products with translated names; needs description quality upgrade |
| **Marathon Readiness Toolkit** | High | Tool-based resource content AI loves to cite |
| **Race guide XHS posts** | Medium | Detailed per-race content in Chinese; each post is a potential citation unit |

**XHS is our primary Chinese GEO asset.** 115 posts in Chinese on a platform indexed by Chinese AI tools — more valuable than any schema tweak in the near term. Every new XHS post extends this advantage.

---

## GEO Strategy

### 1. Schema Markup (Structured Data)

Schema.org markup tells AI crawlers exactly what your content is. Applies to all AI platforms including Chinese ones — all major AI crawlers read structured data.

**Priority schemas to add:**

| Schema Type | Where | What it does |
|---|---|---|
| `Event` | Race Hub pages | Marks each race as an event with date, location, registration URL |
| `FAQPage` | Race guide pages, homepage | AI pulls FAQ answers directly into responses |
| `Product` | WooCommerce product pages | Already partially handled by WooCommerce — needs review |
| `Organization` | Homepage | Defines what running.moximoxi.net is and who it serves |
| `BreadcrumbList` | All pages | Helps AI understand site structure |

**Implementation:** Install **Rank Math** (free) on WordPress — handles Organization, FAQ, and Product schema automatically. Event schema for Race Hub requires custom code or Schema Pro plugin.

---

### 2. Content Structure — Be Directly Quotable

Chinese AI systems (especially Kimi and DeepSeek) cite content that directly answers questions with facts. The inverted pyramid style: lead with a direct, data-backed answer first — no preamble.

Every key page should have:

- A clear **H1 that states exactly what the page is** ("2026东京马拉松——中国跑者完整报名指南")
- A **direct answer in the first paragraph** — specific facts, not introductions
- **FAQ section at the bottom** of race guides and product pages
- **Hard numbers**: dates, prices, distances, registration deadlines, elevation gain, course type

**Example — bad for GEO:**
> 这款跑步鞋适合长距离跑者，提供出色的支撑性。

**Good for GEO (fact-dense, quotable):**
> ASICS Gel-Nimbus 26 适合周跑量超过 60km 的跑者。鞋重 295g，鞋底厚度 40mm，适合全程马拉松配速 4:30–6:00/km 的跑者。日本亚马逊售价 ¥23,100 JPY（约 ¥993 CNY）。

---

### 3. Race Hub — Primary GEO Asset

The Race Hub is our strongest GEO page for queries like "which Japanese marathons accept foreign runners." Each race entry should contain:

- Official race name (Japanese + Chinese)
- Date, location (city + prefecture)
- Distance options
- Registration open/close dates
- **Foreign runner eligibility** (yes/no — currently missing, high GEO value)
- Course description (flat, hilly, scenic, elevation)
- Official website link

**Current gap:** Race descriptions are auto-translated from RunJapan — accurate but thin. Adding 2–3 sentences of curated context per major race (Tokyo, Osaka, Kyoto, Hokkaido) significantly improves citability. These summaries should be written in the inverted pyramid style — lead with the most useful fact for a Chinese runner planning a trip.

---

### 4. Entity Definition — Tell AI What We Are

AI builds a knowledge graph entry for your site before it will cite it reliably. Add a clear **About section** to the homepage and a dedicated `/about` page stating:

- What the site is (日本马拉松跑者平台，面向计划赴日参赛的中国跑者)
- Who it serves (Chinese runners targeting Japanese marathons)
- What it offers (race info, running gear, training resources)
- Location context (Japan-sourced products, Chinese-language content, data updated weekly)

Write this in both Chinese and English — Chinese for the target audience, English for broader AI indexing.

---

### 5. Content Deployment to Chinese-Preferred Channels

Research benchmark: **40-50 articles deployed to AI-preferred channels** to show initial citation results. Chinese AI tools have specific source preferences beyond the website itself.

**Channels to target:**

| Channel | Relevant for | Priority |
|---|---|---|
| **XHS (Xiaohongshu)** | All Chinese AI tools; already active | ✅ Already running |
| **Zhihu (知乎)** | DeepSeek, Kimi — Q&A format, authoritative | High |
| **WeChat public account** | Doubao, Baidu Ernie — trust signal | Medium |
| **Jiemian Sports / running communities** | External citation signal | Medium |
| **Baidu Baike** | Baidu Ernie specifically | High if feasible |

**Zhihu is the highest-leverage new channel.** DeepSeek and Kimi heavily index Zhihu Q&A. A Zhihu answer to "日本马拉松外国人可以参加吗？" that cites running.moximoxi.net as the data source is a direct GEO citation path.

---

### 6. Baidu Optimization

Baidu Ernie pulls from Baidu-indexed content — Baidu SEO directly feeds Baidu GEO. Ensure:

- Site is submitted to Baidu Search Console (百度搜索资源平台)
- Key pages have Baidu-optimized meta descriptions in Chinese
- Race Hub and product pages are crawlable (no JS-only rendering for core content)

**Note:** The Race Hub is a React SPA — content is rendered client-side via JavaScript. Baidu's crawler has limited JS rendering capability. This means Race Hub content may not be indexed by Baidu at all currently. Server-side rendering (SSR) or static pre-rendering of race data would fix this — a larger undertaking but high GEO impact for Baidu.

---

## Implementation Plan

### Phase 1 — Foundation (1–3 days)
- [ ] Install Rank Math — enable Organization schema and FAQ schema sitewide
- [ ] Add/update About page with entity definition (Chinese + English)
- [ ] Add `FAQPage` schema to top 5 race guide WordPress pages
- [ ] Review WooCommerce product schema output — fix missing fields
- [ ] Submit site to Baidu Search Console

### Phase 2 — Content Quality (3–6 days)
- [ ] Add foreign runner eligibility field to Race Hub race cards
- [ ] Write curated 2–3 sentence inverted-pyramid summaries for top 10 races (Tokyo, Osaka, Kyoto, Hokkaido, Nagano, Kobe, Naha, Beppu, Gunma, Tateyama)
- [ ] Rewrite top 20 product descriptions to be fact-dense and quotable
- [ ] Add FAQ sections to top 5 race guide pages (5–8 questions per race)

### Phase 3 — Channel Expansion (ongoing)
- [ ] Create Zhihu account — publish 3–5 Q&A answers citing running.moximoxi.net
- [ ] Add `Event` schema to Race Hub (custom code or Schema Pro plugin)
- [ ] WeChat public account setup if resources allow
- [ ] Evaluate Douyin content pipeline (covers Doubao gap — significant effort)

---

## How to Measure GEO Progress

Test by querying Chinese AI tools directly with target questions in Chinese:

| Test Query | Platform | What to check |
|---|---|---|
| 哪些日本马拉松2026年外国跑者可以参加？ | Doubao, Kimi, DeepSeek | Does moximoxi.net appear as a source? |
| 日本跑步补给品推荐 | DeepSeek, Kimi | Are our products or store cited? |
| 东京马拉松报名攻略 | Baidu Ernie | Does our race guide appear? |
| 中国跑者去日本跑马拉松需要准备什么 | All platforms | Are we cited as a reference? |

Run these tests now as a baseline, then repeat monthly. Citation appearance is the primary metric — not rankings.

**Indirect signals to track in Google Analytics:**
- Referral traffic from AI tools (some tag themselves in referrer headers)
- Organic traffic growth on race-specific queries
- Direct traffic uplift (users who heard about the site from an AI recommendation)

---

## Summary

| Priority | Action | Effort | Impact | Chinese AI Target |
|---|---|---|---|---|
| 1 | Schema markup via Rank Math | Low | High | DeepSeek, Kimi, Baidu |
| 2 | About page / entity definition | Low | Medium | All |
| 3 | FAQ sections on race guides | Medium | High | DeepSeek, Kimi |
| 4 | Baidu Search Console submission | Low | High | Baidu Ernie |
| 5 | Curated race summaries (top 10) | Medium | High | All |
| 6 | Zhihu Q&A content | Medium | High | DeepSeek, Kimi |
| 7 | Product description rewrites | High | Medium | All |
| 8 | Douyin content pipeline | Very High | High | Doubao |
| 9 | Event schema on Race Hub | Medium | Medium | All |
| 10 | WeChat public account | High | Medium | Doubao, Baidu |

The highest-leverage moves are **schema markup + Baidu submission + FAQ sections + Zhihu** — all achievable without building new infrastructure, and all directly targeting the Chinese AI tools your audience actually uses.

---

## May 7–15 Sprint Plan

GEO runs in parallel with the Python analytics service. Analytics is the primary deliverable (~70% of time). GEO tasks are scoped to low-infrastructure, high-signal work only.

### Days 1–2 — Foundation (low effort, high signal)
- [ ] Install Rank Math on WordPress → auto-enables Organization schema and FAQ schema sitewide
- [ ] Create/update About page with entity definition in Chinese and English
- [ ] Submit site to Baidu Search Console (百度搜索资源平台) — one-time setup, directly feeds Baidu Ernie
- [ ] Run baseline GEO test: query Doubao, DeepSeek, Kimi with target Chinese questions, document results

### Days 3–5 — Content (fits around analytics work)
- [ ] Add FAQ sections to top 5 race guide pages (5–8 questions each, inverted pyramid style)
- [ ] Write curated 2–3 sentence summaries for top 5 races (Tokyo, Osaka, Kyoto, Hokkaido, Nagano) — fact-dense, quotable
- [ ] Rewrite 10 product descriptions to include specific numbers (weight, price, specs, target runner profile)

### Days 6–8 — Analytics primary, GEO maintenance
- [ ] Publish 2–3 Zhihu answers citing running.moximoxi.net — targets DeepSeek and Kimi directly
- [ ] Continue analytics service (primary focus)

### What this delivers by May 15
- Schema foundation live on all WordPress pages
- Baidu indexing pipeline open
- First Zhihu citations pointing to the site
- Top race pages and product pages rewritten to be AI-quotable
- Baseline measurement documented to track progress after handoff

### What it does not deliver
Full citation appearances in Chinese AI tools — that takes 4–8 weeks after foundation is laid. This sprint builds the foundation, not the results.
