# automation-ecosystem

Automation infrastructure for [running.moximoxi.net](https://running.moximoxi.net) — a Japanese marathon platform for Chinese runners.

Three manual operations were bottlenecking the platform: daily content creation for Xiaohongshu, keeping race listings current, and sourcing and listing products from Rakuten. This repo contains the automated systems that replace that work, plus a monitoring dashboard to operate them without touching a terminal.

All five services run on a single AWS Lightsail VPS managed by one `docker-compose.yml`, communicating through a shared Docker volume.

---

## Services

| Service | What it does |
|---|---|
| **xhs** | Daily content pipeline — Claude generates on-brand XHS posts, Playwright auto-publishes to the MOXI爱跑步 account |
| **scraper** | Weekly cron — scrapes RunJapan for upcoming marathon data, writes `races.json` to shared volume |
| **race-hub** | Persistent Express server (:3001) — serves `races.json` to the WordPress race hub page via REST API |
| **rakuten** | Product ingestion — fetches from Rakuten API, prices with configurable margins, pushes to WooCommerce |
| **dashboard** | Operator-facing monitoring UI (Express :3000 + React SPA) — pipeline health, logs, config, manual triggers |

---

## Architecture

```
┌──────────────────────────────── AWS Lightsail VPS ──────────────────────────────────────┐
│                                                                                         │
│  [scraper]        [race-hub]        [xhs]              [rakuten]                        │
│  cron weekly      Express :3001     scheduler.js        cron: fetch pipeline            │
│  writes           reads             generator.js        PostgreSQL                      │
│  races.json       races.json        publisher.js        Express :3002 (internal)        │
│       │                │                 │                    │                         │
│       ▼                ▼                 ▼                    ▼                         │
│  ┌──────────────────── shared volume ───────────────────────────────┐                   │
│  │  scraper/races.json   xhs/run_log.json    rakuten/run_log.json   │                   │
│  │  scraper/run_log.json xhs/post_archive/   rakuten/config.json    │                   │
│  │  scraper/config.json  xhs/config.json     ...                    │                   │
│  └────────────────────────────┬─────────────────────────────────────┘                   │
│                               │ reads all                                               │
│                     ┌─────────▼──────────────┐                                          │
│                     │      [dashboard]       │                                          │
│                     │  Express :3000 + React │                                          │
│                     └─────────┬──────────────┘                                          │
└───────────────────────────────┼─────────────────────────────────────────────────────────┘
            │                   │                        │
          HTTPS               HTTPS                    HTTPS
      GET /api/races        (operator)            WooCommerce API
   [WordPress race hub]  [operator browser]     [running.moximoxi.net]
```

---

## Repo Structure

```
automation-ecosystem/
    ├── services/
    │   ├── xhs/            # XHS content pipeline
    │   │   └── docs/       #   xhs-design-doc.md, xhs-checklist.md
    │   ├── scraper/        # RunJapan scraper (cron only)
    │   │   └── docs/       #   scraper-design-doc.md, scraper-checklist.md
    │   ├── race-hub/       # Race data API (Express :3001)
    │   │   └── docs/       #   race-hub-design-doc.md
    │   ├── rakuten/        # Rakuten product aggregator
    │   │   └── docs/       #   rakuten-design-doc.md, rakuten-checklist.md
    │   └── dashboard/      # Operator monitoring dashboard
    │       └── docs/       #   dashboard-design-doc.md
    └── docs/
        └── architecture.md # Ecosystem-wide overview
```

Each service has its own `package.json`. Install dependencies per service:

```bash
cd services/xhs && npm install
cd services/scraper && npm install
# etc.
```

---

## Docs

- [Ecosystem architecture](docs/architecture.md) — how all five services fit together
- [XHS pipeline](services/xhs/docs/xhs-design-doc.md) — content generation, scheduling, publishing
- [Scraper](services/scraper/docs/scraper-design-doc.md) — RunJapan scraping, data schema, failure handling
- [Race Hub](services/race-hub/docs/race-hub-design-doc.md) — Express API, React SPA, WordPress plugin
- [Rakuten](services/rakuten/docs/rakuten-design-doc.md) — product ingestion, pricing, WooCommerce sync
- [Dashboard](services/dashboard/docs/dashboard-design-doc.md) — monitoring UI, operator controls

---

## Status

In development. See each service's `<service>-checklist.md` for current progress.
