import 'dotenv/config';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import * as cheerio from 'cheerio';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import * as deepl from 'deepl-node';
import { getExistingRaces, upsertRace, insertRunLog, upsertPipelineState } from './db/queries.js';

const jar = new CookieJar();
const client = wrapper(axios.create({ jar }));

axiosRetry(client, {
	retries: 3,
	retryDelay: axiosRetry.exponentialDelay,
	retryCondition: axiosRetry.isNetworkOrIdempotentRequestError,
});

const timeout = parseInt(process.env.RUNJAPAN_TIMEOUT) || 10000;

async function populateRaces(limit = null) {
	let outcome = 'success';
	let races_scraped = 0;
	let failure_count = 0;
	let failed_urls = [];
	let error_msg = null;

	await upsertPipelineState('running');

	const existingRacesMap = await getExistingRaces();

	const races = [];

	try {
		console.log('Starting race data refresh...');

		let pageIndex = 1;

		const baseUrl = process.env.RUNJAPAN_BASE_URL || 'https://runjapan.jp/entry/runtes/smp/racesearchdetail.do';
		const formBody = 'command=search&distanceClass=0&availableFlag=0&distanceUnit1=1&distanceUnit2=1';

		while (limit === null || races.length < limit) {
			const res =
				pageIndex === 1
					? await client.post(baseUrl, formBody, {
							timeout,
							headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
						})
					: await client.get(baseUrl + `?command=page&pageIndex=${pageIndex}`, {
							timeout,
						});

			const $ = cheerio.load(res.data);
			const cards = [...$('.event-title a')];
			if (cards.length === 0) break;
			for (const el of cards) {
				const url = 'https://runjapan.jp' + $(el).attr('href');
				if (!existingRacesMap.has(url)) {
					const name = $(el).children('span').text().trim();
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
						failure_count++;
						failed_urls.push(url);
					}
				}

				if (limit !== null && races.length >= limit) break;
			}
			pageIndex++;
		}
		// need to produce translated version of races
		const translatedRaces = await translateRaces(races);
		// merge new races with existing set (existing races already in DB — only new ones translated)
		const allRaces = [...existingRacesMap.values(), ...translatedRaces];

		if (limit === null && allRaces.length < 30) {
			outcome = 'failed';
			error_msg = `Only ${allRaces.length} races scraped — below threshold of 30, aborting upsert`;
			console.error(error_msg);
			return races;
		}

		const cleanedRaces = cleanRaces(allRaces);
		for (const race of cleanedRaces) {
			await upsertRace(race);
		}
		races_scraped = races.length;
		console.log(`Race data refresh complete — ${races.length} races saved`);
		return races;
	} catch (err) {
		outcome = 'failed';
		error_msg = err.message;
		console.error(`Scraper failed: ${err.message}`);
	} finally {
		await insertRunLog({
			outcome,
			racesScraped: races_scraped,
			failureCount: failure_count,
			failedUrls: failed_urls,
			errorMsg: error_msg,
		});
		console.log(`Run log saved — outcome: ${outcome}`);

		await upsertPipelineState(outcome === 'success' ? 'idle' : 'failed');
	}
}

