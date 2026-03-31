import { calculatePrice } from '../src/services/pricing';
import { describe, it, expect } from 'vitest';

describe("calculatePrice", () => {
	describe("valid categories (price=1000)", () => {
		it("Running Gear", () => {
			expect(calculatePrice(1000, "Running Gear")).toEqual(175);
		});
		it("Training", () => {
			expect(calculatePrice(1000, "Training")).toEqual(205);
		});
		it("Nutrition & Supplements", () => {
			expect(calculatePrice(1000, "Nutrition & Supplements")).toEqual(120);
		});
		it("Recovery & Care", () => {
			expect(calculatePrice(1000, "Recovery & Care")).toEqual(175);
		});
		it("Sportswear", () => {
			expect(calculatePrice(1000, "Sportswear")).toEqual(205);
		});
	});

	describe("edge cases", () => {
		it("price=0 returns just shipping rounded to nearest 5", () => {
			expect(calculatePrice(0, "Running Gear")).toEqual(120);
		});
		it("large price rounds up correctly", () => {
			expect(calculatePrice(100000, "Running Gear")).toEqual(5370);
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
