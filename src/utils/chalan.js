/**
 * Chalan (aaroh / avroh) note building
 * Shared by ChordTool's Aaroh / Avroh / Full Raga buttons and RagaQuery's play button
 */

import { patternToPitchClasses } from './noteHelpers.js';
import { arrangeNotesAscending, arrangeNotesDescending } from './audioHelpers.js';

/**
 * Build the notes of an aaroh, avroh or both, with start offsets
 * @param {Object} patterns - { aaroh, avroh, all } 12-element patterns (aaroh/avroh may be empty)
 * @param {'aaroh'|'avroh'|'full'} mode - Which line(s) to build
 * @param {Object} options
 * @param {number} options.baseOctave - Octave of the starting Sa (default 4)
 * @param {number} options.step - Seconds between notes (default 0.4)
 * @param {number} options.pause - Extra seconds between aaroh and avroh in 'full' mode (default 0.3)
 * @returns {Array<{noteIndex: number, octave: number, at: number}>} - Sa-relative notes; `at` in seconds
 */
export function buildChalan(patterns, mode, { baseOctave = 4, step = 0.4, pause = 0.3 } = {}) {
    const aarohPcs = patternToPitchClasses(patterns.aaroh?.length ? patterns.aaroh : patterns.all);
    const avrohPcs = patternToPitchClasses(patterns.avroh?.length ? patterns.avroh : patterns.all);

    // Aaroh climbs to the upper Sa; avroh starts from that same Sa so both lines meet
    const aarohBase = arrangeNotesAscending(aarohPcs, baseOctave);
    const upperSaOctave = aarohBase.length > 0
        ? Math.max(...aarohBase.map(n => n.octave)) + 1
        : baseOctave + 1;
    const aaroh = [...aarohBase, { noteIndex: 0, octave: upperSaOctave }];
    const avroh = arrangeNotesDescending(avrohPcs, upperSaOctave, true, baseOctave);

    const timed = (notes, offset) => notes.map((n, i) => ({ noteIndex: n.noteIndex, octave: n.octave, at: offset + i * step }));

    if (mode === 'aaroh') return timed(aaroh, 0);
    if (mode === 'avroh') return timed(avroh, 0);
    return [...timed(aaroh, 0), ...timed(avroh, aaroh.length * step + pause)];
}

/**
 * Transpose a Sa-relative note by the tonic, carrying into the next octave
 * @param {number} noteIndex - Sa-relative pitch class
 * @param {number} octave - Octave
 * @param {number} tonic - Tonic (0 = C)
 * @returns {{noteIndex: number, octave: number}}
 */
export function transposeNote(noteIndex, octave, tonic) {
    const total = octave * 12 + noteIndex + tonic;
    return { noteIndex: ((total % 12) + 12) % 12, octave: Math.floor(total / 12) };
}

export default { buildChalan, transposeNote };
