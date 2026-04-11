# Operator Handoff Runbook

**Platform:** running.moximoxi.net automation ecosystem
**Audience:** Non-technical operator
**Last updated:** April 2026

---

**Developer leaving?** See [`handoff-setup.md`](handoff-setup.md) for account transfers, SSH key handoff, and database backup steps.

---

## How to Use This Document

Something stopped working. Use this document to figure out what broke and how to fix it.

**Step 1 — Check the dashboard first.** The dashboard (see `dashboard-guide.md`) shows the status of every pipeline. Start there — it will usually tell you which service failed and what the error was.

**Step 2 — Find the section below** that matches what broke.

**Step 3 — Follow the fix steps.** Most fixes involve copying an error message and asking an AI assistant (Claude at claude.ai or ChatGPT) to help you interpret it. Steps that require AI help are marked with 🤖.

**When in doubt:** Copy the exact error message from the dashboard and paste it into Claude or ChatGPT with the message: *"I'm running an automation system on a server. This error appeared. Explain what it means and what I should do."*

---

## Overview — What Each Service Does

| Service | What it does | How often it runs |
|---|---|---|
| **Scraper** | Fetches Japanese marathon race data from RunJapan | Weekly (Sunday 2am JST) |
| **Race Hub** | Serves race data to the WordPress website | Continuously (on-demand) |
| **XHS Pipeline** | Generates and publishes posts to Xiaohongshu | Daily (scheduled time) |
| **Rakuten Pipeline** | Fetches products from Rakuten and pushes to WooCommerce | Weekly + on demand |
| **Dashboard** | Shows status of all pipelines, allows manual control | Always-on |

All services run as Docker containers on an AWS Lightsail server. They share a single PostgreSQL database.

---

## Section 1 — The Most Common Failures

These are the failures most likely to happen in normal operation.

---

### 1.1 XHS Session Expired (Most Frequent)

**Symptom:** Dashboard shows XHS pipeline status as "Auth Failed" or "Session Expired". Posts stop publishing.

**Why it happens:** The XHS login session expires every few weeks. This is normal — XHS requires periodic re-authentication.

**Fix:**
1. Open the dashboard
2. Find the XHS pipeline card
3. Click **"Login to XHS"**
4. A QR code will appear on screen
5. Open the Xiaohongshu app on your phone
6. Tap the profile icon → scan QR code → scan the code shown on screen
7. The dashboard will confirm login was successful
8. Future posts will resume automatically

**If the QR code doesn't appear:** The login flow itself may be broken (XHS changed their website). See Section 3.3.

---

### 1.2 An API Key Stopped Working

**Symptom:** Dashboard shows errors mentioning "401", "Unauthorized", "Invalid API Key", or "Authentication Failed" for any service.

**Why it happens:** API keys expire, get revoked, or reach their usage limit.

**Which service failed tells you which key:**

| Error appears in | Likely broken key | Where to get a new one |
|---|---|---|
| XHS post generation | Anthropic (Claude) API key | console.anthropic.com |
| Product name translation | DeepL API key | deepl.com/pro |
| RAG / embeddings | OpenAI API key | platform.openai.com |
| Rakuten product fetch | Rakuten API key | developers.rakuten.com |
| WooCommerce product push | WooCommerce consumer key | WordPress admin → WooCommerce → Settings → Advanced → REST API |

**Fix:**
1. Get a new API key from the relevant provider (links above)
2. Open the dashboard → Settings
3. Find the relevant key field and update it
4. Save and re-run the failed pipeline via the manual trigger button

---

### 1.3 Pipeline Failed — Generic Error

**Symptom:** Dashboard shows a pipeline run as "Failed" with an error message.

**Fix:**
1. Click on the failed run in the dashboard to see the full error message
2. Copy the error message
3. 🤖 Paste it into Claude or ChatGPT: *"This error appeared in my automation pipeline. What does it mean and how do I fix it?"*
4. If the AI suggests a code fix, see Section 5 (Making Code Changes)
5. After fixing, use the manual trigger button to re-run the pipeline

