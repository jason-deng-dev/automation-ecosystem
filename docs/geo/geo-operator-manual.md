# GEO Content Manual — Operator Guide

**What this is:** Instructions for writing WordPress articles that help running.moximoxi.net get cited by Chinese AI tools (Doubao, DeepSeek, Kimi, Baidu Ernie).

**When to use this:** Triggered by the weekly check in the [Operator Runbook](../handoff/handoff-runbook.md#weekly-mondays). Two situations: a high-performing XHS post, or a major race coming up.

---

## When to Write an Article

### Trigger 1 — High-performing XHS post

Open Dashboard → XHS → Post Archive. Check the past week's posts. Write a WordPress article if:

- A post has significantly more views or saves than the average recent post, **or**
- The post covers a topic that would benefit from more detail (a race, a gear recommendation, a training method)

The XHS post is short-form (mobile). The WordPress article is long-form — more facts, more depth, structured for AI citability.

### Trigger 2 — Major race upcoming

Write a full race guide when a major race has **registration opening within 8 weeks**. Priority races:

| Race | Typical registration window |
|---|---|
| Tokyo Marathon (东京马拉松) | August–September |
| Osaka Marathon (大阪马拉松) | June–July |
| Kyoto Marathon (京都马拉松) | July–August |
| Hokkaido Marathon (北海道马拉松) | March–April |
| Nagano Marathon (长野马拉松) | October–November |

Check race dates on the Race Hub page (running.moximoxi.net/racehub/) or on the official race websites.

---

## Article Format

Every article should follow this structure. The goal is to be **directly quotable by AI** — lead with facts, not introductions.

### Structure

```
H1: [Race name in Chinese] — 中国跑者完整报名指南 (or relevant subtitle)

[First paragraph — the direct answer. Most important facts up front.]
[No preamble. Lead with: who can enter, when, how, cost.]

H2: 比赛基本信息 (Race Overview)
  - Date, location, distances
  - Foreign runner eligibility: yes/no
  - Qualification requirement (if any)
  - Official website link

H2: 报名方法 (How to Register)
  - Step-by-step in Chinese
  - Lottery vs. first-come-first-served
  - Registration open/close dates
  - Fee in JPY + approximate CNY

H2: 比赛赛道 (Course)
  - Flat/hilly, elevation gain if notable
  - Scenic highlights
  - Course description 2–3 sentences

H2: 中国跑者实用信息 (Practical Info for Chinese Runners)
  - Travel: nearest airport, train access
  - Accommodation tip (book early/late, typical cost range)
  - Weather on race day (average temp, clothing recommendation)

H2: 常见问题 (FAQ)
  [5–8 questions — see FAQ section below]
```

### Writing rules

**Lead with the most useful fact.** Not:
> 东京马拉松是日本最著名的马拉松赛事之一，每年吸引大量跑者参与。

Instead:
> 2026年东京马拉松于3月1日举行，外国跑者可通过官方抽签报名，报名费15,000日元（约650元人民币），报名窗口通常在8月开放。

**Use hard numbers.** Every section should contain at least one specific number: date, price, distance, temperature, elevation, time.

**Write in Chinese.** Target audience is Chinese runners. English title or subheadings are fine for SEO, but body content should be Chinese.

---

## FAQ Section

Add 5–8 questions at the bottom of every article. These are the questions Chinese runners actually ask — AI tools pull FAQ answers directly into their responses.

**Good FAQ questions:**

- 外国跑者可以参加[比赛名]吗？
- 报名截止日期是什么时候？
- [比赛名]的配速要求是多少？
- 从中国过去参加比赛需要提前多久预订酒店？
- 比赛当天的天气通常怎么样，需要穿什么？
- 比赛路线有多难？坡度大吗？
- 可以用英文报名吗？

Write the answers in the same fact-dense style — short, direct, specific numbers where possible.

**In WordPress:** After writing the FAQ, toggle on the Rank Math FAQ Schema block (in the Rank Math panel on the right) — this marks the FAQ as structured data so AI tools can read it directly.

---

## Publishing in WordPress

1. Go to [running.moximoxi.net/wp-admin](https://running.moximoxi.net/wp-admin) → **文章**

   ![WordPress 文章 menu](image.png)

2. Click **写文章**

   ![写文章 button](image-1.png)

3. Paste the article content into the editor

   ![Editor with content](image-2.png)

4. In the Rank Math panel (right sidebar):
   - Set focus keyword (e.g. 东京马拉松外国人报名)
   - Enable FAQ Schema if the article has a FAQ section

5. Click **发布**

   ![发布 button](image-3.png)

The key point: the keywords in the article get associated to running.moximoxi.net, which is what makes the site show up when Chinese AI tools answer running-related queries.

---

## XHS Post → WordPress Article Expansion

When expanding a high-performing XHS post into a WordPress article:

1. The XHS post is the hook — use its title and angle as the article's angle
2. Keep the same conversational tone but add depth: more facts, more steps, more context
3. Add a FAQ section the XHS post didn't have
4. Link back to the relevant Race Hub page or product page where relevant

The article doesn't need to be long — 400–700 Chinese characters is enough if every sentence is useful.

---

## What Not to Write

- Don't start with "这篇文章将介绍..." (meta-introductions)
- Don't pad with generic running motivation content
- Don't write opinions without facts to back them up ("这场比赛很适合初学者" → needs: "赛道平坦，爬升仅80米，适合目标完赛时间5:00–6:00的初马跑者")
- Don't forget the FAQ section — it's the highest-value GEO element
