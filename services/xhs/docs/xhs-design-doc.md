**Project:** automation-ecosystem — XHS Pipeline

**Platform:** running.moximoxi.net — Japanese marathon platform for Chinese runners

**GitHub:** [https://github.com/jason-deng-dev/automation-ecosystem](https://github.com/jason-deng-dev/automation-ecosystem) (`services/xhs/`)

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
- **/racehub/** — Upcoming Japanese marathon information hub (RunJapan data)

Traffic and user acquisition is driven through Xiaohongshu (RedNote / XHS) — the dominant discovery channel for Chinese runners interested in overseas race experiences. The account MOXI爱跑步 has published **115 posts manually over several months**, accumulating **60,481 total views** and generating a real performance dataset that directly informs this pipeline's design.

### 1.2 The Problem

Manual content creation is the bottleneck. Writing each post requires:

- Researching relevant race or training topic with a Japan angle
- Writing Chinese-language copy in XHS format (multi-page, emoji-heavy, no markdown headers)
- Formatting for the platform's unique constraints (links only in comments, not post body)
- Publishing manually through the app

At current pace, consistent daily publishing is not sustainable alongside product development.

A second constraint shapes the deployment architecture: the operator is based in mainland China. This rules out running the pipeline on a local machine — there is no guarantee a personal computer stays on 24/7 when the cron fires, and all outbound API calls (Anthropic, RunJapan) would pass through the Great Firewall, which intermittently blocks or throttles foreign services. The Anthropic API is not reliably accessible from mainland China. The pipeline therefore requires a Linux server hosted outside mainland China.

### 1.3 Why This Pipeline Is Different

Most automated content systems are built on assumptions. This one is built on **115 posts of real performance data** — manually created and published over months — that reveal exactly which content types drive views, saves, and high CTR with this specific audience. The generator's prompt strategy, rotation schedule, and content weighting are all derived from this empirical baseline, not guesswork.

### 1.4 Goals

- Generate varied, on-brand Chinese-language XHS posts daily using the Claude API
- Source live race data from the shared volume (`scraper/races.json`, written by the Scraper container)
- Auto-publish to XHS with zero human intervention required
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
DATA  →  SCHEDULE  →  GENERATE  →  PUBLISH
```

- **Stage 1 — DATA:** `races.json` is written weekly by the Scraper container to the shared Docker volume — the XHS container reads it from there at runtime
- **Stage 2 — SCHEDULE:** Scheduler determines today's post type and publish time from a configurable per-day schedule (day → time + post type), replacing the hardcoded 7-day rotation
- **Stage 3 — GENERATE:** Claude API receives race context + system prompt → produces paste-ready structured post
- **Stage 4 — PUBLISH:** Browser automation posts to MOXI爱跑步 XHS account

### 4.2 Component Breakdown

#### races.json (shared volume input)

- Written by the **Scraper container** (`automation-ecosystem/scraper/`) weekly via cron
- Lives on the shared Docker volume at `scraper/races.json` — the XHS container mounts the same volume and reads from it at runtime
- Full schema: `name`, `url`, `date`, `location`, `entryStart`, `entryEnd`, `website`, `images`, `description`, `info`, `notice`, `registrationOpen`, `registrationUrl`
- The XHS container never writes to `races.json` — it is a pure consumer of scraper output
- See `services/scraper/docs/scraper-design-doc.md` for full scraper implementation details

#### generator.js (core)

- Loads `races.json` to inject live race context into prompts
- Selects post type based on data-weighted rotation schedule
- If race post type, calls Claude API to choose a race
- Calls Claude API with system prompt + structured user prompt
- Returns structured post object `{ title, hook, contents[], cta, description, hashtags, comments }` directly to publisher

#### scheduler.js (new)

- Determines today's post type and publish time from a per-day schedule config (day → time + post type)
- Schedule config is loaded from `config.json` at the root of the XHS service — each day maps to an array of `{ time, type }` slots, supporting multiple posts per day
- One cron job is registered per slot at startup — editable via dashboard without touching code
- Calls `generatePost(type)` with the correct post type
- Passes the result to `publisher.js`
- Daily cron: determine type → generate → publish
- Logs each stage to `pipeline.log`
- Flags failures for manual review

#### publisher.js (new)

- Playwright browser automation targeting XHS web client
- Applies H1 to title, H2 to each content page subtitle, pastes body fields as plain text
- Appends hashtags to description
- Posts comments array sequentially (primary CTA first, community second)
- Handles retry logic and session persistence

### 4.3 Data Flow

```
scraper/races.json  (shared Docker volume — written by Scraper container weekly)
    ↓  (reads at runtime)
scheduler.js  ←  7-day rotation logic (determines post type)
    ↓  (calls generatePost(type))
generator.js
    ↓  (POST /v1/messages)
Claude API  ←  system prompt + race context + performance-informed instructions
    ↓  (structured post object — paste-ready, no formatting step needed)
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
|Post scheduling|Node-cron / shell cron|n8n, Zapier|Keeps infra local; consistent with Scraper container cron pattern; no external dependency|
|Data source|races.json (shared volume read)|Direct DB query, live scrape|Lowest coupling — Scraper container owns data; XHS generator is a pure consumer|
|Language|Node.js / JavaScript|Python|Consistent with rest of stack; no context switching|
|Prompt storage|`config/prompts.json`|Hardcoded in JS, `.env`|Separates tunable content (persona, templates) from pipeline logic; employer can adjust prompts without touching code|
|CTA injection|Runtime code injection per post type|Hardcoded in system prompt|System prompt is sent on every API call — putting CTA targets there wastes tokens on context irrelevant to the current post type. Injecting a natural-language CTA description per type in `generatePost()` keeps the system prompt lean and makes each call's context more precise. Claude also doesn't need to know actual URLs — those are hardcoded in the pipeline and injected after parsing.|
|Deployment / handoff|Docker + docker-compose|Manual server setup, PM2|Ensures consistent runtime environment across machines; Playwright browser binaries are notoriously environment-sensitive; allows non-technical handoff with a single `docker-compose up`|
|Hosting|AWS Lightsail — Linux, $10/mo (IPv6-only, 2 GB RAM, 2 vCPUs, 60 GB SSD, 3 TB transfer, hosted outside mainland China)|GitHub Actions, office Windows machine|GitHub Actions blocked by `auth.json` — XHS session requires manual re-login in a headed browser; GH Actions has no display. Existing Tencent Cloud server runs Windows Server 2019, incompatible with Linux Docker images. A Linux server outside of mainland China is required: Anthropic API is accessible outside mainland China, XHS is accessible internationally, and `auth.json` persists on disk between runs.|
|Publisher auth pre-flight|Check both creator and profile page auth before starting publish flow|Check only at publish stage|If auth is valid for publishing but expired for the profile/comment page, the post publishes without comments and there is no recovery path — the bot cannot go back and add comments to an existing post without creating a duplicate. Pre-flighting both auth states ensures the pipeline either succeeds fully or aborts before touching XHS.|
|Test framework|Vitest|Jest|Better ESM support out of the box — project uses native `import` syntax which requires extra config in Jest. Vitest also runs faster and shares config with Vite if needed.|
|API mocking in tests|Mock `@anthropic-ai/sdk` client|Real API calls in tests|Eliminates token cost on every test run, makes tests deterministic, and allows CI to run without a live API key.|
|No formatter.js|Prompt-enforced structure|Separate formatter module|Structured output (`{ title, hook, contents[], cta, description }`) with explicit format rules in the prompt eliminates the need for a post-processing validation step — Claude produces paste-ready output directly.|
|Error handling — generator|Re-throw with specific messages per layer|Return error values; single top-level catch|If generation fails there is nothing to publish — aborting is correct. Specific per-layer messages (race selection, generation, file write) identify exactly which step failed. Errors bubble up to the scheduler which owns the single catch point.|
|API response parsing|Strip markdown fences then `JSON.parse()`|Structured outputs API (tools + schema)|Prompt-level JSON instruction alone is not reliable — Claude wraps JSON in ` ```json ` fences even when explicitly told not to. Defense-in-depth: the system prompt instructs raw JSON output AND `generator.js` strips any leading ` ```json ` / trailing ` ``` ` with a regex before calling `JSON.parse()`. This makes parsing robust regardless of model behavior: `text.trim().replace(/^\`\`\`json\s*/, '').replace(/\`\`\`\s*$/, '')`.|
|Dependency injection (generator)|Optional `{ races, postedRaces, client, prompts }` param with `default*` fallbacks|Module-level globals only; factory function|Tests must inject fixture data and a mock client — without this, every test run hits the real API and uses real data. Optional params keep production calls unchanged (no args = defaults) while letting tests override any dependency. Deps are threaded through the full call chain: `generatePost` → `getContextPrompts` → `chooseRace`.|
|Retries — Anthropic SDK|`maxRetries: 3` configured at client creation; 30s timeout|Manual try/catch retry loop|SDK handles exponential backoff on 429 and 5xx automatically — no manual retry logic needed. 3 retries balances resilience vs latency. Timeout reduced from SDK default (10min) to 30s — responses for this use case are short (< 500 tokens), so 10min is excessive and would stall the pipeline on a hung request.|

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
- Use emojis extensively — every 1-2 lines minimum, and inline within sentences to add energy and visual rhythm
- Each line max 22 characters
- Separate idea groups with a double line break (blank line between groups)
- NO markdown headers (no #, ##, bold **)
- Do NOT include hashtags anywhere in the output

HOOK PAGE RULES:
- Max 19 lines of content
- Each double-line separator costs 2 lines — deduct from the 19-line budget
- End the hook with a tension or curiosity gap that makes the reader swipe — do not summarise the post

CONTENT PAGE RULES:
- 2 to 4 content pages — choose based on how much the topic needs
- Each page covers ONE idea only — no mixing topics on the same page
- Each page starts with a subtitle — max 15 characters, must begin with an emoji
- Max 21 lines of content per page
- Each double-line separator costs 2 lines — deduct from the 21-line budget

CTA PAGE RULES:
- 3 to 5 lines max
- Never open with a hard sell — frame as a natural next step from the content
- End with: '链接在评论区👇'

TITLE RULES (derived from performance data):
- Max 20 characters
- Use comparison format when possible: X vs Y vs Z
- Include specific race names for search intent (东京, 大阪, 富士山)
- Ask counterintuitive questions that challenge assumptions
- Make a specific promise (benefit + context) in the title
- Never use series framing (第1集, EP1, etc.)
- Never use vague titles with no specific hook

OUTPUT FORMAT (critical):
Return ONLY a raw JSON object. No markdown. No code fences. No ```json. No explanation. The response must start with { and end with }. Any other format will break the parser.
No trailing whitespace. No \n at the start or end of any field. Every string must be ready to paste directly with no post-processing.
Do NOT use any double quotation marks of any kind (" or " or ") inside JSON string values — they break JSON parsing. Use 「」or 《》 as alternatives for quoting in Chinese text.
The JSON must have exactly these fields:
- "title": the post title. Max 20 characters. No hashtags.
- "hook": the opening page. No subtitle. Ends with a curiosity gap, not a summary.
- "contents": array of 2–4 page objects, each with:
    - "subtitle": page heading, max 15 chars, starts with an emoji
    - "body": page content
- "cta": the final page. 3–5 lines. Ends with '链接在评论区👇'.
- "description": a short 1-2 sentence caption summarising the post. No hashtags.
```

#### Prompt Design Rationale

| Rule | Reason |
|---|---|
| Structured output `{ title, hook, contents[], cta, description }` | Granular fields let the publisher apply H1 to title, H2 to subtitles, and paste body text separately — necessary because XHS heading styles are applied via editor UI, not inline characters |
| `title` as own field | Previously embedded in body with no explicit boundary — separating it allows the publisher to apply H1 formatting and enforce the 20-char limit programmatically |
| `hook` separate from `contents[]` | Hook has different rules (no subtitle, curiosity gap ending, tighter line budget) — merging it into contents would require special-casing the first item everywhere |
| `cta` as own field | CTA has fixed constraints (3–5 lines, soft sell, ends with 链接在评论区👇) that differ from content pages — separating it keeps content pages clean and makes publisher logic simpler |
| 2–4 content pages, Claude decides | Fixed page count wastes space on short topics or truncates long ones — letting Claude choose within a range produces better-fitting posts |
| One idea per content page | Multi-idea pages read as walls of text on XHS — single-idea pages are scannable and match the platform's swipe-native format |
| Subtitle starts with emoji | Standard XHS creator practice — makes pages visually distinct while scrolling, signals a new section without markdown headers |
| Double line break between idea groups | XHS renders spacing — grouping related lines and separating groups with a blank line matches how top-performing posts are structured visually |
| Line budget with separator cost | XHS has a fixed display area per page swipe — if separators aren't counted against the budget, content overflows to the next page mid-thought |
| CTA framed as natural next step | Hard-sell CTAs on XHS reduce save rate — readers respond better to a soft nudge that feels like a continuation of the post |
| No trailing whitespace / paste-ready strings | Publisher pastes directly into XHS editor — extra whitespace or leading newlines cause visible formatting artifacts |
| No double quotation marks in JSON string values | Any double quote character — straight `"`, curly open `"`, or curly close `"` — inside a JSON string value breaks `JSON.parse()`. Rule broadened to ban all double quotation marks inside values; Chinese text should use `「」` or `《》` instead. |

### 6.3 Post Type Rotation

Based on data-derived content weighting. Wearables / Equipment replaces the Health & Recovery slot — added once wearable post type was wired into the generator.

CTA destinations are not in the prompts — they are injected at runtime per post type in `generatePost()`. See Section 5 (Technical Decisions) for rationale.

|Day|Post Type|Weight Rationale|CTA Destination|
|---|---|---|---|
|Mon|race|Highest traffic driver|/racehub/|
|Tue|nutritionSupplement|Underpublished, highest CTR|/shop/|
|Wed|training|2nd highest avg views|/mara-prep-tools/|
|Thu|race|40% target weight|/racehub/|
|Fri|race|High-browse going into weekend|/racehub/|
|Sat|training|Weekend long run day|/mara-prep-tools/|
|Sun|wearable|Rest day — gear browsing|/shop/|

**Post frequency: 1 post/day.** Posting multiple times per day (e.g. morning/lunch/after-work/night) risks triggering XHS spam detection and suppressing reach. The account has real engagement history from 115 manual posts — preserving organic appearance is more valuable than volume. 1 high-quality post/day is the standard for sustained organic growth on XHS.

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
Current season: {{season}}
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
Use the current month and season for context where relevant (e.g. how far out
the race is, whether it falls in peak training season, weather conditions at
race time, what gear to prepare given the season).
CTA should direct readers to the race's dedicated page on our marathon hub
(currently: general race listings page — will be updated to deep link to the
specific marathon's hub page once the hub is live).
```

> **CTA upgrade path:** Currently links to `/racehub/`. Once the Marathon Hub (race scraper + React SPA) is deployed, each Race Guide post will deep link to that marathon's dedicated hub page — giving readers direct access to full race details, registration links, and entry timelines without leaving the platform. The `races.json` schema already includes the `registrationUrl` and `website` fields needed to build these deep links.

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
CTA should direct readers to our marathon preparation toolkit — a free suite of
tools that helps runners answer: "What marathon time am I realistically capable
of right now?", "What pace does my goal actually require?", and "Given where I
am and how much time I have, is my goal realistic?". The toolkit also includes a
progress trendline for tracking improvement over a training build. Frame the CTA
as a natural next step after reading the post — e.g. after a training tip about
pacing, suggest checking their goal pace with the tool.
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

### 7.3 pipeline_state.json Schema

Written to the shared volume so the Dashboard can poll current XHS run state without reading logs.

```json
{ "state": "idle | running | failed" }
```

| Value | Meaning |
|---|---|
| `"running"` | Written at the start of `Run()` before any pipeline steps |
| `"idle"` | Written in `finally` when `outcome === "success"` |
| `"failed"` | Written in `finally` when `outcome === "failed"` |

Read by Dashboard via `GET /api/pipeline-state`.

---

### 7.4 run_log.json Schema

Object keyed by ISO timestamp. Each entry represents one pipeline run.

```json
{
  "2026-03-25T06:10:28.030Z": {
    "type": "race",
    "outcome": "success | failed",
    "errorStage": "auth | generate | publish | null",
    "errorMsg": "string | null",
    "input_tokens": 1727,
    "output_tokens": 1241
  }
}
```

| Field | Type | Notes |
|---|---|---|
| `type` | string | Post type — `race`, `training`, `nutritionSupplement`, `wearable` |
| `outcome` | string | `"success"` or `"failed"` |
| `errorStage` | string \| null | Which stage failed — `"auth"`, `"generate"`, `"publish"`, or `null` on success |
| `errorMsg` | string \| null | Error message, or `null` on success |
| `input_tokens` | number | Claude API input tokens consumed. `0` if failed before generation |
| `output_tokens` | number | Claude API output tokens consumed. `0` if failed before generation |

---

### 7.4 post_history.json Schema

A flat array of race name strings used to filter already-used races from future selection.

```json
["富士山女子越野跑", "東京マラソン2026", "大阪マラソン"]
```

Initialized as `[]` if the file doesn't exist. A race name is appended each time a race guide post is generated. The race selection step filters out any name present in this array.

**Reset cadence:** `post_history.json` resets monthly. Without a reset, the exclusion list grows permanently and eventually exhausts the available race pool. A monthly reset is appropriate because the Japanese marathon calendar is roughly annual — a race covered 5+ weeks ago is fair game again, and the audience turnover on XHS means repeat coverage of popular races (Tokyo, Osaka, Fuji) is expected and welcome. Reset logic should run at the start of each month before the daily post fires.

---

### 7.4 Generated Post Object

Claude returns a structured JSON object. The pipeline appends hashtags and injects CTA URLs before publishing.

> **Testing note:** During development, responses are in English. Live production will be in Chinese. The 300-character comment limit is enforced in the prompt for production readiness — Chinese characters are denser so this matters more in production than in testing.

**Claude raw output:**
```json
{
  "title": "富士山女子越野跑",
  "hook": "...(opening page, curiosity gap ending, no subtitle)...",
  "contents": [
    { "subtitle": "🗺️ 赛道是什么样", "body": "...(one idea per page)..." },
    { "subtitle": "📋 怎么报名参加", "body": "..." }
  ],
  "cta": "...(3–5 lines, soft sell, ends with 链接在评论区👇)...",
  "description": "一句话简介这篇帖子的内容，吸引读者点击"
}
```

**Comments are static, defined per post type in `generatePost()` switch cases — not generated by Claude.** Each post type has two hardcoded comments with `{{CTA_URL}}` and `{{COMMUNITY_URL}}` placeholders:

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

### 7.5 post_archive Schema

One JSON file per week, stored in `data/post_archive/`. Filename is the Monday date of that ISO week (e.g. `2026-03-23.json`). Content is an object keyed by ISO timestamp — each key is the full published post object.

Written by `archivePost()` in `publisher.js` immediately after a successful publish, before `return true`.

```json
{
  "2026-03-24T21:05:32.000Z": {
    "title": "富士山マラソン完全攻略",
    "hook": "...",
    "contents": [
      { "subtitle": "🗺️ 赛道是什么样", "body": "..." }
    ],
    "cta": "...",
    "description": "...",
    "hashtags": ["#日本马拉松", "#富士山"],
    "comments": ["...", "..."]
  }
}
```

If the week file already exists, the new entry is merged into the existing object. If it doesn't exist, a new file is created.

---

## 8. Implementation Phases

### 8.1 Current Status

|Component|Status|Notes|
|---|---|---|
|Manually written posts|✅ Done|115 posts — performance data extracted and analyzed|
|Node.js project setup|✅ Done|npm init, node-cron + playwright installed, .gitignore + .env.example in place|
|scraper.js (Scraper container)|✅ Done|Lives in `automation-ecosystem/scraper/` — see scraper design doc|
|races.json (shared volume)|✅ Populated|Written by Scraper container; XHS container reads from shared volume at runtime|
|generator.js|✅ Done|All post types wired; race selection + dedup; structured return; error handling; injectable deps for testing; template substitution guarded; axios-retry + Anthropic retries configured.|
|formatter.js|🚫 Removed|Formatting is enforced via prompt structure — separate formatter step not needed|
|scheduler.js|✅ Done|startScheduler() with weekly scraper cron (Mon 8am CST) and daily post cron (9pm CST); getPostType() 7-day rotation; error handling per cron; run-scheduler.js entry point|
|publisher.js|❌ Not started|File does not exist yet|
|Cron orchestration|❌ Not started|End-to-end pipeline not wired|


### 8.2 Phase 1 — Core Generator (Priority: Ship before May 20)

1. Fix `races.json`: raise `RUNJAPAN_RACES_LIMIT`, fix broken cron, wire WP sync
2. Rebuild `generator.js` with Claude API integration
3. Implement system prompt with MOXI persona, China-based audience framing, and XHS format rules
4. Enforce data-derived title patterns in prompt instructions
5. Test generation across all post types — validate Chinese quality and format compliance

### 8.3 Phase 2 — Auto-Publishing

1. Build `publisher.js` with Playwright targeting XHS web client
2. Implement two-step post flow: publish body → add comment with CTA URL
3. Add human-like timing delays and session persistence to reduce bot detection risk
4. Add retry logic and failure logging to `pipeline.log`

### 8.4 Phase 3 — Full Pipeline Automation

1. Wire full cron: scrape → generate → format → publish in one shot
2. Add `post_history.json` to track recent topics — inject as "do not repeat" context
3. Validate end-to-end manually before leaving on autopilot

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

### 9.7 Deployment Constraint: Operator in China + Great Firewall

**Challenge:** The pipeline operator is based in mainland China. Running the Docker container on a local machine introduces two hard problems:

1. **No guaranteed uptime** — there is no assurance a personal computer stays powered on and connected at 9pm CST every night when the daily cron fires. A missed run means no post that day with no alert.
2. **Great Firewall exposure** — all outbound API calls from a China-hosted machine pass through GFW filtering. The Anthropic API is not officially accessible from mainland China. RunJapan is a Japanese website that may be intermittently slow or blocked. Unreliable network conditions turn a deterministic cron into a flaky pipeline with no visibility into which failures are code bugs vs. network blocks.

**Solution:** Deploy to AWS Lightsail (Linux, $10/mo — 2 GB RAM, 2 vCPUs, 60 GB SSD, 3 TB transfer, IPv6-only), hosted outside mainland China. This eliminates GFW exposure entirely — Anthropic API calls succeed reliably, RunJapan HTTP requests are unblocked, and XHS (a Chinese app with international infrastructure) is accessible internationally. The instance runs 24/7 independently of any operator machine. `auth.json` persists on disk between cron runs.

**Auth refresh for non-technical operator:** When the XHS session expires, the operator clicks **"Login to XHS"** in the monitoring dashboard. The full flow is designed to require zero terminal access, zero SSH, and zero technical knowledge:

1. Dashboard sends `POST /api/xhs/login` to the Dashboard Express server
2. Server spawns `xhs-login.js` — Playwright launches a headless browser and navigates to the XHS login page
3. `xhs-login.js` automatically clicks through to the QR code sign-in screen (the click sequence is known and hardcoded — no operator interaction needed to reach the QR code)
4. Server begins polling screenshots of the browser every 2 seconds and streaming them to the dashboard via SSE
5. Dashboard displays the screenshot stream — operator sees the QR code and scans it with their phone
6. Playwright detects the post-login redirect to the XHS home page, stops the screenshot stream, saves `auth.json` to the shared volume, returns success to the dashboard
7. Dashboard clears the auth alert

**Why screenshot polling over noVNC:** noVNC requires a VNC server (e.g. x11vnc) and a virtual display (Xvfb) installed on the Lightsail instance — significant infrastructure overhead for a single use case. Screenshot polling requires nothing beyond Playwright's built-in `page.screenshot()`. The only interactive step in the XHS login flow is scanning the QR code with a phone — the operator never needs to click or type inside the browser. The navigation to the QR code screen is automated, making screenshot polling fully sufficient.

**Why 2 GB RAM minimum:** The pipeline runs three memory-concurrent processes during each publish cycle: Node.js + cron scheduler (~100MB), the Playwright browser instance (~400MB), and Linux + Docker overhead (~200–300MB). A 1GB instance leaves less than 200MB of headroom for Playwright after the OS and Docker claim their share. On a live publish, the kernel OOM killer terminates the browser process mid-run — the post fails silently because the process is killed before it can write to `pipeline.log`. 2GB provides sufficient headroom for all concurrent processes with margin for browser memory spikes during page load.

---

### 9.8 Race Deduplication: Variant Entry Tiers in Source Data

**Challenge:** RunJapan lists the same race multiple times under different entry tiers (e.g. "Kasumigaura Marathon 2026【Regular Entry】" and "Kasumigaura Marathon 2026 【Late entry】"). These are the same event with identical content but different registration windows. Exact-name dedup in `post_history.json` fails to catch these — each variant passes the filter as a new race, causing the pipeline to generate near-identical posts about the same event.

**Solution:** Normalize race names before dedup comparison by stripping everything from `【` onward. At selection time in `generator.js`, filter out any candidate race whose normalized name matches a normalized name already in `post_history`. Check runs both directions — candidate is substring of history entry, or history entry is substring of candidate — to catch partial overlaps. Raw `races.json` is kept intact; dedup logic lives entirely at selection time.

---

## 10. Testing Strategy

### 10.1 Philosophy

Tests are **black-box and sequential** — each test assumes the modules it depends on work correctly, and tests are scoped to the unit under test. The goal is to validate the pipeline's critical paths without coupling tests to implementation details.

**Key design decision:** Any function that calls the Anthropic API is tested with a mock client that returns a pre-defined fixture. This eliminates token cost on every test run, keeps tests deterministic, and means CI can run without a live API key.

### 10.2 Test Framework

**Vitest** — chosen over Jest for native ESM support. The project uses `import` syntax throughout; Jest requires additional config to handle it. Vitest works out of the box and is faster.

### 10.3 Folder Structure

```
tests/
  fixtures/
    sample-races.json        ← pre-scraped subset (10–15 races) used as controlled test input
    mock-api-response.json   ← hardcoded Anthropic response with valid body + description fields
  scraper.test.js
  context-builder.test.js
  generator.test.js
  scheduler.test.js
```

### 10.4 Test Coverage

#### Context Builder (`context-builder.test.js`)

Requires refactoring `generatePost()` to extract a pure `buildContext(type, prompts, races, raceName)` function. Once extracted, it can be tested in isolation — no API calls, no mocks needed.

- Given `'race'` type + mock race name → all race fields injected, no leftover `race.fieldName` placeholders
- Given `'training'` type → correct prompt template selected, CTA appended
- Given `'nutritionSupplement'` type → correct template + CTA
- Given `'wearable'` type → correct wearables template + CTA
- Given invalid type → throws

#### Generator (`generator.test.js`)

Mocks the Anthropic client. Uses `chooseRaceMock()` so no race selection API call fires.

- `generatePost('race')` calls the API with correct system prompt and context
- API response is parsed and returned correctly (body + description accessible on the returned object)
- Mock is called with the correct model and `max_tokens`

#### Scheduler (`scheduler.test.js`)

**Skipped.** `getPostType()` is a plain object lookup — testing all 7 day indices would add 7 test cases for logic that has no branches, conditions, or failure modes. A typo in the map would be caught immediately on the first real run. The cron wiring (`generatePost` → `publishPost`) is already covered by the individual generator and publisher unit tests. The overhead of mocking `node-cron`, `vi.useFakeTimers()`, and `vi.mock('./publisher.js')` is not justified for this level of complexity.

### 10.5 Required Refactor

Before `context-builder.test.js` is meaningful, `getContextPrompts()` must be split:

1. `buildContext(type, prompts, races, raceName)` — pure function, returns `contextToUse` string. No async, no side effects. Testable in isolation without any API calls or mocks.
2. `getContextPrompts(type)` — async orchestrator: calls `chooseRace()` to get a race name, then passes it into `buildContext()` and returns the result.

Call chain: `generatePost()` → `getContextPrompts()` → `buildContext()`

`buildContext` is used in production via `getContextPrompts` — the testability benefit is a consequence of the clean separation, not the reason for it.

---

## 11. Future Extensions

### 11.1 Performance Feedback Loop (Planned)

Once posts are publishing consistently, pull weekly XHS engagement data (likes, saves, comments per post type) and use it to update the content strategy context fed to the generator. This turns the static manual analysis in Section 3 into a continuously updating feedback loop — post types that are performing well get weighted higher in the rotation, underperformers get deprioritized or their prompts revised.

### 11.2 New Content Pillars (Expansion Candidates)

The current four pillars cover the core. Future categories to test:

- **Japan Running Travel** — logistics for Chinese runners visiting Japan: visa, accommodation near race starts, transport from China, booking timeline. High search intent, low competition in this niche.
- **Product Reviews / Comparisons** — head-to-head comparisons of Japanese running products in the store. Direct conversion path. Maps naturally to the high-CTR X vs Y title format.
- **Race Reports / Stories** — first-person race day narratives for major Japanese marathons. High engagement from readers planning the same race.
- **Gear Guides** — shoe and apparel recommendations for Japanese race conditions. Natural store CTA.
- **Chinese Runner Japan FAQ** — common questions from Chinese runners about racing in Japan (entry, language, etiquette, logistics). High search intent from first-timers.

### 11.3 Image Generation

XHS is a visual platform and text-only posts underperform posts with images. A future version could auto-generate race route graphics or product visuals and attach them via the publisher.

### 11.4 Multi-Platform Expansion

The generator and publisher are platform-agnostic. The same pipeline could target WeChat Moments, Weibo, or a WordPress blog by swapping the system prompt format rules and publisher module.

### 11.5 User-Generated Content Integration

As the community grows, pull in user race reports or PB submissions and generate celebratory posts featuring real community members — increasing authenticity with zero additional research effort.

### 11.6 Marathon Hub Deep Linking (Planned)

Currently, Race Guide posts CTA to the general race listings page (`/races/`). Once the Marathon Hub project is deployed — a separate pipeline that scrapes RunJapan, normalises race data, and serves it through a React SPA — each Race Guide post will deep link to that specific marathon's dedicated hub page.

This upgrade closes the full funnel: a reader sees a post about 富士山 trail run → clicks the comment link → lands directly on the hub page for that race with full details, registration timeline, and a direct link to sign up. No extra navigation required.

The data to build these deep links already exists in `races.json` (`registrationUrl`, `website`, `name`). The CTA URL injection in `publisher.js` will be updated to pass the specific hub URL once the hub is live — no changes needed to the generator itself.

---

## 12. Open Questions

- **Auto-publish reliability:** Is Playwright stable enough against XHS bot detection, or is semi-automated safer for v1?
- **Post archiving:** Should generated posts be saved to `post_archive/` before publishing as a quality review record?
- **Human review gate:** Should v1 include an optional manual review step before publishing, to validate Claude output quality before going fully autonomous?
- ~~**Hashtag strategy:** Should hashtags be hardcoded per post type, generated by Claude, or pulled from a curated list?~~ **Resolved:** Hardcoded per post type, appended to `description` after parsing Claude's JSON output.
- ~~**Optimal posting time:** Data doesn't yet show time-of-day effects.~~ **Resolved:** 9pm CST daily (`0 21 * * *` with `timezone: "Asia/Shanghai"`). Peak XHS engagement window for lifestyle/fitness content — Chinese runners browsing before bed, planning races, shopping for products.

---

## 13. Repository Structure

```
services/xhs/
    ├── src/
    │   ├── generator.js                    # Claude API integration — all post types
    │   ├── scheduler.js                    # Cron orchestration; watches xhs/config.json for schedule changes
    │   └── publisher.js                    # Playwright browser automation — publish + archive + auth check
    ├── config/
    │   └── prompts.json                    # System prompt, post-type context templates
    ├── scripts/
    │   ├── run-scheduler.js                # Entry point — starts cron scheduler
    │   ├── test-gen.js                     # Dev tool — real API call to generate a sample post
    │   ├── xhs-login.js                    # Auth setup — auto-navigates to QR code, saves auth.json
    │   └── xhs-selectors.json              # Playwright selectors for XHS web client
    ├── tests/
    │   ├── fixtures/
    │   │   ├── sample-races.json           # Controlled race data for generator tests
    │   │   ├── mock-api-response.json      # Hardcoded Claude response for deterministic tests
    │   │   └── post_history.json           # Fixture for dedup tests
    │   ├── context-builder.test.js
    │   └── generator.test.js
    ├── data/                               # Committed for local dev and cross-device testing
    │   ├── races.json                      #   Race data (used by generator locally; at runtime read from shared volume)
    │   ├── post_history.json               #   Race name dedup tracker (empty {} to start)
    │   └── post_archive/                   #   Archive of generated posts
    ├── docs/
    │   ├── xhs-design-doc.md
    │   └── xhs-checklist.md
    ├── Dockerfile
    ├── .dockerignore
    ├── .env.example                        # Only ANTHROPIC_API_KEY needed for local testing
    └── package.json
```

**Local testing note:** Clone the repo, `cd services/xhs`, `npm install`, copy `.env.example` to `.env` and fill in `ANTHROPIC_API_KEY`. Run `node scripts/test-gen.js` to test post generation. `data/races.json` is committed so generation works without running the scraper first.

**Shared volume (runtime only — not in repo):**
```
/data/                                      # Docker shared volume mount point
    ├── scraper/
    │   ├── races.json                      # Written by Scraper container — XHS reads from here at runtime
    │   ├── run_log.json                    # Written by Scraper container
    │   └── config.json                     # Written by Dashboard — scrape limit
    ├── xhs/
    │   ├── run_log.json                    # Written by XHS — per-run metrics + token costs
    │   ├── post_archive/                   # Written by XHS — weekly post archive
    │   ├── post_history.json               # Written by XHS — race name dedup
    │   ├── auth.json                       # Written by xhs-login.js — XHS session cookies
    │   └── config.json                     # Written by Dashboard — per-day post schedule
    └── rakuten/
        ├── run_log.json
        ├── catalog_stats.json
        ├── import_log.json
        └── config.json
```

---

## 14. Production Operations

> This section covers what happens when things go wrong — failure handling per component, prompt versioning, observability, and long-term maintenance. This is what makes the system operable in production, not just functional as a proof of concept.

### 14.1 Explicit Assumptions

The pipeline assumes the following conditions hold at runtime. If any of these are violated, the failure modes below apply.

| Assumption | What breaks if violated |
|---|---|
| RunJapan website structure is stable | Scraper returns 0 or malformed races |
| XHS web client UI is stable | Playwright selectors fail; publish fails |
| `races.json` is populated and valid when daily cron fires | Generator has no race context; Race Guide posts fail |
| Claude API returns valid JSON matching the expected schema | `JSON.parse()` fails; generator throws and aborts |
| Server has a stable internet connection | Any outbound call (scraper, Claude API, Playwright) can fail |
| XHS session cookies in `auth.json` are still valid | Publisher fails to authenticate; publish fails silently |
| The running Claude model (`claude-sonnet-4-5`) is not deprecated | Generator calls fail with a 404 or model-not-found error |

---

### 14.2 Failure Handling Per Component

#### Generator (`generator.js`)

- **Error propagation strategy:** Errors are re-thrown with specific messages per layer (race selection failure vs. generation failure vs. file write failure) rather than caught silently. This means the scheduler's catch block knows exactly which stage failed.
- **API retry behaviour:** The Anthropic SDK is configured with `maxRetries: 3` and a 30-second timeout. The SDK handles exponential backoff on 429 (rate limit) and 5xx automatically — no manual retry logic needed. The 30s timeout replaces the SDK's default 10-minute timeout; responses for this use case are under 500 tokens and a 10-minute hang would stall the entire pipeline.
- **Abort on failure:** If generation fails after retries are exhausted, there is nothing to publish — the correct behaviour is to abort the run. Errors bubble to the scheduler, which owns the single catch point and logs the failure.
- **JSON parsing defence:** Claude occasionally wraps JSON output in ` ```json ` fences despite explicit instructions not to. `generator.js` strips leading ` ```json ` and trailing ` ``` ` with a regex before calling `JSON.parse()`. If parsing still fails, the generator throws with a descriptive error.

#### Publisher (`publisher.js`)

- **Session persistence:** Playwright reuses the saved session from `auth.json` (written by `xhs-login.js`). If the session expires, the publisher will fail to authenticate and log the error. **Recovery:** Re-run `xhs-login.js` to refresh the session.
- **Playwright automation failure:** If the XHS web client rejects the automation (UI change, bot detection), the publisher logs the failure and exits. The generated post is available in `post_archive/` for manual posting.
- **Semi-automated fallback:** If Playwright automation is unreliable for a given period, the fallback path is: generate the post → copy body/description/comments from the archive → post manually via the XHS app. This eliminates bot detection risk while saving approximately 80% of manual effort (composition is the bottleneck, not clicking).
- **Platform content rejection:** If XHS rejects the post content (community guideline violation, spam detection), the failure is logged with the rejection signal. The post is not written to `post_history.json` — it remains eligible for retry or manual review. The operator can retrieve the post from `post_archive/`, modify it, and repost manually.

#### Scheduler / Orchestrator (`scheduler.js`)

- **Single catch point:** All pipeline errors bubble to the scheduler's top-level catch block, which logs the full error (including failed stage, error message, and stack) to `pipeline.log`.
- **No cascading failures:** A failed daily post does not affect the next day's run — each cron invocation is stateless. The scheduler reads rotation state from the day index, not from prior run success.

---

### 14.3 Observability

The pipeline logs each stage to `pipeline.log`. A healthy run produces entries at each stage. A missing entry indicates where the pipeline stopped.

**What to check if something looks wrong:**

| Signal | Likely cause |
|---|---|
| Generator stage missing from log | Claude API failure or races.json empty/stale |
| Publisher stage missing from log | Generator threw and aborted |
| Publisher failed entry in log | Playwright failure or XHS session expired |
| `post_history.json` not growing week-over-week | Publish not completing successfully |

**Post archive as audit trail:** Every generated post is saved to `post_archive/` before publishing. This provides a record of exactly what was sent to XHS — useful for debugging content issues, reviewing quality drift, or reposting failed posts manually.

---

### 14.4 Prompt Versioning

Prompts are stored in `config/prompts.json`, fully separated from pipeline logic (see Section 5: Technical Decisions — Prompt Storage). This separation means:

- **Git is the version history.** Every change to `prompts.json` is a commit — diffs are readable, rollback is `git checkout <commit> -- config/prompts.json`.
- **Safe update process:**
  1. Edit `config/prompts.json`
  2. Run `node scripts/test-gen.js` to generate a sample post with the new prompt
  3. Review the output — check for tone drift, format violations, audience framing issues
  4. Commit if acceptable: `git commit -m "prompt: <what changed and why>"`
- **Rollback:** `git log config/prompts.json` shows all prompt history. `git checkout <hash> -- config/prompts.json` restores any previous version instantly.
- **Major revisions:** Tag significant prompt updates in git (e.g. `prompt-v2`) for easy reference when correlating prompt changes with post performance data.
- **Performance-driven iteration:** Post engagement data informs prompt updates over time — see Section 11.1 for the planned feedback loop. As more data accumulates, prompts are updated to reflect what actually drives views and saves.

---

### 14.5 Manual Override & Operator Intervention

The pipeline is fully automated but not fully autonomous — there are situations where a human needs to step in.

**XHS content rejection**
If XHS blocks a post (community guideline violation, spam detection, sensitive topic flag), the publisher logs the rejection and exits without writing to `post_history.json`. The generated post is preserved in `post_archive/`.

Intervention path:
1. Retrieve the post from `post_archive/`
2. Review — identify why it may have been rejected (flagged keywords, topic sensitivity, link in body)
3. Edit the post manually to address the issue
4. Post via the XHS app directly (bypasses Playwright entirely)

**Playwright automation failure**
If the XHS web client changes or bot detection triggers, automated publishing stops working. The semi-automated fallback is the override path: run the generator manually (`node scripts/test-gen.js`), copy the output from `post_archive/`, and post via the app. This keeps posts going while the automation is being fixed.

**Bad generated content**
If `test-gen.js` output is reviewed before a deploy and the quality is unacceptable (wrong tone, framing drift, format violations), do not publish — update `prompts.json`, regenerate, and review again before enabling the cron.

**Cron is running but posts look wrong**
Disable the cron (`docker-compose down` or comment out the cron line in `scheduler.js`), diagnose via `pipeline.log`, fix the issue, and re-enable. Every post is archived so nothing is lost during the pause.

---

### 14.6 Long-Term Maintenance

The pipeline is designed to be handed off after May 2026 and continue running with minimal intervention. The most likely maintenance events and how to handle them:

**RunJapan site structure change**
- Symptom: Race count in `pipeline.log` drops sharply or to 0
- Fix: Inspect current HTML structure in browser, update cheerio selectors in `scraper.js`
- No code changes needed elsewhere — scraper is self-contained

**XHS web client redesign**
- Symptom: Publisher fails to locate elements; Playwright selector errors in log
- Fix: Update selectors in `publisher.js` to match new UI
- Continuity: Use semi-automated fallback (Section 9.1) while fixes are made — no post gap

**Prompt decay (content underperforms over time)**
- Symptom: XHS engagement metrics declining week-over-week
- Fix: Review post performance by type, update underperforming templates in `prompts.json`, commit and tag the change
- Frequency: Review quarterly or when a content type drops below baseline engagement

**Claude model deprecation**
- Symptom: Generator API calls return model-not-found error
- Fix: Update the model constant in `generator.js` to the current recommended model; run `test-gen.js` to verify output quality before deploying

**XHS session expiry**
- Symptom: Publisher fails to authenticate
- Fix: Re-run `node scripts/xhs-login.js` to refresh `auth.json`

**Environment consistency**
- Playwright browser binaries are environment-sensitive and a common source of silent failures on new machines. The Docker + docker-compose deployment (see Section 5) ensures binaries behave identically across environments. For any new deployment, use Docker rather than running directly on the host.

---
