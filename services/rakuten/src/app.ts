import "dotenv/config";
import fs from "fs";
import path from "node:path";
import express, { Request, Response } from "express";
import { reloadConfig } from "./services/pricing";
import { updatePrices } from "./services/woocommerceAPI";
import runWeeklySync from "./scripts/runWeeklySync";
import nodeCron from "node-cron";

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

// Watch config.json for markup/rate changes and re-push prices to WooCommerce
const configPath = `${process.env.DATA_DIR}/rakuten/config.json`;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
fs.watch(configPath, () => {
	if (debounceTimer) clearTimeout(debounceTimer);
	debounceTimer = setTimeout(async () => {
		console.log("config.json changed — reloading pricing config and updating WC prices...");
		reloadConfig();
		await updatePrices();
	}, 1000);
});

const assetsPath = path.join(__dirname, "public");
app.use(express.static(assetsPath));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req: Request, res: Response) => res.send("Running"));

app.listen(process.env.PORT!, () => {
	console.log(`Server running on port ${process.env.PORT}`);
});
