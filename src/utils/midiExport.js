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
    baseOctave = 4
}) {
    if (!progression || progression.length === 0) return null;

    const ticksPerBeat = 480; // Standard MIDI resolution
    const midiChannel = (channel - 1) & 0x0f; // Convert 1-16 to 0-15

    // Build track events
    const events = [];

    // Tempo meta event
    const microsecondsPerBeat = bpmToMidiTempo(tempo);
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
        data: [0xc0 | midiChannel, program & 0x7f]
    });


    const noteLengthTicks = Math.round(noteLengthBeats * ticksPerBeat);
    const gapTicks = Math.round(gapBeats * ticksPerBeat);

    for (const item of progression) {
        const chord = item.chord || item;
        const notes = chord.notes || [];

        if (notes.length === 0) {
            continue;
        }

        // Arrange notes for proper voicing
        const arranged = arrangeChordNotes(notes, baseOctave);

        // Note-on events (simultaneous)
        for (let i = 0; i < arranged.length; i++) {
            events.push({
                delta: i === 0 ? 0 : 0, // All start at same time
                type: 'channel',
                data: [0x90 | midiChannel, arranged[i].midiNote & 0x7f, velocity & 0x7f]
            });
        }

        // Note-off events (after noteLengthTicks)
        for (let i = 0; i < arranged.length; i++) {
            events.push({
                delta: i === 0 ? noteLengthTicks : 0,
                type: 'channel',
                data: [0x80 | midiChannel, arranged[i].midiNote & 0x7f, 0]
            });
        }
    }

    // End of track
    events.push({
        delta: gapTicks,
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
