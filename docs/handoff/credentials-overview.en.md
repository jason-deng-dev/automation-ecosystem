# Accounts & Services Overview

All account **passwords** are saved in the credentials table (link in the handoff email). This document explains the purpose, login email, costs, and renewal dates for each service.

---

## Contents

- [Website & Hosting](#website--hosting)
- [WordPress Plugins](#wordpress-plugins)
- [Automation Services](#automation-services)
- [Payments](#payments)

---

## Website & Hosting

### Onamae Hosting

| Item | Details |
|---|---|
| Purpose | Website hosting (the server running WordPress) |
| Login URL | https://cp.onamae.ne.jp/login |
| Login account | `6887322` |
| Cost | ¥2,398 / month |
| Password | See credentials table |

This is the website's core infrastructure. If the site goes down, check the service status here first.

---

### Onamae FTP Account

| Item | Details |
|---|---|
| Purpose | Upload/modify website files via FTP (technical use — rarely needed) |
| Domain | moximoxi.net |
| Login email | `info@moximoxi.net` |
| Password | See credentials table (two sets — primary + backup) |

---

### WordPress Admin

| Item | Details |
|---|---|
| Purpose | Manage website content, products, orders, and users |
| Login URL | https://running.moximoxi.net/wp-admin |
| Login account | See credentials table |

This is the most-used entry point for daily operations. Product management, order processing, and translation edits all happen here.

→ Instructions: [WordPress Manual](wordpress-manual.en.md)

---

## WordPress Plugins

### Flatsome Theme

| Item | Details |
|---|---|
| Purpose | Website visual theme (controls the look and layout) |
| Purchase page | https://themeforest.net/downloads |
| Login email | `jason@goodsoft.co.jp` |
| Cost | $59 one-time (already purchased — no renewal needed) |

The theme is already activated. No need to log into this account under normal circumstances. To update the theme version, do it from WordPress Admin.

---

### FluentCommunity (community plugin)

| Item | Details |
|---|---|
| Purpose | Website community features (activity feed, interest groups, leaderboard) |
| Admin entry | WordPress Admin → FluentCommunity |
| License account | `zhang@moximoxi.net` |
| Cost | $120 / year |
| **Next renewal** | **2026-06-29** |
| Password | See credentials table |

If community features stop working, check that this plugin's license is active and renewed.

---

### FluentForms

| Item | Details |
|---|---|
| Purpose | Website forms (customer contact forms, product request forms) |
| Admin entry | WordPress Admin → Fluent Forms |
| License account | `zhang@moximoxi.net` |
| Cost | $50 / year |
| **Next renewal** | **2026-07-23** |
| Password | See credentials table |

---

### Bitassist

| Item | Details |
|---|---|
| Purpose | WordPress utility plugin |
| Login URL | https://subscription.bitapps.pro/wp/ |
| Login account | `zhang@goodsoft.co.jp` |
| Cost | $29 / year |
| **Next renewal** | **2026-09-17** |
| Password | See credentials table |

---

## Automation Services

### Claude AI (personal account)

| Item | Details |
|---|---|
| Purpose | AI chat tool (daily use — not the automation pipeline) |
| Login URL | https://claude.ai/settings/billing |
| Login email | `info@moximoxi.net` |
| Cost | $20 / month |
| Password | See credentials table |

---

### Anthropic API (automation use)

| Item | Details |
|---|---|
| Purpose | XHS content generation — the system calls this API daily to generate posts |
| Login URL | https://platform.claude.com/dashboard |
| Login email | `info@moximoxi.net` |
| Cost | Usage-based, approximately $20 / month |
| Password | See credentials table |

If XHS post generation fails, the API balance may be insufficient. Log in and top up.

---

### DeepL API

| Item | Details |
|---|---|
| Purpose | Automatic translation — race names and product names translated from Japanese to Chinese |
| Login URL | https://www.deepl.com/en/pro-api |
| Login email | `info@goodsoft.co.jp` |
| Password | See credentials table |

---

### Operations Dashboard

| Item | Details |
|---|---|
| Purpose | Automation system monitoring and control (view logs, generate posts, sync products) |
| Login URL | See credentials table |

→ Instructions: [Dashboard Manual](dashboard-manual.en.md)

---

## Payments

### Stripe

| Item | Details |
|---|---|
| Purpose | Store payment processing — customers complete payment through Stripe when they order |
| Login URL | https://dashboard.stripe.com/login |
| Login email | `jason@goodsoft.co.jp` |
| Password | See credentials table |
| ⚠️ Two-factor auth | Phone verification required at login (phone ending in 9999) |

Log in to view payment records, process refunds, and review disputed transactions.

---

## Renewal Calendar

| Service | Renewal date | Cost |
|---|---|---|
| FluentCommunity | 2026-06-29 | $120 |
| FluentForms | 2026-07-23 | $50 |
| Bitassist | 2026-09-17 | $29 |
| Onamae hosting | Auto-renews monthly | ¥2,398 |
| Claude AI | Auto-renews monthly | $20 |

> **Recommended:** Set a reminder in your calendar 2 weeks before each renewal to avoid service interruptions.
