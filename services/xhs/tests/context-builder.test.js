// context-builder.test.js
// Tests: each post type builds correct context string via buildContext()
import { buildContext } from "../src/generator";
import { describe, it, expect } from "vitest";
import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const races = JSON.parse(
	fs.readFileSync(
		path.resolve(__dirname, "./fixtures/scraper/races.json"),
		"utf-8",
	),
);
const prompts = JSON.parse(
	fs.readFileSync(path.resolve(__dirname, "../config/prompts.json"), "utf-8"),
);

const raceName = "Tohoku Food Marathon 2026";

describe("buildContext", () => {
	describe("race type", () => {
		it("substitutes race name into context", () => {
			const result = buildContext("race", prompts, races, raceName);
			expect(result.contextToUse).toContain(raceName);
		});

		it("substitutes race date into context", () => {
			const result = buildContext("race", prompts, races, raceName);
			expect(result.contextToUse).toContain("April 19 2026");
		});

		it("substitutes race location into context", () => {
			const result = buildContext("race", prompts, races, raceName);
			expect(result.contextToUse).toContain("Tome City (Miyagi) , Japan");
		});

		it("returns comments array with 2 items", () => {
			const result = buildContext("race", prompts, races, raceName);
			expect(result.comments).toHaveLength(2);
		});

		it("does not contain unfilled placeholders", () => {
			const result = buildContext("race", prompts, races, raceName);
			expect(result.contextToUse).not.toContain("race.name");
			expect(result.contextToUse).not.toContain("race.date");
			expect(result.contextToUse).not.toContain("race.location");
		});
	});

	describe("training type", () => {
		it("includes training post type marker", () => {
			const result = buildContext("training", prompts, races, null);
			expect(result.contextToUse).toContain("Post type: Training Science");
		});

		it("appends CTA to context", () => {
			const result = buildContext("training", prompts, races, null);
			expect(result.contextToUse).toContain("CTA: Direct readers to");
		});

		it("injects current month into context", () => {
			const result = buildContext("training", prompts, races, null);
			const month = new Date().toLocaleString("en-US", { month: "long" });
			expect(result.contextToUse).toContain(month);
		});

		it("returns comments array with at least 1 item", () => {
			const result = buildContext("training", prompts, races, null);
			expect(result.comments.length).toBeGreaterThan(0);
		});
	});

	describe("nutritionSupplement type", () => {
		it("includes nutrition post type marker", () => {
			const result = buildContext("nutritionSupplement", prompts, races, null);
			expect(result.contextToUse).toContain("Post type: Nutrition / Supplement");
		});

		it("appends CTA to context", () => {
			const result = buildContext("nutritionSupplement", prompts, races, null);
			expect(result.contextToUse).toContain("CTA: Direct readers to");
		});

		it("injects current month into context", () => {
			const result = buildContext("nutritionSupplement", prompts, races, null);
			const month = new Date().toLocaleString("en-US", { month: "long" });
			expect(result.contextToUse).toContain(month);
		});

		it("returns comments array with at least 1 item", () => {
			const result = buildContext("nutritionSupplement", prompts, races, null);
			expect(result.comments.length).toBeGreaterThan(0);
		});
	});

	describe("wearable type", () => {
		it("includes wearable post type marker", () => {
			const result = buildContext("wearable", prompts, races, null);
			expect(result.contextToUse).toContain("Post type: Wearables / Equipment");
		});

		it("appends CTA to context", () => {
			const result = buildContext("wearable", prompts, races, null);
			expect(result.contextToUse).toContain("CTA: Direct readers to");
		});

		it("injects current month into context", () => {
			const result = buildContext("wearable", prompts, races, null);
			const month = new Date().toLocaleString("en-US", { month: "long" });
			expect(result.contextToUse).toContain(month);
		});

		it("returns comments array with at least 1 item", () => {
			const result = buildContext("wearable", prompts, races, null);
			expect(result.comments.length).toBeGreaterThan(0);
		});
	});

	describe("invalid type", () => {
		it("throws on unknown type", () => {
			expect(() => buildContext("invalid", prompts, races, null)).toThrow(
				"Incorrect type used",
			);
		});
	});
});