---

### 1.4 Posts Not Publishing at Scheduled Time

**Symptom:** Expected daily XHS post didn't go out. Dashboard shows no run at the scheduled time.

**Check these in order:**

1. **Is the XHS session active?** → Check dashboard auth status. If expired, re-auth (Section 1.1)
2. **Did the cron job fire?** → Check the run history on the dashboard. If no entry at all, the scheduled job didn't trigger
3. **Is the container running?** → Dashboard health indicators show green/red per service. If XHS is red, restart it (Section 4.1)
4. **Is the schedule set correctly?** → Dashboard → XHS → Schedule. Confirm the day and time match what you expect

---

### 1.5 DeepL Translation Quota Exceeded

**Symptom:** Race names, product names, or race descriptions appearing in Japanese/English on the website instead of Chinese. Dashboard may show DeepL errors.

**Why it happens:** DeepL has a monthly character limit. If the pipeline translated too much text, the quota runs out.

**Fix:**
1. Log into deepl.com with the account credentials
2. Check the usage meter — if near or at limit, wait until the 1st of next month when it resets
3. If it reset but still failing, the API key may need refreshing — see Section 1.2
4. Translations that already ran are cached in the database — only new content needs re-translating

---

## Section 2 — Scraper Failures

The scraper runs weekly and fetches race data from runjapan.jp. If it fails, the race data on the website goes stale but nothing breaks immediately — the last good data is preserved.

---

### 2.1 Scraper Returned 0 Races or Failed Entirely

**Symptom:** Dashboard shows scraper run failed, or "races scraped: 0".

**Most likely cause:** RunJapan's website changed its HTML structure (they redesigned or updated the page).

**Fix:**
1. Open the dashboard → Scraper → last run details
2. Copy the error message
3. 🤖 Ask Claude: *"My web scraper that reads runjapan.jp is failing with this error: [paste error]. The scraper uses Cheerio in Node.js to parse HTML. What likely changed and how should I update the selectors?"*
4. The AI will suggest updated selector strings
5. See Section 5 for how to apply a code fix

**While waiting for a fix:** The previous race data is still in the database — the website continues working normally, just with slightly stale race information.

---

### 2.2 Only Partial Race Data Returned

**Symptom:** Dashboard shows scraper succeeded but with fewer races than usual (e.g. 15 instead of 80+).

**Most likely cause:** RunJapan pagination changed, or session cookie handling broke.

**Fix:**
1. Note the exact number of races returned from the dashboard
2. 🤖 Ask Claude: *"My RunJapan scraper returned only [X] races instead of the usual 80+. It uses session cookies for pagination on runjapan.jp. What could cause partial results and how do I fix it?"*
3. Apply fix per Section 5, then trigger a manual scrape from the dashboard

---

### 2.3 Scraper Ran But Race Data Looks Wrong

**Symptom:** Races on the website have missing dates, wrong locations, or blank descriptions.

**Most likely cause:** RunJapan changed the HTML structure of their detail pages, so the scraper is reading from the wrong fields.

**Fix:** Same as Section 2.1 — HTML selector update needed.

---

## Section 3 — XHS Pipeline Failures

---

### 3.1 Post Generated But Not Published

**Symptom:** Dashboard shows run completed but no post appeared on XHS. Or error at "publish" stage.

**Check in this order:**
1. Is the session active? (Section 1.1)
2. Was the account temporarily banned? Log into XHS manually and check for any ban notice
3. Did XHS change their publish interface? (Section 3.2)

---

### 3.2 Playwright Publish Selectors Broke

**Symptom:** Dashboard shows error at publish stage mentioning "selector", "element not found", "timeout waiting for", or "strict mode violation".

