/**
 * Progression templates and thaat reference data.
 * Degrees are semitones above Sa; types are chord type ids.
 */

import { pitchClassesToPattern } from '../utils/noteHelpers.js';

const s = (degree, type) => ({ degree, type });

export const PROGRESSION_TEMPLATES = [
    {
        id: 'authentic-cadence',
        name: 'I – IV – V – I',
        description: 'The classic major-key cadence; tonic, subdominant, dominant, home again.',
        modes: ['Ionian'],
        steps: [s(0, 'major'), s(5, 'major'), s(7, 'major'), s(0, 'major')]
    },
    {
        id: 'plagal-cadence',
        name: 'IV – I',
        description: 'The soft "amen" cadence, resolving from the subdominant straight to the tonic.',
        modes: ['Ionian', 'Mixolydian'],
        steps: [s(5, 'major'), s(0, 'major')]
    },
    {
        id: 'pop-axis',
        name: 'I – V – vi – IV',
        description: 'The ubiquitous pop loop; bright, open and endlessly repeatable.',
        modes: ['Ionian'],
        steps: [s(0, 'major'), s(7, 'major'), s(9, 'minor'), s(5, 'major')]
    },
    {
        id: 'fifties',
        name: 'I – vi – IV – V',
        description: 'The 1950s doo-wop turnaround, with a gentle dip to the relative minor.',
        modes: ['Ionian'],
        steps: [s(0, 'major'), s(9, 'minor'), s(5, 'major'), s(7, 'major')]
    },
    {
        id: 'ii-v-i',
        name: 'ii7 – V7 – Imaj7',
        description: 'The jazz cornerstone; the dominant pulls strongly home to a smooth major seventh.',
        modes: ['Ionian'],
        steps: [s(2, 'minor7'), s(7, 'dom7'), s(0, 'major7')]
    },
    {
        id: 'twelve-bar-blues',
        name: '12-bar blues',
        description: 'The standard blues form on dominant sevenths, with a flat seventh colouring the home chord.',
        modes: ['Mixolydian'],
        steps: [
            s(0, 'dom7'), s(0, 'dom7'), s(0, 'dom7'), s(0, 'dom7'),
            s(5, 'dom7'), s(5, 'dom7'),
            s(0, 'dom7'), s(0, 'dom7'),
            s(7, 'dom7'), s(5, 'dom7'), s(0, 'dom7'), s(7, 'dom7')
        ]
    },
    {
        id: 'mixolydian',
        name: 'I – ♭VII – IV – I',
        description: 'Mixolydian rock sound; the lowered seventh (komal Ni) gives the ♭VII chord its swagger.',
        modes: ['Mixolydian'],
        steps: [s(0, 'major'), s(10, 'major'), s(5, 'major'), s(0, 'major')]
    },
    {
        id: 'lydian',
        name: 'I – II',
        description: 'Lydian shimmer; the raised 4th (tivra Ma) makes the major II chord float above the tonic.',
        modes: ['Lydian'],
        steps: [s(0, 'major'), s(2, 'major')]
    },
    {
        id: 'dorian-vamp',
        name: 'i – IV',
        description: 'Dorian vamp; the raised 6th (shuddha Dha) gives the IV chord its brightness.',
        modes: ['Dorian'],
        steps: [s(0, 'minor'), s(5, 'major')]
    },
    {
        id: 'aeolian-rock',
        name: 'i – ♭VII – ♭VI – ♭VII',
        description: 'Natural-minor rock riff, rocking between the lowered seventh and sixth.',
        modes: ['Aeolian'],
        steps: [s(0, 'minor'), s(10, 'major'), s(8, 'major'), s(10, 'major')]
    },
    {
        id: 'andalusian',
        name: 'i – ♭VII – ♭VI – V',
        description: 'Descending Andalusian cadence with a major V, giving a dramatic flamenco pull.',
        modes: ['Aeolian'],
        steps: [s(0, 'minor'), s(10, 'major'), s(8, 'major'), s(7, 'major')]
    },
    {
        id: 'phrygian-cadence',
        name: '♭II – i',
        description: 'Phrygian cadence; the lowered 2nd (komal Re) leans darkly into the minor tonic.',
        modes: ['Phrygian'],
        steps: [s(1, 'major'), s(0, 'minor')]
    },
    {
        id: 'double-harmonic',
        name: 'I – ♭II',
        description: 'Double-harmonic colour, as in Bhairav; a major tonic against a major chord on komal Re.',
        modes: [],
        steps: [s(0, 'major'), s(1, 'major')]
    }
];

const thaat = (id, name, mode, pcs) => ({ id, name, mode, pattern: pitchClassesToPattern(pcs) });

export const THAATS = [
    thaat('bilawal', 'Bilawal', 'Ionian', [0, 2, 4, 5, 7, 9, 11]),
    thaat('kalyan', 'Kalyan', 'Lydian', [0, 2, 4, 6, 7, 9, 11]),
    thaat('khamaj', 'Khamaj', 'Mixolydian', [0, 2, 4, 5, 7, 9, 10]),
    thaat('kafi', 'Kafi', 'Dorian', [0, 2, 3, 5, 7, 9, 10]),
    thaat('asavari', 'Asavari', 'Aeolian', [0, 2, 3, 5, 7, 8, 10]),
    thaat('bhairavi', 'Bhairavi', 'Phrygian', [0, 1, 3, 5, 7, 8, 10]),
    thaat('bhairav', 'Bhairav', null, [0, 1, 4, 5, 7, 8, 11]),
    thaat('poorvi', 'Poorvi', null, [0, 1, 4, 6, 7, 8, 11]),
    thaat('marwa', 'Marwa', null, [0, 1, 4, 6, 7, 9, 11]),
    thaat('todi', 'Todi', null, [0, 1, 3, 6, 7, 8, 11])
];
