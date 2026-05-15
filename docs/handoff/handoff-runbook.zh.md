[English](handoff-runbook.md) | **中文**

# 运营手册 & AI 调试参考

**平台：** running.moximoxi.net 自动化生态系统
**最后更新：** 2026 年 5 月
**服务器：** AWS Lightsail — `<SERVER_IP>`（用户名：`ubuntu`）
**代码路径（服务器上）：** `/home/ubuntu/automation-ecosystem`

---

## 系统简介

**running.moximoxi.net** 是一个面向中国跑者的平台，帮助他们了解日本马拉松赛事并购买日本跑步装备。平台包含一个商店、一个赛事信息中心，以及一个驱动流量的小红书（RedNote）账号。

自动化系统负责处理三项原本需要每天大量手动操作的任务：

---

**1. 小红书内容流水线 — 自动生成帖子内容**

每天，服务器上的程序会调用 Claude AI 接口，生成一篇完整的小红书帖子——用中文写成，格式符合平台规范，包含标题、正文、简介、话题标签和评论内容。帖子生成后保存到数据库。

运营人员打开面板，看到帖子内容，用一键复制按钮复制各个字段，然后粘贴到小红书 App 手动发布。整个发布过程约 3 分钟，而不是从零开始写 1-2 小时。

帖子在四种类型之间轮换：赛事攻略（关于特定日本马拉松的介绍）、训练科学、营养补给、跑步装备——根据历史数据中表现最好的类型加权分配。

---

**2. 赛事抓取器 — 自动更新赛事数据**

每周，服务器访问 runjapan.jp，抓取所有即将举行的日本马拉松赛事信息：名称、日期、地点、报名状态、赛事简介，保存到数据库并翻译成中文。

这些数据驱动两件事：网站上的赛事中心页面（访客可浏览即将开赛的比赛），以及上面的内容流水线（用真实赛事数据生成准确的赛事攻略帖）。

---

**3. 乐天商品流水线 — 自动上架商品**

每周，服务器调用乐天日本 API，抓取多个品类（跑鞋、营养补剂、装备、恢复产品、服装）的热销跑步商品。商品名称翻译成中文，价格换算成人民币，自动推送到 WooCommerce 商店。

当客户搜索某款商店没有的商品时，可以提交请求——流水线从乐天抓取该商品、定价，并在约 2 分钟内将其加入商店。

---

**4. 运营面板 — 一屏管理所有内容**

服务器上的一个私有网页（端口 3002）显示三条流水线的运行状态、历史记录、错误日志和计划排期。运营人员通过它：
- 查看是否有任务在夜间失败
- 阅读并复制每日生成的小红书帖子
- 手动触发任意流水线
- 编辑发布排期
- 更新定价配置（汇率、利润率）

---

**各模块之间的连接关系：**

```
RunJapan 网站
    → 每周抓取 → 赛事数据库
        → 网站赛事中心页面（跑者浏览赛事）
        → 小红书生成器用赛事数据写出准确的攻略帖

乐天 API
    → 每周拉取 → 商品数据库
        → WooCommerce 商店（客户浏览并购买）

Claude AI
    → 每日调用 → 生成小红书帖子 → 保存到数据库
        → 面板展示帖子 → 运营人员复制 → 手动发布到小红书
            → 小红书将流量引回商店和赛事中心
```

所有服务运行在一台租用服务器上（每月约 10 美元，AWS Lightsail），以 Docker 容器形式独立运行，互不干扰，自动启动。

---

## 文档使用说明

---

### 👤 如果你是运营人员（非技术）

**请阅读以下章节——这些内容是为你写的：**

