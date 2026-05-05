**English** | [中文](README.zh.md)

# automation-ecosystem

Automation infrastructure for [running.moximoxi.net](https://running.moximoxi.net) — a Japanese marathon platform for Chinese runners.

Five Docker services on a single AWS Lightsail VPS, coordinated through two PostgreSQL databases. A monitoring dashboard covers all operator controls without touching a terminal.

---

## Services

| Service | Port | What it does |
|---|---|---|
| **xhs** | — | Claude-powered content pipeline — generates XHS posts, Playwright publishes to MOXI爱跑步 account |
| **scraper** | — | Weekly cron — scrapes RunJapan, DeepL-translates, writes to `ecosystemdb.races` |
| **race-hub** | 3001 | Express API — serves races from PostgreSQL to the WordPress race hub page |
| **rakuten** | 3002 | Product ingestion — Rakuten API → pricing → WooCommerce push; weekly auto-sync cron |
| **dashboard** | 3000 | Operator monitoring UI (Next.js) — logs, config editors, manual triggers, re-auth |

---

## Databases

| Database | Used by |
|---|---|
| `ecosystemdb` | XHS, Scraper, Race Hub, Dashboard |
| `rakutendb` | Rakuten, Dashboard |

---

## Repo Structure

```
automation-ecosystem/
    ├── services/
    │   ├── xhs/            # XHS content pipeline
    │   │   └── docs/       #   xhs-design-doc.md, xhs-checklist.md
    │   ├── scraper/        # RunJapan scraper
    │   │   └── docs/       #   scraper-design-doc.md, scraper-checklist.md
    │   ├── race-hub/       # Race data API
    │   │   └── docs/       #   race-hub-design-doc.md
    │   ├── rakuten/        # Rakuten product aggregator
    │   │   └── docs/       #   rakuten-design-doc.md, rakuten-checklist.md
    │   └── dashboard/      # Operator monitoring dashboard
    │       └── docs/       #   dashboard-design-doc.md
    └── docs/
        ├── ecosystem/      # ecosystem-checklist.md, architecture.md
        └── handoff/        # handoff-runbook.md — operator + AI agent reference
```

Each service has its own `package.json`:

```bash
cd services/<service> && npm install
```

---

## Docs

| Doc | What it covers |
|---|---|
| [Handoff runbook](docs/handoff/handoff-runbook.md) | Full system reference — architecture, dashboard features, failure guides, Claude Code debugging prompts |
| [Ecosystem checklist](docs/ecosystem/ecosystem-checklist.md) | Build progress across all services |
| [XHS design doc](services/xhs/docs/xhs-design-doc.md) | Content generation, scheduling, publishing |
| [Scraper design doc](services/scraper/docs/scraper-design-doc.md) | RunJapan scraping, DB schema, failure handling |
| [Race Hub design doc](services/race-hub/docs/race-hub-design-doc.md) | Express API, React SPA, WordPress plugin |
| [Rakuten design doc](services/rakuten/docs/rakuten-design-doc.md) | Product ingestion, pricing formula, WooCommerce sync |
| [Dashboard design doc](services/dashboard/docs/dashboard-design-doc.md) | UI features, API routes, SSE log panels |

---

## Status

All five services deployed and live on Lightsail. See [ecosystem-checklist.md](docs/ecosystem/ecosystem-checklist.md) for current progress per service.
