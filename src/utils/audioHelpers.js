/**
 * Audio Helper Utilities
 * Functions for audio playback, note arrangement, and frequency calculations
 */

import { pitchClassToFrequency, SAMPLE_NOTE_NAMES, NOTE_SUFFIX_BY_OCTAVE, AVAILABLE_OCTAVES } from './noteHelpers.js';

/**
 * Fetch and decode an audio sample
 * @param {AudioContext} ctx - Web Audio context
 * @param {string} noteName - Note name (e.g., "C", "C#")
 * @param {string} suffix - Octave suffix (e.g., "", "_m12", "_p12")
 * @param {string} basePath - Base path for samples (default "/Piano")
 * @returns {Promise<AudioBuffer|null>}
 */
export async function fetchSampleBuffer(ctx, noteName, suffix = '', basePath = '/Piano') {
    // Optimization: Hardcode to .mp3 and specific note names to avoid 404s
    const encoded = encodeURIComponent(`${noteName}${suffix}`);
    const url = `${basePath}/${encoded}.mp3`;

    try {
        const response = await fetch(url);
        if (!response.ok) return null;

        const arrayBuffer = await response.arrayBuffer();
        if (arrayBuffer.byteLength === 0) return null;

        return await ctx.decodeAudioData(arrayBuffer.slice(0));
    } catch (err) {
        console.error(`Failed to load sample: ${url}`, err);
        return null;
    }
}

/**
 * Load all piano samples for available octaves
 * @param {AudioContext} ctx - Web Audio context
 * @param {string} basePath - Base path for samples
 * @returns {Promise<Object>} - Map of noteIndex -> {octave -> AudioBuffer}
 */
export async function loadPianoSamples(ctx, basePath = '/Piano') {
    const buffers = {};

    await Promise.all(SAMPLE_NOTE_NAMES.map(async (noteName, index) => {
        const noteBuffers = {};

        await Promise.all(AVAILABLE_OCTAVES.map(async (oct) => {
            const suffix = NOTE_SUFFIX_BY_OCTAVE[oct] || '';
            const buffer = await fetchSampleBuffer(ctx, noteName, suffix, basePath);
            if (buffer) {
                noteBuffers[oct] = buffer;
            }
        }));

        if (Object.keys(noteBuffers).length > 0) {
            buffers[index] = noteBuffers;
        }
    }));

    return buffers;
}

/**
 * Play a single note using pre-loaded sample buffers
 * @param {Object} options - Playback options
 * @param {AudioContext} options.ctx - Audio context
 * @param {Object} options.buffers - Pre-loaded sample buffers
 * @param {number} options.noteIndex - Pitch class (0-11)
 * @param {number} options.octave - Octave number (default 4)
 * @param {number} options.duration - Duration in seconds (default 0.5)
 * @param {number} options.delay - Start delay in seconds (default 0)
 * @param {number} options.volume - Volume 0-1 (default 1)
 */
export function playNote({ ctx, buffers, noteIndex, octave = 4, duration = 0.5, delay = 0, volume = 1 }) {
    if (!ctx || !buffers) return;

    const startTime = ctx.currentTime + delay;
    const normalizedIndex = ((noteIndex % 12) + 12) % 12;
    const noteBuffers = buffers[normalizedIndex];

    if (!noteBuffers) return;

    // Find closest available octave and calculate pitch shift if needed
    const minAvail = Math.min(...AVAILABLE_OCTAVES);
    const maxAvail = Math.max(...AVAILABLE_OCTAVES);
    let resolvedOctave = octave;
    let pitchShiftSemitones = 0;

    if (octave < minAvail) {
        resolvedOctave = minAvail;
        pitchShiftSemitones = (octave - minAvail) * 12; // Negative semitones
    } else if (octave > maxAvail) {
        resolvedOctave = maxAvail;
        pitchShiftSemitones = (octave - maxAvail) * 12; // Positive semitones
    }

    // Fallback to any available octave if resolvedOctave doesn't have a buffer
    if (!noteBuffers[resolvedOctave]) {
        for (const oct of AVAILABLE_OCTAVES) {
            if (noteBuffers[oct]) {
                pitchShiftSemitones += (resolvedOctave - oct) * 12;
                resolvedOctave = oct;
                break;
            }
        }
    }

    const buffer = noteBuffers[resolvedOctave];
    if (!buffer) return;

    const source = ctx.createBufferSource();
    const gainNode = ctx.createGain();

    source.buffer = buffer;
    source.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Apply pitch shift if octave was outside available range
    // Each semitone = 2^(1/12) ratio
    const playbackRate = Math.pow(2, pitchShiftSemitones / 12);
    source.playbackRate.setValueAtTime(playbackRate, startTime);

    const bufferDuration = buffer.duration / playbackRate; // Adjust for playback rate
    const maxDuration = 2.0;
    const playDuration = Math.min(maxDuration, bufferDuration, duration);
    const fadeOutStart = Math.max(0, playDuration - 0.03);

    // Envelope
    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01);
    gainNode.gain.setValueAtTime(volume, startTime + fadeOutStart);
    gainNode.gain.linearRampToValueAtTime(0.0001, startTime + playDuration);

    source.start(startTime);
    source.stop(startTime + playDuration);

    return source;
}

