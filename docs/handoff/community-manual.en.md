# Community Operations Manual

The community platform is **FluentCommunity**, installed in WordPress. The goal is to keep the community active — post regularly from different accounts and reply to threads to create an authentic discussion atmosphere.

---

## Contents

- [Community Overview](#community-overview)
- [How to Post as Different Users](#how-to-post-as-different-users)
- [How to Create a New Community Account](#how-to-create-a-new-community-account)
- [How to Post and Reply](#how-to-post-and-reply)
- [How to Create a New Interest Group](#how-to-create-a-new-interest-group)
- [Daily Operations Guidelines](#daily-operations-guidelines)

---

## Community Overview

Community URL: **running.moximoxi.net/community**

![Community feed page](image.png)

Community structure:
- **Feed** — unified activity stream across all channels
- **Marathon Prep Tools** — embedded training calculators
- **Progress Trendline** — user pace tracking module
- **Marathon Supply Hub** — store entry
- **Community Spaces** — topic-based discussion channels (see left sidebar)
- **Members / Leaderboard** — GamiPress points system

Existing discussion channels include:
Marathon Info & Discussion, Tokyo/Osaka Interest Groups, Running Beginners, Marathon Training Camp, Supplement Discussion, Training Log Check-ins, Shopping & Shipping Support, and others.

---

## How to Post as Different Users

The community has multiple preset accounts to simulate active users. All accounts are created using the **+number** suffix format on the same email address (e.g. `jason+1@goodsoft.co.jp`) for easy management.

**To view all accounts:**

WordPress Admin → **Users → All Users**

![User list](image-1.png)

Here you can see all community accounts and their emails.

**To log in and post as a specific account:**

1. Log into the website frontend using that account's email + password (passwords are saved in the credentials table)
2. Go to the community and post or reply as that user
3. After posting, log out and switch back to the admin account

> **Tip:** Browsers support multiple account profiles — you can be logged into several accounts at once to avoid constant switching.

---

## How to Create a New Community Account

If you need to add a new community account (e.g. creating a dedicated persona account for a new operator):

**Entry:** WordPress Admin → **Users**

![Users menu](image-2.png)

Click **Add New User**

![Add user page](image-3.png)

Fill in the following:
- **Username:** a Chinese-style nickname in English format (e.g. `morning_runner`)
- **Email:** use the `your-email+number@domain` format (e.g. `operator+1@example.com`)
- **Password:** click "Generate Password" — **save it to the credentials table immediately**
- **Role:** select **Subscriber** (regular community member permissions)
- Uncheck "Send the new user an account notification" (avoids sending to the alias address)

Click **Add New User** to complete.

![Add user form](image-4.png)

After creating the account, log into the community frontend with it and add a profile picture and bio to make it look authentic.

---

## How to Post and Reply

**Publishing a new post:**

1. Log into the website frontend with the relevant account
2. Go to the community → select the appropriate **discussion channel** (e.g. "Marathon Info & Discussion")
3. Click the post box, type your content, select the channel, and click **Post**

**Post content guidelines:**
- Write from a runner's perspective — natural tone, like a real user
- Reference the style of existing posts: share training experiences, ask race questions, discuss gear and nutrition
- Don't have every account post the same type of content — keep different accounts with different "personalities"

**Replying to posts (as admin Jason Deng):**

1. Log in with the admin account
2. Find the post you want to reply to and click **Comment**
3. Type the reply and send

Admin replies should be short and helpful — aim to guide the discussion, not dominate it.

---

## How to Create a New Interest Group

When a new race or trending topic emerges, you can create a matching interest group (e.g. "2027 Tokyo Marathon Interest Group").

**Entry:** WordPress Admin → **FluentCommunity → Spaces**

1. Click **Add New Space**
2. Enter a space name (add a relevant emoji, e.g. 🏁 2027 Tokyo Marathon Interest Group)
3. Set visibility to **Community-visible**, allowing members to join freely
4. After saving, the space appears in the left sidebar on the community frontend

After creating it, post a **welcome thread** from the admin account introducing the group's purpose and how to participate — follow the format of existing interest group welcome posts.

---

## Daily Operations Guidelines

| Frequency | Task |
|---|---|
| Daily | Check community activity and reply to real user comments (as admin) |
| 2–3 times per week | Post from different accounts to keep discussion active |
| Monthly | Create new interest groups or launch community challenges based on seasonal race events |

**Posting cadence guidelines:**
- Don't have the same account post every day — keep it natural (1–2 times per week per account)
- Rotate accounts so the feed looks diverse
- The admin (Jason Deng) should stay in the "facilitator" role — ask questions, summarise, give advice, but not dominate topics

**Topic ideas:**
- Training doubts and anxieties (easiest to generate engagement)
- Japanese marathon race info and experience sharing
- Gear, nutrition, and pacing strategy discussions
- Pre- and post-race mindset sharing
