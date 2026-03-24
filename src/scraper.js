import "dotenv/config";
import axios from "axios";
import axiosRetry from "axios-retry";
import * as cheerio from "cheerio";
import { writeFile } from "fs/promises";

import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";

const jar = new CookieJar();
const client = wrapper(axios.create({ jar }));

axiosRetry(client, {
	retries: 3,
	retryDelay: axiosRetry.exponentialDelay,
	retryCondition: axiosRetry.isNetworkOrIdempotentRequestError,
});

const timeout = parseInt(process.env.RUNJAPAN_TIMEOUT) || 10000;

async function populateRaces(limit) {
	console.log('Starting race data refresh...')
	const races = [];
	let pageIndex = 1;

	const baseUrl =
		process.env.RUNJAPAN_BASE_URL ||
		"https://runjapan.jp/entry/runtes/smp/racesearchdetail.do";
	const formBody =
		"command=search&distanceClass=0&availableFlag=0&distanceUnit1=1&distanceUnit2=1";
	while (races.length < limit) {

		const res =
			pageIndex === 1
				? await client.post(baseUrl, formBody, {
						timeout,
						headers: { "Content-Type": "application/x-www-form-urlencoded" },
					})
				: await client.get(baseUrl + `?command=page&pageIndex=${pageIndex}`, {
						timeout,
					});

		// scrape page for races
		const $ = cheerio.load(res.data);
		const cards = [...$(".event-title a")];
		if (cards.length === 0) break;
		for (const el of cards) {
			const url = "https://runjapan.jp" + $(el).attr("href");
			const name = $(el).children("span").text().trim();
			try {
				const {
					date,
					location,
					entryStart,
					entryEnd,
					website,
					images,
					description,
					info,
					notice,
					registrationOpen,
					registrationUrl,
				} = await getInfo(url);
				races.push({
					name,
					url,
					date,
					location,
					entryStart,
					entryEnd,
					website,
					images,
					description,
					info,
					notice,
					registrationOpen,
					registrationUrl,
				});
			} catch (err) {
				console.error(`Failed to scrape race: ${err.message}`);
			}
			if (races.length >= limit) break;
		}

		pageIndex++;
	}

	const output = { last_updated: new Date().toISOString(), races };
	await writeFile("data/races.json", JSON.stringify(output, null, 2));
	console.log(`Race data refresh complete — ${races.length} races saved`)
	return races;
}

async function getInfo(url) {
	let date, location, entryPeriod, website;
	let entryStart = "";
	let entryEnd = "";

	// scrape details of each race
	const detailRes = await client.get(url, {
		timeout,
	});
	const $detail = cheerio.load(detailRes.data);

	// has Date, Location, Entry Period, Web site link
	$detail("table.race-data tr").each((i, row) => {
		const label = $detail(row).find("th .lang.en").text().trim();
		const value = $detail(row).find("td span").first().text().trim();
		if (label === "Date") date = value;
		if (label === "Location") location = value;
		if (label === "Entry Period") entryPeriod = value;

		if (label === "Web Site") website = value;
	});

	if (entryPeriod) {
		[entryStart, entryEnd] = entryPeriod
			.replace(/\s+/g, " ")
			.trim()
			.split(" - ");
	}

	const images = [];
	$detail(".race_img img").each((_i, img) => {
		images.push($detail(img).attr("src"));
	});

	const description = $detail(".race_text").text().trim();

	const info = {};
	$detail("#raceinfoID dt:not(.info-start dt):not(dd dl dt)").each((_i, dt) => {
		const label = $detail(dt).find(".lang.en").text().trim();
		const dd = $detail(dt).next("dd");
		const nestedDl = dd.find("dl");
		if (nestedDl.length) {
			const nested = {};
			nestedDl.find("dt").each((_j, ndt) => {
				const nLabel = $detail(ndt).text().trim();
				const nValue = $detail(ndt)
					.next("dd")
					.text()
					.replace(/\s+/g, " ")
					.trim();
				if (nLabel) nested[nLabel] = nValue;
			});
			if (label) info[label] = nested;
		} else {
			const value = dd.text().replace(/\s+/g, " ").trim();
			if (label) info[label] = value;
		}
	});

	const notice = [];
	function collectText(nodeEl) {
		$detail(nodeEl)
			.contents()
			.each((_j, node) => {
				if (node.type === "text") {
					const text = node.data.replace(/\s+/g, " ").trim();
					if (text) notice.push(text);
				} else if (node.name !== "br" && node.name !== "font") {
					collectText(node);
				}
			});
	}
	$detail(".event-info-bttom_list2 ul li").each((_i, li) => collectText(li));

	// tri-state: true = open, false = closed, null = unknown (button element missing — page structure changed)
	let registrationOpen = null;
	let registrationUrl = null;
	const entryBtn = $detail(".event-info-btn");
	if (!entryBtn.length) {
		registrationOpen = null;
	} else if (!entryBtn.find(".close-btn").length) {
		const onclick = entryBtn.find("a").attr("onclick") || "";
		const match = onclick.match(/location\.href='([^']+)'/);
		if (match) registrationUrl = "https://runjapan.jp" + match[1];
		registrationOpen = true;
	} else {
		registrationOpen = false;
	}
	return {
		url,
		date,
		location,
		entryStart,
		entryEnd,
		website,
		images,
		description,
		info,
		notice,
		registrationOpen,
		registrationUrl,
	};
}

export { populateRaces, getInfo };
