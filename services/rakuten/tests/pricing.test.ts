import { describe, it, expect, vi, beforeAll } from 'vitest';

vi.mock('../src/db/queries', () => ({
	getConfig: vi.fn().mockResolvedValue({
		yenToYuan: 0.043,
		markupPercent: 0,
		searchFillThreshold: 10,
		productsPerCategory: 30,
	}),
}));

const { initPricing, calculatePrice } = await import('../src/services/pricing');

beforeAll(async () => {
	await initPricing();
});

describe("calculatePrice", () => {
	describe("JPY → CNY conversion (rate=0.043)", () => {
		it("price=1000 → ¥45 CNY (rounded up to nearest 5)", () => {
			// 1000 * 0.043 = 43 → rounds up to 45
			expect(calculatePrice(1000)).toEqual(45);
		});
		it("price=5000 → ¥215 CNY", () => {
			// 5000 * 0.043 = 215 → already on 5
			expect(calculatePrice(5000)).toEqual(215);
		});
	});

	describe("edge cases", () => {
		it("price=0 returns 0", () => {
			expect(calculatePrice(0)).toEqual(0);
		});
		it("large price rounds up correctly", () => {
			// 100000 * 0.043 = 4300 → already on 5
			expect(calculatePrice(100000)).toEqual(4300);
		});
	});
});
