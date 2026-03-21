import axios from "axios";
import * as cheerio from "cheerio";
import { writeFile } from "fs/promises";

const timeout = 10000;

async function populateRaces(limit) {
	const races = [];
	let pageIndex = 1;

	const baseUrl = "https://runjapan.jp/entry/runtes/smp/racesearchdetail.do";
	while (races.length < limit) {
		const pageUrl =
			pageIndex === 1
				? baseUrl + "?command=search"
				: baseUrl + `?command=page&pageIndex=${pageIndex}`;

		const res = await axios.get(pageUrl, {
			timeout,
		});

		// scrape page for races
		const $ = cheerio.load(res.data);
		const cards = [...$(".event-title a")];

		if (cards.length === 0) break;
		for (const el of cards) {
			try {
				const {
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
				} = await getInfo($, el);
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
		}

		pageIndex++;
	}

	const output = { last_updated: new Date().toISOString(), races };
	await writeFile("data/races.json", JSON.stringify(output, null, 2));
	return races;
}

async function getInfo($, el) {
	let date, location, entryPeriod, website;
	let entryStart = "";
	let entryEnd = "";

	const url = "https://runjapan.jp" + $(el).attr("href");
	const raceName = $(el).children("span").text().trim();

	// scrape details of each race
	const detailRes = await axios.get(url, {
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
		name: raceName,
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
