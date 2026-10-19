/**
 * Tests for raga-level logic: jati counting, aaroh/avroh comparison, chalan building
 */

import { describe, it, expect } from 'vitest';
import { countSwaras, getJatiCount, patternsDiffer, pitchClassesToPattern } from '../../utils/noteHelpers.js';
import { buildChalan, transposeNote } from '../../utils/chalan.js';
import { HINDUSTANI_RAGAS } from '../../data/ragaData.js';
import { MELAKARTA_72 } from '../../data/melakartaData.js';

const raga = (name) => HINDUSTANI_RAGAS.find(r => r.name === name);

describe('countSwaras', () => {
    it('counts komal and shuddha of one swara once', () => {
        // Sa, Re + Re♭, Ga + Ga♭, Pa = 4 swaras, 6 pitch classes
        expect(countSwaras(pitchClassesToPattern([0, 1, 2, 3, 4, 7]))).toBe(4);
    });

    it('gives a jati (5-7 swaras) for compound-token ragas', () => {
        // "Gg"/"Rr" tokens set both variants; these used to count 8-9 notes and show no jati
        const abheriTodi = raga('Abheri Todi');
        expect(countSwaras(abheriTodi.avrohPattern)).toBe(7);
    });
});

describe('getJatiCount', () => {
    it('gives Sampoorna (7) for every melakarta, including enharmonic ones like Kanakangi (R1 G1)', () => {
        // countSwaras would merge G1 (= R2's pitch) into Re and report 5
        for (const mela of MELAKARTA_72) {
            expect(getJatiCount(mela.notePattern, mela.type)).toBe(7);
        }
    });

    it('counts swaras for Hindustani ragas', () => {
        expect(getJatiCount(raga('Abheri Todi').avrohPattern, 'hindustani')).toBe(7);
    });
});

describe('patternsDiffer', () => {
    it('detects patterns with the same note count but different notes', () => {
        const a = pitchClassesToPattern([0, 2, 4, 7, 9]);
        const b = pitchClassesToPattern([0, 1, 4, 7, 9]);
        expect(patternsDiffer(a, b)).toBe(true);
    });

    it('treats 0/1 and false/true alike', () => {
        expect(patternsDiffer([1, 0, 1], [true, false, true])).toBe(false);
    });

    it('flags every Hindustani raga whose aaroh and avroh notes differ', () => {
        // Sorting the bit arrays (the old check) missed 10 of these, e.g. Champak
        const flagged = HINDUSTANI_RAGAS.filter(r => patternsDiffer(r.aarohPattern, r.avrohPattern));
        expect(flagged.map(r => r.name)).toContain('Champak');
        expect(flagged).toHaveLength(104);
    });
});

describe('buildChalan', () => {
    const bilawal = pitchClassesToPattern([0, 2, 4, 5, 7, 9, 11]);
    const patterns = { aaroh: bilawal, avroh: bilawal, all: bilawal };

    it('aaroh climbs from Sa to the upper Sa', () => {
        const notes = buildChalan(patterns, 'aaroh');
        expect(notes[0]).toMatchObject({ noteIndex: 0, octave: 4, at: 0 });
        expect(notes.at(-1)).toMatchObject({ noteIndex: 0, octave: 5 });
        expect(notes).toHaveLength(8);
    });

    it('avroh descends from the upper Sa to Sa', () => {
        const notes = buildChalan(patterns, 'avroh');
        expect(notes[0]).toMatchObject({ noteIndex: 0, octave: 5 });
        expect(notes.at(-1)).toMatchObject({ noteIndex: 0, octave: 4 });
        const absolute = notes.map(n => n.octave * 12 + n.noteIndex);
        expect(absolute).toEqual([...absolute].sort((x, y) => y - x));
    });

    it('full raga plays avroh after aaroh plus a pause', () => {
        const notes = buildChalan(patterns, 'full', { step: 0.4, pause: 0.3 });
        expect(notes).toHaveLength(16);
        expect(notes[8].at).toBeCloseTo(8 * 0.4 + 0.3);
    });

    it('falls back to the full pattern when aaroh/avroh are missing', () => {
        const notes = buildChalan({ aaroh: [], avroh: [], all: bilawal }, 'aaroh');
        expect(notes).toHaveLength(8);
    });
});

describe('transposeNote', () => {
    it('carries into the next octave', () => {
        // Ni (11) in octave 4 with tonic D (2) is C# in octave 5, not octave 4
        expect(transposeNote(11, 4, 2)).toEqual({ noteIndex: 1, octave: 5 });
    });

    it('leaves notes unchanged with tonic C', () => {
        expect(transposeNote(7, 3, 0)).toEqual({ noteIndex: 7, octave: 3 });
    });
});
