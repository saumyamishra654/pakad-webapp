/**
 * Chord Helper Utilities
 * Functions for computing available chords from raga patterns
 */

import { CHORD_TYPES, EXTENDED_CHORD_TYPES, ALL_CHORD_TYPES } from '../data/chordTypes.js';
import { patternToPitchClasses, applyTonic } from './noteHelpers.js';

/**
 * Check if all chord intervals are present in the pattern
 * @param {number} root - Root pitch class (0-11)
 * @param {number[]} intervals - Chord intervals (e.g., [0, 4, 7] for major)
 * @param {number[]} pattern - 12-element raga pattern
 * @returns {boolean}
 */
export function isChordInPattern(root, intervals, pattern) {
    for (const interval of intervals) {
        const pc = ((root + interval) % 12 + 12) % 12;
        if (!pattern[pc]) return false;
    }
    return true;
}

/**
 * Count how many notes in a chord are outside the pattern
 * @param {number} root - Root pitch class
 * @param {number[]} intervals - Chord intervals
 * @param {number[]} pattern - Raga pattern
 * @returns {number} - Number of notes outside pattern
 */
export function countOutsideNotes(root, intervals, pattern) {
    let count = 0;
    for (const interval of intervals) {
        const pc = ((root + interval) % 12 + 12) % 12;
        if (!pattern[pc]) count++;
    }
    return count;
}

/**
 * Get all available chords for a given pattern
 * @param {number[]} pattern - 12-element raga pattern
 * @param {string} chordTypeFilter - 'all' or specific chord type ID
 * @param {boolean} includeExtended - Include extended chord types
 * @returns {Array<{root: number, type: string, notes: number[], intervals: number[]}>}
 */
export function getAvailableChords(pattern, chordTypeFilter = 'all', includeExtended = false) {
    const types = chordTypeFilter === 'all'
        ? (includeExtended ? ALL_CHORD_TYPES : CHORD_TYPES)
        : (includeExtended ? ALL_CHORD_TYPES : CHORD_TYPES).filter(t => t.id === chordTypeFilter);

    const chords = [];
    const availableRoots = patternToPitchClasses(pattern);

    for (const root of availableRoots) {
        for (const chordType of types) {
            if (isChordInPattern(root, chordType.intervals, pattern)) {
                const notes = chordType.intervals.map(i => ((root + i) % 12 + 12) % 12);
                chords.push({
                    root,
                    type: chordType.id,
                    name: chordType.name,
                    notes,
                    intervals: chordType.intervals,
                    color: chordType.color,
                    isExtended: chordType.category === 'extended'
                });
            }
        }
    }

    return chords;
}

/**
 * Get chords with some notes outside the pattern (for "outside raga" feature)
 * @param {number[]} pattern - Raga pattern
 * @param {number} minOutside - Minimum notes outside pattern
 * @param {number} maxOutside - Maximum notes outside pattern
 * @param {string} chordTypeFilter - Chord type filter
 * @param {boolean} includeExtended - Include extended chords
 * @returns {Array} - Chords with outside note counts
 */
export function getChordsOutsidePattern(pattern, minOutside = 1, maxOutside = 2, chordTypeFilter = 'all', includeExtended = false) {
    const types = chordTypeFilter === 'all'
        ? (includeExtended ? ALL_CHORD_TYPES : CHORD_TYPES)
        : (includeExtended ? ALL_CHORD_TYPES : CHORD_TYPES).filter(t => t.id === chordTypeFilter);

    const chords = [];

    // Try all 12 possible roots (not just pattern notes)
    for (let root = 0; root < 12; root++) {
        for (const chordType of types) {
            const outsideCount = countOutsideNotes(root, chordType.intervals, pattern);

            if (outsideCount >= minOutside && outsideCount <= maxOutside) {
                const notes = chordType.intervals.map(i => ((root + i) % 12 + 12) % 12);
                chords.push({
                    root,
                    type: chordType.id,
                    name: chordType.name,
                    notes,
                    intervals: chordType.intervals,
                    color: chordType.color,
                    outsideCount,
                    isExtended: chordType.category === 'extended'
                });
            }
        }
    }

    return chords;
}

/**
 * Filter chords by note (root or any position)
 * @param {Array} chords - Array of chord objects
 * @param {number} note - Pitch class to filter by
 * @param {string} mode - 'root' (only root matches) or 'any' (any note matches)
 * @returns {Array} - Filtered chords
 */