- [日常操作](#日常操作) — 从这里开始，这是你的实际工作
- [第三部分 — 小红书内容流水线](#第三部分--小红书内容流水线) — 如何发布帖子
- [第四部分 — 常见故障](#第四部分--常见故障) — 出问题时怎么办
- [第五部分 — 抓取器故障](#第五部分--抓取器故障)
- [第六部分 — 乐天同步故障](#第六部分--乐天同步故障)
- [第七部分 — 数据库与服务器基础设施](#第七部分--数据库与服务器基础设施)
- [第八部分 — Stripe 与支付](#第八部分--stripe-与支付)
- [第九部分 — WooCommerce 订单](#第九部分--woocommerce-订单)
- [第十部分 — 使用 Claude Code 修复代码](#第十部分--使用-claude-code-修复代码)
- [第十一部分 — 月度维护与费用](#第十一部分--月度维护与费用)
- [第十二部分 — 快速参考](#第十二部分--快速参考)

**以下章节可跳过——这些是开发者和 AI 工具的技术参考：**
- 第一部分 — 系统架构
- 第二部分 — 面板功能（技术清单）

---

### 🤖 如果你是 AI 工具（Claude Code / 开发者）

**先读第一部分** — 在动代码之前，先了解完整的系统架构：每个服务、文件路径、数据库表、环境变量，以及各服务之间的连接关系。

**再读第二部分**，了解面板功能的完整范围。

**第三至十二部分** 包含面向运营人员的故障指南和操作说明——有助于理解上下文，但第一部分是主要的技术参考。

---

### 📋 目录

| 章节 | 适用对象 |
|---|---|
| [日常操作](#日常操作) | 👤 运营人员 |
| [第一部分 — 系统架构](#第一部分--系统架构) | 🤖 AI / 开发者 |
| [第二部分 — 面板功能](#第二部分--面板功能) | 🤖 AI / 开发者 |
| [第三部分 — 小红书内容流水线](#第三部分--小红书内容流水线) | 👤 运营人员 + 🤖 AI |
| [第四部分 — 常见故障](#第四部分--常见故障) | 👤 运营人员 |
| [第五部分 — 抓取器故障](#第五部分--抓取器故障) | 👤 运营人员 |
| [第六部分 — 乐天同步故障](#第六部分--乐天同步故障) | 👤 运营人员 |
| [第七部分 — 数据库与服务器基础设施](#第七部分--数据库与服务器基础设施) | 👤 运营人员 |
| [第八部分 — Stripe 与支付](#第八部分--stripe-与支付) | 👤 运营人员 |
| [第九部分 — WooCommerce 订单](#第九部分--woocommerce-订单) | 👤 运营人员 |
| [第十部分 — 使用 Claude Code 修复代码](#第十部分--使用-claude-code-修复代码) | 👤 运营人员 |
| [第十一部分 — 月度维护与费用](#第十一部分--月度维护与费用) | 👤 运营人员 |
| [第十二部分 — 快速参考](#第十二部分--快速参考) | 👤 运营人员 + 🤖 AI |

---

## 日常操作

> 这就是你实际要做的事。正常情况下全程不超过 10 分钟。

---

### 每天早上

1. **打开面板**，地址：`http://<SERVER_IP>:3002`
2. **查看首页** — 三个流水线卡片，全部应显示绿色状态和最近的运行时间。
   - 小红书卡片：注意是否有**红色/橙色提示横幅**（表示有帖子等待发布或已逾期）
   - 抓取器卡片：上次运行应在 7 天以内
   - 乐天卡片：上次同步应在 7 天以内
3. **如果小红书显示待发布帖子**（导航栏小红书选项有橙色圆点，或首页卡片有提示横幅）：
   - 进入面板 → 小红书 → **待发布区域**（页面顶部，红色边框卡片）
   - 点开帖子卡片
   - 使用复制按钮依次复制每个字段：**标题 → 开场 → 正文各页 → 简介 → 评论**
   - 打开手机上的小红书 App 或电脑上的 [creator.xiaohongshu.com](https://creator.xiaohongshu.com)
   - 新建帖子，将每个字段粘贴到对应位置
   - 在小红书上发布帖子
   - 回到面板 → 点击该帖子卡片上的 **"✓ 标记为已发布"**
4. **如果任意流水线卡片显示红色/失败：** 跳转到本文档对应的故障处理章节

这就是正常的一天。不需要登录服务器，不需要写代码，不需要打开终端。

---

### 正常运行状态参考

| 流水线 | 正常基准 |
|---|---|
| **小红书** | 每天按计划生成 1 篇帖子，待发布队列 ≤1-2 篇，运行历史显示绿色"成功"记录 |
| **抓取器** | 上次运行在 7 天以内（每周日凌晨 2 点 JST），赛事数量 80+ 条，无失败记录 |
| **乐天** | 上次同步在 7 天以内，商品数量稳定（每次同步减少不超过 10-20 件） |

三个流水线都符合上表，说明一切正常。

---

### 每周（周一）

- 查看乐天卡片 — 确认周末同步已运行，商品数量正常
- 浏览小红书运行历史 — 确认每天都在生成帖子
- **GEO 内容检查** — 在控制台 → 小红书 → 帖子归档中，扫描过去一周浏览量或收藏量明显较高的帖子，将其扩展为一篇 WordPress 文章。参见 [GEO 内容手册](../geo/geo-operator-manual.zh.md)。
- **近期赛事检查** — 如果东京、大阪、京都、北海道或长野马拉松将在 8 周内开放报名，在 WordPress 写一篇完整的赛事指南。参见 [GEO 内容手册](../geo/geo-operator-manual.zh.md)。

### 每月（每月 1 日）

- 在 [xe.com](https://xe.com) 查看最新汇率 — 如果日元/人民币汇率变动超过 2%，进入面板 → 乐天 → 配置 → 更新汇率 → 保存
- 登录 [console.anthropic.com](https://console.anthropic.com) → 用量 — 确认 Claude API 费用在正常范围内
- 登录 [deepl.com](https://deepl.com) → 账户 → 用量 — 确认翻译配额未接近上限

---

## 第一部分 — 系统架构

> 🤖 **本部分仅供 AI 工具和开发者阅读。** 如果你是运营人员，请跳转至[日常操作](#日常操作)或[第四部分 — 常见故障](#第四部分--常见故障)。
>
> 本部分描述每个服务的位置、功能、服务间的连接方式，以及排查问题时应查看的内容。

---

### 1.1 系统概述

五个 Docker 容器运行在同一台 AWS Lightsail 实例（`<SERVER_IP>`）上，共同驱动：

1. **内容流水线** — 每日 Claude 生成的小红书帖子
2. **赛事数据流水线** — 每周抓取 RunJapan → PostgreSQL → WordPress 赛事中心
3. **商品流水线** — 每周拉取乐天商品 → WooCommerce 商店
4. **监控面板** — `:3002` 端口，集中展示所有流水线状态，支持手动控制

所有服务共用同一个 PostgreSQL 实例，两个数据库：`ecosystemdb`（小红书 + 抓取器 + 赛事中心）和 `rakutendb`（乐天流水线）。

---

### 1.2 基础设施

| 项目 | 值 |
|---|---|
| 服务器 | AWS Lightsail，`<SERVER_IP>`，用户名 `ubuntu` |
| 操作系统 | Ubuntu，Docker + docker-compose |
| 代码路径 | `/home/ubuntu/automation-ecosystem` |
| SSH 密钥 | `~/.ssh/automation-ecosystem.pem` |
| SSH 命令 | `ssh -i ~/.ssh/automation-ecosystem.pem ubuntu@<SERVER_IP>` |
| 容器管理 | 在代码根目录执行 `docker-compose up/down/restart/logs` |
| CD 流水线 | GitHub Actions（`.github/workflows/`）— 推送到 `main` 分支触发构建 + 部署 |
| PostgreSQL | 端口 5432 — 使用 `psql -U goodsoft -d ecosystemdb -h localhost` 连接 |

---

### 1.3 各服务说明

#### 面板（`services/dashboard/`）
- **类型：** Next.js，端口 `:3002`
- **关键文件：** `app/page.js`（首页）、`app/xhs/page.js`、`app/scraper/page.js`、`app/rakuten/page.js`、`app/api/`（所有 API 路由）、`app/lib/locales/en.js` + `zh.js`（所有 UI 文字）
- **数据库：** 读取 `ecosystemdb` 和 `rakutendb`
- **调用其他服务方式：** `docker exec`（挂载了 Docker socket）

#### 小红书流水线（`services/xhs/`）
- **类型：** 无 HTTP 服务器，通过 `docker exec` 或 cron 调用
- **关键文件：** `src/scheduler.js`（cron 调度）、`src/generator.js`（Claude API 集成）、`src/publisher.js`（保留备用，当前未调用）、`config/prompts.json`（系统提示词和各类型模板）
- **数据库：** `ecosystemdb`

| 数据表 | 读写方向 | 用途 |
|---|---|---|
| `races` | 读 | 赛事数据（由抓取器写入） |
| `xhs_schedule` | 读 | 每日发布排期 |
| `pipeline_state` | 写 | 当前状态：idle / running / failed |
| `xhs_run_logs` | 写 | 每次运行记录 |
| `xhs_post_archive` | 写 | 完整帖子内容，`published=false` 直到运营人员标记 |
| `xhs_post_history` | 读+写 | 最近 7 天已用赛事名称，去重用 |

#### 赛事抓取器（`services/scraper/`）
- **类型：** 纯 cron，无 HTTP 服务器
- **关键文件：** `scraper.js`（两阶段抓取：POST 列表页 + GET 详情页）、`run-scraper.js`（入口）
- **Cron：** 每周日凌晨 2 点 JST
- **数据库：** `ecosystemdb`

#### 赛事中心（`services/race-hub/`）
- **类型：** Express API，端口 `:3001`
- **用途：** 将赛事数据从 `ecosystemdb.races` 提供给 WordPress 插件

#### 乐天流水线（`services/rakuten/`）
- **类型：** TypeScript Express API，端口 `:3000`
- **关键文件：** `src/controller.ts`、`src/services/rakutenAPI.ts`、`src/services/woocommerceAPI.ts`、`src/services/pricing.ts`、`src/runWeeklySync.ts`
- **数据库：** `rakutendb`

---

### 1.4 各服务连接关系

```
                     ┌─────────────────────────────────────┐
                     │       AWS Lightsail :3002            │
                     │       面板（Next.js）                 │
                     │  读取：ecosystemdb + rakutendb        │
                     │  通过 docker exec 调用：              │
                     │    → xhs（手动生成、重载排期）         │
                     │    → scraper（手动运行）               │
                     │    → rakuten（手动同步）               │
                     └────────────────┬────────────────────┘
                                      │
           ┌──────────────────────────┼─────────────────────────┐
           │                          │                         │
           ▼                          ▼                         ▼
  ┌─────────────────┐      ┌──────────────────┐    ┌──────────────────────┐
  │  小红书容器      │      │   抓取器容器      │    │    乐天容器           │
  │  node-cron      │      │   node-cron       │    │    Express :3000      │
  │  scheduler.js   │      │   scraper.js      │    │    runWeeklySync.ts   │
  │  generator.js   │      │   每周日 2am JST  │    │    Ranking API 拉取   │
  └────────┬────────┘      └────────┬──────────┘    └──────────┬───────────┘
           │ 读/写                   │ 写                       │ 读/写
           ▼                        ▼                           ▼
  ┌───────────────────────────────────────┐      ┌──────────────────────────┐
  │         ecosystemdb（PostgreSQL）     │      │   rakutendb（PostgreSQL）│
  │  races / xhs_post_archive             │      │   products / config       │
  │  xhs_run_logs / xhs_schedule          │      │   run_logs / import_logs  │
  │  scraper_run_logs / pipeline_state    │      └──────────────────────────┘
  └───────────────────────────────────────┘
           │ 读                                    读
           ▼                                       ▼
  ┌────────────────────┐           ┌──────────────────────────────┐
  │  赛事中心 :3001    │           │  WordPress / WooCommerce      │
  │  提供赛事数据给 WP  │ ────────► │  running.moximoxi.net        │
  └────────────────────┘           └──────────────────────────────┘
```

---

### 1.5 环境变量

每个服务有独立的 `.env` 文件（不提交到 Git）。

**小红书（`services/xhs/.env`）：**
- `ANTHROPIC_API_KEY` — Claude API
- `DATABASE_URL` — `ecosystemdb` 连接字符串
- `XHS_AUTH_SECRET` — 面板 SSE 鉴权共享密钥

**抓取器（`services/scraper/.env`）：**
- `DATABASE_URL` — `ecosystemdb`
- `DEEPL_API_KEY` — 赛事数据翻译

**乐天（`services/rakuten/.env`）：**
- `RAKUTEN_APP_ID` — 乐天 API 应用 ID
- `RAKUTEN_ACCESS_KEY` — 乐天 API 访问密钥
- `ANTHROPIC_API_KEY` — Claude API（品类分类器）
- `WP_WOOCOMMERCE_CONSUMER_KEY` + `WP_WOOCOMMERCE_CONSUMER_SECRET` — WooCommerce REST API
- `WP_URL` — `https://running.moximoxi.net`
- `DATABASE_URL` — `rakutendb` 连接字符串
- `DEEPL_API_KEY` — 商品名翻译
- `REDIS_URL` — 限流（Redis 本地 Docker 容器）

**面板（`services/dashboard/.env`）：**
- `DATABASE_URL` — `ecosystemdb`
- `RAKUTEN_DATABASE_URL` — `rakutendb`
- `RAKUTEN_SERVICE_URL` — 乐天 Express 服务内部地址（`http://rakuten:3000`）
- `XHS_AUTH_SECRET` — 必须与小红书服务的值一致
- `NEXT_PUBLIC_LANG` — 生产环境 `zh`，本地开发 `en`

---

### 1.6 设计文档 & AI 工具入口

**处理任何服务前，按以下顺序阅读：**

1. `CLAUDE.md`（代码根目录）— 全局规范
2. `services/<service>/CLAUDE.md` — 服务级规范
3. `services/<service>/docs/<service>-design-doc.md` — 完整架构、数据库 schema、技术决策记录
4. `docs/ecosystem/ecosystem-checklist.md` — 各服务当前构建状态

| 服务 | CLAUDE.md | 设计文档 |
|---|---|---|
| 小红书 | `services/xhs/CLAUDE.md` | `services/xhs/docs/xhs-design-doc.md` |
| 抓取器 | `services/scraper/CLAUDE.md` | `services/scraper/docs/scraper-design-doc.md` |
| 乐天 | `services/rakuten/CLAUDE.md` | `services/rakuten/docs/rakuten-design-doc.md` |
| 面板 | — | `services/dashboard/docs/dashboard-design-doc.md` |
| 赛事中心 | — | `services/race-hub/docs/race-hub-design-doc.md` |

---

## 第二部分 — 面板功能

> 🤖 **本部分是面向 AI 工具和开发者的技术功能清单。** 记录了每个面板功能、API 路由和组件。
>
> 👤 **运营人员：** 无需阅读本部分。如需了解如何使用面板，请查看[日常操作](#日常操作)和[第三部分](#第三部分--小红书内容流水线)。

面板地址：`http://<SERVER_IP>:3002`

---

### 2.1 首页 — 流水线卡片

三张卡片，仅显示指标数据，首页上没有触发按钮（触发按钮在各详情页）。

**小红书卡片** — 显示：流水线状态、上次运行时间、下次计划发布、30 日成功率、各阶段错误分布、帖子类型分布、累计 API token 用量。

**抓取器卡片** — 显示：流水线状态、上次运行时间、下次计划抓取、数据库中赛事总数、上次抓取数量、数据新鲜度指标。

**乐天卡片** — 显示：商品目录总数、WooCommerce 在线商品数、上次同步时间、上次操作结果、上次新增商品数、近期错误数、分品类明细。

---

### 2.2 小红书详情页（`/xhs`）

**帖子归档** — `xhs_post_archive` 中所有帖子的列表，可展开为完整帖子卡片，包含：
- 标题、开场、正文各页、简介、话题标签、评论
- 每个字段的一键复制按钮
- **"✓ 标记为已发布"** 按钮 — 将 `published` 设为 `true`

**待发布区域** — `published=false` 的帖子，运营人员的工作队列。

**运行历史** — `xhs_run_logs` 表：时间戳、帖子类型、结果、失败阶段、错误信息、token 消耗。

**排期管理** — 周一到周日的排期网格，支持设置时间（24 小时制 CST）和帖子类型。保存后写入 `xhs_schedule` 表，并通过 `docker exec` 调用 `setupAllDailyCrons()` 重载 cron，无需重启容器。

**手动生成触发** — 帖子类型下拉框 + "生成帖子"按钮。通过 SSE 流式输出实时日志，刷新后日志仍保留。

---

### 2.3 抓取器详情页（`/scraper`）

**运行历史** — `scraper_run_logs` 表：时间戳、结果、抓取数量、失败数、错误信息。

**赛事列表** — 完整的 `races` 数据库表：赛事名称、日期、地点、报名状态徽标（开放/关闭）。

**失败 URL 列表** — 上次运行中失败的 URL（可折叠）。

**"立即运行抓取器"** — 触发按钮，SSE 实时日志，刷新后日志保留。

---

### 2.4 乐天详情页（`/rakuten`）

**运行日志** — `run_logs` 表：时间戳、操作、新增商品数、价格更新数、删除数量、错误数。

**导入日志** — `import_logs` 表：时间戳、商品名、状态（成功/失败/跳过）、错误信息。

**定价配置编辑器** — 可直接编辑的字段：`yenToYuan`（汇率）、`markupPercent`、`searchFillThreshold`、`productsPerCategory`。保存后通过 `/api/rakuten/config` 写入 `rakutendb.config` 表。

**"立即运行同步"** — 触发按钮，SSE 实时日志，刷新后日志保留。

---

### 2.5 语言切换

`LangToggle` 客户端组件，设置 `lang` Cookie（`en` 或 `zh`）并刷新页面。所有页面调用 `getDict()` 读取 Cookie，返回对应语言的文字对象。生产环境默认中文（`NEXT_PUBLIC_LANG=zh`）。

---

## 第三部分 — 小红书内容流水线

### 3.1 帖子生成流程

```
xhs_schedule 表
    ↓ 容器启动时由 scheduler.js 加载
node-cron 任务（每个排期时间槽对应一个）
    ↓ 到达计划时间时触发
Run(postType)  [scheduler.js]
    ↓
generatePost(type)  [generator.js]
    ↓ 如果类型为赛事攻略：
    chooseRace()  →  Claude API（单独调用，从数据库选最佳赛事）
    ↓
    Claude API ← 系统提示词（MOXI 人设、格式规范）+ 上下文（赛事数据/季节/月份）
    ↓
    返回 { title, hook, contents[], cta, description, hashtags, comments, ... }
    ↓
insertPostArchive(post, published=false)  [scheduler.js]
    ↓
xhs_post_archive 表 — published=false
    ↓
insertRunLog(...)  — 写入 xhs_run_logs
upsertPipelineState('idle' 或 'failed')
```

**帖子类型：** `race`（赛事攻略）、`training`（训练科学）、`nutritionSupplement`（营养补给）、`wearable`（跑步装备）

**内容策略：** 赛事（40%）、训练（25%）、营养（20%）、装备（15%）— 基于 115 篇历史帖子的数据得出。

---

### 3.2 小红书账号现状

> ⚠️ **重要提示：** 原 MOXI爱跑步 账号于 2026 年 4 月因自动化登录测试触发小红书风控系统而被封禁。在正式移交时，新小红书账号仍需注册。这是一项待完成的任务。

**流水线当前状态：** 每日自动生成完整帖子并保存到面板。帖子在"待发布"队列中等待，直到运营人员复制并手动发布。内容生成（最耗时的部分）已完全自动化。

**新账号注册后：** 以下操作流程立即适用，无需任何代码改动。

---

### 3.3 运营人员发布流程

系统自动生成帖子。运营人员的工作是从面板复制内容并粘贴到小红书。每篇帖子约需 3 分钟。

**为什么不全自动：** 小红书会检测并封禁从数据中心 IP 地址发帖的账号（即服务器的 IP）。内容创作才是瓶颈——不是点击发布。3 分钟的粘贴是可以接受的；账号被封的风险则不可接受。

**操作步骤：**
1. 打开面板 → 小红书 → **待发布区域**（页面顶部，红色边框卡片）
2. 点开帖子卡片
3. 使用复制按钮依次复制每个字段：**标题 → 开场 → 正文各页 → 简介 → 评论**
4. 打开小红书 App 或 [creator.xiaohongshu.com](https://creator.xiaohongshu.com) → 新建帖子 → 将每个字段粘贴到对应位置
5. 在小红书上发布帖子
6. 回到面板 → 点击 **"✓ 标记为已发布"**

**字段对应关系（小红书发帖界面）：**

| 面板字段 | 小红书对应位置 |
|---|---|
| 标题（Title） | 帖子标题（顶部输入框） |
| 开场（Hook） | 第一页——粘贴为正文 |
| 正文各页（Body sections） | 每页对应一张图文页，各有小标题和正文 |
| 简介（Description） | 图文下方的说明文字输入框 |
| 评论（Comments） | 发布后立即在评论框逐条粘贴 |

**帖子逾期提示：** 如果一篇帖子待发布超过 4 小时，面板会显示红色"逾期"徽标——请尽快发布。

---

### 3.4 排期管理

排期存储在 `xhs_schedule` 表（`day` 0-6，`time` HH:MM，`post_type`）。面板通过 `GET/POST /api/xhs/schedule` 读写。保存后，面板调用 `docker exec xhs node scripts/run-reloadSchedule.js` 重载 cron 任务，无需重启容器。

---

## 第四部分 — 常见故障

### 4.1 API 密钥失效

**症状：** 面板显示含有"401"、"Unauthorized"、"Invalid API Key"或"Authentication Failed"的错误。

| 错误来源 | 失效的密钥 | 续期地址 |
|---|---|---|
| 小红书生成阶段 | Anthropic（Claude）API | console.anthropic.com |
| 抓取器翻译 | DeepL API | deepl.com/pro → 账户 → API 密钥 |
| 乐天商品名翻译 | DeepL API | deepl.com/pro → 账户 → API 密钥 |
| 乐天商品拉取 | 乐天 API | webservice.rakuten.co.jp |
| 乐天推送 WooCommerce | WooCommerce consumer key | WordPress 后台 → WooCommerce → 设置 → 高级 → REST API |

**修复步骤：**
1. 从对应服务商获取新密钥
2. SSH 登录服务器：`ssh -i ~/.ssh/automation-ecosystem.pem ubuntu@<SERVER_IP>`
3. 编辑该服务的 `.env` 文件：`nano /home/ubuntu/automation-ecosystem/services/<service>/.env`
4. 替换旧密钥
5. 重启容器：`docker-compose restart <service>`
6. 在面板重新触发失败的流水线

---

### 4.2 流水线失败 — 通用错误

**症状：** 面板显示某次运行"失败"并附有错误信息。

**修复步骤：**
1. 在面板点击失败记录，查看完整错误信息
2. 复制错误信息
3. 🤖 粘贴给 Claude 或 ChatGPT：*"这个错误出现在我运行在 AWS Lightsail Docker 上的自动化流水线中。服务是 [小红书 / 抓取器 / 乐天]。错误内容：[粘贴]。这是什么意思，如何修复？"*
4. 如果 AI 建议修改代码，请查看[第十部分](#第十部分--使用-claude-code-修复代码)

---

### 4.3 没有按计划生成帖子

**症状：** 预期的每日小红书帖子没有生成，面板在该时间点没有运行记录。

**按顺序检查：**
1. **排期设置是否正确？** 面板 → 小红书 → 排期，确认日期和时间。时区为 Asia/Shanghai。
2. **cron 是否触发了？** 查看小红书运行历史——如果该时间完全没有记录，说明 cron 没有触发。重启小红书容器：`docker-compose restart xhs`
3. **小红书容器是否运行？** 面板健康指标显示各服务状态。如果小红书显示红色，查看日志：`docker-compose logs xhs`
4. **生成阶段是否失败？** 如果有运行记录但在"generate"阶段显示"失败"，请查看第 4.4 节

---

### 4.4 Claude API 失败 / 帖子未生成

**症状：** 面板小红书运行历史中显示"generate"阶段出错。

| 错误包含 | 原因 | 修复方式 |
|---|---|---|
| "401"或"Unauthorized" | Anthropic 密钥失效 | 第 4.1 节 — 更新密钥 |
| "429"或"rate limit" | 请求过多 | 等待 1 小时后重试 |
| "timeout" | Anthropic API 慢或宕机 | 查看 status.anthropic.com |
| "JSON parse error" | Claude 返回格式错误的输出 | 重试（通常是偶发问题）；如反复出现见下方 |

**如果 JSON parse 错误反复出现：**
🤖 *"我的小红书帖子生成器（使用 Anthropic Claude API）在 `services/xhs/src/generator.js` 中反复出现 JSON 解析错误。系统提示词在 `services/xhs/config/prompts.json`。提示词中哪里可能导致 Claude 返回无效 JSON，如何修复？"*

---

### 4.5 DeepL 翻译配额用尽

**症状：** 赛事名称或商品名称显示为日文而非中文。面板可能在抓取器或乐天运行中显示 DeepL 错误。

**修复步骤：**
1. 登录 deepl.com → 账户 → 用量 — 查看月度字符配额
2. 如果接近上限：等到下月 1 日重置
3. 如果已重置但仍失败：API 密钥可能已变更 — 查看第 4.1 节
4. 已翻译的内容缓存在数据库中，只有新内容需要重新翻译

---

## 第五部分 — 抓取器故障

抓取器每周运行一次。如果失败，网站上的赛事数据会变旧，但不会立即造成功能故障——上次成功的数据仍保留在 `ecosystemdb.races` 中。

---

### 5.1 抓取器返回 0 条赛事或完全失败

**症状：** 面板显示"抓取赛事数：0"或运行失败。

**最可能的原因：** RunJapan 网站更新了 HTML 结构。

**修复步骤：**
1. 面板 → 抓取器 → 上次运行 → 复制错误信息
2. 🤖 *"我的 runjapan.jp 抓取器出现以下错误：[粘贴]。抓取器在 `services/scraper/scraper.js` 中，使用 Cheerio 解析 HTML，采用两阶段方式：POST 列表页，再 GET 详情页。网站结构可能发生了什么变化？如何更新选择器？"*
3. 按[第十部分](#第十部分--使用-claude-code-修复代码)指引应用修复

**修复期间：** 之前的赛事数据仍在 `races` 表中——网站和小红书生成器继续正常使用稍旧的数据。

---

### 5.2 只返回部分赛事数据

**症状：** 抓取成功，但赛事数量少于正常水平（通常应有 80+ 条）。

**最可能的原因：** RunJapan 分页机制变更，或 session cookie 处理出现问题。

**修复：**
🤖 *"我的 RunJapan 抓取器只返回了 [X] 条赛事，而通常应有 80+ 条。抓取器在 `services/scraper/scraper.js`，使用 `tough-cookie` + `axios-cookiejar-support` 处理跨分页请求的 session。什么原因可能导致结果不完整？"*

---

### 5.3 赛事数据显示异常

**症状：** 赛事缺少日期、地点错误或简介为空。

**原因：** RunJapan 更改了详情页的 HTML 结构，Cheerio 选择器读取了错误的字段。

**修复：** 同第 5.1 节——更新 `scraper.js` 中的选择器。

---

## 第六部分 — 乐天同步故障

---

### 6.1 商品未出现在 WooCommerce

**症状：** 同步已运行，但商品没有出现在商店。

**按顺序检查：**
1. 面板 → 乐天 → 导入日志 — 查看每件商品的错误
2. 常见原因：WooCommerce API 鉴权失败 → 第 4.1 节（更新 WC consumer key）
3. 常见原因：图片上传失败 → 商品创建成功但无图片，到 WooCommerce 后台确认商品是否存在

---

### 6.2 乐天 API 限流

**症状：** 运行日志中出现乐天"429"或"Too Many Requests"错误。

**修复：** 等待 1 小时后在面板重新触发同步。流水线在 API 调用之间有 1 秒延迟，但大批量拉取仍可能触发限流。

🤖 如反复出现：*"我的乐天 API 调用持续触发限流。同步逻辑在 `services/rakuten/src/runWeeklySync.ts`。如何降低请求频率？"*

---

### 6.3 商品没有图片

**症状：** 商店商品显示占位图而非商品图片。

**原因：** WooCommerce 从乐天 CDN 上传图片失败（CDN 拒绝请求或 URL 已过期）。

**修复：** 重新触发同步——没有 `wc_product_id` 的商品在下次同步时会自动重新推送。如果图片仍然失败：🤖 *"我的 WooCommerce 商品从乐天 CDN URL 上传图片失败。最可能的原因和修复方案是什么？"*

---

### 6.4 汇率过期

**症状：** 商品价格与当前日元/人民币汇率明显不符。

**修复：**
1. 在 xe.com 或 Google 查看最新汇率
2. 面板 → 乐天 → 配置 → 更新"日元 → 人民币汇率"
3. 保存 — 价格将在下次同步时重新计算

---

### 6.5 商品被过度删除

**症状：** 本应在售的商品从商店消失。

**下架机制说明：**
- 每次同步：`incrementMissedScrapes()` 将所有商品的计数器加 1
- 乐天 Ranking API 返回的商品：`upsertProducts()` 将其计数器重置为 0
- `missed_scrapes >= 15` 的商品：从 WooCommerce 和 PostgreSQL 中删除

**原因：** 如果 `productsPerCategory` 设置过低，每次同步拉取的商品少，商品更容易离开排行榜从而加速被下架。

**修复：**
1. 面板 → 乐天 → 配置 → 增大 `productsPerCategory`
2. 或：暂时降低同步频率，等商品目录稳定后再恢复

---

### 6.6 每周同步未运行

**症状：** 价格过期，或商品显示缺货。

**修复：**
1. 面板 → 乐天 → "立即运行同步"
2. 如果失败，检查数据库错误（第 7.1 节）或 API 鉴权错误（第 4.1 节）

---

## 第七部分 — 数据库与服务器基础设施

---

### 7.1 数据库连接错误

**症状：** 多个服务同时失败，错误中包含"ECONNREFUSED"、"database"、"PostgreSQL"或"connection refused"。

**修复步骤：**
1. SSH 登录服务器
2. `docker-compose ps` — 检查 `postgres` 容器是否在运行
3. 如果显示"Exit"或"Restarting"：`docker-compose restart postgres`
4. 等待 30 秒：再次运行 `docker-compose ps`
5. 如果持续崩溃：`docker-compose logs postgres` → 🤖 复制粘贴输出

**如果磁盘空间不足**（"no space left on device"）：
1. `df -h` — 查看磁盘使用情况
2. `docker system prune -f` — 清理无用的 Docker 镜像和容器
3. 如果仍然不足，需要在 AWS 控制台升级 Lightsail 实例存储

---

### 7.2 容器持续崩溃

**症状：** 面板显示某服务下线，不断重启。

**修复步骤：**
1. SSH 登录服务器
2. `docker-compose logs <service>`（服务名称：`xhs`、`scraper`、`rakuten`、`race-hub`、`dashboard`）
3. 复制最后 50 行日志
4. 🤖 *"我在 AWS Lightsail 上的 Docker 容器 [服务名] 持续崩溃。以下是日志：[粘贴]。是什么原因？"*

---

### 7.3 所有服务均下线

**症状：** 面板无法访问，网站仍正常，但自动化全部停止。

**最可能的原因：** Lightsail 实例重启（AWS 维护），容器未自动启动。

**修复步骤：**
1. SSH 登录服务器
2. `docker-compose up -d`
3. 等待 1 分钟：`docker-compose ps` — 所有服务应显示"Up"
4. 打开面板确认

**预防措施：** `sudo systemctl enable docker` 确保 Docker 在系统启动时自动运行。

---

## 第八部分 — Stripe 与支付

Stripe 处理 WooCommerce 商店的所有支付。日常运营无需主动操作 Stripe，WooCommerce 会自动处理订单流程。只有在支付出现问题时才需要登录 Stripe。

---

### 8.1 查看支付状态

1. 登录 [dashboard.stripe.com](https://dashboard.stripe.com)
2. **Payments** 标签页 — 显示所有交易记录，状态：成功 / 失败 / 已退款
3. 通过客户邮箱或金额搜索特定支付记录

---

### 8.2 客户反映支付失败

1. Stripe → Payments → 找到失败记录
2. 查看失败原因（显示在支付记录下方）：银行卡被拒、余额不足、需要身份验证等
3. 告知客户原因，并建议：
   - 换一张银行卡重试
   - 如果显示"需要身份验证"，联系发卡行（3D Secure 问题）
   - 直接重试——有时短暂失败会自动恢复
4. 如果 Stripe 显示支付成功但 WooCommerce 没有生成订单：🤖 *"Stripe 支付成功，但 WooCommerce 未创建订单。可能是 webhook 投递失败，如何检查 Stripe webhook 日志？"*

---

### 8.3 退款操作

1. Stripe → Payments → 找到对应支付记录 → 点击 **Refund**
2. 输入退款金额（全额或部分）和退款原因
3. 点击 **Refund** — 客户 5-10 个工作日内收到退款
4. 登录 WordPress 后台 → WooCommerce → 订单 → 找到对应订单 → 将状态改为**已退款**

---

### 8.4 到账记录

Stripe 按滚动方式将资金转入绑定的银行账户（通常每笔支付清算后 2-7 个工作日）。在 Stripe → **Payouts** 标签页查看到账计划。

如果到账延迟或缺失：
1. Stripe → Payouts → 检查是否有"Failed"（失败）的到账记录
2. 确认银行账户信息正确：Stripe → Settings → Bank accounts

---

### 8.5 Stripe 手续费

Stripe 每笔交易收取约 2.9% + 固定费用（按地区不同）。费用从每笔支付中自动扣除后再转账——无需单独支付。在 Stripe → Settings → Pricing 查看具体费率。

---

## 第九部分 — WooCommerce 订单

客户在商店下单后，订单出现在 WooCommerce 中。自动化流水线只负责上架商品和定价，发货和客户沟通需要手动处理。

---

### 9.1 查看订单

WordPress 后台 → [running.moximoxi.net/wp-admin](https://running.moximoxi.net/wp-admin) → **WooCommerce → 订单**

每个订单显示：客户姓名、邮箱、购买商品、支付总额、客户备注（如有填写尺码/颜色偏好）、订单状态。

---

### 9.2 正常订单处理流程

1. 客户下单 → WooCommerce 自动发送订单确认邮件
2. 在 WooCommerce 后台看到订单，状态：**处理中**
3. 查看订单中是否有客户备注（尺码/颜色偏好）
4. 在乐天日本购买对应商品（商品链接在 WooCommerce 商品详情页中）
5. 通过转运/代购服务将商品发货给客户
6. 发货后将订单状态更新为**已完成** — WooCommerce 自动发送邮件通知客户
7. 如果商品缺货或延迟，直接给客户发邮件（邮箱地址在订单页面）

---

### 9.3 订单状态说明

| 状态 | 含义 |
|---|---|
| **待付款** | 支付尚未确认，等待即可，通常自动解决 |
| **处理中** | 支付已确认，需要你发货 |
| **已完成** | 已发货，客户已收到通知 |
| **已退款** | 通过 Stripe 已退款 |
| **已取消** | 订单已取消，未扣款 |
| **暂停** | 需要人工审核，查看订单备注 |

---

### 9.4 客户咨询

客户通过以下方式联系：
- 网站右下角的在线聊天工具
- 电话：15721021232
- 下单时使用的邮箱

常见问题：
- **"我的订单在哪里？"** — 确认是否已发货，如有物流信息可提供
- **"可以改尺码吗？"** — 在购买乐天商品之前，在 WooCommerce 后台更新订单备注
- **"商品缺货"** — 在乐天查询。如确实无货，退款并推荐替代商品

---

### 9.5 客户请求上架新商品

如果客户询问商店中没有的商品：

1. 面板 → 乐天 → 找到商品请求入口（或让客户通过网站的请求表单提交）
2. 流水线自动从乐天拉取该商品、定价，约 2 分钟内加入 WooCommerce
3. 将商品页面链接发给客户

---

### 9.6 下架无关商品

乐天流水线从跑步相关品类中抓取商品，但偶尔会混入不相关的产品（如冷冻食品、家居用品、非跑步服装）。发现明显不合适的商品时：

1. 进入 **running.moximoxi.net/wp-admin/edit.php?post_type=product**
2. 右上角搜索框输入商品名称的部分关键词
3. 鼠标悬停在商品上 → 点击**移至回收站**

建议每周例行检查一次商品列表——大多数误入商品一眼就能认出（食品、无关服装、电子产品等）。

---

## 第十部分 — 使用 Claude Code 修复代码

### 10.1 什么是 Claude Code

Claude Code 是一个在终端中运行的 AI 编程助手。在代码仓库目录下启动后，它可以直接读取代码库并进行精准的代码修改。这是在不深入了解代码的情况下，诊断和修复系统问题的最快方式。

### 10.2 如何开始调试会话

**方式 A — 直接在服务器上操作：**
```bash
ssh -i ~/.ssh/automation-ecosystem.pem ubuntu@<SERVER_IP>
cd /home/ubuntu/automation-ecosystem
claude  # 启动 Claude Code CLI
```

**方式 B — 在本地克隆的代码库上操作：**
```bash
git clone <repo-url>
cd automation-ecosystem
claude
```

**每次调试会话的第一条消息（复制粘贴这段话）：**
```
我在维护 running.moximoxi.net 的自动化系统。
它在 AWS Lightsail 上运行 5 个 Docker 服务：
- XHS：每日 Claude 驱动的帖子生成器（services/xhs/）— 半自动，生成后保存到数据库
- Scraper：每周 RunJapan 抓取器（services/scraper/）
- Race Hub：向 WordPress 提供赛事数据的 Express API（services/race-hub/）
- Rakuten：从乐天抓取商品推送到 WooCommerce 的 TypeScript 服务（services/rakuten/）
- Dashboard：Next.js 监控面板（services/dashboard/）

两个 PostgreSQL 数据库：ecosystemdb（XHS + 抓取器）和 rakutendb（乐天）。
设计文档在 services/<service>/docs/<service>-design-doc.md。

[在这里粘贴你的具体问题]
```

### 10.3 各故障类型对应的提示词

**抓取器选择器失效（RunJapan 改版）：**
```
完整读取 services/scraper/scraper.js。抓取器报错：[粘贴错误]。
RunJapan 网站可能更改了 HTML 结构。找出需要更新的 Cheerio 选择器并提出修复方案。
我需要先在浏览器中验证新的选择器——告诉我应该在 DevTools 中查找什么。
```

**小红书帖子生成器失败：**
```
读取 services/xhs/src/generator.js 和 services/xhs/config/prompts.json。
生成器在 [generate/chooseRace] 阶段报错：[粘贴错误]。
诊断原因并提出修复方案。在未解释权衡之前，不要修改 prompts.json 中的提示词内容。
```

**面板显示数据错误 / 功能异常：**
```
读取 services/dashboard/app/[相关页面文件] 以及
services/dashboard/app/ui/ 中的相关组件。问题是：[描述异常现象]。
如果是显示/文字问题，同时检查 services/dashboard/app/lib/locales/。
```

**乐天同步问题：**
```
读取 services/rakuten/src/runWeeklySync.ts 和 services/rakuten/src/db/queries.ts。
乐天同步失败/行为异常：[粘贴错误或描述现象]。
如果是商品数量/下架问题，同时检查 config 表的当前值。
```

**容器无法启动：**
```
[服务名] Docker 容器持续崩溃。以下是日志：
[粘贴 docker-compose logs 输出]
读取 services/<service>/Dockerfile 和入口脚本来诊断问题。
```

### 10.4 通过 GitHub 应用修复（推荐）

1. 在浏览器中打开 GitHub 代码仓库
2. 找到 Claude Code 指出的文件
3. 点击铅笔图标（Edit）
4. 修改内容
5. 点击"Commit changes"
6. CD 流水线几分钟内自动部署
7. 查看面板，确认服务正常重启

### 10.5 直接在服务器上应用修复（紧急情况）

```bash
ssh -i ~/.ssh/automation-ecosystem.pem ubuntu@<SERVER_IP>
cd /home/ubuntu/automation-ecosystem
nano services/<service>/src/<file>   # 修改文件
docker-compose restart <service>
docker-compose logs <service>        # 确认服务正常启动
```

⚠️ 直接在服务器上做的修改会在下次 GitHub 部署时被覆盖。修改完成后，务必同时在 GitHub 提交相同的改动。

---

## 第十一部分 — 月度维护与费用

### 11.1 月度任务

| 任务 | 时间 | 操作方式 |
|---|---|---|
| 检查汇率 | 每月 1 日 | xe.com → 面板 → 乐天 → 配置 → 如变动超 2% 则更新 |
| 查看小红书帖子归档 | 随时 | 面板 → 小红书 → 帖子归档 — 确认近期帖子内容正常 |
| 检查 DeepL 配额 | 翻译停止时 | deepl.com → 账户 → 用量 |
| 检查 Anthropic 用量 | 随时 | console.anthropic.com → 用量 |
| 乐天商品目录检查 | 每月 | 面板 → 乐天 → 分品类数量 — 确认无大幅意外下降 |
| 域名续费检查 | 每年（设置提醒） | 登录域名注册商 — 确认 `moximoxi.net` 自动续费已开启 |

---

### 11.2 月度费用（参考）

以下是维持平台运行的持续费用，均从移交手册（handoff-setup.md）中列出的账户扣款。

| 服务 | 费用 | 账单方 |
|---|---|---|
| AWS Lightsail VPS | 约 10-20 美元/月 | AWS |
| Anthropic（Claude API） | 约 5-30 美元/月（随用量变化） | Anthropic |
| DeepL | 取决于套餐（免费版：50 万字符/月） | DeepL |
| 域名（`moximoxi.net`） | 约 10-20 美元/年 | 域名注册商 |
| Docker Hub | 免费（公开仓库） | Docker Hub |
| Stripe | 每笔交易 2.9% + 固定费用（无月费） | 从每笔支付中自动扣除 |
| Google Translate API | 极少（TranslatePress 仅翻译新内容） | Google Cloud |

**需要关注的异常情况：**
- **AWS 账单突增：** 通常说明实例负载过高或存在多余的快照 — 检查 AWS Lightsail 控制台
- **Anthropic 账单突增：** 说明小红书生成的帖子数量远超预期 — 检查运行历史
- **DeepL 配额用尽：** 新赛事翻译会失败 — 升级套餐或等待下月重置

---

## 第十二部分 — 快速参考

### 错误信息速查

| 错误信息 | 含义 | 跳转至 |
|---|---|---|
| `401 Unauthorized` | API 密钥失效或过期 | 第 4.1 节 |
| `429 Too Many Requests` | 触发限流 | 等待 1 小时后重试 |
| `ECONNREFUSED` | 服务未运行或数据库宕机 | 第 7.1 节 |
| `selector not found` / `strict mode violation` | 网站 HTML 结构变化 | 第 5.1 节 |
| `JSON parse error` | Claude 返回格式错误的响应 | 重试；如反复出现见第 4.4 节 |
| `no space left on device` | 服务器磁盘空间不足 | 第 7.1 节 |
| `DEEPL_API_KEY` | DeepL 密钥缺失或过期 | 第 4.1 节 |
| `missed_scrapes >= 15` | 商品被判定为过期并删除 | 第 6.5 节 |
| `published=false` | 帖子已生成，运营人员尚未发布到小红书 | 正常状态，见第 3.3 节 |

### SSH & Docker 命令

```bash
# SSH 登录服务器
ssh -i ~/.ssh/automation-ecosystem.pem ubuntu@<SERVER_IP>

# 查看所有容器状态
docker-compose ps

# 查看某服务的日志
docker-compose logs xhs
docker-compose logs -f rakuten   # 持续跟踪模式

# 重启某服务
docker-compose restart xhs

# 启动所有服务（服务器重启后）
docker-compose up -d

# 连接 PostgreSQL
psql -U goodsoft -d ecosystemdb -h localhost
psql -U goodsoft -d rakutendb -h localhost
```

### 容器名称

| 容器名 | 对应服务 |
|---|---|
| `xhs` | 小红书帖子生成器 |
| `scraper` | 赛事抓取器 |
| `race-hub` | 赛事中心 API |
| `rakuten` | 乐天商品聚合器 |
| `dashboard` | 监控面板 |
| `postgres` | PostgreSQL 数据库 |

### 关键链接

| 链接 | 用途 |
|---|---|
| `http://<SERVER_IP>:3002` | 运营面板 |
| `https://running.moximoxi.net` | WordPress 商店 |
| `https://running.moximoxi.net/wp-admin` | WordPress 后台 |
| `https://running.moximoxi.net/racehub/` | 赛事中心页面 |
| `https://creator.xiaohongshu.com` | 小红书创作平台 |
| `https://console.anthropic.com` | Anthropic API 密钥 & 用量 |
| `https://webservice.rakuten.co.jp` | 乐天 API 控制台 |
| `https://dashboard.stripe.com` | Stripe 支付管理 |
| `https://running.moximoxi.net/wp-admin` → WooCommerce → 订单 | 订单管理 |
