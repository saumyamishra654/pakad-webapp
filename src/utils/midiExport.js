/**
 * MIDI Export Utilities
 * Functions for generating MIDI files from chord progressions
 */

import { arrangeChordNotes } from './chordHelpers.js';

/**
 * Create a variable-length quantity (VLQ) for MIDI delta times
 * @param {number} value - Value to encode
 * @returns {number[]} - Array of bytes
 */
function writeVLQ(value) {
    const bytes = [];
    let v = value;

    bytes.unshift(v & 0x7f);
    v >>= 7;

    while (v > 0) {
        bytes.unshift((v & 0x7f) | 0x80);
        v >>= 7;
    }

    return bytes;
}

/**
 * Convert BPM to MIDI tempo (microseconds per beat)
 * @param {number} bpm - Beats per minute
 * @returns {number} - Microseconds per beat
 */
function bpmToMidiTempo(bpm) {
    return Math.round(60000000 / bpm);
}

/**
 * Build a MIDI file from a chord progression
 * @param {Object} options - Configuration options
 * @param {Array} options.progression - Array of chord objects with notes
 * @param {number} options.tempo - BPM (default 120)
 * @param {number} options.noteLengthBeats - Note duration in beats (default 3.2)
 * @param {number} options.gapBeats - Gap between chords in beats (default 0.4)
 * @param {number} options.velocity - MIDI velocity 1-127 (default 96)
 * @param {number} options.channel - MIDI channel 1-16 (default 1)
 * @param {number} options.program - MIDI program/instrument 0-127 (default 0)
 * @param {number} options.baseOctave - Base octave for notes (default 4)
 * @param {number} options.tonic - Semitones to transpose by (selected tonic, 0 = C)
 * @returns {Uint8Array|null} - MIDI file bytes or null if empty
 */
export function buildMidiFromProgression({
    progression,
    tempo = 120,
    noteLengthBeats = 3.2,
    gapBeats = 0.4,
    velocity = 96,
    channel = 1,
    program = 0,
    baseOctave = 4,
    tonic = 0
}) {
    if (!progression || progression.length === 0) return null;

    const ticksPerBeat = 480; // Standard MIDI resolution
    const midiChannel = (channel - 1) & 0x0f; // Convert 1-16 to 0-15
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    // Only non-numbers fall back to defaults; 0 is a real value that gets clamped
    const num = (v, fallback) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
    const bpm = clamp(num(tempo, 120), 20, 300);
    const vel = clamp(Math.round(num(velocity, 96)), 1, 127);
    const lengthBeats = Math.max(0, num(noteLengthBeats, 0));
    const gap = Math.max(0, num(gapBeats, 0));

    // Build track events
    const events = [];

    // Tempo meta event
    const microsecondsPerBeat = bpmToMidiTempo(bpm);
    events.push({
        delta: 0,
        type: 'meta',
        data: [0x51, 0x03,
            (microsecondsPerBeat >> 16) & 0xff,
            (microsecondsPerBeat >> 8) & 0xff,
            microsecondsPerBeat & 0xff
        ]
    });

    // Program change
    events.push({
        delta: 0,
        type: 'channel',
        data: [0xc0 | midiChannel, clamp(Math.round(num(program, 0)), 0, 127)]
    });

    // Place each chord at its beat (items without a beat are spaced sequentially)
    const placed = progression
        .map((item, i) => ({
            notes: (item.chord || item).notes || [],
            beat: Number.isFinite(item.beat) && item.beat >= 0 ? item.beat : i * (lengthBeats + gap)
        }))
        .filter(item => item.notes.length > 0)
        .sort((a, b) => a.beat - b.beat);

    // Absolute-time note events, converted to deltas afterwards
    const timed = [];
    placed.forEach((item, i) => {
        const startTick = Math.round(item.beat * ticksPerBeat);
        let endTick = startTick + Math.round(lengthBeats * ticksPerBeat);
        const next = placed[i + 1];
        if (next) {
            // gap = silence before the next chord, capped so a chord never shrinks to nothing
            const nextTick = Math.round(next.beat * ticksPerBeat);
            const gapTicks = Math.min(Math.round(gap * ticksPerBeat), Math.floor((nextTick - startTick) / 2));
            endTick = Math.min(endTick, nextTick - gapTicks);
        }
        endTick = Math.max(endTick, startTick + 1);

        for (const { midiNote } of arrangeChordNotes(item.notes, baseOctave)) {
            const note = clamp(midiNote + tonic, 0, 127);
            timed.push({ tick: startTick, on: true, note });
            timed.push({ tick: endTick, on: false, note });
        }
    });
    // Note-offs before note-ons at the same tick so repeated notes retrigger cleanly
    timed.sort((a, b) => a.tick - b.tick || (a.on === b.on ? 0 : a.on ? 1 : -1));

    let prevTick = 0;
    for (const ev of timed) {
        events.push({
            delta: ev.tick - prevTick,
            type: 'channel',
            data: ev.on ? [0x90 | midiChannel, ev.note, vel] : [0x80 | midiChannel, ev.note, 0]
        });
        prevTick = ev.tick;
    }

    // End of track
    events.push({
        delta: 0,
        type: 'meta',
        data: [0x2f, 0x00]
    });

    // Build track data
    const trackData = [];
    for (const event of events) {
        trackData.push(...writeVLQ(event.delta));
        if (event.type === 'meta') {
            trackData.push(0xff, ...event.data);
        } else {
            trackData.push(...event.data);
        }
    }

    // Build MIDI file
    const header = [
        // "MThd" chunk
        0x4d, 0x54, 0x68, 0x64, // MThd
        0x00, 0x00, 0x00, 0x06, // Header length (6)
        0x00, 0x00,             // Format 0 (single track)
        0x00, 0x01,             // Number of tracks (1)
        (ticksPerBeat >> 8) & 0xff, ticksPerBeat & 0xff // Ticks per beat
    ];

    const trackHeader = [
        0x4d, 0x54, 0x72, 0x6b, // MTrk
        (trackData.length >> 24) & 0xff,
        (trackData.length >> 16) & 0xff,
        (trackData.length >> 8) & 0xff,
        trackData.length & 0xff
    ];

    return new Uint8Array([...header, ...trackHeader, ...trackData]);
}

/**
 * Download MIDI data as a file
 * @param {Uint8Array} midiData - MIDI file bytes
 * @param {string} filename - Filename (without extension)
 */
export function downloadMidi(midiData, filename = 'progression') {
    if (!midiData) return;

    const blob = new Blob([midiData], { type: 'audio/midi' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.mid`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
}

/**
 * Build and download MIDI from progression in one step
 * @param {Object} options - Same as buildMidiFromProgression
 * @param {string} filename - Output filename
 */
export function exportProgressionToMidi(options, filename = 'progression') {
    const midiData = buildMidiFromProgression(options);
    if (midiData) {
        downloadMidi(midiData, filename);
    }
}

export default {
    buildMidiFromProgression,
    downloadMidi,
    exportProgressionToMidi
};
