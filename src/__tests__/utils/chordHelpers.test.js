/**
 * Tests for chordHelpers.js
 * Covers chord detection, filtering, notation, and voicing
 */

import { describe, it, expect } from 'vitest';
import {
    isChordInPattern,
    countOutsideNotes,
    getAvailableChords,
    getChordsOutsidePattern,
    filterChordsByNote,
    countChordsByType,
    getChordNotation,
    arrangeChordNotes
} from '../../utils/chordHelpers.js';

// Common test patterns
const MAJOR_SCALE = [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1]; // C major: C D E F G A B
const PENTATONIC = [1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0];  // C D E G A
const CHROMATIC = new Array(12).fill(1);

// Common chord intervals
const MAJOR_TRIAD = [0, 4, 7];     // Root, major 3rd, perfect 5th
const MINOR_TRIAD = [0, 3, 7];     // Root, minor 3rd, perfect 5th
const DIM_TRIAD = [0, 3, 6];       // Root, minor 3rd, diminished 5th

describe('chordHelpers', () => {
    describe('isChordInPattern', () => {
        it('returns true when all chord notes are in pattern', () => {
            // C major chord (C, E, G) in C major scale
            expect(isChordInPattern(0, MAJOR_TRIAD, MAJOR_SCALE)).toBe(true);
        });

        it('returns false when a chord note is outside pattern', () => {
            // C# major chord has notes not in C major scale
            expect(isChordInPattern(1, MAJOR_TRIAD, MAJOR_SCALE)).toBe(false);
        });

        it('works with minor triads', () => {
            // A minor (A, C, E) in C major scale
            expect(isChordInPattern(9, MINOR_TRIAD, MAJOR_SCALE)).toBe(true);
            // C minor (C, Eb, G) has Eb not in C major
            expect(isChordInPattern(0, MINOR_TRIAD, MAJOR_SCALE)).toBe(false);
        });

        it('returns true for all chords in chromatic scale', () => {
            expect(isChordInPattern(0, MAJOR_TRIAD, CHROMATIC)).toBe(true);
            expect(isChordInPattern(5, DIM_TRIAD, CHROMATIC)).toBe(true);
        });
    });

    describe('countOutsideNotes', () => {
        it('returns 0 when all notes are in pattern', () => {
            expect(countOutsideNotes(0, MAJOR_TRIAD, MAJOR_SCALE)).toBe(0);
        });

        it('counts notes outside pattern correctly', () => {
            // C minor (C, Eb, G) - Eb is outside C major scale
            expect(countOutsideNotes(0, MINOR_TRIAD, MAJOR_SCALE)).toBe(1);
        });

        it('counts multiple outside notes', () => {
            // C# major (C#, F, G#) - C# and G# are outside C major
            expect(countOutsideNotes(1, MAJOR_TRIAD, MAJOR_SCALE)).toBe(2);
        });
    });

    describe('getAvailableChords', () => {
        it('returns array of chord objects', () => {
            const chords = getAvailableChords(MAJOR_SCALE, 'all', false);
            expect(Array.isArray(chords)).toBe(true);
            expect(chords.length).toBeGreaterThan(0);
        });

        it('each chord has required properties', () => {
            const chords = getAvailableChords(MAJOR_SCALE, 'all', false);
            const chord = chords[0];
            expect(chord).toHaveProperty('root');
            expect(chord).toHaveProperty('notes');
            expect(chord).toHaveProperty('intervals');
            expect(typeof chord.root).toBe('number');
            expect(Array.isArray(chord.notes)).toBe(true);
        });

        it('includes more chords when includeExtended is true', () => {
            const basic = getAvailableChords(MAJOR_SCALE, 'all', false);
            const extended = getAvailableChords(MAJOR_SCALE, 'all', true);
            expect(extended.length).toBeGreaterThanOrEqual(basic.length);
        });

        it('returns fewer chords for pentatonic vs major scale', () => {
            const pentaChords = getAvailableChords(PENTATONIC, 'all', false);
            const majorChords = getAvailableChords(MAJOR_SCALE, 'all', false);
            expect(pentaChords.length).toBeLessThanOrEqual(majorChords.length);
        });
    });

    describe('getChordsOutsidePattern', () => {
        it('returns chords with notes outside the pattern', () => {
            const outside = getChordsOutsidePattern(MAJOR_SCALE, 1, 1, 'all', false);
            expect(Array.isArray(outside)).toBe(true);
        });

        it('respects minOutside and maxOutside bounds', () => {
            const outside = getChordsOutsidePattern(MAJOR_SCALE, 1, 2, 'all', false);
            outside.forEach(chord => {
                expect(chord.outsideCount).toBeGreaterThanOrEqual(1);
                expect(chord.outsideCount).toBeLessThanOrEqual(2);
            });
        });

        it('returns empty for chromatic scale (all notes present)', () => {
            const outside = getChordsOutsidePattern(CHROMATIC, 1, 3, 'all', false);
            expect(outside.length).toBe(0);
        });
    });

    describe('filterChordsByNote', () => {
        const testChords = [
            { root: 0, notes: [0, 4, 7] },   // C major
            { root: 2, notes: [2, 5, 9] },   // D minor
            { root: 4, notes: [4, 7, 11] },  // E minor
        ];

        it('filters by root note in "root" mode', () => {
            const filtered = filterChordsByNote(testChords, 0, 'root');
            expect(filtered.length).toBe(1);
            expect(filtered[0].root).toBe(0);
        });

        it('filters by any note in "any" mode', () => {
            // Note 7 (G) is in C major and E minor
            const filtered = filterChordsByNote(testChords, 7, 'any');
            expect(filtered.length).toBe(2);
        });

        it('returns empty array when no matches', () => {
            const filtered = filterChordsByNote(testChords, 10, 'root');
            expect(filtered.length).toBe(0);
        });
    });

    describe('countChordsByType', () => {
        const testChords = [
            { type: 'major' },
            { type: 'major' },
            { type: 'minor' },
        ];

        it('counts chords by type correctly', () => {
            const counts = countChordsByType(testChords);
            expect(counts['major']).toBe(2);
            expect(counts['minor']).toBe(1);
        });

        it('returns empty object for empty array', () => {
            const counts = countChordsByType([]);
            expect(Object.keys(counts).length).toBe(0);
        });
    });

    describe('getChordNotation', () => {
        it('returns Western notation with tonic offset', () => {
            const chord = { root: 0, type: { symbol: '' } };
            // Root 0 (Sa) with tonic 0 (C) = C
            expect(getChordNotation(chord, 0)).toContain('C');
        });

        it('applies tonic offset correctly', () => {
            const chord = { root: 0, type: { symbol: 'maj' } };
            // Sa with tonic 2 (D) = D
            const notation = getChordNotation(chord, 2);
            expect(notation).toContain('D');
        });

        it('includes chord type symbol', () => {
            // getChordNotation uses chord.type as a string key, not chord.type.symbol
            const chord = { root: 0, type: 'minor' };
            const notation = getChordNotation(chord, 0);
            expect(notation).toBe('Cm');
        });
    });

    describe('arrangeChordNotes', () => {
        it('returns array of note objects with octave info', () => {
            const notes = [0, 4, 7]; // C E G
            const arranged = arrangeChordNotes(notes, 4);
            expect(Array.isArray(arranged)).toBe(true);
            arranged.forEach(note => {
                expect(note).toHaveProperty('noteIndex');
                expect(note).toHaveProperty('octave');
                expect(note).toHaveProperty('midiNote');
            });
        });

        it('arranges notes in ascending order across octaves', () => {
            const notes = [0, 4, 7];
            const arranged = arrangeChordNotes(notes, 4);
            // Check that MIDI notes are ascending
            for (let i = 1; i < arranged.length; i++) {
                expect(arranged[i].midiNote).toBeGreaterThan(arranged[i - 1].midiNote);
            }
        });

        it('uses specified base octave', () => {
            const notes = [0];
            const arranged = arrangeChordNotes(notes, 5);
            expect(arranged[0].octave).toBe(5);
        });
    });
});
