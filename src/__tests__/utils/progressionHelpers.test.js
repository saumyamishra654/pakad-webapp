import { describe, it, expect } from 'vitest';
import { PROGRESSION_TEMPLATES } from '../../data/progressionTemplates.js';
import { buildChord, matchThaats, templateFit, layoutSteps } from '../../utils/progressionHelpers.js';
import { getChordType } from '../../data/chordTypes.js';
import { pitchClassesToPattern } from '../../utils/noteHelpers.js';

const bilawal = pitchClassesToPattern([0, 2, 4, 5, 7, 9, 11]);
const kafi = pitchClassesToPattern([0, 2, 3, 5, 7, 9, 10]);
const bhupali = pitchClassesToPattern([0, 2, 4, 7, 9]);
const tpl = id => PROGRESSION_TEMPLATES.find(t => t.id === id);
const P = p => ({ all: p, aaroh: p, avroh: p });

describe('progressionHelpers', () => {
    it('buildChord matches the getAvailableChords shape', () => {
        expect(buildChord(7, 'dom7')).toMatchObject({ root: 7, type: 'dom7', notes: [7, 11, 2, 5], isExtended: false });
    });
    it('matches thaats exactly and by containment', () => {
        expect(matchThaats(kafi).exact.id).toBe('kafi');
        expect(matchThaats(kafi).exact.mode).toBe('Dorian');
        expect(matchThaats(bhupali).exact).toBeNull();
        expect(matchThaats(bhupali).containing.map(t => t.id)).toEqual(expect.arrayContaining(['bilawal', 'kalyan', 'khamaj']));
    });
    it('rates template fit', () => {
        expect(templateFit(tpl('authentic-cadence'), P(bilawal)).status).toBe('fits');
        expect(templateFit(tpl('dorian-vamp'), P(kafi)).status).toBe('fits');
        expect(templateFit(tpl('mixolydian'), P(bilawal)).status).toBe('close');
        expect(templateFit(tpl('authentic-cadence'), P(kafi)).status).toBe('none');
        expect(templateFit(tpl('ii-v-i'), P(bhupali)).status).toBe('none');
    });
    it('counts outside steps by position: exactly one is close, more is none', () => {
        const outside = fit => fit.steps.filter(s => !s.inRaga).length;
        const mixo = templateFit(tpl('mixolydian'), P(bilawal));
        expect(outside(mixo)).toBe(1);
        expect(mixo.status).toBe('close');
        const kafiCad = templateFit(tpl('authentic-cadence'), P(kafi));
        expect(outside(kafiCad)).toBe(3); // both I positions need Ga, V needs Ni; IV fits
        expect(kafiCad.status).toBe('none');
        // Bilawal lacks Ni-flat and Ga-flat: I7 (x7 positions) and IV7 (x3) are outside, only V7 fits.
        const blues = templateFit(tpl('twelve-bar-blues'), P(bilawal));
        expect(outside(blues)).toBeGreaterThan(1);
        expect(blues.status).toBe('none');
    });
    it('accepts boolean patterns', () => {
        const b = bilawal.map(Boolean);
        expect(templateFit(tpl('authentic-cadence'), P(b)).status).toBe('fits');
        expect(matchThaats(b).exact.id).toBe('bilawal');
    });
    it('reports aaroh/avroh validity per step', () => {
        const fit = templateFit(tpl('authentic-cadence'), { all: bilawal, aaroh: pitchClassesToPattern([0, 2, 4, 7, 9, 11]), avroh: bilawal });
        expect(fit.steps[1]).toMatchObject({ inRaga: true, inAaroh: false, inAvroh: true });
    });
    it('lays steps out over the cycle', () => {
        expect(layoutSteps(4, 8)).toEqual({ beats: 8, beatIndices: [0, 2, 4, 6] });
        expect(layoutSteps(12, 8)).toEqual({ beats: 12, beatIndices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] });
        expect(layoutSteps(20, 8).beats).toBe(18);
        expect(layoutSteps(20, 8).beatIndices).toHaveLength(18);
    });
    it('every template step uses a known chord type', () => {
        for (const t of PROGRESSION_TEMPLATES) for (const s of t.steps) expect(getChordType(s.type)).toBeTruthy();
    });
});
