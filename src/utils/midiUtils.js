/**
 * MIDI utility functions for Samvad
 * Ported from the original prototype
 */

const writeVarLen = (value) => {
    let buffer = value & 0x7F;
    const bytes = [];
    while ((value >>= 7)) {
        buffer <<= 8;
        buffer |= ((value & 0x7F) | 0x80);
    }
    while (true) {
        bytes.push(buffer & 0xFF);
        if (buffer & 0x80) buffer >>= 8; else break;
    }
    return bytes;
};

/**
 * Builds a MIDI file from a list of chords placed on a timeline
 */
export const buildMidiFromChords = ({
    chords,
    tempoBPM = 120,
    velocity = 96,
    channel = 1,
    program = 0, // Acoustic Grand Piano
    tonicOffset = 0,
    baseOctave = 3,
    noteLengthBeats = 3.2, // Duration of each chord in beats
    gapBeats = 0.4 // Gap between chords in beats
}) => {
    if (!chords || chords.length === 0) return null;

    const TPQ = 480; // ticks per quarter
    const bpm = Math.min(300, Math.max(20, Number(tempoBPM) || 120));
    const tempoUS = Math.round(60000000 / bpm);
    const beatDurTicks = TPQ; // 1 beat = 1 quarter note

    const events = [];
    const pushEvent = (delta, bytes) => {
        events.push(...writeVarLen(delta), ...bytes);
    };

    // Tempo meta event
    pushEvent(0, [0xFF, 0x51, 0x03, (tempoUS >> 16) & 0xFF, (tempoUS >> 8) & 0xFF, tempoUS & 0xFF]);

    // Program change
    const ch = Math.max(1, Math.min(16, Number(channel) || 1)) - 1; // 0-15
    const p = Math.max(0, Math.min(127, Number(program) || 0));
    pushEvent(0, [0xC0 | ch, p]);

    const vel = Math.max(1, Math.min(127, Number(velocity) || 96));
    const noteLenTicks = Math.max(1, Math.round(Number(noteLengthBeats) * beatDurTicks));
    const gapTicks = Math.max(0, Math.round(Number(gapBeats) * beatDurTicks));

    // Valid chords sorted by beat
    const sortedChords = chords
        .filter(item => item.chord && Array.isArray(item.chord.notes) && item.chord.notes.length > 0)
        .sort((a, b) => a.beat - b.beat);

    // Build absolute-tick events
    const absEvents = [];
    sortedChords.forEach((item, i) => {
        const startTick = Math.round(item.beat * beatDurTicks);
        let endTick = startTick + noteLenTicks;
        if (i + 1 < sortedChords.length) {
            const nextStartTick = Math.round(sortedChords[i + 1].beat * beatDurTicks);
            const effectiveGap = Math.min(gapTicks, Math.floor((nextStartTick - startTick) / 2));
            endTick = Math.min(endTick, nextStartTick - effectiveGap);
        }
        endTick = Math.max(endTick, startTick + 1);

        item.chord.notes.forEach(n => {
            // Each note is pitch-class + tonicOffset, shifted to correct octave
            const pitch = (n + tonicOffset) % 12;
            const octaveShift = Math.floor((n + tonicOffset) / 12);
            const m = Math.max(0, Math.min(127, (baseOctave + octaveShift + 1) * 12 + pitch));
            absEvents.push({ tick: startTick, kind: 'on', note: m });
            absEvents.push({ tick: endTick, kind: 'off', note: m });
        });
    });

    // Sort by tick; note-offs before note-ons at the same tick (stable sort keeps chord order)
    absEvents.sort((a, b) => a.tick - b.tick || (a.kind === b.kind ? 0 : a.kind === 'off' ? -1 : 1));

    let prevTick = 0;
    for (const ev of absEvents) {
        const delta = ev.tick - prevTick;
        prevTick = ev.tick;
        if (ev.kind === 'on') pushEvent(delta, [0x90 | ch, ev.note, vel]);
        else pushEvent(delta, [0x80 | ch, ev.note, 64]);
    }

    // End of track
    pushEvent(0, [0xFF, 0x2F, 0x00]);

    // Build track chunk
    const trackData = Uint8Array.from(events);
    const trackHeader = new Uint8Array(8);
    trackHeader.set([0x4D, 0x54, 0x72, 0x6B]); // 'MTrk'
    const trackLen = trackData.length;
    trackHeader[4] = (trackLen >>> 24) & 0xFF;
    trackHeader[5] = (trackLen >>> 16) & 0xFF;
    trackHeader[6] = (trackLen >>> 8) & 0xFF;
    trackHeader[7] = trackLen & 0xFF;

    // Build header chunk (format 0, 1 track, TPQ)
    const header = new Uint8Array(14);
    header.set([0x4D, 0x54, 0x68, 0x64, 0x00, 0x00, 0x00, 0x06, 0x00, 0x00, 0x00, 0x01]);
    header[12] = (TPQ >>> 8) & 0xFF;
    header[13] = TPQ & 0xFF;

    // Concatenate
    const out = new Uint8Array(header.length + trackHeader.length + trackData.length);
    out.set(header, 0);
    out.set(trackHeader, header.length);
    out.set(trackData, header.length + trackHeader.length);

    return out;
};

export const downloadMidi = (bytes, fileName = 'samvad_composition.mid') => {
    if (!bytes) return;
    const blob = new Blob([bytes], { type: 'audio/midi' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
};

export const downloadProjectJson = (data, fileName = 'samvad_project.json') => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
};
