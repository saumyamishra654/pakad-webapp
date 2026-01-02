/**
 * Tests for noteHelpers.js
 * Covers conversion functions, pattern manipulation, and note utilities
 */

import { describe, it, expect } from 'vitest';
import {
    SWAR_NAMES,
    CARNATIC_LABELS,
    getDisplayLabels,
    pitchClassToFrequency,
    pitchClassToMidi,
    applyTonic,
    rotateBinary,
    patternToString,
    countNotes,
    patternToPitchClasses,
    pitchClassesToPattern,
    isSubset,
    hammingDistance,
    getSwarLabel,
    getWesternNoteName
} from '../../utils/noteHelpers.js';

describe('noteHelpers', () => {
    describe('getDisplayLabels', () => {
        it('returns Hindustani labels when isCarnatic is false', () => {
            const labels = getDisplayLabels(false);
            expect(labels).toEqual(SWAR_NAMES);
            expect(labels[0]).toBe('Sa');
            expect(labels[7]).toBe('Pa');
        });

        it('returns Carnatic labels when isCarnatic is true', () => {
            const labels = getDisplayLabels(true);
            expect(labels).toEqual(CARNATIC_LABELS);
            expect(labels[0]).toBe('S');
            expect(labels[7]).toBe('P');
        });
    });

    describe('pitchClassToFrequency', () => {
        it('returns 440Hz for A4 (pitch class 9, octave 4)', () => {
            const freq = pitchClassToFrequency(9, 4);
            expect(freq).toBeCloseTo(440, 2);
        });

        it('returns ~261.63Hz for C4 (middle C)', () => {
            const freq = pitchClassToFrequency(0, 4);
            expect(freq).toBeCloseTo(261.63, 1);
        });

        it('doubles frequency for each octave', () => {
            const c4 = pitchClassToFrequency(0, 4);
            const c5 = pitchClassToFrequency(0, 5);
            expect(c5).toBeCloseTo(c4 * 2, 1);
        });

        it('halves frequency for lower octave', () => {
            const c4 = pitchClassToFrequency(0, 4);
            const c3 = pitchClassToFrequency(0, 3);
            expect(c3).toBeCloseTo(c4 / 2, 1);
        });
    });

    describe('pitchClassToMidi', () => {
        it('returns 60 for C4', () => {
            expect(pitchClassToMidi(0, 4)).toBe(60);
        });

        it('returns 69 for A4', () => {
            expect(pitchClassToMidi(9, 4)).toBe(69);
        });

        it('returns 48 for C3', () => {
            expect(pitchClassToMidi(0, 3)).toBe(48);
        });

        it('returns 72 for C5', () => {
            expect(pitchClassToMidi(0, 5)).toBe(72);
        });
    });

    describe('applyTonic', () => {
        it('returns same pitch class when tonic is 0 (C)', () => {
            expect(applyTonic(0, 0)).toBe(0);
            expect(applyTonic(4, 0)).toBe(4);
        });

        it('applies tonic offset correctly', () => {
            // Sa (0) with tonic 2 (D) = D (absolute pitch 2)
            expect(applyTonic(0, 2)).toBe(2);
            // Pa (7) with tonic 2 (D) = A (absolute pitch 9)
            expect(applyTonic(7, 2)).toBe(9);
        });

        it('wraps around 12', () => {
            // Ni (11) with tonic 2 (D) = C# (absolute pitch 1)
            expect(applyTonic(11, 2)).toBe(1);
        });

        it('handles negative results correctly', () => {
            expect(applyTonic(-1, 0)).toBe(11);
        });
    });

    describe('rotateBinary', () => {
        it('rotates pattern by given steps', () => {
            const pattern = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            const rotated = rotateBinary(pattern, 2);
            expect(rotated[2]).toBe(1);
            expect(rotated[0]).toBe(0);
        });

        it('returns original when steps is 0', () => {
            const pattern = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0];
            const rotated = rotateBinary(pattern, 0);
            expect(rotated).toEqual(pattern);
        });

        it('wraps around at 12', () => {
            const pattern = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1];
            const rotated = rotateBinary(pattern, 1);
            expect(rotated[0]).toBe(1);
        });
    });

    describe('patternToString', () => {
        it('converts pattern to binary string', () => {
            const pattern = [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1];
            expect(patternToString(pattern)).toBe('101011010101');
        });

        it('handles empty pattern (all zeros)', () => {
            const pattern = new Array(12).fill(0);
            expect(patternToString(pattern)).toBe('000000000000');
        });

        it('handles full pattern (all ones)', () => {
            const pattern = new Array(12).fill(1);
            expect(patternToString(pattern)).toBe('111111111111');
        });
    });

    describe('countNotes', () => {
        it('counts active notes in pattern', () => {
            const heptatonic = [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1]; // 7 notes
            expect(countNotes(heptatonic)).toBe(7);
        });

        it('returns 0 for empty pattern', () => {
            expect(countNotes(new Array(12).fill(0))).toBe(0);
        });

        it('returns 12 for chromatic', () => {
            expect(countNotes(new Array(12).fill(1))).toBe(12);
        });
    });

    describe('patternToPitchClasses', () => {
        it('returns indices of active notes', () => {
            const pentatonic = [1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0];
            expect(patternToPitchClasses(pentatonic)).toEqual([0, 2, 4, 7, 9]);
        });

        it('returns empty array for empty pattern', () => {
            expect(patternToPitchClasses(new Array(12).fill(0))).toEqual([]);
        });
    });

    describe('pitchClassesToPattern', () => {
        it('creates pattern from pitch classes', () => {
            const pitchClasses = [0, 2, 4, 7, 9];
            const pattern = pitchClassesToPattern(pitchClasses);
            expect(pattern[0]).toBe(1);
            expect(pattern[2]).toBe(1);
            expect(pattern[4]).toBe(1);
            expect(pattern[7]).toBe(1);
            expect(pattern[9]).toBe(1);
            expect(pattern[1]).toBe(0);
        });

        it('handles negative pitch classes (wraps around)', () => {
            const pattern = pitchClassesToPattern([-1]);
            expect(pattern[11]).toBe(1);
        });

        it('round-trips with patternToPitchClasses', () => {
            const original = [0, 3, 5, 7, 10];
            const pattern = pitchClassesToPattern(original);
            const result = patternToPitchClasses(pattern);
            expect(result).toEqual(original);
        });
    });

    describe('isSubset', () => {
        it('returns true when A is a subset of B', () => {
            const pentatonic = [1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0];
            const heptatonic = [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1];
            expect(isSubset(pentatonic, heptatonic)).toBe(true);
        });

        it('returns false when A has notes not in B', () => {
            const patternA = [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            const patternB = [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            expect(isSubset(patternA, patternB)).toBe(false);
        });

        it('returns true for identical patterns', () => {
            const pattern = [1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0];
            expect(isSubset(pattern, pattern)).toBe(true);
        });
    });

    describe('hammingDistance', () => {
        it('returns 0 for identical patterns', () => {
            const pattern = [1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0];
            expect(hammingDistance(pattern, pattern)).toBe(0);
        });

        it('counts differing positions', () => {
            const a = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            const b = [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            expect(hammingDistance(a, b)).toBe(2);
        });

        it('returns 12 for completely different patterns', () => {
            const a = new Array(12).fill(1);
            const b = new Array(12).fill(0);
            expect(hammingDistance(a, b)).toBe(12);
        });
    });

    describe('getSwarLabel', () => {
        it('returns correct Hindustani label', () => {
            expect(getSwarLabel(0, false)).toBe('Sa');
            expect(getSwarLabel(7, false)).toBe('Pa');
        });

        it('returns correct Carnatic label', () => {
            expect(getSwarLabel(0, true)).toBe('S');
            expect(getSwarLabel(7, true)).toBe('P');
        });

        it('handles wrap-around', () => {
            expect(getSwarLabel(12, false)).toBe('Sa');
            expect(getSwarLabel(-1, false)).toBe('Ni');
        });
    });

    describe('getWesternNoteName', () => {
        it('returns correct note with no tonic offset', () => {
            expect(getWesternNoteName(0, 0)).toBe('C');
            expect(getWesternNoteName(4, 0)).toBe('E');
        });

        it('applies tonic offset', () => {
            // Sa (0) with tonic D (2) = D
            expect(getWesternNoteName(0, 2)).toBe('D');
        });

        it('uses flats when preferFlats is true', () => {
            expect(getWesternNoteName(1, 0, true)).toBe('D♭');
            expect(getWesternNoteName(1, 0, false)).toBe('C#');
        });
    });
});
