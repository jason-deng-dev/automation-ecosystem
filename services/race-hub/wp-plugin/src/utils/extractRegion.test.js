// extractRegion.test.js
// Tests: extractRegion() — extracts prefecture from location string and maps to region.
// Location format from scraper: "City (Prefecture) , Japan"
import { describe, it, expect } from 'vitest';
import extractRegion from './extractRegion.js';

describe('extractRegion', () => {
	describe('Kanto / Fuji', () => {
		it('maps Tokyo', () => {
			const [race] = extractRegion([{ location: 'Shinjuku (Tokyo) , Japan' }]);
			expect(race.region).toBe('Kanto / Fuji');
		});

		it('maps Kanagawa', () => {
			const [race] = extractRegion([{ location: 'Yokohama (Kanagawa) , Japan' }]);
			expect(race.region).toBe('Kanto / Fuji');
		});

		it('maps Shizuoka', () => {
			const [race] = extractRegion([{ location: 'Fuji City (Shizuoka) , Japan' }]);
			expect(race.region).toBe('Kanto / Fuji');
		});
	});

	describe('Kansai', () => {
		it('maps Osaka', () => {
			const [race] = extractRegion([{ location: 'Osaka City (Osaka) , Japan' }]);
			expect(race.region).toBe('Kansai');
		});

		it('maps Kyoto', () => {
			const [race] = extractRegion([{ location: 'Kyoto City (Kyoto) , Japan' }]);
			expect(race.region).toBe('Kansai');
		});
	});

	describe('Hokkaido / Tohoku', () => {
		it('maps Hokkaido', () => {
			const [race] = extractRegion([{ location: 'Sapporo (Hokkaido) , Japan' }]);
			expect(race.region).toBe('Hokkaido / Tohoku');
		});

		it('maps Miyagi', () => {
			const [race] = extractRegion([{ location: 'Sendai (Miyagi) , Japan' }]);
			expect(race.region).toBe('Hokkaido / Tohoku');
		});
	});

	describe('Kyushu / Okinawa', () => {
		it('maps Fukuoka', () => {
			const [race] = extractRegion([{ location: 'Fukuoka City (Fukuoka) , Japan' }]);
			expect(race.region).toBe('Kyushu / Okinawa');
		});

		it('maps Okinawa', () => {
			const [race] = extractRegion([{ location: 'Naha (Okinawa) , Japan' }]);
			expect(race.region).toBe('Kyushu / Okinawa');
		});
	});

	describe('Chugoku / Shikoku', () => {
		it('maps Hiroshima', () => {
			const [race] = extractRegion([{ location: 'Hiroshima City (Hiroshima) , Japan' }]);
			expect(race.region).toBe('Chugoku / Shikoku');
		});
	});

	describe('Chubu / Hokuriku', () => {
		it('maps Nagano', () => {
			const [race] = extractRegion([{ location: 'Nagano City (Nagano) , Japan' }]);
			expect(race.region).toBe('Chubu / Hokuriku');
		});
	});

	describe('null / unknown cases', () => {
		it('returns null for unknown prefecture', () => {
			const [race] = extractRegion([{ location: 'City (Unknown) , Japan' }]);
			expect(race.region).toBeNull();
		});

		it('returns null when no parentheses in location', () => {
			const [race] = extractRegion([{ location: 'Japan' }]);
			expect(race.region).toBeNull();
		});

		it('returns null for null location', () => {
			const [race] = extractRegion([{ location: null }]);
			expect(race.region).toBeNull();
		});

		it('returns null for undefined location', () => {
			const [race] = extractRegion([{ name: 'Test' }]);
			expect(race.region).toBeNull();
		});
	});

	describe('multiple races', () => {
		it('processes all races in array', () => {
			const races = extractRegion([
				{ location: 'Tokyo (Tokyo) , Japan' },
				{ location: 'Osaka City (Osaka) , Japan' },
				{ location: null },
			]);
			expect(races[0].region).toBe('Kanto / Fuji');
			expect(races[1].region).toBe('Kansai');
			expect(races[2].region).toBeNull();
		});
	});
});