**Why it happens:** XHS updated their website design and the buttons/fields the automation clicks are now in different places or have different names.

**Fix:**
1. Copy the full error from the dashboard
2. 🤖 Ask Claude: *"My Playwright browser automation for publishing to Xiaohongshu is failing with: [paste error]. The script is in publisher.js. XHS likely changed their HTML. How do I find the new selectors and what code changes are needed?"*
3. Claude will walk you through opening the XHS website in a browser, using Developer Tools (F12) to find the new selectors, and what to change in the code
4. Apply fix per Section 5

---

### 3.3 XHS Login / QR Code Flow Broke

**Symptom:** Clicking "Login to XHS" on the dashboard shows an error or blank screen instead of a QR code.

**Why it happens:** XHS changed their login page design — the automated script can no longer navigate to the QR code screen.

**Fix:**
1. 🤖 Ask Claude: *"My Playwright script that navigates to the XHS login page and clicks through to the QR code screen is failing. The script is xhs-login.js. XHS likely changed their login page HTML. How do I find the new selectors for the login flow?"*
2. Apply fix per Section 5

**In the meantime:** You can manually log in by SSH-ing into the server — ask the developer for instructions specific to your setup if this becomes urgent.

---

### 3.4 Claude API Failing / Post Not Generating

**Symptom:** Dashboard shows error at "generate" stage. Error mentions "API", "Anthropic", "timeout", or "rate limit".

**Possible causes and fixes:**

| Error message contains | Cause | Fix |
|---|---|---|
| "401" or "Unauthorized" | API key invalid | Section 1.2 — renew Anthropic key |
| "429" or "rate limit" | Too many requests | Wait 1 hour and re-trigger manually |
| "timeout" | Anthropic API slow/down | Check status.anthropic.com — wait if outage, re-trigger when resolved |
| "invalid JSON" | Claude returned malformed output | Re-trigger — usually transient. If repeating, see below |

**If "invalid JSON" keeps repeating:**
1. Copy the error from the dashboard
2. 🤖 Ask Claude: *"My XHS post generator using the Anthropic Claude API is repeatedly failing with a JSON parse error. The generator is in generator.js. What in the system prompt might cause Claude to return invalid JSON and how do I fix it?"*

---

### 3.5 Race Data Missing — Race Posts Failing

**Symptom:** Error at "generate" stage for race post types specifically. Error mentions "races", "empty", or "no races available".

**Why it happens:** The scraper hasn't run recently or failed, leaving the race database empty or stale.

**Fix:**
1. Dashboard → Scraper → click "Run Now" to trigger a manual scrape
2. Wait for it to complete (usually 5–10 minutes)
3. Dashboard → XHS → click "Run Now" with post type "Race Guide"

---

### 3.6 Posts Generating But Quality is Poor

**Symptom:** Posts are publishing but content seems off-brand, repetitive, or not matching the expected format.

**Fix:**
1. Dashboard → Analytics → trigger a manual calibration (if the monthly Excel export has been uploaded)
2. If no export uploaded: download the latest performance export from XHS Creator Studio (笔记数据 → 导出数据), drop into the shared volume path shown in the dashboard, then trigger calibration
3. If quality issues persist after calibration, the system prompt may need manual review — see Section 5

---

## Section 4 — Rakuten Pipeline Failures

---

### 4.1 Products Not Appearing in WooCommerce

**Symptom:** Triggered a product fetch from the dashboard but products didn't appear in the WooCommerce store.

**Check in order:**
1. Dashboard → Rakuten → import log — look for errors per product
2. Common error: WooCommerce API auth failed → Section 1.2 (renew WC consumer key)
3. Common error: Image sideload failed → products were created but without images. Check WooCommerce admin to see if products exist without photos

---

### 4.2 Rakuten API Rate Limit

**Symptom:** Dashboard shows Rakuten errors with "429" or "Too Many Requests".

