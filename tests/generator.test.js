// generator.test.js
// Tests: generatePost() with mocked Anthropic client — no real API calls
import { generatePost } from "../src/generator.js";
import { describe, it, expect, vi, afterAll } from "vitest";
import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const mockApiResponse = JSON.parse(
	fs.readFileSync(
		path.resolve(__dirname, "./fixtures/mock-api-response.json"),
		"utf-8",
	),
);
const races = JSON.parse(
	fs.readFileSync(
		path.resolve(__dirname, "./fixtures/sample-races.json"),
		"utf-8",
	),
);
const prompts = JSON.parse(
	fs.readFileSync(path.resolve(__dirname, "../config/prompts.json"), "utf-8"),
);

const raceName = "Tohoku Food Marathon 2026";
const noopWriteHistory = () => {};

// Builds a mock client for non-race types — single API call
function makeMockClient(type) {
	return {
		messages: {
			create: vi.fn().mockResolvedValue({
				content: [{ text: JSON.stringify(mockApiResponse[type]) }],
			}),
		},
	};
}

// Race type needs two calls: chooseRace() then generatePost()
function makeMockClientRace() {
	return {
		messages: {
			create: vi
				.fn()
				.mockResolvedValueOnce({ content: [{ text: raceName }] })
				.mockResolvedValueOnce({
					content: [{ text: JSON.stringify(mockApiResponse.race) }],
				}),
		},
	};
}

afterAll(() => {
	fs.writeFileSync(
		path.resolve(__dirname, "../data/post_history.json"),
		JSON.stringify([], null, 2),
	);
});

describe("generatePost", () => {
	describe("race type", () => {
		it("returns all required fields", async () => {
			const client = makeMockClientRace();
			const result = await generatePost("race", { client, races, prompts, postedRaces: [], writeHistory: noopWriteHistory });
			expect(result.title).toBeDefined();
			expect(result.hook).toBeDefined();
			expect(result.contents).toBeInstanceOf(Array);
			expect(result.cta).toBeDefined();
			expect(result.description).toBeDefined();
			expect(result.hashtags).toBeInstanceOf(Array);
			expect(result.comments).toBeInstanceOf(Array);
		});

		it("contents items have subtitle and body", async () => {
			const client = makeMockClientRace();
			const result = await generatePost("race", { client, races, prompts, postedRaces: [], writeHistory: noopWriteHistory });
			expect(result.contents.length).toBeGreaterThanOrEqual(1);
			for (const page of result.contents) {
				expect(page.subtitle).toBeDefined();
				expect(page.body).toBeDefined();
			}
		});

		it("returns 2 comments", async () => {
			const client = makeMockClientRace();
			const result = await generatePost("race", { client, races, prompts, postedRaces: [], writeHistory: noopWriteHistory });
			expect(result.comments).toHaveLength(2);
		});

		it("calls API twice — once for race selection, once for generation", async () => {
			const client = makeMockClientRace();
			await generatePost("race", { client, races, prompts, postedRaces: [], writeHistory: noopWriteHistory });
			expect(client.messages.create).toHaveBeenCalledTimes(2);
		});

		it("calls generation API with correct model and max_tokens", async () => {
			const client = makeMockClientRace();
			await generatePost("race", { client, races, prompts, postedRaces: [], writeHistory: noopWriteHistory });
			expect(client.messages.create).toHaveBeenLastCalledWith(
				expect.objectContaining({
					model: "claude-sonnet-4-6",
					max_tokens: 4096,
				}),
			);
		});

		it("adds selected race to post history after generation", async () => {
			const client = makeMockClientRace();
			const mockWriteHistory = vi.fn();
			await generatePost("race", { client, races, prompts, postedRaces: [], writeHistory: mockWriteHistory });
			expect(mockWriteHistory).toHaveBeenCalledTimes(1);
			expect(mockWriteHistory).toHaveBeenCalledWith(
				expect.arrayContaining([raceName]),
			);
		});
	});

	describe("training type", () => {
		it("returns all required fields", async () => {
			const client = makeMockClient("training");
			const result = await generatePost("training", { client, races, prompts, postedRaces: [] });
			expect(result.title).toBeDefined();
			expect(result.hook).toBeDefined();
			expect(result.contents).toBeInstanceOf(Array);
			expect(result.cta).toBeDefined();
			expect(result.description).toBeDefined();
			expect(result.hashtags).toBeInstanceOf(Array);
			expect(result.comments).toBeInstanceOf(Array);
		});

		it("returns 3 comments", async () => {
			const client = makeMockClient("training");
			const result = await generatePost("training", { client, races, prompts, postedRaces: [] });
			expect(result.comments).toHaveLength(3);
		});

		it("calls API once", async () => {
			const client = makeMockClient("training");
			await generatePost("training", { client, races, prompts, postedRaces: [] });
			expect(client.messages.create).toHaveBeenCalledTimes(1);
		});
	});

	describe("nutritionSupplement type", () => {
		it("returns all required fields", async () => {
			const client = makeMockClient("nutritionSupplement");
			const result = await generatePost("nutritionSupplement", { client, races, prompts, postedRaces: [] });
			expect(result.title).toBeDefined();
			expect(result.hook).toBeDefined();
			expect(result.contents).toBeInstanceOf(Array);
			expect(result.cta).toBeDefined();
			expect(result.description).toBeDefined();
			expect(result.hashtags).toBeInstanceOf(Array);
			expect(result.comments).toBeInstanceOf(Array);
		});

		it("returns 2 comments", async () => {
			const client = makeMockClient("nutritionSupplement");
			const result = await generatePost("nutritionSupplement", { client, races, prompts, postedRaces: [] });
			expect(result.comments).toHaveLength(2);
		});

		it("calls API once", async () => {
			const client = makeMockClient("nutritionSupplement");
			await generatePost("nutritionSupplement", { client, races, prompts, postedRaces: [] });
			expect(client.messages.create).toHaveBeenCalledTimes(1);
		});
	});

	describe("wearable type", () => {
		it("returns all required fields", async () => {
			const client = makeMockClient("wearable");
			const result = await generatePost("wearable", { client, races, prompts, postedRaces: [] });
			expect(result.title).toBeDefined();
			expect(result.hook).toBeDefined();
			expect(result.contents).toBeInstanceOf(Array);
			expect(result.cta).toBeDefined();
			expect(result.description).toBeDefined();
			expect(result.hashtags).toBeInstanceOf(Array);
			expect(result.comments).toBeInstanceOf(Array);
		});

		it("returns 2 comments", async () => {
			const client = makeMockClient("wearable");
			const result = await generatePost("wearable", { client, races, prompts, postedRaces: [] });
			expect(result.comments).toHaveLength(2);
		});

		it("calls API once", async () => {
			const client = makeMockClient("wearable");
			await generatePost("wearable", { client, races, prompts, postedRaces: [] });
			expect(client.messages.create).toHaveBeenCalledTimes(1);
		});
	});

	describe("error handling", () => {
		it("throws with 'Post generation failed' when API throws", async () => {
			const client = {
				messages: {
					create: vi.fn().mockRejectedValue(new Error("network error")),
				},
			};
			await expect(
				generatePost("training", { client, races, prompts, postedRaces: [] }),
			).rejects.toThrow("Post generation failed");
		});

		it("throws with 'Incorrect type used' for invalid type", async () => {
			const client = makeMockClient("training");
			await expect(
				generatePost("invalid", { client, races, prompts, postedRaces: [] }),
			).rejects.toThrow("Incorrect type used");
		});
	});
});
