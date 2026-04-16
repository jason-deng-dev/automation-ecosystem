// extractDate.test.js
// Tests: extractDate() — parses race date string into JS Date + extracts month/year
// for use in date range and month filtering in the SPA.
import { describe, it, expect } from 'vitest';
import extractDate from './extractDate.js';

describe('extractDate', () => {
	it('parses "March 29 2026" — month is 0-indexed', () => {
		const [race] = extractDate([{ name: 'Test', date: 'March 29 2026' }]);
		expect(race.dateObj).toBeInstanceOf(Date);
		expect(race.month).toBe(2); // March = index 2
		expect(race.year).toBe(2026);
	});

	it('parses "January 1 2025"', () => {
		const [race] = extractDate([{ name: 'Test', date: 'January 1 2025' }]);
		expect(race.month).toBe(0);
		expect(race.year).toBe(2025);
	});

	it('parses "December 31 2026"', () => {
		const [race] = extractDate([{ name: 'Test', date: 'December 31 2026' }]);
		expect(race.month).toBe(11);
		expect(race.year).toBe(2026);
	});

	it('returns null dateObj for null date', () => {
		const [race] = extractDate([{ name: 'Test', date: null }]);
		expect(race.dateObj).toBeNull();
		expect(race.month).toBeNull();
		expect(race.year).toBeNull();
	});

	it('returns null dateObj for invalid date string', () => {
		const [race] = extractDate([{ name: 'Test', date: 'TBD' }]);
		expect(race.dateObj).toBeNull();
		expect(race.month).toBeNull();
		expect(race.year).toBeNull();
	});

	it('returns null dateObj for undefined date', () => {
		const [race] = extractDate([{ name: 'Test' }]);
		expect(race.dateObj).toBeNull();
	});

	it('processes multiple races independently', () => {
		const races = extractDate([
			{ name: 'Race A', date: 'April 10 2026' },
			{ name: 'Race B', date: null },
			{ name: 'Race C', date: 'November 3 2026' },
		]);
		expect(races[0].month).toBe(3);
		expect(races[1].dateObj).toBeNull();
		expect(races[2].month).toBe(10);
	});

	it('preserves all other race fields', () => {
		const [race] = extractDate([{ name: 'Osaka Marathon', date: 'March 1 2026', location: 'Osaka' }]);
		expect(race.name).toBe('Osaka Marathon');
		expect(race.location).toBe('Osaka');
		expect(race.year).toBe(2026);
	});
});
