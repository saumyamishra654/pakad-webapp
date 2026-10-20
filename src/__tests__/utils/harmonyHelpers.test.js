import { describe, it, expect } from 'vitest';
import { harmonizeLine, commonTones, rootMotionScore } from '../../utils/harmonyHelpers.js';
import { buildChord } from '../../utils/progressionHelpers.js';
import { getAvailableChords } from '../../utils/chordHelpers.js';
import { pitchClassesToPattern } from '../../utils/noteHelpers.js';

const bilawal = pitchClassesToPattern([0, 2, 4, 5, 7, 9, 11]);
const bilawalChords = getAvailableChords(bilawal, 'all', false);

describe('harmonyHelpers', () => {
    it('returns one chord per melody note, each containing that note', () => {
        const melody = [0, 2, 4, 5, 7, 9, 11, 0];
        const out = harmonizeLine(melody, bilawalChords);
        expect(out).toHaveLength(8);
        out.forEach((ch, i) => expect(ch.notes).toContain(melody[i]));
    });
    it('starts and ends a line on Sa with a chord rooted on Sa', () => {
        const out = harmonizeLine([0, 4, 7, 0], bilawalChords);
        expect(out[0].root).toBe(0);
        expect(out[3].root).toBe(0);
    });
    it('avoids repeating the same chord when another fits', () => {
        const out = harmonizeLine([0, 4, 7], bilawalChords);
        expect(new Set(out.map(c => `${c.root}${c.type}`)).size).toBeGreaterThan(1);
    });
    it('leaves a gap when no chord contains the note', () => {
        const out = harmonizeLine([0, 1, 0], bilawalChords); // Re flat is not in Bilawal
        expect(out).toHaveLength(3);
        expect(out[1]).toBeNull();
        expect(out[0]).not.toBeNull();
        expect(out[2]).not.toBeNull();
    });
    it('handles an empty melody', () => {
        expect(harmonizeLine([], bilawalChords)).toEqual([]);
    });
    it('commonTones and rootMotionScore', () => {
        expect(commonTones(buildChord(0, 'major'), buildChord(9, 'minor'))).toBe(2);
        expect(rootMotionScore(0, 5)).toBe(3); // up a 4th
        expect(rootMotionScore(0, 2)).toBe(2); // step
        expect(rootMotionScore(0, 4)).toBe(1); // third
        expect(rootMotionScore(0, 0)).toBe(-5); // repeat
    });
});
