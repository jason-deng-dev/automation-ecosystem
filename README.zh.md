[English](README.md) | **中文**

# automation-ecosystem

[running.moximoxi.net](https://running.moximoxi.net) 的自动化后端 —— 一个面向中国跑者的日本马拉松平台。

五个 Docker 服务部署在同一台 AWS Lightsail 服务器上，通过两个 PostgreSQL 数据库协同运作。操作面板涵盖所有管理功能，无需登录服务器。

---

## 服务

| 服务 | 端口 | 功能说明 |
|---|---|---|
| **xhs** | — | 内容生成流水线 —— Claude AI 生成小红书帖子，操作员手动发布至 MOXI爱跑步 账号 |
| **scraper** | — | 每周定时任务 —— 抓取 RunJapan 赛事数据，经 DeepL 翻译后写入数据库 |
| **race-hub** | 3001 | Express API —— 将赛事数据从 PostgreSQL 提供给 WordPress 赛事页面 |
| **rakuten** | 3002 | 商品采集流水线 —— 乐天 API 抓取 → 定价计算 → 推送至 WooCommerce |
| **dashboard** | 3000 | 操作面板（Next.js）—— 运行日志、配置编辑、手动触发、内容归档 |

---

## 数据库

| 数据库 | 使用方 |
|---|---|
| `ecosystemdb` | XHS、Scraper、Race Hub、Dashboard |
| `rakutendb` | Rakuten、Dashboard |

---

## 目录结构

```
automation-ecosystem/
    ├── services/
    │   ├── xhs/            # 小红书内容流水线
    │   │   └── docs/       #   xhs-design-doc.md, xhs-checklist.md
    │   ├── scraper/        # RunJapan 抓取器
    │   │   └── docs/       #   scraper-design-doc.md, scraper-checklist.md
    │   ├── race-hub/       # 赛事数据 API
    │   │   └── docs/       #   race-hub-design-doc.md
    │   ├── rakuten/        # 乐天商品聚合器
    │   │   └── docs/       #   rakuten-design-doc.md, rakuten-checklist.md
    │   └── dashboard/      # 操作监控面板
    │       └── docs/       #   dashboard-design-doc.md
    └── docs/
        ├── ecosystem/      # ecosystem-checklist.md, architecture.md
        └── handoff/        # handoff-runbook.md — 运维手册 + AI 调试参考
```

各服务独立管理依赖：

```bash
cd services/<service> && npm install
```

---

## 文档

| 文档 | 内容说明 |
|---|---|
| [运维手册](docs/handoff/handoff-runbook.md) | 完整系统参考 —— 架构说明、面板功能、故障排查、Claude Code 调试指令 |
| [进度清单](docs/ecosystem/ecosystem-checklist.md) | 各服务建设进度 |
| [XHS 设计文档](services/xhs/docs/xhs-design-doc.md) | 内容生成、排期管理、发布流程 |
| [Scraper 设计文档](services/scraper/docs/scraper-design-doc.md) | RunJapan 抓取逻辑、数据库结构、异常处理 |
| [Race Hub 设计文档](services/race-hub/docs/race-hub-design-doc.md) | Express API、React SPA、WordPress 插件 |
| [Rakuten 设计文档](services/rakuten/docs/rakuten-design-doc.md) | 商品采集、定价公式、WooCommerce 同步 |
| [Dashboard 设计文档](services/dashboard/docs/dashboard-design-doc.md) | 面板功能、API 路由、SSE 日志推送 |

---

## 当前状态

五个服务均已部署并在 Lightsail 上运行。详见 [进度清单](docs/ecosystem/ecosystem-checklist.md)。
