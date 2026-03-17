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

- **Stage 1 — DATA:** Race scraper pulls upcoming Japanese marathon data into `races.json` daily via cron
- **Stage 2 — GENERATE:** Claude API receives race context + system prompt → produces complete XHS post in Chinese
- **Stage 3 — FORMAT:** Formatter applies XHS rules: multi-page structure, emoji density, CTA, comment link
- **Stage 4 — PUBLISH:** Browser automation posts to MOXI爱跑步 XHS account

### 4.2 Component Breakdown

#### scraper.js (new — self-contained)

- Scrapes RunJapan directly — no dependency on marathon-hub-race-scraper
- Saves structured race data to `races.json`
- Built from scratch to understand the scraping logic end-to-end

#### rednote-post-generator.js (core)

- Loads `races.json` to inject live race context into prompts
- Selects post type based on data-weighted rotation schedule
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

- Single daily cron: scrape → generate → format → publish
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
- Include 5-8 relevant hashtags at the end

TITLE RULES (derived from performance data):
- Use comparison format when possible: X vs Y vs Z
- Include specific race names for search intent (东京, 大阪, 富士山)
- Ask counterintuitive questions that challenge assumptions
- Make a specific promise (benefit + context) in the title
- Never use series framing (第1集, EP1, etc.)
- Never use vague titles with no specific hook

CTA TARGETS:
- Race guide posts → race listings page
- Nutrition posts → /shop/
- Training posts → /mara-prep-tools/
- Community posts → /community/
```

### 6.3 Post Type Rotation

Based on data-derived content weighting:

|Day|Post Type|Weight Rationale|CTA Destination|
|---|---|---|---|
|Mon|Race Guide|Highest traffic driver|Race listings|
|Tue|Nutrition / Supplement|Underpublished, highest CTR|/shop/|
|Wed|Training Science|2nd highest avg views|/mara-prep-tools/|
|Thu|Race Guide|40% target weight|Race listings|
|Fri|Nutrition / Supplement|20% target, weekend browse|/shop/|
|Sat|Training Science|Weekend training research|/mara-prep-tools/|
|Sun|Health & Recovery|Rest day content|/community/|

### 6.4 Race Context Injection

For Race Guide and Nutrition posts:

```
Post type: Race Guide
Target race: {{race.name}} on {{race.date}} in {{race.location}}
Distance: {{race.distance}}
Entry fee: {{race.entry_fee}}

Write a complete XHS post that helps a Chinese runner in China understand
whether this race is worth travelling to Japan for, and how to plan for it.
```

For Training Science posts:

```
Post type: Training Science
Current month: {{month}}
Upcoming major races: {{next_3_races_from_json}}

Write a training tip post that ties into preparation for upcoming Japanese marathons.
Use a counterintuitive hook or X vs Y comparison format in the title.
```

---

## 7. API & Data Design

### 7.1 Claude API Call

```json
POST https://api.anthropic.com/v1/messages
{
  "model": "claude-sonnet-4-20250514",
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
      "url": "https://runjapan.com/...",
      "description": "..."
    }
  ],
  "last_updated": "2026-03-17T00:00:00Z"
}
```

### 7.3 Generated Post Object

```json
{
  "post_type": "race_guide",
  "title": "东京马拉松攻略来了🏃｜中国跑者怎么报名？",
  "body": "...(XHS formatted Chinese text)...",
  "comment_url": "https://running.moximoxi.net/races/tokyo-marathon",
  "hashtags": ["#日本马拉松", "#东京马拉松", "#中国跑者", "#海外马拉松", "#moxi爱跑步"],
  "generated_at": "2026-03-17T06:00:00Z"
}
```

---

## 8. Implementation Phases

### 8.1 Current Status

|Component|Status|Notes|
|---|---|---|
|scraper.js|❌ Not started|File does not exist yet|
|races.json|❌ Not started|No data file yet|
|rednote-post-generator.js|❌ Not started|File does not exist yet|
|formatter.js|❌ Not started|File does not exist yet|
|publisher.js|❌ Not started|File does not exist yet|
|Cron orchestration|❌ Not started|End-to-end pipeline not wired|
|Node.js project setup|✅ Done|npm init, node-cron + playwright installed, .gitignore + .env.example in place|
|Manually written posts|✅ Baseline complete|115 posts — performance data extracted and analyzed|

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

### 9.5 Links in Comments, Not Post Body

**Challenge:** XHS does not allow clickable links in post body text.

**Solution:** Formatter enforces `链接在评论区👇` as the standard CTA. `publisher.js` executes two sequential actions: post the content body, then immediately post the first comment with the destination URL. This is standard XHS creator practice — the audience expects it.

---

## 10. Future Extensions

### 10.1 Performance Feedback Loop

Once posts are publishing consistently, scrape engagement metrics (likes, saves, comments) and feed them back into the prompt weighting. This turns the static data analysis in Section 3 into a continuously updating feedback loop.

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

---

## 11. Open Questions

- **Auto-publish reliability:** Is Playwright stable enough against XHS bot detection, or is semi-automated safer for v1?
- **Post archiving:** Should generated posts be saved to `post_archive/` before publishing as a quality review record?
- **Human review gate:** Should v1 include an optional manual review step before publishing, to validate Claude output quality before going fully autonomous?
- **Hashtag strategy:** Should hashtags be hardcoded per post type, generated by Claude, or pulled from a curated list?
- **Optimal posting time:** Data doesn't yet show time-of-day effects. Experiment with morning vs evening cadence once automated.

---

## 12. Repository Structure

```
rednote-content-automation/
    ├── src/
    │   ├── scraper.js                  # Self-contained RunJapan scraper
    │   ├── rednote-post-generator.js   # Core — Claude API integration
    │   ├── formatter.js                # XHS format validation + CTA injection
    │   └── publisher.js                # Playwright browser automation
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
