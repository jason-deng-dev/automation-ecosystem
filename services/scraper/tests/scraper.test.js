// scraper.test.js
// Tests: validate scraper output shape, required fields, minimum race count
// Tested against sample-races.json fixture — shape/completeness, not exact content
import { describe, it, expect } from "vitest";
import { cleanRaces } from "../src/scraper.js";
import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { races } = JSON.parse(
	fs.readFileSync(
		path.resolve(__dirname, "./fixtures/sample-races.json"),
		"utf-8",
	),
);

const REQUIRED_FIELDS = [
	"name",
	"date",
	"location",
	"entryStart",
	"entryEnd",
	"website",
	"description",
	"registrationOpen",
	"registrationUrl",
];

describe("scraper output", () => {
	describe("top-level shape", () => {
		it("races is an array", () => {
			expect(races).toBeInstanceOf(Array);
		});

		it("contains at least 10 races", () => {
			expect(races.length).toBeGreaterThanOrEqual(10);
		});

		it("each race is an object", () => {
			for (const race of races) {
				expect(typeof race).toBe("object");
				expect(race).not.toBeNull();
			}
		});
	});

	describe("required fields", () => {
		it("every race has all required fields", () => {
			for (const race of races) {
				for (const field of REQUIRED_FIELDS) {
					expect(race, `race "${race.name}" missing field "${field}"`).toHaveProperty(field);
				}
			}
		});

		it("name is a non-empty string on every race", () => {
			for (const race of races) {
				expect(typeof race.name).toBe("string");
				expect(race.name.length).toBeGreaterThan(0);
			}
		});

		it("url is a non-empty string on every race", () => {
			for (const race of races) {
				expect(typeof race.url).toBe("string");
				expect(race.url.length).toBeGreaterThan(0);
			}
		});

		it("description is a string on every race (may be empty if not on page)", () => {
			for (const race of races) {
				expect(typeof race.description).toBe("string");
			}
		});

		it("images is an array on every race", () => {
			for (const race of races) {
				expect(race.images).toBeInstanceOf(Array);
			}
		});
	});

	describe("info and notice shape", () => {
		it("info is an object on every race", () => {
			for (const race of races) {
				expect(typeof race.info).toBe("object");
				expect(Array.isArray(race.info)).toBe(false);
				expect(race.info).not.toBeNull();
			}
		});

		it("notice is an array on every race", () => {
			for (const race of races) {
				expect(race.notice).toBeInstanceOf(Array);
			}
		});
	});

	describe("_zh translation fields", () => {
		const ZH_STRING_FIELDS = [
			"name_zh", "date_zh", "location_zh",
			"entryStart_zh", "entryEnd_zh", "description_zh",
		];

		it("every race has all _zh fields present (string or null)", () => {
			for (const race of races) {
				for (const field of ZH_STRING_FIELDS) {
					expect(race, `race "${race.name}" missing field "${field}"`).toHaveProperty(field);
					expect(
						typeof race[field] === "string" || race[field] === null,
						`race "${race.name}" field "${field}" is neither string nor null`
					).toBe(true);
				}
			}
		});

		it("every race has info_zh (object or null)", () => {
			for (const race of races) {
				expect(race, `race "${race.name}" missing field "info_zh"`).toHaveProperty("info_zh");
				expect(
					(typeof race.info_zh === "object" && !Array.isArray(race.info_zh)) || race.info_zh === null,
					`race "${race.name}" info_zh must be object or null`
				).toBe(true);
			}
		});

		it("every race has notice_zh (array or null)", () => {
			for (const race of races) {
				expect(race, `race "${race.name}" missing field "notice_zh"`).toHaveProperty("notice_zh");
				expect(
					Array.isArray(race.notice_zh) || race.notice_zh === null,
					`race "${race.name}" notice_zh must be array or null`
				).toBe(true);
			}
		});

		it("non-null _zh strings are non-empty", () => {
			for (const race of races) {
				for (const field of ZH_STRING_FIELDS) {
					if (race[field] !== null) {
						expect(race[field].length, `race "${race.name}" field "${field}" is empty string`).toBeGreaterThan(0);
					}
				}
			}
		});
	});

	describe("field formats", () => {
		it("registrationOpen is true, false, or null on every race", () => {
			for (const race of races) {
				expect(
					race.registrationOpen === true ||
					race.registrationOpen === false ||
					race.registrationOpen === null,
					`race "${race.name}" has invalid registrationOpen: ${race.registrationOpen}`
				).toBe(true);
			}
		});

		it("date field contains a year on every race", () => {
			for (const race of races) {
				if (race.date) {
					expect(race.date).toMatch(/20\d\d/);
				}
			}
		});

		it("url starts with https://runjapan.jp on every race", () => {
			for (const race of races) {
				expect(race.url).toMatch(/^https:\/\/runjapan\.jp/);
			}
		});

		it("registrationUrl starts with https:// or is null", () => {
			for (const race of races) {
				if (race.registrationUrl !== null) {
					expect(race.registrationUrl).toMatch(/^https:\/\//);
				}
			}
		});
	});
});

// ── cleanRaces ────────────────────────────────────────────────────────────────
// cleanRaces filters out past races by end date. Uses 2020 as "past" and 2099
// as "future" so tests stay deterministic regardless of when they run.

const makeRace = (date) => ({ name: 'Test Race', date, url: 'https://runjapan.jp/test' });

describe("cleanRaces", () => {
	it("keeps race with future date", () => {
		expect(cleanRaces([makeRace("January 1 2099")])).toHaveLength(1);
	});

	it("removes race with past date", () => {
		expect(cleanRaces([makeRace("January 1 2020")])).toHaveLength(0);
	});

	it("uses end date of a date range — removes past range", () => {
		expect(cleanRaces([makeRace("March 1 2020 - March 31 2020")])).toHaveLength(0);
	});

	it("uses end date of a date range — keeps future range", () => {
		expect(cleanRaces([makeRace("January 1 2099 - December 31 2099")])).toHaveLength(1);
	});

	it("keeps race with unparseable date (do not silently drop)", () => {
		expect(cleanRaces([makeRace("TBD")])).toHaveLength(1);
	});

	it("returns only future races from mixed array", () => {
		const result = cleanRaces([
			makeRace("January 1 2020"),
			makeRace("January 1 2099"),
		]);
		expect(result).toHaveLength(1);
		expect(result[0].date).toBe("January 1 2099");
	});

	it("returns empty array when all races are past", () => {
		expect(cleanRaces([makeRace("June 1 2020"), makeRace("December 31 2021")])).toHaveLength(0);
	});

	it("returns all races when all are future", () => {
		expect(cleanRaces([makeRace("January 1 2099"), makeRace("June 1 2099")])).toHaveLength(2);
	});
});
