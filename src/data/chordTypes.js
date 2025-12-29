/**
 * Chord Type Definitions
 * Intervals are semitones from the root (0 = root)
 * Each chord type has a unique color for visualization
 */

/**
 * Basic chord types (triads and seventh chords)
 */
export const CHORD_TYPES = [
    { id: 'major', name: 'Major', intervals: [0, 4, 7], color: '#3b82f6', category: 'triad' },
    { id: 'minor', name: 'Minor', intervals: [0, 3, 7], color: '#8b5cf6', category: 'triad' },
    { id: 'diminished', name: 'Diminished', intervals: [0, 3, 6], color: '#ef4444', category: 'triad' },
    { id: 'augmented', name: 'Augmented', intervals: [0, 4, 8], color: '#f97316', category: 'triad' },
    { id: 'sus2', name: 'Sus2', intervals: [0, 2, 7], color: '#14b8a6', category: 'sus' },
    { id: 'sus4', name: 'Sus4', intervals: [0, 5, 7], color: '#10b981', category: 'sus' },
    { id: 'major7', name: 'Major 7', intervals: [0, 4, 7, 11], color: '#22c55e', category: 'seventh' },
    { id: 'minor7', name: 'Minor 7', intervals: [0, 3, 7, 10], color: '#06b6d4', category: 'seventh' },
    { id: 'dom7', name: 'Dominant 7', intervals: [0, 4, 7, 10], color: '#eab308', category: 'seventh' },
    { id: 'dim7', name: 'Diminished 7', intervals: [0, 3, 6, 9], color: '#db2777', category: 'seventh' },
    { id: 'm7b5', name: 'Half-diminished (m7♭5)', intervals: [0, 3, 6, 10], color: '#0ea5e9', category: 'seventh' },
    { id: 'maj6', name: 'Major 6', intervals: [0, 4, 7, 9], color: '#a3e635', category: 'sixth' },
    { id: 'min6', name: 'Minor 6', intervals: [0, 3, 7, 9], color: '#f43f5e', category: 'sixth' }
];

/**
 * Extended chord types (add9, 9th, 11th, 13th)
 * Used when "Show Extended Chords" is enabled
 */
export const EXTENDED_CHORD_TYPES = [
    { id: 'add9', name: 'Add9', intervals: [0, 4, 7, 14], color: '#fb923c', category: 'extended' },
    { id: 'madd9', name: 'Minor Add9', intervals: [0, 3, 7, 14], color: '#a855f7', category: 'extended' },
    { id: 'maj9', name: 'Major 9', intervals: [0, 4, 7, 11, 14], color: '#84cc16', category: 'extended' },
    { id: 'min9', name: 'Minor 9', intervals: [0, 3, 7, 10, 14], color: '#2dd4bf', category: 'extended' },
    { id: 'dom9', name: 'Dominant 9', intervals: [0, 4, 7, 10, 14], color: '#fbbf24', category: 'extended' },
    { id: '7sus4', name: '7 Sus4', intervals: [0, 5, 7, 10], color: '#4ade80', category: 'sus' },
    { id: 'minMaj7', name: 'Minor Major 7', intervals: [0, 3, 7, 11], color: '#c084fc', category: 'seventh' },
    { id: 'aug7', name: 'Augmented 7', intervals: [0, 4, 8, 10], color: '#fb7185', category: 'seventh' }
];

/**
 * All chord types combined for when "All" is selected
 */
export const ALL_CHORD_TYPES = [...CHORD_TYPES, ...EXTENDED_CHORD_TYPES];

/**
 * Special chord type for showing all chords
 */
export const ALL_CHORDS_OPTION = {
    id: 'all',
    name: 'All',
    intervals: [],
    color: '#6366f1',
    isSpecial: true,
    description: 'Show all chord types'
};

/**
 * Get chord type by ID
 * @param {string} id - Chord type ID (e.g., 'major', 'minor7')
 * @returns {Object|undefined} - Chord type object
 */
export function getChordType(id) {
    if (id === 'all') return ALL_CHORDS_OPTION;
    return ALL_CHORD_TYPES.find(c => c.id === id);
}

/**
 * Get chord name from root note and chord type
 * @param {number} root - Root note as pitch class (0-11)
 * @param {string} chordTypeId - Chord type ID
 * @param {number} tonic - Selected tonic offset (0-11)
 * @returns {string} - Western chord name (e.g., "Cmaj7")
 */
export function getWesternChordName(root, chordTypeId, tonic = 0) {
    const WESTERN_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const absoluteRoot = (root + tonic) % 12;
    const noteName = WESTERN_NOTES[absoluteRoot];

    const chordType = getChordType(chordTypeId);
    if (!chordType) return noteName;

    // Abbreviations for chord suffixes
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

    return noteName + (suffixes[chordTypeId] || '');
}

/**
 * Get count of chords by type from a list of available chords
 * @param {Array} chords - Array of chord objects with chordType property
 * @returns {Object} - Map of chordTypeId -> count
 */
export function countChordsByType(chords) {
    const counts = {};
    for (const chord of chords) {
        const type = chord.chordType || chord.type;
        counts[type] = (counts[type] || 0) + 1;
    }
    return counts;
}

export default CHORD_TYPES;
