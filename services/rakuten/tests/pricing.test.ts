import { calculatePrice } from '../src/services/pricing';
import { describe, it, expect } from 'vitest';

describe("calculatePrice", () => {
	describe("valid categories (price=1000)", () => {
		it("Running Gear", () => {
			expect(calculatePrice(1000, "Running Gear")).toEqual(55);
		});
		it("Training", () => {
			expect(calculatePrice(1000, "Training")).toEqual(55);
		});
		it("Nutrition & Supplements", () => {
			expect(calculatePrice(1000, "Nutrition & Supplements")).toEqual(55);
		});
		it("Recovery & Care", () => {
			expect(calculatePrice(1000, "Recovery & Care")).toEqual(55);
		});
		it("Sportswear", () => {
			expect(calculatePrice(1000, "Sportswear")).toEqual(55);
		});
	});

	describe("edge cases", () => {
		it("price=0 returns 0", () => {
			expect(calculatePrice(0, "Running Gear")).toEqual(0);
		});
		it("large price rounds up correctly", () => {
			// 100000 * 1.22 * 0.043 = 5246 → rounds to 5250
			expect(calculatePrice(100000, "Running Gear")).toEqual(5250);
		});
	});

	describe("invalid category", () => {
		it("misspelled category returns NaN", () => {
			expect(calculatePrice(1000, "RunningGear")).toBeNaN();
		});
		it("empty string returns NaN", () => {
			expect(calculatePrice(1000, "")).toBeNaN();
		});
	});
});
