// utils.test.js
// Tests: cleanName() — the dedup function used to strip 【...】 entry tier suffixes
// before comparing race names against post_history. Had a real prod bug when mismatch
// between scraped name and stored name caused races to be re-posted.
import { cleanName } from '../src/generator.js';
import { describe, it, expect } from 'vitest';

describe('cleanName', () => {
	it('returns string unchanged when no 【 present', () => {
		expect(cleanName('Tokyo Marathon 2026')).toBe('Tokyo Marathon 2026');
	});

	it('strips 【...】 suffix when space before bracket', () => {
		expect(cleanName('Tokyo Marathon 2026 【先着】')).toBe('Tokyo Marathon 2026');
	});

	it('strips 【...】 suffix when no space before bracket', () => {
		expect(cleanName('Tokyo Marathon 2026【先着】')).toBe('Tokyo Marathon 2026');
	});

	it('strips from first 【 when multiple suffixes present', () => {
		expect(cleanName('Tokyo Marathon 2026 【先着】【定員あり】')).toBe('Tokyo Marathon 2026');
	});

	it('returns empty string when 【 is at position 0', () => {
		expect(cleanName('【先着】Tokyo Marathon 2026')).toBe('');
	});

	it('handles empty string', () => {
		expect(cleanName('')).toBe('');
	});

	it('leaves name with Japanese chars but no 【 unchanged', () => {
		expect(cleanName('東京マラソン2026')).toBe('東京マラソン2026');
	});
});
