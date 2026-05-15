# Daily Operations Manual

Everything you need to do each day, week, and month. Each task links to detailed instructions.

---

## Daily Tasks

### 1. Check Dashboard Status

Open the dashboard and confirm all three cards on the home page are healthy.

✅ Normal: all three cards show "Last Status: success" and "Current State: idle"
❌ Abnormal: red text or "failed" → open the relevant module's run history and find the cause

→ Details: [Dashboard Manual](dashboard-manual.en.md)

---

### 2. Publish Today's Xiaohongshu Post

The dashboard generates a Xiaohongshu post automatically every day, but you need to copy it manually and post it in the XHS app.

1. Open dashboard → XHS → check the "**Pending**" list on the right
2. Expand the day's post and copy each field: title, body, hashtags, comments
3. Open the Xiaohongshu app on your phone, create a new note, paste the content, and publish
4. Done

If you see an "**Overdue**" label, yesterday's post hasn't been published yet — handle that first.

**Want to post about a specific topic?** Select the post type, type your direction in Chinese in the input box, then click Generate. Useful for specific races, gear, or seasonal content.

→ Details: [Dashboard Manual — XHS Module](dashboard-manual.en.md#xhs-module) · [Custom Post Content](dashboard-manual.en.md#custom-post-content)

---

### 3. Process New Orders

Check whether there are new customer orders to handle.

1. Open WordPress Admin → WooCommerce → Orders
2. Look for orders with status "**Processing**"
3. Review the order, purchase the corresponding product on Rakuten, and arrange shipping
4. After shipping, change the order status to "**Completed**"

→ Details: [WordPress Manual — Update Order Status](wordpress-manual.en.md#update-order-status)

---

### 4. Maintain the Community

Keep the community active so members feel it's being managed.

1. Open the community home page and check recent activity
2. Reply to active threads using the admin account (short and helpful is enough)
3. Every 2–3 days, post a new thread from a community account (training thoughts, race questions, gear discussions)

→ Details: [Community Manual](community-manual.en.md)

---

## Weekly Tasks

### 5. Review and Clean Product Listings

The Rakuten system occasionally imports products unrelated to running (food, household goods, etc.) — these need to be deleted manually.

1. Open WordPress Admin → Products
2. Scan the product list and find any obviously irrelevant items
3. Hover over the product → click **Move to Trash**

→ Details: [Full Runbook §9.6](handoff-runbook.md)

---

### 6. Check Product Translation Quality

Automated translations are sometimes inaccurate and can affect the customer experience.

1. Open the website's product pages and spot-check a few products
2. If a translation is clearly wrong or unreadable, fix it in WordPress Admin
3. Focus on: product names and specification descriptions

→ Details: [WordPress Manual — How to Edit Translations](wordpress-manual.en.md#how-to-edit-translations)

---

### 7. Manage Community Interest Groups

Check each group for new members and any posts that need a reply. If a Japanese race is coming up soon, consider creating a matching interest group.

→ Details: [Community Manual — How to Create a New Interest Group](community-manual.en.md#how-to-create-a-new-interest-group)

---

### 8. GEO Content — Write a WordPress Article

Once a week, check whether anything is worth expanding into a WordPress article. Two triggers:

- **High-performing XHS post** — open Dashboard → XHS → Post Archive, scan the past week. If a post has noticeably more views or saves than usual, expand it into a WordPress article.
- **Major race registration opening** — if Tokyo, Osaka, Kyoto, Hokkaido, or Nagano marathon has registration opening within 8 weeks, write a full race guide.

→ How to write and publish: [GEO Content Manual](../geo/geo-operator-manual.md)

---

## Monthly Tasks

### 9. Update the JPY Exchange Rate

Product prices are calculated from the JPY → CNY rate. A large drift affects margins.

1. Check the current JPY/CNY rate at [xe.com](https://xe.com)
2. Compare with the rate shown in Dashboard → Rakuten → Pricing Config
3. If the difference is more than 2%, update the rate and save

→ Details: [Dashboard Manual — Edit Pricing Config](dashboard-manual.en.md#edit-pricing-config)

---

### 10. Content Calibration Analysis

Once a month, export data from XHS Creator Studio, upload it to the dashboard, and adjust the posting strategy based on the results. You can also run the analysis without uploading a file — the system will use existing data from the database.

1. XHS Creator Studio → **Content Analytics** → **Export Data** — download the Excel file
2. Open Dashboard → XHS → left panel "**Content Calibration**"
3. Select the file (optional) → click **Analyze**
4. Review the ranking results and add more slots in the schedule for the type marked "**Post More**"

→ Details: [Dashboard Manual — Content Calibration](dashboard-manual.en.md#content-calibration)

---

### 11. Stripe Reconciliation

Confirm last month's payments arrived and check for any refunds or disputes.

1. Log into Stripe dashboard
2. Review last month's total revenue
3. Check for any "dispute" or "refund" status transactions and follow the prompts

→ Details: [Full Runbook — Stripe & Payments](handoff-runbook.md)

---

## Quick Reference

| I need to… | Where | Frequency |
|---|---|---|
| Check if the system is running | [Dashboard home](dashboard-manual.en.md) | Daily |
| Publish today's XHS post | [Dashboard → XHS → Pending](dashboard-manual.en.md#xhs-module) | Daily |
| Generate a post about a specific topic | [Dashboard → XHS → Custom Post](dashboard-manual.en.md#custom-post-content) | As needed |
| Process new orders | [WordPress → WooCommerce → Orders](wordpress-manual.en.md#update-order-status) | Daily |
| Reply to community members | [Community](community-manual.en.md) | Daily |
| Delete irrelevant products | [WordPress → Products](handoff-runbook.md) | Weekly |
| Check product translations | [WordPress → product pages](wordpress-manual.en.md#how-to-edit-translations) | Weekly |
| Write a GEO WordPress article | [GEO Content Manual](../geo/geo-operator-manual.md) | Weekly |
| Content calibration analysis (file optional) | [Dashboard → XHS → Content Calibration](dashboard-manual.en.md#content-calibration) | Monthly |
| Update exchange rate | [Dashboard → Rakuten → Pricing Config](dashboard-manual.en.md#edit-pricing-config) | Monthly |
| Reconcile payments | Stripe dashboard | Monthly |
