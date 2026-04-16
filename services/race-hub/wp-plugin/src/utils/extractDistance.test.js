// extractDistance.test.js
// Tests: parseKmFromString edge cases (via extractDistance) — these map directly
// to the 20+ edge cases documented in the race-hub checklist.
import { describe, it, expect } from 'vitest';
import extractDistance from './extractDistance.js';

// Build a mock race with specific Event/Eligibility keys
function makeRace(eligibility) {
	return { name: 'Test Race', info: { 'Event/Eligibility': eligibility ?? {} } };
}

// Extract just the distances from a single race
function parse(eligibility) {
	return extractDistance([makeRace(eligibility)])[0].distances;
}

describe('extractDistance', () => {
	describe('km parsing', () => {
		it('parses standard km', () => {
			expect(parse({ '42.195km': '' })).toEqual([42.195]);
		});

		it('parses km with space between number and unit', () => {
			expect(parse({ '16 km': '' })).toEqual([16]);
		});

		it('parses K shorthand (no m)', () => {
			expect(parse({ '70K': '' })).toEqual([70]);
		});

		it('parses KM uppercase', () => {
			expect(parse({ '14KM': '' })).toEqual([14]);
		});

		it('parses decimal km', () => {
			expect(parse({ '21.0975km': '' })).toEqual([21.0975]);
		});
	});

	describe('named distances', () => {
		it('Full Marathon with no number → 42.195', () => {
			expect(parse({ 'Full Marathon': '' })).toEqual([42.195]);
		});

		it('Half Marathon with no number → 21.0975', () => {
			expect(parse({ 'Half Marathon': '' })).toEqual([21.0975]);
		});

		it('named distance with digit present does NOT use named fallback', () => {
			// "Full Marathon 42km" has a digit so goes through normal parsing
			const distances = parse({ 'Full Marathon 42km': '' });
			expect(distances).toEqual([42]);
		});
	});

	describe('miles conversion', () => {
		it('converts miles to km', () => {
			const distances = parse({ '100mi': '' });
			expect(distances[0]).toBeCloseTo(160.93, 1);
		});

		it('prefers explicit km over miles when both present', () => {
			// "100mi (161km)" — km regex matches 161km first
			expect(parse({ '100mi (161km)': '' })).toEqual([161]);
		});
	});

	describe('metres conversion', () => {
		it('converts metres ≥ 100 to km', () => {
			expect(parse({ '500m': '' })).toEqual([0.5]);
		});

		it('ignores metres < 100 (not a race distance)', () => {
			expect(parse({ '50m': '' })).toEqual([]);
		});
	});

	describe('GPS and elevation stripping', () => {
		it('picks first km value — ignores GPS-corrected value in parens', () => {
			expect(parse({ '30km (GPS 24.5km)': '' })).toEqual([30]);
		});

		it('strips elevation before parsing km', () => {
			expect(parse({ '20km/±2100m': '' })).toEqual([20]);
		});

		it('strips D+ elevation notation', () => {
			expect(parse({ '50km D+3000m': '' })).toEqual([50]);
		});
	});

	describe('time-based events', () => {
		it('returns null for time-based events (no distance)', () => {
			expect(parse({ '4-Hours Team': '' })).toEqual([]);
		});

		it('returns null for 24-hour events', () => {
			expect(parse({ '24 Hours': '' })).toEqual([]);
		});
	});

	describe('normalisation', () => {
		it('handles newlines in key string', () => {
			expect(parse({ '42.195km\n(certified)': '' })).toEqual([42.195]);
		});

		it('handles full-width brackets → standard brackets', () => {
			// 【50K】51.2km — after normalization becomes [50K]51.2km, km match → 51.2
			expect(parse({ '【50K】51.2km': '' })).toEqual([51.2]);
		});

		it('handles Japanese comma/middle dot as separator', () => {
			// Should not break parsing
			const distances = parse({ 'Solo 18km、14KM': '' });
			expect(distances).toContain(18);
		});
	});

	describe('multiple keys and edge cases', () => {
		it('extracts distances from multiple eligibility keys', () => {
			const distances = parse({ '10km': '', '21km': '', 'Full Marathon': '' });
			expect(distances).toContain(10);
			expect(distances).toContain(21);
			expect(distances).toContain(42.195);
		});

		it('returns empty array when info missing', () => {
			const [race] = extractDistance([{ name: 'Test', info: {} }]);
			expect(race.distances).toEqual([]);
		});

		it('returns empty array when race has no info at all', () => {
			const [race] = extractDistance([{ name: 'Test' }]);
			expect(race.distances).toEqual([]);
		});

		it('preserves all other race fields', () => {
			const [race] = extractDistance([makeRace({ '42km': '' })]);
			expect(race.name).toBe('Test Race');
			expect(race.distances).toEqual([42]);
		});
	});
});
