/**
 * Progression helpers: chord building, thaat matching, template raga-fit and layout.
 */

import { getChordType } from '../data/chordTypes.js';
import { THAATS } from '../data/progressionTemplates.js';

export const MAX_CYCLE_BEATS = 18;

/**
 * Build a chord object in the getAvailableChords shape.
 */
export function buildChord(root, typeId) {
    const chordType = getChordType(typeId);
    return {
        root,
        type: chordType.id,
        name: chordType.name,
        notes: chordType.intervals.map(i => (root + i) % 12),
        intervals: chordType.intervals,
        color: chordType.color,
        isExtended: chordType.category === 'extended'
    };
}

/**
 * Find thaats equal to, or supersets of, a pattern.
 */
export function matchThaats(pattern) {
    let exact = null;
    const containing = [];
    for (const thaat of THAATS) {
        let equal = true;
        let subset = true;
        for (let i = 0; i < 12; i++) {
            const inPattern = !!pattern[i];
            const inThaat = !!thaat.pattern[i];
            if (inPattern !== inThaat) equal = false;
            if (inPattern && !inThaat) subset = false;
        }
        if (equal) exact = thaat;
        else if (subset) containing.push(thaat);
    }
    return { exact, containing };
}

const chordInPattern = (chord, pattern) =>
    !!pattern && chord.notes.every(pc => !!pattern[pc]);

/**
 * Rate how well a template fits a raga.
 * 'fits' = every step inside the raga; 'close' = at most a quarter of the
 * steps (minimum one) fall outside; otherwise 'none'.
 */
export function templateFit(template, patterns) {
    const steps = template.steps.map(step => {
        const chord = buildChord(step.degree, step.type);
        return {
            chord,
            inRaga: chordInPattern(chord, patterns.all),
            inAaroh: chordInPattern(chord, patterns.aaroh),
            inAvroh: chordInPattern(chord, patterns.avroh)
        };
    });
    const outside = steps.filter(s => !s.inRaga).length;
    let status = 'none';
    if (outside === 0) status = 'fits';
    else if (outside <= Math.max(1, Math.floor(steps.length * 0.25))) status = 'close';
    return { status, steps };
}

export function templateToChords(template) {
    return template.steps.map(step => buildChord(step.degree, step.type));
}

/**
 * Spread steps over a cycle of `beats`; if there are more steps than beats,
 * grow the cycle (capped at MAX_CYCLE_BEATS) with one step per beat.
 */
export function layoutSteps(stepCount, beats) {
    if (stepCount <= beats) {
        return {
            beats,
            beatIndices: Array.from({ length: stepCount }, (_, i) => Math.floor(i * beats / stepCount))
        };
    }
    const total = Math.min(stepCount, MAX_CYCLE_BEATS);
    return { beats: total, beatIndices: Array.from({ length: total }, (_, i) => i) };
}
