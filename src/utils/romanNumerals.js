/**
 * Roman numeral labels for chords, relative to Sa (pitch class 0).
 */

const DEGREES = ['I', '♭II', 'II', '♭III', 'III', 'IV', '♯IV', 'V', '♭VI', 'VI', '♭VII', 'VII'];

const LOWER_CASE_TYPES = new Set([
    'minor', 'minor7', 'min6', 'madd9', 'min9', 'minMaj7', 'diminished', 'dim7', 'm7b5'
]);

const SUFFIXES = {
    major: '', minor: '',
    diminished: '°', dim7: '°7', m7b5: 'ø7',
    augmented: '+', aug7: '+7',
    major7: 'maj7', dom7: '7', minor7: '7',
    maj6: '6', min6: '6',
    sus2: 'sus2', sus4: 'sus4',
    add9: 'add9', madd9: 'add9',
    maj9: 'maj9', min9: '9', dom9: '9',
    '7sus4': '7sus4',
    minMaj7: '(maj7)'
};

/**
 * @param {{ root: number, type: string|{id?: string, name?: string} }} chord
 * @returns {string} e.g. 'V7', 'ii', '♭VII', 'vii°'
 */
export function getRomanNumeral(chord) {
    if (!chord) return '';
    const typeId = typeof chord.type === 'string' ? chord.type : (chord.type?.id ?? chord.type?.name);
    const degree = DEGREES[((chord.root % 12) + 12) % 12];
    const base = LOWER_CASE_TYPES.has(typeId)
        ? degree.replace(/[IV]+/, (m) => m.toLowerCase())
        : degree;
    return base + (SUFFIXES[typeId] ?? '');
}
