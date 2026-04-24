- [x] Setup
  - [x] Initialize repo
  - [x] Set up Node.js project (npm init)
  - [x] Install dependencies (node-cron, playwright)
  - [x] Install scraper dependencies (axios, cheerio)
  - [x] Install @anthropic-ai/sdk
  - [x] Set up .env (Anthropic API key)
  - [x] Set up .gitignore

- [x] Build scraper.js (self-contained RunJapan scraper)
  - [x] Fetch race listings from RunJapan
  - [x] Parse and normalize race data
  - [x] Write to races.json

- [x] Build post generator with Claude API
  - [x] system prompt/context prompt template setup
  - [x] Specify JSON output format in system prompt (title, hook, contents[], cta, description)
  - [x] Make api call with context and get response
  - [x] chooseRace() working — race selection API call complete, returns race name
  - [x] Add chooseRaceMock() for testing without burning API calls
  - [x] Update context prompt with relevent info at runtime
    - [x] If race post, make api call with all marathons and ask which one to use
    - [x] Inject race fields into raceGuide context at runtime
    - [x] update design doc for new prompts / responses / explanation prompt selection
    - [x] Move CTA out of system prompt — inject per post type as natural language description in generatePost()
    - [x] Add static comments array per post type (primary CTA + community CTA)
    - [x] Populate comments with real URLs for all post types (race, training, nutrition)
    - [x] Training comments expanded to 3 (mara-prep-tools, progress-trendline, community)
    - [x] Add season field to race guide prompt template
    - [x] Add current month injection to all post type prompts at runtime
    - [x] Add current season injection to all post type prompts at runtime
    - [x] Add seasonal content guidance to training/nutrition post type prompts
    - [x] Add wearables/equipment post type context prompt to prompts.json
    - [x] Define hardcoded hashtags per post type (including wearables)
    - [x] Update system prompt with new structured output format (title, hook, contents[], cta, description)
    - [x] Update system prompt with new format rules (line limits, page budgets, subtitle rules, CTA rules)
    - [x] getHashtags() wired — append to response before returning from generatePost()
    - [x] When a marathon is used it is added to post_history.json
    - [x] When selecting a marathon filter out marathons in post_history.json

- [x] Code quality / robustness (generator + scraper)
  - [x] Add named exports to generator.js and scraper.js
  - [x] Replace chooseRaceMock() with chooseRace() in production code path
  - [x] Move post_history.json write to after successful API call
  - [x] Include comments in generatePost() return value
  - [x] Deserialize API response — JSON.parse(message.content[0].text) → structured post object
  - [x] Add error handling — re-throw with specific messages per layer (chooseRace, generatePost, scraper)
  - [x] Fix module-level side effects — injectable deps with default* fallbacks; threaded through generatePost → getContextPrompts → chooseRace
  - [x] Fix template substitution — use replaceAll, guard against null/undefined fields with "missing from the website" fallback
  - [x] Fix dedup — filter races array before building string, not string manipulation after
  - [x] Add `cleanName()` to strip 【...】 entry tier suffixes from race names before comparison
  - [x] Fix race dedup — two-way `.some()` substring check so all variant entry tiers of the same race are excluded
  - [x] Fix trailing ||| delimiter in race list — use Array.join('|||')
  - [x] Fix race selection max_tokens: 1024 → 100
  - [x] Move systemRaceSelectionPromptTest out of prompts.json → defined inline in generator.test.js
  - [x] Fix "dev" script — add target file to node --watch
  - [x] Fix registrationOpen false negative — use null for unknown state instead of false
  - [x] Fix getInfo() mixed concerns — extract href/name in caller, pass only url to getInfo
  - [x] Fix inner scraper loop — break early when races.length >= limit
  - [x] Add dotenv import + RUNJAPAN_BASE_URL / RUNJAPAN_TIMEOUT from .env in scraper
  - [x] Add retries + timeout to Anthropic client — maxRetries: 3, timeout: 30s
  - [x] Add axios-retry to scraper — 3 retries, exponential backoff, network errors + 5xx only

- [x] Setup tests (Vitest)
  - [x] Install Vitest
  - [x] Create tests/ folder structure (fixtures/, scraper.test.js, context-builder.test.js, generator.test.js, scheduler.test.js)
  - [x] Create sample-races.json and mock-api-response.json fixtures
  - [x] Refactor generatePost() — extract getContextPrompts() as separate async function
  - [x] Refactor getContextPrompts() → pure buildContext(type, prompts, races, raceName) — no async, no internal API calls
  - [x] scraper.test.js — validate output shape, required fields, minimum race count
  - [x] context-builder.test.js — test each post type builds correct context
  - [x] generator.test.js — mock Anthropic client, verify API called correctly
  - [x] scheduler.test.js — skipped: getPostType() is a plain lookup table, not worth 7 test cases; cron wiring already covered by individual unit tests
  - [x] utils.test.js — cleanName() edge cases (dedup function; had real prod bug)