async function getInfo(url) {
	let date, location, entryPeriod, website;
	let entryStart = '';
	let entryEnd = '';

	// scrape details of each race
	const detailRes = await client.get(url, {
		timeout,
	});
	const $detail = cheerio.load(detailRes.data);

	// has Date, Location, Entry Period, Web site link
	$detail('table.race-data tr').each((i, row) => {
		const label = $detail(row).find('th .lang.en').text().trim();
		const value = $detail(row).find('td span').first().text().trim();
		if (label === 'Date') date = value;
		if (label === 'Location') location = value;
		if (label === 'Entry Period') entryPeriod = value;

		if (label === 'Web Site') website = value;
	});

	if (entryPeriod) {
		[entryStart, entryEnd] = entryPeriod.replace(/\s+/g, ' ').trim().split(' - ');
	}

	const images = [];
	$detail('.race_img img').each((_i, img) => {
		images.push($detail(img).attr('src'));
	});

	const description = $detail('.race_text').text().trim();

	const info = {};
	$detail('#raceinfoID dt:not(.info-start dt):not(dd dl dt)').each((_i, dt) => {
		const label = $detail(dt).find('.lang.en').text().trim();
		const dd = $detail(dt).next('dd');
		const nestedDl = dd.find('dl');
		if (nestedDl.length) {
			const nested = {};
			nestedDl.find('dt').each((_j, ndt) => {
				const nLabel = $detail(ndt).text().trim();
				const nValue = $detail(ndt).next('dd').text().replace(/\s+/g, ' ').trim();
				if (nLabel) nested[nLabel] = nValue;
			});
			if (label) info[label] = nested;
		} else {
			const value = dd.text().replace(/\s+/g, ' ').trim();
			if (label) info[label] = value;
		}
	});

	const notice = [];
	function collectText(nodeEl) {
		$detail(nodeEl)
			.contents()
			.each((_j, node) => {
				if (node.type === 'text') {
					const text = node.data.replace(/\s+/g, ' ').trim();
					if (text) notice.push(text);
				} else if (node.name !== 'br' && node.name !== 'font') {
					collectText(node);
				}
			});
	}
	$detail('.event-info-bttom_list2 ul li').each((_i, li) => collectText(li));

	// tri-state: true = open, false = closed, null = unknown (button element missing — page structure changed)
	let registrationOpen = null;
	let registrationUrl = null;
	const entryBtn = $detail('.event-info-btn');
	if (!entryBtn.length) {
		registrationOpen = null;
	} else if (!entryBtn.find('.close-btn').length) {
		const onclick = entryBtn.find('a').attr('onclick') || '';
		const match = onclick.match(/location\.href='([^']+)'/);
		if (match) registrationUrl = 'https://runjapan.jp' + match[1];
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

function cleanRaces(races) {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	return races.filter((race) => {
		const cleaned = race.date.replace(/\s+/g, ' ').trim();
		const parts = cleaned.split(' - ');
		const endDate = new Date(parts[parts.length - 1].trim());
		return isNaN(endDate) || endDate >= today; // keep if unparseable (don't silently drop)
	});
}

async function translateRaces(races) {
	const authKey = process.env.DEEPL_API_KEY;
	const deeplClient = new deepl.DeepLClient(authKey);
	const translatedRaces = [];
	for (const race of races) {
		const { name, date, location, entryStart, entryEnd, description, info, notice } = race;

		// Flatten all strings into one array, track indices for reassembly
		const texts = [];
		const push = (str) => { texts.push(str); return texts.length - 1; };

		const i = {
			name: push(name),
			date: push(date),
			location: push(location),
			entryStart: push(entryStart),
			entryEnd: push(entryEnd),
			description: push(description),
			info: Object.entries(info).map(([key, value]) => {
				const keyIdx = push(key);
				if (typeof value === 'string') {
					return { keyIdx, valueIdx: push(value) };
				} else {
					return { keyIdx, nested: Object.entries(value).map(([k, v]) => ({ k: push(k), v: push(v) })) };
				}
			}),
			notice: notice.map(push),
		};

		// Single DeepL call for all strings in this race
		const results = await deeplClient.translateText(texts, null, 'ZH-HANS');
		const t = results.map((r) => r.text);

		// Reassemble translated fields
		const info_zh = Object.fromEntries(
			i.info.map(({ keyIdx, valueIdx, nested }) => {
				const key_zh = t[keyIdx];
				if (nested) {
					return [key_zh, Object.fromEntries(nested.map(({ k, v }) => [t[k], t[v]]))];
				}
				return [key_zh, t[valueIdx]];
			}),
		);

		translatedRaces.push({
			...race,
			name_zh: t[i.name],
			date_zh: t[i.date],
			location_zh: t[i.location],
			entryStart_zh: t[i.entryStart],
			entryEnd_zh: t[i.entryEnd],
			description_zh: t[i.description],
			info_zh,
			notice_zh: i.notice.map((idx) => t[idx]),
		});
	}
	return translatedRaces;
}

export { populateRaces, getInfo };
