**Role:** Full-Stack Developer & Growth Engineer
**Company:** running.moximoxi.net
**Duration:** June 2025 – May 2026
**Location:** Osaka, Japan (remote-first)

---

## Overview

Solo-built and operated a Japanese marathon platform targeting Chinese runners, from initial domain registration through to a fully deployed production system. Owned the complete product lifecycle: platform architecture, e-commerce setup, content strategy, growth, and a suite of automation systems built to replace manual operational work at scale.

---

## Platform Development

- Built running.moximoxi.net from scratch — domain, hosting, production deployment, and payments (Stripe) fully configured and live
- Implemented WordPress + WooCommerce e-commerce store with custom product sourcing pipeline, shipping configuration, currency localization (CNY), and bilingual product presentation (Japanese → Chinese)
- Built a 4-module Marathon Readiness Toolkit in vanilla JavaScript with account-based persistence: Race Time Estimator, Goal Pace Converter, Goal-Timeline Feasibility Check, and Progress Trendline — engineered as the platform's retention layer to bring runners back weekly throughout 12–20 week training cycles rather than one-time visits
- Integrated FluentCommunity discussion system and GamiPress gamification layer
- Configured TranslatePress with Google Translate API for automatic Japanese → Chinese product description translation, with manually reviewed and corrected category names for accuracy

---

## Content & Growth

- Designed and executed an organic Xiaohongshu (RedNote) content strategy: 115 posts published, 60,000+ views generated
- Maintained a consistent daily publishing cadence across five content verticals: race guides, training, nutrition, wearables, and equipment
- Conducted ongoing product research to curate a relevant, high-quality catalog aligned with the target audience's purchasing intent

---

## Automation Systems

Identified three core operational bottlenecks and built dedicated automation pipelines to eliminate each.

### XHS Content Pipeline
Built an end-to-end content automation system: a node-cron scheduler drives a Claude API content generator, which produces fully structured posts (title, hook, body sections, CTA, hashtags, comments), passed to a Playwright publisher that handles browser-automated submission to Xiaohongshu including post-publish comment seeding. Replaced 1–2 hours of daily manual work per post. Includes a 7-day post type rotation, structured run logging with token tracking, session management with automatic auth detection, and monthly post history reset to prevent content repetition.

### Race Data Pipeline (Scraper + Race Hub)
Built a weekly RunJapan scraper with incremental deduplication (O(1) URL-based lookup) and DeepL EN→ZH translation across all race fields. Paired with a persistent Express API and a React SPA (Vite + Tailwind CSS v4) embedded in WordPress via a custom plugin — featuring full filtering by distance, region, and date range, with bilingual rendering and graceful fallback for missing translations. Keeps 100+ race listings always current with no manual intervention.

### Rakuten Product Aggregator
Built a full e-commerce automation pipeline: Rakuten API ingestion (keyword search, genre fetch, ranking fetch) → product normalization and title/description cleaning → DeepL JA→ZH name translation → JPY→CNY pricing with configurable markup → WooCommerce REST API push with idempotency checking. Includes a weekly auto-sync cron that updates changed prices, removes unavailable products, and culls stale inventory. A product request flow allows on-demand catalog expansion by keyword directly from the storefront. Deployed on AWS Lightsail via Docker with a GitHub Actions CI/CD pipeline (automated testing on push, automated deployment to production on merge to main).

---

## Infrastructure & Architecture

- Designed a 5-service containerized architecture (XHS, Scraper, Race Hub, Rakuten, Dashboard) all sharing a single PostgreSQL instance as a communication bus — pipelines write state, logs, and output data to the database; the dashboard reads directly without file I/O
- Wrote Dockerfiles and CI/CD workflows (GitHub Actions) for multiple services; Rakuten pipeline live on AWS Lightsail with Docker Hub registry integration
- Managed all infrastructure including SSH key setup, GitHub Secrets configuration, and VPS provisioning

---

## Operator Handoff & Non-Technical Operations Design

All architectural decisions were made with a non-technical successor in mind. The system was explicitly designed so that ongoing operations require no SSH access, no terminal, and no code changes.

- Built a monitoring dashboard (Next.js) giving the operator full visibility into all pipeline states, run histories, error breakdowns, and API usage — from a browser with no technical knowledge required
- Dashboard surfaces manual trigger controls, pricing configuration editing, XHS schedule management, and re-authentication flows — all writing back to PostgreSQL and reloading live without service restarts
- Config hot-reloading implemented across pipelines: price changes and schedule changes propagate immediately when the operator updates a value in the dashboard
- Wrote a handoff document covering: markup and shipping rate configuration, exchange rate updates, pipeline trigger procedures, and MFA/account transfer steps for AWS and Stripe

---

## Analytics Service (In Development)

Designed and building a FastAPI (Python) analytics service that reads XHS post performance data from PostgreSQL and computes per-post-type performance scores — automatically adjusting content generation weights fed back into the XHS scheduler. The system self-optimizes based on observed content performance rather than a fixed rotation, closing the feedback loop between publishing outcomes and future content decisions. The same architecture extends to Rakuten: category performance and price sensitivity analysis to inform product sourcing prioritization.

---

## LinkedIn Setup — Framing Notes

*For internal use — how to present the company LinkedIn ask to boss.*

**The natural framing:**
Tack it on at the end of the letter of rec conversation. Frame it as a masters application credibility ask, not a job hunting ask: *"Universities want to verify work experience — a comment from the company on my LinkedIn is more credible than just listing the role on an application, since it shows it's a real position. Would you be okay leaving a short comment? I'll write a draft, you just approve it."*

**Why it works:**
- He already knows you're applying for masters — completely consistent
- Frames it as verification, not self-promotion
- More credible than a letter you could have written yourself (his words on a public profile)
- He already said yes to the bigger ask (letter of rec) — this is smaller and same pattern
- You do all the work: create the page, write the comment draft, send it to him via WeChat to copy-paste

**What he needs to do:**
1. Create a personal LinkedIn account (needs his own email — only thing he has to do himself)
2. Approve you as company page admin — you handle everything else
3. Copy-paste the comment draft you send him onto your LinkedIn profile

**Draft comment to send him (WeChat, ready to copy-paste):**
> Jason single-handedly built our marathon platform and the automation systems behind it — content pipeline, race data pipeline, and product sourcing — all deployed to production. He also designed everything to be operated by a non-technical team after handoff, which made a real difference. Strong technical work and strong ownership throughout.

Keep it to 3–4 sentences. Specific, credible, not over the top.