export function filterChordsByNote(chords, note, mode = 'any') {
    if (note === null || note === undefined) return chords;

    return chords.filter(chord => {
        if (mode === 'root') {
            return chord.root === note;
        } else {
            return chord.notes.includes(note);
        }
    });
}

/**
 * Group chords by type and count
 * @param {Array} chords - Array of chord objects
 * @returns {Object} - Map of type -> {count, chords}
 */
export function groupChordsByType(chords) {
    const groups = {};

    for (const chord of chords) {
        if (!groups[chord.type]) {
            groups[chord.type] = { count: 0, chords: [], color: chord.color, name: chord.name };
        }
        groups[chord.type].count++;
        groups[chord.type].chords.push(chord);
    }

    return groups;
}

/**
 * Count chords by type
 * @param {Array} chords - Array of chord objects
 * @returns {Object} - Map of type -> count
 */
export function countChordsByType(chords) {
    const counts = {};
    for (const chord of chords) {
        counts[chord.type] = (counts[chord.type] || 0) + 1;
    }
    return counts;
}

/**
 * Get chord notation with Western names
 * @param {Object} chord - Chord object with root and type
 * @param {number} tonic - Tonic offset (0=C)
 * @returns {string} - e.g., "Cmaj7", "F#m"
 */
export function getChordNotation(chord, tonic = 0) {
    const WESTERN_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const absoluteRoot = applyTonic(chord.root, tonic);
    const rootName = WESTERN_NOTES[absoluteRoot];

    const suffixes = {
        'major': '',
        'minor': 'm',
        'diminished': 'dim',
        'augmented': 'aug',
        'sus2': 'sus2',
        'sus4': 'sus4',
        'major7': 'maj7',
        'minor7': 'm7',
        'dom7': '7',
        'dim7': 'dim7',
        'm7b5': 'm7♭5',
        'maj6': '6',
        'min6': 'm6',
        'add9': 'add9',
        'madd9': 'madd9',
        'maj9': 'maj9',
        'min9': 'm9',
        'dom9': '9',
        '7sus4': '7sus4',
        'minMaj7': 'mMaj7',
        'aug7': 'aug7'
    };

    return rootName + (suffixes[chord.type] || '');
}

/**
 * Aggregate chord data for display
 * Combines basic and extended chord lists with counts
 * @param {Object} options - Options object
 * @returns {Object} - Aggregated chord data
 */
export function aggregateChordData({ pattern, chordTypeFilter, includeExtended, separateAarohAvroh, aarohPattern, avrohPattern }) {
    const result = {
        all: { chords: [], counts: {} },
        aaroh: { chords: [], counts: {} },
        avroh: { chords: [], counts: {} }
    };

    if (separateAarohAvroh && aarohPattern && avrohPattern) {
        result.aaroh.chords = getAvailableChords(aarohPattern, chordTypeFilter, includeExtended);
        result.aaroh.counts = countChordsByType(result.aaroh.chords);

        result.avroh.chords = getAvailableChords(avrohPattern, chordTypeFilter, includeExtended);
        result.avroh.counts = countChordsByType(result.avroh.chords);
    }

    result.all.chords = getAvailableChords(pattern, chordTypeFilter, includeExtended);
    result.all.counts = countChordsByType(result.all.chords);

    return result;
}

/**
 * Arrange chord notes for proper voicing (ascending from root)
 * @param {number[]} notes - Chord notes as pitch classes
 * @param {number} baseOctave - Starting octave
 * @returns {Array<{noteIndex: number, octave: number, midiNote: number}>}
 */
export function arrangeChordNotes(notes, baseOctave = 4) {
    if (!notes || notes.length === 0) return [];

    const arranged = [];
    let currentOctave = baseOctave;
    let prevMidi = -Infinity;

    for (const noteIndex of notes) {
        let midiNote = currentOctave * 12 + noteIndex + 12; // +12 for MIDI convention

        // Move to next octave if this note would be same or lower than previous
        while (midiNote <= prevMidi) {
            currentOctave++;
            midiNote = currentOctave * 12 + noteIndex + 12;
        }

        arranged.push({
            noteIndex,
            octave: currentOctave,
            midiNote
        });

        prevMidi = midiNote;
    }

    return arranged;
}

export default {
    isChordInPattern,
    countOutsideNotes,
    getAvailableChords,
    getChordsOutsidePattern,
    filterChordsByNote,
    groupChordsByType,
    countChordsByType,
    getChordNotation,
    aggregateChordData,
    arrangeChordNotes
};
