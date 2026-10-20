import { describe, it, expect } from 'vitest';
import { getRomanNumeral } from '../../utils/romanNumerals.js';
import { ALL_CHORD_TYPES } from '../../data/chordTypes.js';

const c = (root, type) => ({ root, type });

describe('getRomanNumeral', () => {
    it('uses upper case for major-family and lower case for minor-family chords', () => {
        expect(getRomanNumeral(c(0, 'major'))).toBe('I');
        expect(getRomanNumeral(c(2, 'minor'))).toBe('ii');
        expect(getRomanNumeral(c(7, 'dom7'))).toBe('V7');
        expect(getRomanNumeral(c(9, 'minor7'))).toBe('vi7');
    });
    it('marks altered degrees relative to Sa', () => {
        expect(getRomanNumeral(c(1, 'major'))).toBe('♭II');
        expect(getRomanNumeral(c(10, 'major'))).toBe('♭VII');
        expect(getRomanNumeral(c(6, 'major'))).toBe('♯IV');
    });
    it('uses standard symbols for diminished, half-diminished and augmented', () => {
        expect(getRomanNumeral(c(11, 'diminished'))).toBe('vii°');
        expect(getRomanNumeral(c(11, 'dim7'))).toBe('vii°7');
        expect(getRomanNumeral(c(11, 'm7b5'))).toBe('viiø7');
        expect(getRomanNumeral(c(0, 'augmented'))).toBe('I+');
    });
    it('covers every chord type', () => {
        for (const t of ALL_CHORD_TYPES) expect(getRomanNumeral(c(0, t.id))).toMatch(/^[Ii]/);
    });
});
