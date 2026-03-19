**Project:** rednote-content-automation

**Platform:** running.moximoxi.net — Japanese marathon platform for Chinese runners

**GitHub:** [https://github.com/jason-deng-dev/rednote-content-automation](https://github.com/jason-deng-dev/rednote-content-automation)

**Author:** Jason Deng

**Date:** March 2026

**Status:** In Development

---

## 1. Problem Statement

### 1.1 Context

running.moximoxi.net is a marathon platform targeting **Chinese runners based in China** who are interested in running Japanese marathons and buying Japanese running products. The audience is not expats — they are runners in China who see Japan as an aspirational race destination and Japanese running gear/nutrition as premium, authentic products.

The platform has four core destinations:

- **/shop/** — Japanese running nutrition (FANCL, Amino Vital, Pocari Sweat, SAVAS PRO, salt tabs)
- **/mara-prep-tools/** — Training analytics suite (pace calculator, goal calibration, trendline tracker)
- **/community/** — Community hub for Chinese runners targeting Japanese races
- **Race listings** — Upcoming Japanese marathon database (RunJapan data)

Traffic and user acquisition is driven through Xiaohongshu (RedNote / XHS) — the dominant discovery channel for Chinese runners interested in overseas race experiences. The account MOXI爱跑步 has published **115 posts manually over several months**, accumulating **60,481 total views** and generating a real performance dataset that directly informs this pipeline's design.

### 1.2 The Problem

Manual content creation is the bottleneck. Writing each post requires:

- Researching relevant race or training topic with a Japan angle
- Writing Chinese-language copy in XHS format (multi-page, emoji-heavy, no markdown headers)
- Formatting for the platform's unique constraints (links only in comments, not post body)
- Publishing manually through the app

At current pace, consistent daily publishing is not sustainable alongside product development.

### 1.3 Why This Pipeline Is Different

Most automated content systems are built on assumptions. This one is built on **115 posts of real performance data** — manually created and published over months — that reveal exactly which content types drive views, saves, and high CTR with this specific audience. The generator's prompt strategy, rotation schedule, and content weighting are all derived from this empirical baseline, not guesswork.

### 1.4 Goals

- Generate varied, on-brand Chinese-language XHS posts daily using the Claude API
- Source live race data from the race-updater pipeline as generation context
- Auto-publish to RedNote with zero human intervention required
- Funnel every post toward one of four platform destinations
- Weight content types by proven performance data, not intuition

### 1.5 Non-Goals

- Image generation — posts are text-only for now
- Multi-platform publishing (XHS only in v1)
- Real-time analytics on post performance
- Paid promotion or ad buying

---

## 2. Audience Definition

### 2.1 Primary Audience

**Chinese recreational-to-intermediate runners, based in China, interested in Japan.**

Key characteristics:

- Targeting Japanese marathons (Tokyo, Osaka, Kyoto, Hokkaido, Fuji) as bucket-list races
- View Japanese running nutrition (Amino Vital, Pocari Sweat, FANCL, SAVAS PRO) as premium and authentic
- Use XHS as their primary discovery platform for overseas race research
- Range from first-time marathon consideration to repeat Japan race participants
- High cross-border purchase intent — willing to buy Japanese products via proxy/forwarding services

### 2.2 Content Framing Implications

Because the audience is **in China, not in Japan**, every content angle must be framed accordingly:

|Topic|Wrong Framing (expat)|Correct Framing (China-based)|
|---|---|---|
|Race guides|"Here's what to do when you get there"|"Here's everything you need to plan your Japan marathon trip"|
|Japanese products|"Buy these at your local convenience store"|"These are the exact products Japanese elite runners use — here's how to get them"|
|Training tips|"Prepare for your next local race"|"How to train in China to be ready for a Japanese marathon"|
|Community|"Find training partners near you in Japan"|"Connect with other Chinese runners planning Japan marathons"|

This framing shift affects the system prompt, CTA language, and post structure throughout the pipeline.

---

## 3. Performance Data Analysis

> This section documents the empirical foundation for all content strategy decisions in this pipeline. Data is drawn from 115 manually published posts on the MOXI爱跑步 account over several months of operation.

### 3.1 Overall Baseline

|Metric|Value|
|---|---|
|Total posts analyzed|115|
|Total views|60,481|
|Average views per post|526|
|Median views per post|192|
|Average CTR|0.125|

The large gap between mean (526) and median (192) views indicates a power-law distribution — a small number of posts drive disproportionate traffic. The generator should be optimized to replicate the conditions of top performers, not average posts.

### 3.2 Performance by Content Category

|Category|Posts|Avg Views|Avg CTR|Avg Saves|Avg Engagement|Total Views|
|---|---|---|---|---|---|---|
|Race Guide|48|721|0.140|12.75|34.6|34,610|
|Training Science|15|588|0.110|6.80|21.0|8,827|
|Comparison / Other|30|376|0.130|4.90|14.5|11,290|
|Nutrition|7|385|0.110|4.43|11.3|2,694|
|Health & Recovery|12|229|0.120|1.50|6.4|2,745|

**Key finding:** Race Guides account for 57% of all total views despite being 42% of posts, and drive the highest saves — the strongest signal of purchase and action intent on XHS.

### 3.3 Top Performers by Views

|Title|Category|Views|CTR|Saves|Engagement|
|---|---|---|---|---|---|
|日本最值得跑的8场马拉松|Race Guide|7,065|0.201|183|375|
|为什么你的"慢跑"根本不够慢？|Training Science|5,239|0.153|48|131|
|起终点与动线全攻略｜福州马拉松|Race Guide|3,124|0.162|28|75|
|赛前早餐怎么吃？不胀又有力|Nutrition|2,351|0.248|28|59|
|东京马拉松2026全攻略|Race Guide|2,234|0.236|18|31|
|每天跑多久才算有效？3 vs 5 vs 10公里|Comparison|2,106|0.142|8|25|
|目标配速，你真的跑过吗？|Training Science|1,907|0.194|10|62|
|富士山马拉松2025｜全程马拉松篇|Race Guide|1,883|0.157|26|82|
|2025/2026日本半马怎么选?|Race Guide|1,755|0.170|71|131|

### 3.4 Top Performers by Saves (High Purchase/Action Intent)

Saves indicate the reader wants to reference the content again — the strongest proxy for intent to plan a trip or buy a product:

|Title|Saves|Views|Save Rate|Category|
|---|---|---|---|---|
|日本最值得跑的8场马拉松|**183**|7,065|2.6%|Race Guide|
|2025/2026日本半马怎么选?|**71**|1,755|4.0%|Race Guide|
|2025东京/大阪落选了？别急|**53**|1,425|3.7%|Race Guide|
|为什么你的"慢跑"根本不够慢？|**48**|5,239|0.9%|Training Science|
|马拉松比赛日9条黄金法则|**47**|1,449|3.2%|Race Guide|
|Canova训练法：让马拉松快2–3分钟|**46**|852|5.4%|Race Guide|

Race Guides dominate saves. Save rates of 2-5% are extremely high for XHS. Saves also boost algorithmic distribution, making this a compounding signal.

### 3.5 Top Performers by CTR (Title Effectiveness)

|Title|CTR|Views|Pattern|
|---|---|---|---|
|早晚各跑 vs 一次性跑完 vs 隔天跑|**0.252**|562|Direct comparison format|
|赛前早餐怎么吃？不胀又有力|**0.248**|2,351|Question + dual benefit|
|跑步和睡眠的关系：晚上跑会影响睡觉吗？|**0.247**|1,230|Counterintuitive question|
|3:30不是目标，4:58/km才是|**0.242**|616|Reframe hook|
|东京马拉松2026全攻略|**0.236**|2,234|Specific race + guide|
|目标配速，你真的跑过吗？|**0.194**|1,907|Challenge assumption|

Titles that challenge assumptions, use direct comparisons (X vs Y vs Z), or make a specific promise consistently outperform generic descriptive titles. The generator must enforce these patterns explicitly.

### 3.6 Failure Patterns — What the Data Says to Avoid

|Pattern|Example|Performance|Root Cause|
|---|---|---|---|
|Series format (EP1, EP2...)|比赛当天策略 第1-7集|Avg 45 views, 0.08 CTR|Audience doesn't follow series on XHS|
|Generic seasonal tips|夏季训练期：防中暑|7 views|No specific hook or search intent|
|Philosophical / fluffy|享受属于你的舞台|18 views|Zero actionable takeaway|
|Vague topic, no anchor|跑量怎么分配更稳？|36 views|No race or timing context|
|Weak title tension|比赛当天策略|89 views, 0.087 CTR|No promise, no curiosity hook|

**Generator must explicitly avoid:** series framing, seasonal content without a specific race anchor, and titles without tension or a clear promise.

### 3.7 Nutrition Is Critically Undersampled

Only **7 Nutrition posts** have been published vs **48 Race Guide posts**. Yet Nutrition achieves the highest single CTR in the entire dataset (0.248) and has a direct conversion pathway to the store. This category is statistically underrepresented and likely the highest-ROI pillar to expand. The generator should treat Nutrition as a priority, not an afterthought.

### 3.8 Data-Derived Content Weighting

|Content Type|Recommended Weight|Rationale|
|---|---|---|
|Race Guides|**40%**|Highest avg views (721), highest saves, 57% of all traffic|
|Training Science|**25%**|2nd highest avg views (588), strong engagement, scalable myth-busting format|
|Nutrition / Supplements|**20%**|Highest single CTR (0.248), direct store conversion path, severely undersampled|
|Health & Recovery|**10%**|Moderate baseline but sleep/injury content shows breakout potential|
|Comparison / Myth-busting|**5%**|High CTR title format — better as a style applied within other categories|

---

## 4. System Architecture

### 4.1 High-Level Overview

```
DATA  →  GENERATE  →  FORMAT  →  PUBLISH
```

- **Stage 1 — DATA:** Race scraper pulls all upcoming Japanese marathon data into `races.json` weekly via cron
- **Stage 2 — GENERATE:** Claude API receives race context + system prompt → produces complete XHS post in Chinese
- **Stage 3 — FORMAT:** Formatter applies XHS rules: multi-page structure, emoji density, CTA, comment link
- **Stage 4 — PUBLISH:** Browser automation posts to MOXI爱跑步 XHS account

### 4.2 Component Breakdown

#### scraper.js (self-contained)

- Two-pass scrape: fetch listing page → extract race links → fetch each detail page
- Pass 1: GET `runjapan.jp` homepage, use cheerio to find all race card links (each contains a `raceId` param e.g. `raceId=E335908`)
- Pass 2: For each race link, GET the detail page and extract structured data via regex
- Scrapes all ~60 upcoming races (RunJapan only shows upcoming events, no date filtering needed)
- Fully replaces `data/races.json` on each run
- Runs weekly via cron — race listings don't change fast enough to warrant daily scraping
- Controlled via `.env`: `RUNJAPAN_BASE_URL`, `RUNJAPAN_TIMEOUT`

#### rednote-post-generator.js (core)

- Loads `races.json` to inject live race context into prompts
- Selects post type based on data-weighted rotation schedule
- If race post type, calls Claude API to choose a race
- Calls Claude API with system prompt + structured user prompt
- Passes generated post to formatter

#### content-generator/formatter.js (new)

- Validates XHS format rules: no markdown headers, multi-page breaks, emoji density
- Injects CTA text and comment-link instructions
- Outputs final post object: `{ title, body, comment_url, hashtags }`

#### content-generator/publisher.js (new)

- Playwright browser automation targeting XHS web client
- Posts title + body, then adds comment with destination URL
- Handles retry logic and session persistence

#### Cron orchestrator

- Weekly cron: scrape → update `races.json`
- Daily cron: generate → format → publish
- Logs each stage to `pipeline.log`
- Flags failures for manual review

### 4.3 Data Flow

```
RunJapan website
    ↓  (HTTP scrape, daily cron)
scraper.js
    ↓  (writes)
races.json
    ↓  (reads)
rednote-post-generator.js
    ↓  (POST /v1/messages)
Claude API  ←  system prompt + race context + performance-informed instructions
    ↓  (generated post text)
formatter.js
    ↓  (formatted XHS post object)
publisher.js
    ↓  (Playwright browser automation)
XHS / Xiaohongshu (MOXI爱跑步 account)
```

---

## 5. Technical Decisions

|Decision|Choice|Alternatives Considered|Rationale|
|---|---|---|---|
|Generation engine|Claude API (Sonnet)|OpenAI GPT-4, template strings|Superior Chinese-language quality; better instruction-following for format-constrained output|
|Browser automation|Playwright|Base64 injection, Puppeteer, manual|Better stability, built-in waiting, screenshot debugging vs brittle base64 approach|
|Post scheduling|Node-cron / shell cron|n8n, Zapier|Keeps infra local; consistent with race-updater cron pattern; no external dependency|
|Data source|races.json (file read)|Direct DB query, live scrape|Lowest coupling — race-updater owns data; generator is a pure consumer|
|Language|Node.js / JavaScript|Python|Consistent with rest of stack; no context switching|
|HTTP requests (scraper)|axios|node-fetch, native fetch|More reliable for scraping; better error handling and timeout support|
|HTML parsing (scraper)|cheerio|jsdom, regex|Lightweight jQuery-style API; purpose-built for server-side HTML parsing|
|Prompt storage|`config/prompts.json`|Hardcoded in JS, `.env`|Separates tunable content (persona, templates) from pipeline logic; employer can adjust prompts without touching code|
|CTA injection|Runtime code injection per post type|Hardcoded in system prompt|System prompt is sent on every API call — putting CTA targets there wastes tokens on context irrelevant to the current post type. Injecting a natural-language CTA description per type in `generatePosts()` keeps the system prompt lean and makes each call's context more precise. Claude also doesn't need to know actual URLs — those are hardcoded in the pipeline and injected after parsing.|
|Deployment / handoff|Docker + docker-compose|Manual server setup, PM2|Ensures consistent runtime environment across machines; Playwright browser binaries are notoriously environment-sensitive; allows non-technical handoff with a single `docker-compose up`|

---

## 6. Prompt Engineering Design

### 6.1 Persona — MOXI爱跑步

- **Tone:** Warm, knowledgeable, slightly aspirational — like a friend who has run Japanese marathons and wants to help you do the same
- **Audience:** Chinese runners based in China, planning or dreaming about running in Japan
- **Framing:** Japan as destination — races, products, and experiences are aspirational, not local
- **Voice:** First-person, conversational, genuine enthusiasm for Japanese running culture
- **Format:** XHS-native — emoji-heavy, multi-page, no markdown headers, short punchy lines
- **Goal:** Every post ends with a soft funnel toward one platform destination

### 6.2 System Prompt Structure

```
You are MOXI爱跑步, a Chinese running account focused on Japanese marathons
and Japanese running products. Your audience is Chinese runners based in China
who want to run races in Japan or buy authentic Japanese running products.

AUDIENCE FRAMING (critical):
- Japan is a destination, not where the reader lives
- Frame races as trips to plan, not local events
- Frame Japanese products as premium/authentic, worth importing
- Frame community as "finding others planning the same Japan race"

FORMAT RULES:
- Write in Simplified Chinese
- Use emojis frequently (every 2-3 lines minimum)
- Break into multiple pages using ——— dividers
- NO markdown headers (no #, ##, bold **)
- Short lines — max 20 characters per line
- End with: '链接在评论区👇'
- Do NOT include hashtags in the body

TITLE RULES (derived from performance data):
- Use comparison format when possible: X vs Y vs Z
- Include specific race names for search intent (东京, 大阪, 富士山)
- Ask counterintuitive questions that challenge assumptions
- Make a specific promise (benefit + context) in the title
- Never use series framing (第1集, EP1, etc.)
- Never use vague titles with no specific hook

OUTPUT FORMAT (critical):
Return ONLY a valid JSON object with no extra text, explanation, or markdown code blocks.
The JSON must have exactly these two fields:
- "body": the full XHS post text, ending with '链接在评论区👇'. No hashtags.
- "description": a short 1-2 sentence caption summarising the post. No hashtags.
```

### 6.3 Post Type Rotation

Based on data-derived content weighting. Wearables / Equipment will be added to the rotation once the Rakuten store has sufficient product coverage — planned to replace one Health & Recovery slot.

CTA destinations are not in the prompts — they are injected at runtime per post type in `generatePosts()`. See Section 5 (Technical Decisions) for rationale.

|Day|Post Type|Weight Rationale|CTA Destination|
|---|---|---|---|
|Mon|Race Guide|Highest traffic driver|/racehub/|
|Tue|Nutrition / Supplement|Underpublished, highest CTR|/shop/|
|Wed|Training Science|2nd highest avg views|/mara-prep-tools/|
|Thu|Race Guide|40% target weight|/racehub/|
|Fri|Nutrition / Supplement|20% target, weekend browse|/shop/|
|Sat|Training Science|Weekend training research|/mara-prep-tools/|
|Sun|Health & Recovery|Rest day content|/community/|

### 6.4 Runtime Context Injection

All user-turn prompts are dynamic. The pipeline injects the following fields at runtime before each API call:

| Field | Source | Used in |
|---|---|---|
| `{{race.*}}` | `races.json` via `chooseRace()` | Race Guide only |
| `{{month}}` | `new Date()` | All post types |
| `{{season}}` | Derived from month | All post types |

**Seasonal content guidance (applies to all post types):**

The season is injected so Claude can tailor content to what's relevant for the reader right now:

- **Winter (Dec–Feb):** Cold-weather training motivation, layering gear, indoor alternatives, warm-up routines
- **Spring (Mar–May):** Race season buildup, peak training, lightweight gear, race-day prep
- **Summer (Jun–Aug):** Heat management, hydration, early morning training, sweat-resistant gear
- **Autumn (Sep–Nov):** Marathon season peak, recovery between races, race selection for the season

This keeps posts timely without requiring manual intervention — the same prompt produces seasonally-aware content year-round.

#### Race Guide Posts

```
Post type: Race Guide
Current month: {{month}}
Race name: {{race.name}}
Date: {{race.date}}
Location: {{race.location}}
Entry period: {{race.entryStart}} – {{race.entryEnd}}
Registration open: {{race.registrationOpen}}
Registration URL: {{race.registrationUrl}}
Race website: {{race.website}}
Description: {{race.description}}

Write a complete XHS post that helps a Chinese runner in China understand
whether this race is worth travelling to Japan for, and how to plan for it.
Use the current month for seasonal context where relevant (e.g. training window,
weather at race time, how far out the race is).
CTA should direct readers to the race's dedicated page on our marathon hub
(currently: general race listings page — will be updated to deep link to the
specific marathon's hub page once the hub is live).
```

> **CTA upgrade path:** Currently links to the general race listings page (`/races/`). Once the Marathon Hub (race scraper + React SPA) is deployed, each Race Guide post will deep link to that marathon's dedicated hub page — giving readers direct access to full race details, registration links, and entry timelines without leaving the platform. The `races.json` schema already includes the `registrationUrl` and `website` fields needed to build these deep links.

#### Nutrition / Supplement Posts

```
Post type: Nutrition / Supplement
Current month: {{month}}
Current season: {{season}}

Write a nutrition or supplement tip post for marathon runners. Topic should be
broadly useful (not Japan-specific) to maximise discovery. Optionally add a soft
Japan tie-in at the end (e.g. "especially useful if you're prepping for a Japan race").
Use seasonal context to make the topic timely: summer posts can focus on hydration
and electrolytes; winter posts on cold-weather nutrition and immune support.
Use a counterintuitive hook or X vs Y comparison format in the title.
CTA should direct readers to the store at /shop/.
```

#### Training Science Posts

```
Post type: Training Science
Current month: {{month}}
Current season: {{season}}

Write a training tip post for marathon runners. Topic should be broadly useful
(not Japan-specific) to maximise discovery. Optionally add a soft Japan tie-in
at the end (e.g. "great prep if you have a Japan race on the calendar").
Use seasonal context: winter posts can address cold-weather motivation and indoor
training; summer posts can cover heat adaptation and pacing in humidity.
Use a counterintuitive hook or X vs Y comparison format in the title.
CTA should direct readers to /mara-prep-tools/.
```

#### Wearables / Equipment Posts

```
Post type: Wearables / Equipment
Current month: {{month}}
Current season: {{season}}

Write a post reviewing, comparing, or recommending running gear or equipment for
marathon runners. Focus on Japanese brands or products available through Japanese
retailers — frame them as premium, authentic, and worth importing.

Topics can include: running shoes, GPS watches, apparel, compression gear,
hydration vests, race-day accessories, cold-weather layers, or summer breathability gear.

Use seasonal context: summer posts can focus on lightweight and breathable gear,
heat management tools, and UV protection; winter posts can cover thermal layers,
wind resistance, and cold-weather accessories.

Use a counterintuitive hook or X vs Y vs Z comparison format in the title.
CTA should direct readers to the store at /shop/.
```

> **Ecosystem note:** The Wearables / Equipment post type is directly tied to the Rakuten-WooCommerce aggregator pipeline — a separate project that pulls Japanese running products from Rakuten Ichiba, translates them via DeepL, applies auto-pricing logic, and syncs them to the WooCommerce store. Content generation and product supply are two halves of the same flywheel: the aggregator keeps the store stocked, and this pipeline drives traffic to it.

### 6.5 Race Selection — Two-Stage API Call

When the post type is Race Guide, `chooseRace()` makes a preliminary Claude API call before the main generation call. Rather than picking a race randomly or round-robin, the model acts as a content strategist and selects the race with the highest post-performance potential from the full `races.json` list.

**Why a separate API call:**
The race choice directly determines the post's ceiling. A famous, high-intent race (富士山, 東京) has 10x the discoverability of an obscure regional event. Delegating this decision to the model — with explicit selection criteria — produces better picks than any static heuristic.

**System prompt — `systemRaceSelectionPrompt` (production):**

```
You are a content strategist for a Chinese running account focused on Japanese marathons.

Your job is to select ONE race from a provided list that has the highest potential
to perform well as a Rednote (Xiaohongshu) post.

Audience context:
- Chinese runners living in China
- Interested in traveling to Japan for races
- Care about cost-performance, uniqueness, and experience

Selection criteria (VERY IMPORTANT):
1. High search intent (famous names like 东京, 大阪, 富士山)
2. Strong differentiation (scenic, unique experience, difficult entry, special concept)
3. Travel appeal (worth flying to Japan for)
4. Content potential (supports comparison, storytelling, or a strong hook)
5. Avoid obscure races unless they have a VERY strong unique angle

Output rules:
- Return ONLY the selected race name
- Do NOT explain your reasoning
- Do NOT include extra text
```

**Context message — `contextRaceSelection`:**

All race names from `races.json` are joined with `|||` as a delimiter and appended to this message:

```
Select the best race for a high-performing post — return the marathon name only.
Here is the list of races, separated by |||: [race1]|||[race2]|||...
```

**max_tokens:** 100 in production — the response is a single race name, nothing more.

**Test variant — `systemRaceSelectionPromptTest`:**

Identical selection criteria, but the output rule asks for a full reasoning breakdown instead of just the race name. Used during development to validate that the model's decision logic aligns with content strategy goals. Not used in production.

**Validated example response (test run, March 2026):**

> **The 5th Mt. Fuji Sanroku Women's Trail Run**
>
> **1. Search Intent:** 富士山 is the single highest-value keyword for Chinese audiences in the Japan travel + running space. The name alone stops the scroll.
>
> **2. Differentiation:** The women-only angle creates immediate identity resonance with a large and growing segment of Rednote's core demographic (women aged 25–35 who run). Women-only races in Japan are rare — that's storytelling gold.
>
> **3. Travel Appeal:** Mt. Fuji + trail run = a complete Japan trip narrative. Chinese runners can frame it as "running at the foot of Fuji" — aspirational and photogenic.
>
> **4. Content Potential:** Hook writes itself: *"在富士山脚下，和一群女生一起跑步是什么体验？"* Supports packing guides, costume content, and squad travel framing — perfect for XHS's social format.
>
> **Why not the others:** Tohoku Food Marathon, Higashine Sakuranbo — niche, low name recognition. Sado, Rishiri, Echigo — too obscure geographically. Okinawa Ekiden — relay format limits individual runner identification.

This response confirms the selection criteria are working as intended. The 富士山 keyword signal, women-only differentiation angle, and XHS-native hook are all exactly what the content strategy targets.

---

## 7. API & Data Design

### 7.1 Claude API Call

```json
POST https://api.anthropic.com/v1/messages
{
  "model": "claude-sonnet-4-6",
  "max_tokens": 1000,
  "system": "<MOXI persona + audience framing + format rules + title rules>",
  "messages": [{
    "role": "user",
    "content": "Post type: Race Guide\nTarget race: Tokyo Marathon 2026 on 2026-03-01\nDistance: 42.195km\nEntry fee: ¥15,700\nGenerate a complete XHS post for Chinese runners in China considering this race."
  }]
}
```

### 7.2 races.json Schema

```json
{
  "races": [
    {
      "name": "东京马拉松2026",
      "date": "2026-03-01",
      "location": "Tokyo",
      "prefecture": "東京都",
      "distance": "42.195km",
      "entry_fee": "¥15,700",
      "url": "https://runjapan.jp/...",
      "description": "..."
    }
  ],
  "last_updated": "2026-03-17T00:00:00Z"
}
```

### 7.3 Generated Post Object

Claude returns a structured JSON object. The pipeline appends hashtags and injects CTA URLs before publishing.

> **Testing note:** During development, responses are in English. Live production will be in Chinese. The 300-character comment limit is enforced in the prompt for production readiness — Chinese characters are denser so this matters more in production than in testing.

**Claude raw output (body + description only):**
```json
{
  "body": "...(full XHS post text ending with 链接在评论区👇)...",
  "description": "一句话简介这篇帖子的内容，吸引读者点击"
}
```

**Comments are static, defined per post type in `generatePosts()` switch cases — not generated by Claude.** Each post type has two hardcoded comments with `{{CTA_URL}}` and `{{COMMUNITY_URL}}` placeholders:

```js
// race case
comments = [
  '想了解更多关于这场比赛的详细信息和报名攻略？👇 {{CTA_URL}}',
  '加入我们的跑步社区，和其他计划去日本跑马的小伙伴一起交流👇 {{COMMUNITY_URL}}',
];
```

**After pipeline processing (published object):**
```json
{
  "post_type": "race_guide",
  "body": "...(XHS formatted Chinese text)...",
  "description": "一句话简介 #日本马拉松 #富士山 #中国跑者 #海外马拉松 #moxi爱跑步",
  "comments": [
    "想了解更多关于这场比赛的详细信息和报名攻略？👇 running.moximoxi.net/races/",
    "加入我们的跑步社区👇 running.moximoxi.net/community/"
  ],
  "generated_at": "2026-03-17T06:00:00Z"
}
```

Hashtags are hardcoded per post type and appended to `description` after parsing. `{{CTA_URL}}` and `{{COMMUNITY_URL}}` placeholders are replaced at runtime. Each comment is posted sequentially by `publisher.js` — primary CTA first, community second.

---

## 8. Implementation Phases

### 8.1 Current Status

|Component|Status|Notes|
|---|---|---|
|Manually written posts|✅ Done|115 posts — performance data extracted and analyzed|
|Node.js project setup|✅ Done|npm init, node-cron + playwright installed, .gitignore + .env.example in place|
|scraper.js|✅ Done|Two-pass scrape (listing → detail pages); writes to data/races.json|
|races.json|✅ Populated|Full schema: name, url, date, location, entryStart/End, website, images, description, info, notice, registrationOpen, registrationUrl|
|rednote-post-generator.js|🔄 In progress|Race selection API call working; prompts wired from prompts.json; post generation and return logic still in progress|
|formatter.js|❌ Not started|File does not exist yet|
|publisher.js|❌ Not started|File does not exist yet|
|Cron orchestration|❌ Not started|End-to-end pipeline not wired|


### 8.2 Phase 1 — Core Generator (Priority: Ship before May 20)

1. Fix `races.json`: raise `RUNJAPAN_RACES_LIMIT`, fix broken cron, wire WP sync
2. Rebuild `rednote-post-generator.js` with Claude API integration
3. Implement system prompt with MOXI persona, China-based audience framing, and XHS format rules
4. Enforce data-derived title patterns in prompt instructions
5. Build `formatter.js` to validate and structure output
6. Test generation across all post types — validate Chinese quality and format compliance

### 8.3 Phase 2 — Auto-Publishing

1. Build `publisher.js` with Playwright targeting XHS web client
2. Implement two-step post flow: publish body → add comment with CTA URL
3. Add human-like timing delays and session persistence to reduce bot detection risk
4. Add retry logic and failure logging to `pipeline.log`

### 8.4 Phase 3 — Full Pipeline Automation

1. Wire full cron: scrape → generate → format → publish in one shot
2. Add `post_history.json` to track recent topics — inject as "do not repeat" context
3. Validate end-to-end manually before leaving on autopilot

### 8.5 Phase 4 — Portfolio Demo Page

1. Run pipeline once per content category to generate one high-quality post each (Race Guide, Training Science, Nutrition, Health & Recovery)
2. Save outputs as static JSON to `demo/posts/`
3. Build `demo/index.html` — XHS-style post preview, one card per category
4. Deploy as standalone static page for portfolio showcase

---

## 9. Engineering Challenges & Solutions

### 9.1 XHS Has No Official API

**Challenge:** Xiaohongshu provides no public API for posting. All publishing must go through the app or web interface.

**Solution:** Playwright browser automation targeting the XHS web client. Mitigations for bot detection: human-like timing delays, session persistence via stored cookies, posting at realistic hours (morning China time).

**Fallback:** Semi-automated approach — generate the post, copy to clipboard, open XHS manually — eliminates bot detection risk while saving 80% of manual effort.

### 9.2 Consistent Chinese-Language Quality

**Challenge:** Generated Chinese must sound natural to native speakers. XHS readers are sensitive to inauthentic tone.

**Solution:** System prompt written with explicit tone guidance referencing the MOXI brand voice. The 115 manually written posts — especially the top performers — implicitly define the quality bar. Best-performing title structures are referenced directly in prompt instructions. Output is spot-checked before deploying to cron.

### 9.3 Audience Framing Drift

**Challenge:** Claude may default to framing content as if the reader is already in Japan (e.g. "go to this race") vs correctly framing Japan as a destination to plan for.

**Solution:** Explicit audience framing section in system prompt with concrete correct/incorrect examples. Every prompt includes: "Your reader is in China, not Japan. Frame everything accordingly."

### 9.4 Content Variety Without Repetition

**Challenge:** Daily generation risks producing similar-sounding posts, hurting algorithmic reach.

**Solution:** Data-weighted 7-day rotation ensures topic variety. `post_history.json` tracks recent topics and race names, injected into each prompt as "do not repeat these this week." Live race data ensures race-specific posts are always anchored to different upcoming events.

### 9.5 Race Selection: Content-Aware vs. Static Rotation

**Challenge:** Picking which race to write about for a Race Guide post is a content decision, not just a data decision. A random or round-robin approach would regularly surface obscure regional races with low search intent — posts that would underperform regardless of post quality.

**Solution:** Two-stage API call. Before generating the post, `chooseRace()` sends a separate Claude call with a content strategist persona and explicit selection criteria (search intent, differentiation, travel appeal, content potential). The model returns a single race name, which is then used to inject the correct race context into the main generation call. This delegates the curation decision to the model rather than hardcoding heuristics.

**Tradeoff:** An extra API call per Race Guide post (~433 input tokens at $3/M = ~$0.001). Cost is negligible; the quality improvement justifies it.

### 9.6 Links in Comments, Not Post Body

**Challenge:** XHS does not allow clickable links in the post body or description. Any URL typed into the body is rendered as plain text — not clickable. This means the CTA (directing readers to the store, race listings, or tools) cannot be placed where the reader is most engaged.

**Solution:** Three-part post output. Claude generates a structured JSON response with three fields:

- `body` — the full XHS post text, ending with `链接在评论区👇` to signal the link is below
- `description` — a short caption summary; hashtags (hardcoded per post type) are appended here after parsing
- `comments` — an array of comment strings, each with a single purpose and under 300 characters

**Comment structure:** Each post gets at least two comments, posted sequentially by `publisher.js`:
1. **Primary CTA** — links to the relevant destination (race hub page, `/shop/`, `/mara-prep-tools/`)
2. **Community CTA** — links to `/community/`, present on every post to drive community growth regardless of post type

XHS enforces a **300-character limit per comment**. This is enforced in the prompt so Claude generates comments that fit in production. During development, responses are in English (which runs longer); the limit matters most in Chinese production where character density is higher.

`publisher.js` posts each comment in the array sequentially after publishing the body. First-comment placement is standard XHS creator practice — the audience expects it and the algorithm treats it as part of the post.

**Hashtag strategy:** Tags are hardcoded per post type in the pipeline (not generated by Claude) and appended to `description` after parsing the Claude response. This avoids hallucinated or off-brand tags and keeps the tag set consistent and controlled.

---

## 10. Future Extensions

### 10.1 Performance Feedback Loop (Planned)

Once posts are publishing consistently, pull weekly XHS engagement data (likes, saves, comments per post type) and use it to update the content strategy context fed to the generator. This turns the static manual analysis in Section 3 into a continuously updating feedback loop — post types that are performing well get weighted higher in the rotation, underperformers get deprioritized or their prompts revised.

### 10.2 New Content Pillars (Expansion Candidates)

The current four pillars cover the core. Future categories to test:

- **Japan Running Travel** — logistics for Chinese runners visiting Japan: visa, accommodation near race starts, transport from China, booking timeline. High search intent, low competition in this niche.
- **Product Reviews / Comparisons** — head-to-head comparisons of Japanese running products in the store. Direct conversion path. Maps naturally to the high-CTR X vs Y title format.
- **Race Reports / Stories** — first-person race day narratives for major Japanese marathons. High engagement from readers planning the same race.
- **Gear Guides** — shoe and apparel recommendations for Japanese race conditions. Natural store CTA.
- **Chinese Runner Japan FAQ** — common questions from Chinese runners about racing in Japan (entry, language, etiquette, logistics). High search intent from first-timers.

### 10.3 Image Generation

XHS is a visual platform and text-only posts underperform posts with images. A future version could auto-generate race route graphics or product visuals and attach them via the publisher.

### 10.4 Multi-Platform Expansion

The formatter and generator are platform-agnostic. The same pipeline could target WeChat Moments, Weibo, or a WordPress blog by swapping the formatter rules and publisher module.

### 10.5 User-Generated Content Integration

As the community grows, pull in user race reports or PB submissions and generate celebratory posts featuring real community members — increasing authenticity with zero additional research effort.

### 10.6 Marathon Hub Deep Linking (Planned)

Currently, Race Guide posts CTA to the general race listings page (`/races/`). Once the Marathon Hub project is deployed — a separate pipeline that scrapes RunJapan, normalises race data, and serves it through a React SPA — each Race Guide post will deep link to that specific marathon's dedicated hub page.

This upgrade closes the full funnel: a reader sees a post about 富士山 trail run → clicks the comment link → lands directly on the hub page for that race with full details, registration timeline, and a direct link to sign up. No extra navigation required.

The data to build these deep links already exists in `races.json` (`registrationUrl`, `website`, `name`). The CTA URL injection in `publisher.js` will be updated to pass the specific hub URL once the hub is live — no changes needed to the generator itself.

---

## 11. Open Questions

- **Auto-publish reliability:** Is Playwright stable enough against XHS bot detection, or is semi-automated safer for v1?
- **Post archiving:** Should generated posts be saved to `post_archive/` before publishing as a quality review record?
- **Human review gate:** Should v1 include an optional manual review step before publishing, to validate Claude output quality before going fully autonomous?
- ~~**Hashtag strategy:** Should hashtags be hardcoded per post type, generated by Claude, or pulled from a curated list?~~ **Resolved:** Hardcoded per post type, appended to `description` after parsing Claude's JSON output.
- **Optimal posting time:** Data doesn't yet show time-of-day effects. Experiment with morning vs evening cadence once automated.
- **Testing:** Add a `test/` folder with basic unit tests once the pipeline is stable — would strengthen the portfolio story and guard against regressions.

---

## 12. Repository Structure

```
rednote-content-automation/
    ├── src/
    │   ├── scraper.js                  # Self-contained RunJapan scraper
    │   ├── rednote-post-generator.js   # Core — Claude API integration
    │   ├── formatter.js                # XHS format validation + CTA injection
    │   └── publisher.js                # Playwright browser automation
    ├── config/
    │   └── prompts.json                # System prompt, post-type context templates — tunable without touching code
    ├── data/
    │   ├── races.json                  # Scraped race data output
    │   ├── post_history.json           # Recent topics log for dedup
    │   └── post_archive/               # Generated post backup
    ├── demo/
    │   ├── index.html                  # Portfolio showcase page
    │   ├── style.css
    │   └── posts/                      # Pre-generated static posts (one per category)
    │       ├── race-guide.json
    │       ├── training.json
    │       ├── nutrition.json
    │       └── health.json
    ├── docs/
    ├── .env
    ├── .env.example
    ├── .gitignore
    ├── package.json
    └── README.md
```

---