- [x] Test generation across all post types

- [x] Build scheduler.js (orchestrator)
  - [x] Post type rotation logic (7-day schedule)
  - [x] Add wearables/equipment to rotation schedule
  - [x] Simulate 7-day schedule and verify correct post types fire in order
  - [x] Wire full daily cron (scraper weekly, generate → publish daily)
  - [x] Add run-scheduler.js entry point

- [x] Build publisher.js (Playwright)
  - [x] Auth setup (one-time)
    - [x] Add auth.json to .gitignore
    - [x] Write scripts/xhs-login.js — launch headed browser, navigate to XHS, page.pause() for manual login, save storageState to auth.json
    - [x] Run xhs-login.js and verify auth.json is created
  - [x] Selector discovery (do before writing publisher.js)
    - [x] Open XHS post creation page manually in headed browser with DevTools
    - [x] Find and document selector for title input
    - [x] Find and document selector for body/content area (likely a rich text editor)
    - [x] Find and document selector for description field
    - [x] Find and document selector for hashtag input
    - [x] Find and document selector for publish/submit button
    - [x] Find and document selector for comment input field
    - [x] Determine how to input text into the rich text editor (page.fill vs keyboard.type vs clipboard)
    - [x] Document all selectors as named constants at the top of publisher.js
  - [x] Build publisher.js
    - [x] Load auth.json as storageState on context creation
    - [x] Navigate to XHS post creation URL
    - [x] Wait for editor to be ready
    - [x] Fill title field
    - [x] Fill content body: hook → each contents[] subtitle + body → cta (in sequence)
    - [x] Fill description field with hashtags appended
    - [x] Click publish button
    - [x] Wait for success confirmation
    - [x] Navigate to published post URL
    - [x] Post comments sequentially — primary CTA first, community second
    - [x] Return true on success
  - [x] Error handling
    - [x] Catch auth failure (auth.json expired) — log clear message prompting re-login
    - [x] Catch publish failure — log error, do not post comments
    - [x] Catch comment failure — log which comment failed, continue with remaining
    - [x] Add auth pre-flight check for profile/comment page before starting publish flow
    - [x] Fix #login-btn strict mode violation — resolves to 2 elements, use .first()
    - [x] Fix scheduler not stopping on publishPost() returning false — check return value and abort
    - [x] Fix generator crash: "Cannot read properties of undefined (reading 'name')" — cleanName() receiving undefined race when selected race name didn't match races.json due to 【...】 suffix
    - [x] Fix JSON parse crash: added system prompt rule banning all double quotation marks inside JSON string values; use 「」or 《》 as alternatives
    - [x] Fix `checkAuth()` missing `return true` — caused infinite auth-failed loop in scheduler
    - [x] Fix scheduler — call `process.exit(1)` on auth error to hard-stop cron job
    - [x] Refactor xhs-login.js — auto-advance on login detection instead of page.pause()

- [x] Post archive
  - [x] Write generated post to data/post_archive/ on successful publish (weekly JSON file keyed by ISO timestamp)
  - [x] archivePost() in publisher.js — computes Monday of current week as filename, merges into existing file

- [x] Test 7-day post cycle
  - [x] Verify all 7 post types fire in order (scheduler test mode — queue-based, back-to-back)
  - [x] Verify race dedup works — no repeat races across cycle

- [x] Structured run logging (dashboard prerequisite)
  - [x] Append to `xhs/run_log.json` on every pipeline run — timestamp, post_type, outcome, error_stage, error_message, tokens_input, tokens_output
  - [x] Pull token counts from `usage` field on every Claude API response and include in log entry

- [x] Monthly post_history.json reset — clear the array at the start of each month so the race pool doesn't get permanently exhausted

- [x] Shared volume migration
  - [x] Update all file read/write paths to use shared volume mount (scraper/races.json, xhs/run_log.json, xhs/post_archive/, xhs/auth.json)
  - [x] Move hardcoded dayTypeMap + cron times out of scheduler.js into xhs/config.json
  - [x] Scheduler watches xhs/config.json for changes and re-registers cron jobs at runtime
  - [x] Write xhs/pipeline_state.json to shared volume on run start (running) and run end (idle / failed) — dashboard reads this for GET /api/pipeline-state
  - [x] Remove scraper.js from XHS container — reads scraper/races.json from shared volume instead

