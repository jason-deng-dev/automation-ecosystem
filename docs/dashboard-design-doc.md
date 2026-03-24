**Project:** Automation Pipeline Monitoring Dashboard

**Author:** Jason Deng

**Date:** March 2026

**Status:** Planning — to be built after all three pipelines are operational

---

## 1. Problem Statement

Three automation pipelines are running in production:

- **Race Scraper Pipeline** — weekly RunJapan scrape → `races.json`
- **Rakuten Product Aggregator** — product data pipeline
- **RedNote Content Generator** — daily Claude-powered XHS post generation and publishing

Currently, the only way to check pipeline health is to read raw log files. This is fine during development but breaks down at handoff — a non-technical operator shouldn't need to dig through logs to know if something is broken.

A unified monitoring dashboard gives a single place to check the health of all three pipelines without touching the underlying systems.

---

## 2. Goals

- Surface the operational status of all three pipelines in one place
- Track success/failure rates per pipeline run
- Monitor prompt generation quality (RedNote pipeline)
- Make the system self-diagnosing: when a pipeline fails, surface enough context for the operator to understand what broke and how to fix it
- Reduce operator burden — no raw log reading required for routine checks

---

## 3. Key Metrics (Per Pipeline)

### All Pipelines
- Last run timestamp
- Last run status (success / failure / partial)
- Success rate over last 7 / 30 days
- Error count by error type
- Current pipeline state (idle / running / failed)

### Race Scraper Pipeline
- Races scraped per run (threshold alert: < 30)
- Scrape failures per run (individual race detail pages that failed)
- Data freshness (how old is the current `races.json`)

### Rakuten Product Aggregator
- Products fetched per run
- Failure rate per product / category
- Data freshness

### RedNote Content Generator
- Posts generated per day
- Posts published successfully vs. failed
- Post type distribution (race / training / nutrition / wearable)
- Prompt generation quality score (TBD — format: did the response parse correctly, was JSON valid, did it hit required fields)
- Claude API error rate (429s, 5xx, timeout)
- XHS publish failure rate and failure reasons

---

## 4. Claude-Assisted Error Resolution

When a pipeline run fails, the dashboard feeds the error context (pipeline name, failed stage, error message, recent log lines) to Claude with a system prompt that gives it full knowledge of the pipeline architecture.

Claude returns a plain-English explanation of what likely went wrong and a step-by-step fix — displayed directly in the dashboard. The operator follows the steps without needing to understand the underlying code.

Example flow:
1. RedNote pipeline fails at publisher stage — `auth.json` session expired
2. Dashboard detects failure, identifies error type
3. Feeds error context to Claude
4. Claude responds: "Your XHS session has expired. Click the **Login to XHS** button to refresh your session."
5. Operator clicks the button, logs in via the embedded browser view, pipeline resumes

---

## 5. XHS Session Management

XHS sessions expire periodically (typically every few weeks). Rather than requiring the operator to SSH into the server and run a script, the dashboard exposes a browser-based re-authentication flow.

### How It Works

1. Operator clicks **"Login to XHS"** button in the dashboard
2. Server spawns a Playwright-controlled browser instance
3. Operator interacts with the XHS login page directly — the browser window is streamed into the dashboard via an embedded **noVNC viewer**, so they never leave the browser tab
4. Playwright captures the resulting session cookies automatically
5. Cookies are saved as `auth.json` on the AWS server
6. All future automated publishing runs use the refreshed `auth.json`

### Why This Approach

- **Solves bot detection** — it's a real human login producing a real session, not a scripted credential submission
- **No server access required** — operator never touches SSH, the terminal, or any files
- **No credentials stored in code** — `auth.json` is a session artifact, not a hardcoded password
- **Self-service re-auth** — when the session expires, the operator clicks one button and is done in under a minute

### Session Expiry Detection

The dashboard should surface session state as a status indicator on the RedNote pipeline card:
- **Session active** — last successful publish timestamp + estimated expiry (30 days from last login)
- **Session expiring soon** — warning at <7 days remaining
- **Session expired / publish failed** — error state with the Login button prominently shown

### Implementation Notes

- Backend: `POST /api/xhs/login` — spawns Playwright with `headful: true`, starts a noVNC-compatible VNC server pointing at that browser instance
- Frontend: dashboard opens an `<iframe>` or dedicated panel with the noVNC web client, connecting to the VNC stream
- On successful login detection (Playwright observes redirect to XHS home), server closes the browser, saves `auth.json`, returns success to the dashboard
- `auth.json` is never transmitted to the client — it stays on the server

---

## 6. Pipeline Configuration

The dashboard should allow the operator to configure the RedNote posting schedule without touching code or the server.

### Per-Day Schedule Config

Each day supports multiple post slots — each slot has a time and a post type. The operator can add or remove slots per day from the dashboard.

- **Time** — time picker per slot (24h, CST)
- **Post Type** — dropdown per slot: Race Guide / Training / Nutrition / Wearables
- **Add slot** — button to add another post to the same day
- **Remove slot** — button to remove a slot

The schedule is stored in `config/schedule.json` on the server. The dashboard reads and writes this file via an API endpoint. The scheduler reads `schedule.json` at runtime to register one cron job per slot — no code changes or restarts required.

### schedule.json Shape

```json
{
  "monday":    [{ "time": "21:00", "type": "race" }],
  "tuesday":   [{ "time": "21:00", "type": "nutritionSupplement" }],
  "wednesday": [{ "time": "21:00", "type": "training" }],
  "thursday":  [{ "time": "09:00", "type": "race" }, { "time": "21:00", "type": "wearable" }],
  "friday":    [{ "time": "21:00", "type": "race" }],
  "saturday":  [{ "time": "21:00", "type": "training" }],
  "sunday":    [{ "time": "21:00", "type": "wearable" }]
}
```

---

## 7. Open Questions

- What form does the dashboard take? Web UI, CLI, or terminal output?
- Where does it run — same server as the pipelines, or separate?
- How is prompt quality scored? (Parse success alone, or semantic review?)
- Does the Claude-assisted fix mode run automatically on failure, or on-demand?
- Should the dashboard send alerts (email, Telegram) when a pipeline fails, or is checking it manually sufficient?
- noVNC vs. alternative browser streaming approach for the XHS login flow — noVNC requires a VNC server on the AWS instance; simpler alternative is Playwright's `slowMo` + screenshot polling, but that's less interactive

---

## 8. Next Steps

- Finalize architecture and tech stack (to be decided once all three pipelines are operational)
- Define prompt quality scoring criteria based on observed generator output
- Implement per-pipeline structured logging as a prerequisite (logs need consistent format for the dashboard to parse)
