/**
 * Note Helper Utilities
 * Constants and conversion functions for musical notes
 */

// === Note Name Constants ===

/**
 * Hindustani swar names (12 notes)
 */
export const SWAR_NAMES = [
    'Sa', 'Re♭', 'Re', 'Ga♭', 'Ga', 'Ma', 'Ma♯', 'Pa', 'Dha♭', 'Dha', 'Ni♭', 'Ni'
];

/**
 * Carnatic labels for the 12-note wheel
 * Shows enharmonic equivalents where applicable
 */
export const CARNATIC_LABELS = [
    'S', 'R1', 'R2/G1', 'R3/G2', 'G3', 'M1', 'M2', 'P', 'D1', 'D2/N1', 'D3/N2', 'N3'
];

/**
 * Western note names (with sharps/flats)
 */
export const WESTERN_NOTES = ['C', 'C#/D♭', 'D', 'D#/E♭', 'E', 'F', 'F#/G♭', 'G', 'G#/A♭', 'A', 'A#/B♭', 'B'];
export const WESTERN_NOTES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const WESTERN_NOTES_FLAT = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];

/**
 * Sample note names for audio file loading (using flats for URL compatibility)
 */
export const SAMPLE_NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

/**
 * Available octaves for piano samples
 */
export const AVAILABLE_OCTAVES = [3, 4, 5];

/**
 * Note file suffix by octave (for pre-rendered samples)
 */
export const NOTE_SUFFIX_BY_OCTAVE = {
    3: '_m12',
    4: '',
    5: '_p12'
};

// === Conversion Functions ===

/**
 * Get display labels based on music system
 * @param {boolean} isCarnatic - Whether Carnatic mode is active
 * @returns {string[]} - Array of 12 note labels
 */
export function getDisplayLabels(isCarnatic) {
    return isCarnatic ? CARNATIC_LABELS : SWAR_NAMES;
}

/**
 * Convert pitch class to frequency
 * @param {number} pitchClass - 0-11 pitch class
 * @param {number} octave - Octave number (4 = middle C)
 * @returns {number} - Frequency in Hz
 */
export function pitchClassToFrequency(pitchClass, octave = 4) {
    const A4 = 440;
    // A4 is pitch class 9 in octave 4
    const semitonesFromA4 = (octave - 4) * 12 + (pitchClass - 9);
    return A4 * Math.pow(2, semitonesFromA4 / 12);
}

/**
 * Convert pitch class to MIDI note number
 * @param {number} pitchClass - 0-11 pitch class
 * @param {number} octave - Octave number
 * @returns {number} - MIDI note number (0-127)
 */
export function pitchClassToMidi(pitchClass, octave = 4) {
    return octave * 12 + pitchClass + 12; // +12 because MIDI octave starts at C-1
}

/**
 * Apply tonic offset to get absolute pitch class
 * @param {number} relativePc - Pitch class relative to Sa (0-11)
 * @param {number} tonic - Tonic offset (0-11, where 0=C, 1=C#, etc.)
 * @returns {number} - Absolute pitch class (0-11)
 */
export function applyTonic(relativePc, tonic) {
    return ((relativePc + tonic) % 12 + 12) % 12;
}

/**
 * Rotate a 12-element binary pattern by N semitones
 * Used for murchanna (modal rotation) analysis
 * @param {number[]} pattern - 12-element array of 0s and 1s
 * @param {number} steps - Number of semitones to rotate
 * @returns {number[]} - Rotated pattern
 */
export function rotateBinary(pattern, steps) {
    const result = new Array(12).fill(0);
    for (let i = 0; i < 12; i++) {
        result[(i + steps) % 12] = pattern[i];
    }
    return result;
}

/**
 * Convert pattern array to string for comparison
 * @param {number[]} pattern - 12-element pattern
 * @returns {string} - e.g., "101010110101"
 */
export function patternToString(pattern) {
    return pattern.map(p => p ? '1' : '0').join('');
}

/**
 * Count notes in a pattern
 * @param {number[]} pattern - 12-element pattern
 * @returns {number} - Number of notes present
 */
export function countNotes(pattern) {
    return pattern.reduce((sum, p) => sum + (p ? 1 : 0), 0);
}

/**
 * Get indices of present notes from pattern
 * @param {number[]} pattern - 12-element pattern
 * @returns {number[]} - Array of pitch classes that are present
 */
export function patternToPitchClasses(pattern) {
    return pattern.map((p, i) => p ? i : null).filter(v => v !== null);
}

/**
 * Create pattern from pitch classes
 * @param {number[]} pitchClasses - Array of pitch classes
 * @returns {number[]} - 12-element pattern
 */
export function pitchClassesToPattern(pitchClasses) {
    const pattern = new Array(12).fill(0);
    for (const pc of pitchClasses) {
        pattern[((pc % 12) + 12) % 12] = 1;
    }
    return pattern;
}

/**
 * Check if pattern A is a subset of pattern B
 * @param {number[]} subset - Pattern that might be a subset
 * @param {number[]} superset - Pattern that might be a superset
 * @returns {boolean}
 */
export function isSubset(subset, superset) {
    for (let i = 0; i < 12; i++) {
        if (subset[i] && !superset[i]) return false;
    }
    return true;
}

/**
 * Calculate Hamming distance between two patterns
 * Used for ranking search results by similarity
 * @param {number[]} a - First pattern
 * @param {number[]} b - Second pattern
 * @returns {number} - Number of differing positions
 */
export function hammingDistance(a, b) {
    return a.reduce((acc, ai, i) => acc + (ai !== (b[i] || 0) ? 1 : 0), 0);
}

/**
 * Get swar label for a pitch class
 * @param {number} pc - Pitch class (0-11)
 * @param {boolean} isCarnatic - Use Carnatic labels
 * @returns {string} - Note label
 */
export function getSwarLabel(pc, isCarnatic = false) {
    const labels = getDisplayLabels(isCarnatic);
    return labels[((pc % 12) + 12) % 12];
}

/**
 * Get Western note name for a pitch class with tonic offset
 * @param {number} pc - Pitch class relative to Sa
 * @param {number} tonic - Tonic offset
 * @param {boolean} preferFlats - Use flat notation
 * @returns {string} - Note name (e.g., "C#" or "D♭")
 */
export function getWesternNoteName(pc, tonic = 0, preferFlats = false) {
    const absolutePc = applyTonic(pc, tonic);
    return preferFlats ? WESTERN_NOTES_FLAT[absolutePc] : WESTERN_NOTES_SHARP[absolutePc];
}

export default {
    SWAR_NAMES,
    CARNATIC_LABELS,
    WESTERN_NOTES,
    WESTERN_NOTES_SHARP,
    WESTERN_NOTES_FLAT,
    SAMPLE_NOTE_NAMES,
    AVAILABLE_OCTAVES,
    NOTE_SUFFIX_BY_OCTAVE,
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
};