/**
 * Arrange notes for ascending playback (aaroh)
 * @param {number[]} pitchClasses - Array of pitch classes
 * @param {number} baseOctave - Starting octave
 * @returns {Array<{noteIndex: number, octave: number, frequency: number}>}
 */
export function arrangeNotesAscending(pitchClasses, baseOctave = 3) {
    if (!pitchClasses || pitchClasses.length === 0) return [];

    const sorted = [...pitchClasses].sort((a, b) => a - b);
    const result = [];
    let oct = baseOctave;

    for (let i = 0; i < sorted.length; i++) {
        if (i > 0 && sorted[i] < sorted[i - 1]) oct++;
        result.push({
            noteIndex: sorted[i],
            octave: oct,
            frequency: pitchClassToFrequency(sorted[i], oct)
        });
    }

    return result;
}

/**
 * Arrange notes for descending playback (avroh)
 * @param {number[]} pitchClasses - Array of pitch classes
 * @param {number} startingOctave - Starting octave (high)
 * @param {boolean} includeLowerSa - Include Sa at end
 * @param {number} baseLower - Lowest octave allowed
 * @returns {Array<{noteIndex: number, octave: number, frequency: number}>}
 */
export function arrangeNotesDescending(pitchClasses, startingOctave = 5, includeLowerSa = true, baseLower = 3) {
    if (!pitchClasses || pitchClasses.length === 0) return [];

    const uniqueDesc = Array.from(new Set(pitchClasses)).sort((a, b) => b - a);
    const result = [];

    let prevAbs = startingOctave * 12 + 0; // Start on high Sa
    result.push({
        noteIndex: 0,
        octave: startingOctave,
        frequency: pitchClassToFrequency(0, startingOctave)
    });

    for (const pc of uniqueDesc) {
        if (pc === 0) continue;
        const o = Math.floor((prevAbs - 1 - pc) / 12);
        const octave = Math.max(baseLower, o);
        const abs = octave * 12 + pc;
        prevAbs = abs;

        result.push({
            noteIndex: pc,
            octave,
            frequency: pitchClassToFrequency(pc, octave)
        });
    }

    if (includeLowerSa) {
        const o = Math.floor((prevAbs - 1) / 12);
        const octave = Math.max(baseLower, o);
        result.push({
            noteIndex: 0,
            octave,
            frequency: pitchClassToFrequency(0, octave)
        });
    }

    return result;
}

/**
 * Get piano key positions for a chord (for visualization)
 * @param {number[]} chordNotes - Array of pitch classes
 * @param {number} tonic - Tonic offset
 * @param {number} baseOctave - Base octave
 * @returns {number[]} - Array of MIDI note numbers
 */
export function getPianoKeyPositions(chordNotes, tonic = 0, baseOctave = 4) {
    if (!chordNotes || chordNotes.length === 0) return [];

    const arranged = [];
    const rootNote = (chordNotes[0] + tonic) % 12;
    const rootMidi = baseOctave * 12 + rootNote;
    arranged.push(rootMidi);

    let currentOctave = baseOctave;
    for (let i = 1; i < chordNotes.length; i++) {
        const noteIndex = (chordNotes[i] + tonic) % 12;
        let midiNote = currentOctave * 12 + noteIndex;

        if (midiNote <= arranged[arranged.length - 1]) {
            midiNote += 12;
        }

        arranged.push(midiNote);
    }

    return arranged;
}

export default {
    fetchSampleBuffer,
    loadPianoSamples,
    playNote,
    arrangeNotesAscending,
    arrangeNotesDescending,
    getPianoKeyPositions
};