**Fix:** Wait 1 hour, then re-trigger the product fetch. The pipeline has automatic retry built in but hitting the rate limit during a large bulk fetch can exhaust retries.

If this happens repeatedly during weekly sync, the fetch volume may need reducing — 🤖 ask Claude: *"My Rakuten API calls are repeatedly hitting rate limits during bulk product fetching. How do I reduce the request rate in the pipeline?"*

---

### 4.3 WooCommerce Products Have No Images

**Symptom:** Products appear in the store but show a placeholder image instead of the actual product photo.

**Why it happens:** Rakuten's image CDN blocked the image download during WooCommerce sideloading.

**Fix:**
1. Dashboard → Rakuten → click "Retry Failed Imports"
2. If images still fail, 🤖 ask Claude: *"My WooCommerce product image sideloading from Rakuten CDN URLs is failing. What's the most likely cause and fix?"*

---

### 4.4 Exchange Rate Is Stale

**Symptom:** Product prices on the store look obviously wrong — either too high or too low compared to the current JPY/CNY rate.

**Fix:**
1. Check the current JPY → CNY exchange rate (xe.com or Google)
2. Dashboard → Rakuten → Config → update the "Exchange Rate (JPY to CNY)" field
3. Save — all product prices will automatically recalculate and update in WooCommerce

---

### 4.5 Weekly Sync Didn't Run

**Symptom:** Products in the store have outdated prices or show items that are out of stock.

**Fix:**
1. Dashboard → Rakuten → click "Run Weekly Sync" to trigger manually
2. If it fails, check for database errors (Section 6.1) or API auth errors (Section 1.2)

---

## Section 5 — Making Code Changes

When a fix requires editing code (e.g. updated HTML selectors, updated API call format), follow these steps.

**You will need:** SSH access to the server, or access to the GitHub repository.

### Option A — Using the GitHub Repository (Recommended)

1. Go to the GitHub repository in a browser
2. Find the file that needs changing (the AI assistant will tell you the filename)
3. Click the pencil icon (Edit) on the file
4. Make the change the AI suggested
5. Click "Commit changes" — add a short description of what you changed
6. The CD pipeline will automatically deploy the change to the server within a few minutes
7. Check the dashboard to confirm the service restarted successfully

### Option B — Editing Directly on the Server (Emergency Only)

1. SSH into the Lightsail instance
2. Navigate to the file: `cd /home/ec2-user/automation-ecosystem`
3. Edit the file using nano: `nano services/xhs/src/publisher.js` (or whichever file)
4. Make the change, save with Ctrl+X → Y → Enter
5. Restart the affected container: `docker-compose restart xhs`
6. ⚠️ Note: changes made this way will be overwritten on the next GitHub deploy. Make sure to also update the GitHub file.

### 🤖 Getting AI Help With Code Changes

Always paste the following context to Claude or ChatGPT along with your question:

> *"I'm maintaining a Node.js automation ecosystem running on AWS Lightsail in Docker containers. The services are: XHS (Playwright + Anthropic API), Scraper (Cheerio web scraper), Rakuten (TypeScript Express API), Race Hub (Express + React). [Paste your specific question/error here]."*

---

## Section 6 — Database & Infrastructure Failures

---

### 6.1 Database Down / Connection Errors

**Symptom:** Multiple services failing simultaneously. Dashboard shows errors mentioning "ECONNREFUSED", "database", "PostgreSQL", or "connection refused".

**Fix:**
1. SSH into the server
2. Run: `docker-compose ps` — check if the `postgres` container is running
3. If it shows "Exit" or "Restarting": `docker-compose restart postgres`
4. Wait 30 seconds, then check: `docker-compose ps` again
5. If it keeps crashing: `docker-compose logs postgres` — copy the output and 🤖 ask Claude what's wrong

**If disk is full** (error mentions "no space left on device"):
1. Run: `df -h` to check disk usage
2. Run: `docker system prune -f` to remove unused Docker images/containers
3. If still full, the Lightsail instance storage may need upgrading — contact AWS support

