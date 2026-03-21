import { chromium } from "playwright";

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();
await page.goto("https://creator.xiaohongshu.com/publish/publish");
await page.pause(); // opens Playwright Inspector — pauses script so you can log in manually
await context.storageState({ path: "auth.json" }); // saves cookies/session to file
await browser.close();

