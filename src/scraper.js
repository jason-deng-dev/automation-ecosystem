import axios from 'axios';
import * as cheerio from 'cheerio';
const timeout = 10000;

async function populateRaces(limit) {
	const races = [];
	let pageIndex = 1;

	const baseUrl = 'https://runjapan.jp/entry/runtes/smp/racesearchdetail.do';
	const firstPage = baseUrl + '?command=search';
	const incrementUrl = baseUrl + `?command=page&pageIndex=${pageIndex}`;

	while (races.length < limit) {
		const res = await axios.get(firstPage, {
			timeout,
		});

		// scrape page for races
		const $ = cheerio.load(res.data);
		const cards = [...$('.event-title a')].slice(0, 1);
		

		for (const el of cards) {
            let date, location, entryPeriod, website;
			const url = 'https://runjapan.jp' + $(el).attr('href');
			const name = $(el).children('span').text().trim();

			// scrape details of each race
			const detailRes = await axios.get(url, {
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


			const [entryStart, entryEnd] = entryPeriod.replace(/\s+/g, ' ').trim().split(' - ');
			races.push({ name, url, date, location, entryStart, entryEnd, website });
		}

		break;

		/*
        if res contains zero race cards => break

        for each race card on page:
            fetch detail page information
            extract info:
            push to races[]
            if race.length === limit => stop
        pageIndex++
        */
	}

	console.log(races);
}

populateRaces(1);
