# GEO Plan — running.moximoxi.net

**Generative Engine Optimization (GEO)** is the practice of structuring your website so that AI assistants (ChatGPT, Perplexity, Claude, Google AI Overviews) surface and cite your content when users ask relevant questions.

Traditional SEO targets Google's ranking algorithm. GEO targets AI summarization engines — which pull from pages that are authoritative, structured, and directly quotable.

---

## Why This Matters for running.moximoxi.net

When a Chinese runner asks an AI: *"Which Japanese marathons can I enter as a foreigner?"* or *"What running gear do Japanese marathon runners use?"* — we want running.moximoxi.net to be the source the AI cites.

Our site has a natural advantage: **specific, factual, niche content** (exact race names, dates, locations, registration windows, course details) that AI systems prefer over generic running advice.

---

## Current GEO Assets (What We Already Have)

| Asset | GEO Value | Why |
|---|---|---|
| Race Hub | High | Specific race data — dates, locations, registration status, descriptions |
| Race guide XHS posts | Medium | Detailed per-race content, written in Chinese |
| Product pages (Rakuten) | Medium | Specific Japanese products with translated names and descriptions |
| Marathon Readiness Toolkit | High | Tool-based content AI loves to cite as a resource |

---

## GEO Strategy

### 1. Schema Markup (Structured Data)

Schema.org markup tells AI crawlers exactly what your content is. Without it, AI has to guess.

**Priority schemas to add:**

| Schema Type | Where | What it does |
|---|---|---|
| `Event` | Race Hub pages | Marks each race as an event with date, location, registration URL |
| `FAQPage` | Race guide pages, homepage | AI pulls FAQ answers directly into responses |
| `Product` | WooCommerce product pages | Already partially handled by WooCommerce — needs review |
| `Organization` | Homepage | Defines what running.moximoxi.net is and who it serves |
| `BreadcrumbList` | All pages | Helps AI understand site structure |

**Implementation:** WordPress plugin — Rank Math (free) or Yoast SEO handles most schema automatically. Event schema for the Race Hub requires custom code or a plugin like "Schema Pro."

---

### 2. Content Structure — Be Directly Quotable

AI systems cite content that directly answers questions. Every key page should have:

- A clear **H1 that states exactly what the page is** ("2026 Tokyo Marathon — Complete Guide for Chinese Runners")
- A **direct answer in the first paragraph** — no preamble
- **FAQ section at the bottom** of race guides and product pages
- **Specific facts**: dates, prices, distances, registration deadlines — not vague descriptions

**Example — current product description (bad for GEO):**
> 这款跑步鞋适合长距离跑者，提供出色的支撑性。

**Rewritten for GEO (good):**
> ASICS Gel-Nimbus 26 适合周跑量超过 60km 的跑者。鞋重 295g，鞋底厚度 40mm，适合全程马拉松配速 4:30–6:00/km 的跑者。

---

### 3. Race Hub — Primary GEO Asset

The Race Hub is our strongest GEO page. Each race entry should contain:

- Official race name (Japanese + Chinese)
- Date, location (city + prefecture)
- Distance options
- Registration open/close dates
- Foreign runner eligibility (yes/no)
- Course description (flat, hilly, scenic)
- Official website link

This is the kind of structured, factual content AI assistants cite when answering "which Japanese marathons accept foreign runners in 2026."

**Current gap:** Race descriptions are auto-translated from RunJapan — they're accurate but thin. Adding 2–3 sentences of curated context per major race (Tokyo, Osaka, Kyoto, Hokkaido) would significantly improve citability.

---

### 4. Entity Definition — Tell AI What We Are

AI needs to understand the entity (your site) before it will cite it. Add a clear **About section** to the homepage and an `/about` page that states:

- What the site is (Japanese marathon platform for Chinese runners)
- Who it serves (Chinese runners targeting Japanese marathons)
- What it offers (race info, running gear, training resources)
- Location context (Japan-sourced products, Chinese-language content)

This helps AI build a knowledge graph entry for running.moximoxi.net.

---

### 5. External Citations

AI citation likelihood increases when other sources reference your site. Strategies:

- **XHS posts** — link back to specific race guides on the site (already doing this)
- **Guest content** — submit race reports or gear reviews to Chinese running communities (Jiemian Sports, running WeChat groups)
- **Race Hub as reference** — pitch the Race Hub to Chinese running bloggers as a reliable foreign race database

---

## Implementation Plan

### Phase 1 — Quick wins (1–3 days)
- [ ] Install Rank Math or Yoast — enable FAQ schema and Organization schema
- [ ] Add `FAQPage` schema to top 5 race guide pages
- [ ] Add/update About page with clear entity definition
- [ ] Review WooCommerce product schema output — fix missing fields

### Phase 2 — Race Hub upgrade (3–5 days)
- [ ] Add `Event` schema to Race Hub — date, location, URL per race
- [ ] Add foreign runner eligibility field to race database and display it
- [ ] Write 2–3 sentence curated summaries for top 10 races (Tokyo, Osaka, Kyoto, Hokkaido, Nagano, Kobe, Naha, Beppu, Gunma, Tateyama)

### Phase 3 — Content depth (5–9 days)
- [ ] Add FAQ sections to all major race guide pages (5–8 questions per race)
- [ ] Rewrite top 20 product descriptions to be specific and quotable
- [ ] Add structured training resource page (links to Marathon Readiness Toolkit with clear descriptions)

---

## How to Measure GEO Progress

GEO is harder to measure than SEO. Proxies:

- **Manual testing** — ask ChatGPT, Perplexity, Claude: "best Japanese marathons for Chinese runners" — does our site appear?
- **Perplexity citations** — Perplexity shows sources. Track whether running.moximoxi.net appears for target queries.
- **Google AI Overviews** — search target queries on Google Japan/China and check if our content is pulled into the AI summary box
- **Organic referral traffic** — indirect signal: if AI is sending users, you'll see referrals from ChatGPT, Perplexity, Bing in Google Analytics

---

## Summary

| Priority | Action | Effort | Impact |
|---|---|---|---|
| 1 | Schema markup via Rank Math | Low | High |
| 2 | FAQ sections on race guides | Medium | High |
| 3 | Event schema on Race Hub | Medium | High |
| 4 | Curated race summaries (top 10) | Medium | Medium |
| 5 | Product description rewrites | High | Medium |
| 6 | About page / entity definition | Low | Medium |
| 7 | External citation outreach | High | Low (long-term) |

The highest-leverage move is **schema markup + FAQ sections** — low effort, immediate signal to AI crawlers, no content creation required beyond what we already have.
