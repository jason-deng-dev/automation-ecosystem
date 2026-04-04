# Portfolio Recording Guide — Automation Ecosystem

Every scene below is a self-contained recording that demonstrates a real, working system. Each one should be short (1–3 min), purposeful, and end on a visible result. Narrate what's happening and why it matters as you go.

---

## 1. Rakuten Pipeline

### 1.1 Bulk Product Push (DB on VPS → WooCommerce live)
**What to show:**
- VSCode open, SSH tunnel to VPS Postgres active
- Run the bulk push script (`npm run bulk-push` or equivalent)
- Split screen: terminal showing products being inserted row by row into PostgreSQL, browser showing WordPress `/shop/` refreshing as products appear live
- End on: 50–100 products populated, store visibly full

**Why it's strong:** End-to-end pipeline. Real DB on a real VPS. Real WooCommerce store. No mocking.

---

### 1.2 Product Request Flow (keyword → search → push → live)
**What to show:**
- Open the dashboard's product request panel
- Type a keyword (e.g. "Amino Vital")
- Watch the SSE progress bar tick through: Fetching from Rakuten → Normalizing → Pricing → Pushing to WooCommerce
- Switch to the WordPress store — product is there within ~2 minutes
- Click the product: price is correct (JPY → CNY formula applied), images are pulled from Rakuten

**Why it's strong:** Real-time feedback loop, customer-facing feature, full pipeline visible in one take.

---

### 1.3 Price Sync (config change → auto-recalculate → WooCommerce update)
**What to show:**
- Open `rakuten/config.json` in VSCode
- Change `markupPercent` for a category (e.g. 30% → 40%)
- Save the file — `fs.watch` fires
- Terminal shows: config reloaded → prices recalculated → WooCommerce API calls firing
- Refresh the product on WordPress — price updated

**Why it's strong:** Hot-reload config without restarting the server. Shows production-grade thinking.

---

### 1.4 Weekly Cron (auto-sync: price updates, unavailability removal, stale cleanup)
**What to show:**
- Dashboard showing last cron run timestamp and stats (products synced, removed, updated)
- Trigger a manual run via dashboard
- Terminal logs showing each stage of the sync

**Why it's strong:** Fully autonomous, zero manual intervention required. Operational maturity.

---

## 2. XHS Pipeline

### 2.1 Auth Flow (QR code scan → session saved)
**What to show:**
- Run the auth script from the dashboard re-auth panel
- Browser opens headlessly, QR code appears on screen via SSE stream
- Scan with phone
- Terminal confirms: session cookies saved to `auth.json`

**Why it's strong:** Browser automation (Playwright) + real auth flow. Not a toy demo.

---

### 2.2 Post Generation (Claude API → Chinese-language XHS post)
**What to show:**
- Trigger a post generation manually
- Terminal shows: context built → Claude API called → structured post returned
- Show the raw output: Chinese copy, correct XHS format (no markdown headers, emoji-heavy, multi-page)
- Compare the generated post to a real top-performing manual post from the archive

**Why it's strong:** Prompt engineering, Claude API, production-grade content generation from a real performance dataset.

---

### 2.3 Publishing (Playwright → XHS live post)
**What to show:**
- Trigger publish from terminal or dashboard
- Playwright browser visible (or headful mode for recording): navigates to XHS, pastes content, submits
- Switch to the live XHS account — post is live
- Dashboard log shows: outcome: success, timestamp, post type

**Why it's strong:** Full browser automation against a real platform. Most people can't get this working.

---

### 2.4 Scheduled Pipeline (7-day cycle, hot-reload config)
**What to show:**
- Dashboard config editor: show the 7-day post schedule
- Change a post type for tomorrow's slot — save
- Terminal confirms: config reloaded, cron jobs re-registered without restart
- Show `run_log.json` with previous successful runs across multiple days

**Why it's strong:** Shows the full autonomous loop — not just one run, but a sustained 7-day cycle.

---

## 3. Scraper + Race Hub

### 3.1 Scraper Run (RunJapan → races.json)
**What to show:**
- Trigger the scraper manually
- Terminal: Playwright navigating RunJapan, races being extracted one by one
- `races.json` populates in real time (watch it grow with `tail -f`)
- End on: X races scraped, `pipeline_state.json` set to idle

**Why it's strong:** Real web scraping against a live site. Data extraction at scale.

---

### 3.2 Race Hub → WordPress Plugin (live race data on the site)
**What to show:**
- Open the Race Hub SPA on running.moximoxi.net/racehub/
- Filter by region, toggle EN/ZH language
- Open a race drawer — full race detail populated from `races.json`
- Show the data flowing: scraper → shared volume → Race Hub API → WordPress plugin → SPA

**Why it's strong:** Full data pipeline made user-facing. Real bilingual product.

---

## 4. Dashboard

### 4.1 Operator Overview (all pipelines at a glance)
**What to show:**
- Open the dashboard at its URL
- Pan across all pipeline cards: XHS status, scraper last run, Rakuten product stats
- Click into XHS detail: run history, token usage, error breakdown
- Trigger a manual scraper run from the dashboard — watch status card update live

**Why it's strong:** Non-technical operator UI. Full observability. Real-time state.

---

## 5. Infrastructure

### 5.1 SSH into VPS + Docker Stack
**What to show:**
- `ssh lightsail` from terminal — in instantly
- `docker ps` — all containers running
- `docker logs rakuten --tail 50` — live pipeline logs
- `docker compose up -d` — stack restarts cleanly

**Why it's strong:** Production-grade deployment. Not localhost.

---

### 5.2 CI/CD Pipeline (GitHub Actions)
**What to show:**
- Push a small change to a service
- Open GitHub Actions tab — CI workflow triggers automatically
- Tests pass → merge allowed
- CD fires: image built, pushed to Docker Hub, deployed to Lightsail via SSH
- `docker ps` on server shows new container version running

**Why it's strong:** Industry-standard engineering practice. Zero manual deploy steps.

---

## Recording Tips

- Use a clean terminal theme (dark, readable font)
- Narrate as you go — explain what each step is doing and why it exists
- Split screen where possible: code/terminal on left, live result (WordPress, XHS, dashboard) on right
- Keep each clip under 3 minutes — one clear outcome per video
- Edit out wait times (API calls, scrape loops) with a jump cut
- End every clip on the visible result, not the code