---

### 6.2 A Container Keeps Crashing

**Symptom:** Dashboard shows a service as "down" repeatedly, even after restarting.

**Fix:**
1. SSH into server
2. Run: `docker-compose logs [service-name]` (replace with: xhs, scraper, rakuten, race-hub, dashboard)
3. Copy the last 50 lines of output
4. 🤖 Paste into Claude: *"My Docker container keeps crashing. Here are the logs: [paste]. What is causing this?"*

---

### 6.3 All Services Down

**Symptom:** Dashboard unreachable. Website still works but no automation running.

**Most likely cause:** The Lightsail instance rebooted (e.g. AWS maintenance, power event) and Docker containers didn't auto-start.

**Fix:**
1. SSH into the server
2. Run: `docker-compose up -d`
3. Wait 1 minute, then check: `docker-compose ps` — all services should show "Up"
4. Open the dashboard to confirm everything is running

**To prevent this in future:** Docker should be configured to start on boot. Run: `sudo systemctl enable docker`

---

## Section 7 — Monthly Maintenance Tasks

These are routine tasks that require manual action once a month.

| Task | When | How |
|---|---|---|
| Upload XHS performance export | 1st of each month | Download from XHS Creator Studio (笔记数据 → 导出数据) → Dashboard → Analytics → Upload |
| Trigger analytics calibration | After upload | Dashboard → Analytics → "Run Calibration" |
| Check exchange rate | 1st of each month | xe.com → update in Dashboard → Rakuten → Config if moved >2% |
| Review post archive | Any time | Dashboard → XHS → Post Archive — check recent posts look correct |
| Check DeepL quota | If translations stop | deepl.com → account → usage |

---

## Section 8 — Account Access Handoff

These accounts need to be transferred to the operator before the developer leaves.

### AWS (Lightsail — server hosting)
- The Lightsail instance runs all automation containers
- **Action required:** Developer must add operator as an IAM user with MFA, or transfer the root account MFA device (authenticator app) in person
- Without access: you cannot restart the server, check logs, or manage infrastructure
- AWS console: lightsail.aws.amazon.com

### Stripe (payment processing)
- Stripe is connected to WooCommerce for customer payments
- **Action required:** Developer must reassign the MFA authenticator to operator's phone, or switch to SMS-based MFA before handoff
- Without access: you cannot view payouts, manage disputes, or update payment settings
- Stripe dashboard: dashboard.stripe.com

---

## Section 9 — Emergency Contacts & Resources

| Need | Resource |
|---|---|
| General AI help with errors | claude.ai or chatgpt.com |
| Anthropic API status | status.anthropic.com |
| Rakuten API docs | webservice.rakuten.co.jp |
| DeepL API status | deepl.com/pro |
| AWS Lightsail console | lightsail.aws.amazon.com |
| WooCommerce REST API docs | woocommerce.com/document/woocommerce-rest-api |
| XHS Creator Studio | creator.xiaohongshu.com |

---

## Quick Reference — Error Message Lookup



| Error message | What it means | Go to |
|---|---|---|
| `401 Unauthorized` | API key invalid or expired | Section 1.2 |
| `429 Too Many Requests` | Rate limit hit | Wait 1 hour, retry |
| `ECONNREFUSED` | Service not running or DB down | Section 6.1 |
| `auth.json expired` | XHS session expired | Section 1.1 |
| `selector not found` or `strict mode violation` | Website HTML changed | Section 3.2 or 2.1 |
| `JSON parse error` | API returned malformed response | Re-trigger; if repeating see Section 3.4 |
| `no space left on device` | Server disk full | Section 6.1 |
| `races.json not found` | Scraper hasn't run | Section 3.5 |
| `DEEPL_API_KEY` | DeepL key missing or expired | Section 1.2 |