- [x] PostgreSQL migration (shared volume → DB)
  - [x] Add `pg` to package.json dependencies
  - [x] Create `src/db/pool.js` — pg Pool with DATABASE_URL
  - [x] Create `src/db/queries.js` — all DB operations (see table specs below)
  - [x] Create `src/db/schema.sql` — all XHS tables
  - [x] Add `xhs_schedule` table — day (0–6), time, post_type; replaces `xhs/config.json`
  - [x] Add `xhs_run_logs` table — published_at TIMESTAMPTZ, post_type, outcome, error_stage, error_msg, input_tokens, output_tokens; used for ops/dashboard monitoring
  - [x] Add `xhs_post_history` table — race_name, posted_at, month (for monthly reset)
  - [x] Add `xhs_post_archive` table — full analytics record per post: published_at TIMESTAMPTZ, post_type, race_name (nullable — race posts only), title, hook, contents JSONB, cta, description, hashtags TEXT[], comments TEXT[], input_tokens, output_tokens, published BOOLEAN (false = preview run); analytics source of truth, no join needed
  - [x] Replace `races.json` file read with SELECT from `races` table
  - [x] Replace `config.json` file watch with one-time DB load of `xhs_schedule` on startup — no polling; dashboard/analytics service triggers reload via `setupAllDailyCrons()` (docker exec or HTTP endpoint)
  - [x] Replace `pipeline_state.json` write with UPSERT into `pipeline_state` table
  - [x] Replace `run_log.json` append with INSERT into `xhs_run_logs`
  - [x] Replace `post_history.json` read/write with SELECT/INSERT on `xhs_post_history`
  - [x] Replace `post_archive/` writes with INSERT into `xhs_post_archive` — include post_type, race_name, token counts, published flag
  - [x] Monthly reset — DELETE FROM xhs_post_history WHERE month != current month
  - [x] Remove `DATA_DIR` env var dependency — add DATABASE_URL to .env.example
  - [x] `auth.json` stays as file — no migration needed

- [x] Bot detection mitigations (publisher.js)
  - [x] Replace all `page.fill()` with clipboard paste — `page.evaluate(() => navigator.clipboard.writeText(text))` + `Ctrl+V`
  - [x] Add `humanDelay(min, max)` helper — random sleep between min/max ms, applied between all major actions
  - [x] Add random 3–8s page dwell after navigation before first interaction
  - [x] Add ±15–30 min random offset to actual post time inside publisher (cron fires at 21:00, post lands 20:30–21:30)

- [x] Docker & Deploy
  - [x] Write Dockerfile (XHS container)
  - [x] Write .dockerignore
  - [x] Complete Dockerfile — install Playwright + Chromium browser dependencies
  - [x] Write `cicd-xhs.yml` — replaces ci-xhs.yml; test job gates deploy; auth.json bind-mounted from /home/ubuntu/xhs/auth.json on VPS
  - [x] Transfer `.env` to VPS (`~/xhs/.env`)
  - [x] Transfer auth.json to Lightsail instance (`~/xhs/auth.json`)
  - [x] Seed `ecosystemdb` — ran schema.sql + seeded xhs_schedule (7 rows) + pipeline_state via psql
  - [x] Verify XHS container runs on Lightsail — 7 cron jobs registered; awaiting cron fire to confirm publish

- [x] Dashboard integration — manual trigger + preview mode
  - [x] `scripts/run-manualPost.js` — reads type from `process.argv[2]`, triggers a full publish run
  - [x] `scripts/run-preview.js` — reads type from `process.argv[2]`, generates + archives only, skips publish + post_history write
  - [x] Dashboard invokes via `docker exec xhs node scripts/run-manualPost.js <type>` or `run-preview.js <type>`

- [x] xhs-login.js — dashboard re-auth flow (requires deploy + dashboard)
  - [x] Discover and document selectors for: "login with QR code" tab, QR code image element, post-login redirect URL
  - [x] Auto-click through to QR code screen — `.login-box-container img` click switches to QR code mode
  - [x] Detect successful login via post-login URL redirect
  - [x] Screenshot stream wired — emit({ type: 'frame' }) every 1s, SSE route forwards to dashboard EventSource
  - [x] Log stream wired — emit({ type: 'log' }) replaces console.log; dashboard shows log panel beside QR view
  - [ ] Fix headless bot detection — XHS blocks headless Playwright on VPS; screenshots render white, page loads fail
    - [ ] Install Xvfb in XHS Docker container
    - [ ] Switch to headless: false + xvfb-run so browser runs in virtual display
    - [ ] Update xhsController.js spawn command to use xvfb-run
    - [ ] Update Dockerfile: apt-get install xvfb



---
