import "dotenv/config";
import path from "node:path";
import express, { Request, Response } from "express";
import { initPricing, reloadConfig } from "./services/pricing";
import { updatePrices } from "./services/woocommerceAPI";
import { updateConfig, Config } from "./db/queries";
import runWeeklySync from "./scripts/runWeeklySync";
import nodeCron from "node-cron";
import { itemRequestByKeyword } from "./controller";
import { productRequestLimiter } from "./middleware/rateLimiter";

const app = express();

nodeCron.schedule(
	"0 2 * * 1",
	async () => {
		try {
			await runWeeklySync();
		} catch (err) {
			console.error(`weekly sync failed`);
			return;
		}
	},
	{ timezone: "Asia/Shanghai" },
);

const assetsPath = path.join(__dirname, "public");
app.use(express.static(assetsPath));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get("/", (_req: Request, res: Response) => res.send("Running"));

app.post("/api/request-product", productRequestLimiter, async (req: Request, res: Response) => {
	console.log(`[api] POST /api/request-product — keyword: "${req.body.keyword}"`);
	const result = await itemRequestByKeyword(req.body.keyword);
	console.log(`[api] /api/request-product response: success=${result.success}, productIds=${JSON.stringify((result as any).productIds ?? [])}`);
	res.json(result);
});

app.post("/api/config", async (req: Request, res: Response) => {
	const { key, value } = req.body as { key: keyof Config; value: number };
	console.log(`[api] POST /api/config — ${key} = ${value}`);
	await updateConfig(key, value);
	await reloadConfig();
	await updatePrices();
	res.json({ success: true });
});

async function start() {
	await initPricing();
	app.listen(process.env.PORT!, () => {
		console.log(`Server running on port ${process.env.PORT}`);
	});
}

start();
