# Dashboard User Guide

**Platform:** running.moximoxi.net automation ecosystem
**Audience:** Non-technical operator
**Last updated:** April 2026

---

## What Is the Dashboard?

The dashboard is your control panel for the entire automation system. It runs at a private URL on the server (not public-facing) and lets you:

- See whether each pipeline is running correctly
- Read logs from recent pipeline runs
- Trigger pipelines manually
- Change the XHS posting schedule
- Re-authenticate the XHS account when the session expires
- Update pricing configuration for Rakuten products
- Upload the monthly XHS performance export and run analytics calibration

You do not need to touch any files, terminals, or code to do any of the above — everything is in the dashboard.

---

## Accessing the Dashboard

Open a browser and go to the dashboard URL (ask the developer for this — it's not publicly listed).

You will be prompted to log in with Google. Use the authorised Google account. No other accounts can access the dashboard.

---

## Home Page — Pipeline Cards

The home page shows one card per service. Each card tells you at a glance whether that pipeline is healthy.

### Status Indicators

Each card has a coloured dot in the top-right corner:

| Colour | Meaning |
|---|---|
| 🟢 Green | Service is running normally |
| 🟡 Yellow | Warning — something needs attention but isn't broken |
| 🔴 Red | Service is down or last run failed |
| ⚪ Grey | Service hasn't run yet or status unknown |

### What Each Card Shows

**XHS Pipeline Card**
- Current status (idle / running / failed)
- Auth status (Session Active / Session Expiring Soon / Session Expired)
- Last run: time, post type, outcome
- Next scheduled post: time and post type
- Success rate over last 30 days
- Token usage (Claude API cost indicator)
- **Login to XHS** button — appears automatically when session is expired

**Scraper Card**
- Current status
- Last run: time, races scraped, outcome
- Next scheduled scrape time
- Data freshness (how old is the current race data)
- Total races in database

**Rakuten Card**
- Current status
- Products in database
- Products live on WooCommerce
- Last sync time
- Error count from last run

---

## XHS Section

Click on the XHS card or navigate to **XHS** in the sidebar.

---

### Schedule Management

The schedule determines what type of post gets published on each day of the week and at what time.

**To view the schedule:** Dashboard → XHS → Schedule

You'll see a weekly grid — one row per day (Monday through Sunday). Each row shows:
- The post type for that day (Race Guide, Training Science, Nutrition, etc.)
- The publish time

**To change a post time:**
1. Click the time field for that day
2. Type the new time (24-hour format, e.g. `21:00` for 9pm)
3. Click Save

**To change a post type:**
1. Click the post type dropdown for that day
2. Select from the available types
3. Click Save

**To add a second post on one day:**
1. Click "+ Add Slot" on that day's row
2. Set the time and post type
3. Click Save

**To remove a post slot:**
1. Click the × next to that slot
2. Click Save

Changes take effect immediately — the scheduler re-registers automatically.

---

### Manual Trigger

Run a post right now without waiting for the scheduled time.

**Dashboard → XHS → "Run Now"**

1. Select a post type from the dropdown (or leave as "Auto" to use today's scheduled type)
2. Click **Run Now**
3. A live log panel opens — you can watch the pipeline run in real time
4. When complete, the result (success / failure) appears at the top of the log

Use this to:
- Test after fixing an issue
- Make up for a missed scheduled post
- Generate a specific post type on demand

---

### Preview Mode

Generate a post without publishing it — useful for checking quality before a real run.

**Dashboard → XHS → "Preview"**

1. Select a post type
2. Click **Preview**
3. The generated post content appears on screen — title, hook, body sections, CTA, hashtags
4. Nothing is published to XHS

---

### Re-Authentication (Login to XHS)

The XHS session expires every few weeks. When it does, the dashboard shows an alert on the XHS card and the Login button becomes prominent.

**To re-authenticate:**
1. Click **"Login to XHS"** (on the home card or in the XHS section)
2. A QR code appears on screen within a few seconds
3. Open the Xiaohongshu app on your phone
4. Tap the camera / scan icon (or Profile → QR code scanner)
5. Scan the QR code shown on the dashboard
6. The dashboard confirms login — the QR code disappears and status updates to "Session Active"
7. All future scheduled posts will now publish normally

**If the QR code doesn't appear:** See Section 3.3 of the handoff runbook.

---

### Run History

A table of every past pipeline run.

**Dashboard → XHS → Run History**

Each row shows:
- Timestamp
- Post type
- Outcome (success / failed)
- Error stage (if failed — e.g. "generate", "publish", "auth")
- Error message (click to expand)
- Token usage (input + output tokens)

Use this to:
- Confirm a post ran
- Find the error message when something failed
- Track token usage over time

---

### Post Archive

View every post that was successfully published.

**Dashboard → XHS → Post Archive**

Each entry shows:
- Title
- Post type
- Publish timestamp
- Click to expand: full post content (hook, body, CTA, hashtags, comments)

---

### Live Logs

Stream the XHS container's output in real time.

**Dashboard → XHS → Live Logs**

The log panel auto-scrolls. Lines are colour-coded:
- White: normal progress
- Yellow: warnings
- Red: errors

Use this when a run is in progress and you want to see what's happening step by step.

---

## Scraper Section

**Dashboard → Scraper**

---

### Manual Trigger

Run the scraper now instead of waiting for the weekly schedule.

**Dashboard → Scraper → "Run Now"**

The scraper takes 5–15 minutes to complete. A live log panel shows progress. Use this after fixing a scraper issue to verify it works.

---

### Run History

Same format as XHS run history — timestamp, outcome, races scraped, failures, error messages.

---

### Race Data Viewer

**Dashboard → Scraper → Races**

A table of all current races in the database:
- Race name (Japanese + Chinese)
- Date
- Location
- Registration status (Open / Closed)
- Last updated

Use this to verify the scraper returned good data after a run.

---

## Rakuten Section

**Dashboard → Rakuten**

---

### Catalog Overview

A table of all product categories with:
- Category name
- Products in database
- Products live on WooCommerce
- Last synced

---

### Add Products to a Category

Fetch more top-ranked products from Rakuten for a specific category and push them to WooCommerce.

1. Find the category row
2. Enter a number in the "Add X" field (e.g. `30` to add 30 more products)
3. Click **Add**
4. A progress indicator shows fetch → translate → push status
5. New products appear in WooCommerce within a few minutes

---

### Pricing Configuration

Update the exchange rate or markup percentage.

**Dashboard → Rakuten → Config**

| Field | What it does |
|---|---|
| Exchange Rate (JPY → CNY) | Used in price calculation for all products |
| Markup % | Profit margin added on top of Rakuten price (e.g. `20` = 20% markup) |

After saving, all product prices recalculate and update automatically in WooCommerce.

**When to update the exchange rate:** When the JPY/CNY rate has moved more than ~2% from the current setting. Check xe.com for the current rate.

---

### Import Log

A log of every product import attempt — success, failed, or skipped.

**Dashboard → Rakuten → Import Log**

Use this to identify which specific products failed to import and why.

---

### Manual Sync

Run the weekly product sync now.

**Dashboard → Rakuten → "Run Weekly Sync"**

This fetches the latest rankings from Rakuten, updates changed prices in WooCommerce, and removes products that are no longer available. Normally runs automatically every Monday 3am JST.

---

### Retry Failed Imports

Re-attempt any products that failed during the last import.

**Dashboard → Rakuten → "Retry Failed"**

---

## Analytics Section

**Dashboard → Analytics**

This section manages the monthly content calibration — analysing post performance and updating the XHS generation strategy.

---

### Monthly Calibration Process

Do this once a month, on the 1st.

**Step 1 — Download the performance export from XHS:**
1. Open XHS Creator Studio (creator.xiaohongshu.com)
2. Go to 数据中心 → 笔记数据
3. Click 导出数据 (Export Data)
4. Download the Excel file to your computer

**Step 2 — Upload to the dashboard:**
1. Dashboard → Analytics → "Upload Performance Export"
2. Select the downloaded Excel file
3. Click Upload

**Step 3 — Run calibration:**
1. Click **"Run Calibration"**
2. The service analyses the data and:
   - Updates content weights (which post types to prioritise)
   - Updates system prompts based on top-performing posts
   - Stores embeddings for new archive posts (improves future post quality)
3. A summary shows what changed — new weights, which prompts were updated, any rollbacks triggered

**Step 4 — Review the diff:**
The calibration summary shows the before/after weights. If anything looks wrong (e.g. nutrition dropped to 0%), you can revert individual changes using the rollback buttons.

---

## Settings

**Dashboard → Settings**

Manage API keys and environment configuration.

| Setting | Description |
|---|---|
| Anthropic API Key | Used by XHS pipeline for post generation |
| OpenAI API Key | Used by analytics service for embeddings |
| DeepL API Key | Used for translating race names and product names |
| Rakuten API Key | Used for fetching products |
| WooCommerce Consumer Key | Used for pushing products to the store |
| WooCommerce Consumer Secret | Paired with consumer key |

**To update a key:**
1. Click the pencil icon next to the key field
2. Paste the new key
3. Click Save

The change takes effect immediately — no restart needed.

---

## Notifications

The system sends Telegram alerts when a pipeline fails. These come from the automation bot account.

**Alert format:**
```
🔴 XHS Pipeline Failed
Stage: publish
Error: auth.json expired — re-authentication required
Time: 2026-04-07 21:03 JST
→ Dashboard: [link]
```

When you receive an alert, open the dashboard and follow the relevant section in the handoff runbook.

---

## Quick Action Reference

| I want to... | Where to go |
|---|---|
| Re-login to XHS | Home → XHS card → Login to XHS |
| Run a post now | XHS → Run Now |
| Preview a post | XHS → Preview |
| Change the posting schedule | XHS → Schedule |
| See why a post failed | XHS → Run History → click the failed run |
| Read recent post content | XHS → Post Archive |
| Add products to the store | Rakuten → category row → Add X |
| Update the exchange rate | Rakuten → Config |
| Sync latest Rakuten prices | Rakuten → Run Weekly Sync |
| Run monthly calibration | Analytics → upload export → Run Calibration |
| Check if everything is running | Home page — check all cards are green |
| Restart a broken service | See handoff-runbook.md Section 6.2 |
