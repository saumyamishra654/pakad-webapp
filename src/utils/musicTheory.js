// Core music theory logic (swaras, intervals, chord mapping)

export const swarNames = ['Sa', 'Re♭', 'Re', 'Ga♭', 'Ga', 'Ma', 'Ma♯', 'Pa', 'Dha♭', 'Dha', 'Ni♭', 'Ni'];
export const carnaticLabels = ['S', 'R1', 'R2/G1', 'R3/G2', 'G3', 'M1', 'M2', 'P', 'D1', 'D2/N1', 'D3/N2', 'N3'];

export const westernNotes = ['C', 'C#/D♭', 'D', 'D#/E♭', 'E', 'F', 'F#/G♭', 'G', 'G#/A♭', 'A', 'A#', 'B'];
export const westernNotesFlat = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
export const westernNotesSharp = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const CHORD_TYPES = [
    { id: 'major', name: 'Major', intervals: [0, 4, 7], color: '#3b82f6' },
    { id: 'minor', name: 'Minor', intervals: [0, 3, 7], color: '#8b5cf6' },
    { id: 'diminished', name: 'Diminished', intervals: [0, 3, 6], color: '#ef4444' },
    { id: 'sus4', name: 'Sus4', intervals: [0, 5, 7], color: '#10b981' },
    { id: 'augmented', name: 'Augmented', intervals: [0, 4, 8], color: '#f97316' },
    { id: 'major7', name: 'Major 7', intervals: [0, 4, 7, 11], color: '#22c55e' },
    { id: 'minor7', name: 'Minor 7', intervals: [0, 3, 7, 10], color: '#06b6d4' },
    { id: 'dom7', name: 'Dominant 7', intervals: [0, 4, 7, 10], color: '#eab308' },
    { id: 'sus2', name: 'Sus2', intervals: [0, 2, 7], color: '#14b8a6' },
    { id: 'dim7', name: 'Diminished 7', intervals: [0, 3, 6, 9], color: '#db2777' },
    { id: 'maj6', name: 'Major 6', intervals: [0, 4, 7, 9], color: '#a3e635' },
    { id: 'min6', name: 'Minor 6', intervals: [0, 3, 7, 9], color: '#f43f5e' },
    { id: 'm7b5', name: 'Half-diminished (m7♭5)', intervals: [0, 3, 6, 10], color: '#0ea5e9' }
];

export const countSwaras = (pattern) => {
    const swaraGroups = [[0], [1, 2], [3, 4], [5, 6], [7], [8, 9], [10, 11]];
    return swaraGroups.reduce((acc, grp) => acc + (grp.some(i => pattern[i] === 1) ? 1 : 0), 0);
};

export const getJati = (count) => {
    if (count === 5) return 'Audav (Pentatonic)';
    if (count === 6) return 'Shadav (Hexatonic)';
    if (count === 7) return 'Sampoorna (Heptatonic)';
    return `${count} notes`;
};

export const getExtendedIntervals = (baseIntervals, extend) => {
    if (!extend || !baseIntervals || baseIntervals.length < 3) return baseIntervals || [];
    const highest = Math.max(...baseIntervals);
    const add = (highest + 3) % 12;
    return [...baseIntervals, add];
};

export const availableChordsForPattern = (pattern, chordTypeId, extend, isCarnaticMode = false) => {
    const out = [];
    const types = (chordTypeId === 'all' || !chordTypeId) ? CHORD_TYPES : CHORD_TYPES.filter(c => c.id === chordTypeId);
    types.forEach(ct => {
        for (let root = 0; root < 12; root++) {
            if (!pattern[root]) continue;
            const intervals = getExtendedIntervals(ct.intervals, extend);
            const notes = intervals.map(x => (root + x) % 12);
            if (notes.every(n => pattern[n])) {
                out.push({
                    root,
                    rootName: (isCarnaticMode ? carnaticLabels[root] : swarNames[root]),
                    notes,
                    type: ct,
                    isExtended: extend && intervals.length > ct.intervals.length
                });
            }
        }
    });
    return out;
};

export const availableChordsAllowingOutside = (pattern, chordTypeId, extend, minOutside = 1, maxOutside = 1, enforceRootInPattern = true, isCarnaticMode = false) => {
    const out = [];
    const types = (chordTypeId === 'all' || !chordTypeId) ? CHORD_TYPES : CHORD_TYPES.filter(c => c.id === chordTypeId);
    types.forEach(ct => {
        for (let root = 0; root < 12; root++) {
            if (enforceRootInPattern && !pattern[root]) continue;
            const intervals = getExtendedIntervals(ct.intervals, extend);
            const notes = intervals.map(x => (root + x) % 12);
            const outsideNotes = notes.filter(n => !pattern[n]);
            const outsideCount = outsideNotes.length;
            const chordMaxOutside = Math.max(0, Math.min(maxOutside, notes.length - 1));
            if (outsideCount >= Math.max(1, minOutside) && outsideCount <= chordMaxOutside) {
                out.push({
                    root,
                    rootName: (isCarnaticMode ? carnaticLabels[root] : swarNames[root]),
                    notes,
                    type: ct,
                    isExtended: extend && intervals.length > ct.intervals.length,
                    outsideCount,
                    outsideNotes
                });
            }
        }
    });
    return out;
};

export const filterChordsByNote = (chords, selectedNote, mode) => {
    if (selectedNote === null || selectedNote === undefined) return chords;
    if (mode === 'any') return chords.filter(c => c.notes.includes(selectedNote));
    return chords.filter(c => c.root === selectedNote);
};

export const attachWesternNames = (chords, tonicIndex) => {
    if (tonicIndex === null || tonicIndex === undefined) return chords;
    const qualityFromId = (id) => {
        if (id === 'major') return '';
        if (id === 'minor') return 'm';
        if (id === 'diminished') return 'dim';
        if (id === 'augmented') return 'aug';
        if (id === 'sus4') return 'sus4';
        if (id === 'sus2') return 'sus2';
        if (id === 'major7') return 'maj7';
        if (id === 'minor7') return 'm7';
        if (id === 'dom7') return '7';
        if (id === 'dim7') return 'dim7';
        if (id === 'm7b5') return 'm7♭5';
        if (id === 'maj6') return '6';
        if (id === 'min6') return 'm6';
        return '';
    };
    return chords.map(chord => {
        const rootWesternIndex = (chord.root + tonicIndex) % 12;
        const rootNote = westernNotesFlat[rootWesternIndex];
        const quality = qualityFromId(chord.type?.id);
        const westernChordNotes = chord.notes.map(n => westernNotesFlat[(n + tonicIndex) % 12]);
        return { ...chord, westernName: `${rootNote}${quality}: ${westernChordNotes.join(' - ')}` };
    });
};

// Piano visualization helpers
export const getFrequencyFromNote = (noteIndex, octave = 4, selectedTonic = null) => {
    // use C4 = 261.63 Hz as base, but adjust the calculation
    const baseFreq = selectedTonic !== null ?
        261.63 * Math.pow(2, selectedTonic / 12) : // C4 adjusted for tonic
        261.63; // C4 default
    // calculate frequency using proper octave offset
    return baseFreq * Math.pow(2, (noteIndex / 12) + (octave - 4));
};

export const getPianoKeyPositions = (chordNotes, selectedTonic) => {
    if (!chordNotes || chordNotes.length === 0) return [];

    const tonicOffset = selectedTonic !== null ? selectedTonic : 0;
    const baseOctave = 4; // Start in octave 4

    // Get the root note (first note in the chord)
    const rootNote = (chordNotes[0] + tonicOffset) % 12;

    // Arrange chord notes properly starting from root
    const arrangedNotes = [];
    const rootMidi = baseOctave * 12 + rootNote;
    arrangedNotes.push(rootMidi);

    // Add other chord notes in the next octave if they would be lower than root
    let currentOctave = baseOctave;
    for (let i = 1; i < chordNotes.length; i++) {
        const noteIndex = (chordNotes[i] + tonicOffset) % 12;
        let midiNote = currentOctave * 12 + noteIndex;

        // If this note is lower than the previous note, move it to next octave
        if (midiNote <= arrangedNotes[arrangedNotes.length - 1]) {
            midiNote += 12;
        }

        arrangedNotes.push(midiNote);
    }

    return arrangedNotes;
};

export const arrangeNotesAscending = (noteIndices, baseOctave = 3, selectedTonic = null) => {
    if (!noteIndices || noteIndices.length === 0) return [];

    const arrangedNotes = [];
    // Start absolute semitone from first note in base octave
    let prevAbs = baseOctave * 12 + noteIndices[0];

    arrangedNotes.push({
        noteIndex: noteIndices[0],
        octave: baseOctave,
        frequency: getFrequencyFromNote(noteIndices[0], baseOctave, selectedTonic)
    });

    for (let i = 1; i < noteIndices.length; i++) {
        const pc = noteIndices[i];
        // Find the smallest octave such that this note is >= previous note
        let octave = Math.floor(prevAbs / 12);
        if (pc < (prevAbs % 12)) octave++;

        const abs = octave * 12 + pc;
        arrangedNotes.push({
            noteIndex: pc,
            octave: octave,
            frequency: getFrequencyFromNote(pc, octave, selectedTonic)
        });
        prevAbs = abs;
    }

    return arrangedNotes;
};

export const arrangeNotesDescending = (noteIndices, startingOctave = 4, includeLowerSa = true, baseLowerOctave = 3, selectedTonic = null) => {
    if (!noteIndices || noteIndices.length === 0) return [];

    const arranged = [];
    // Start on Sa at startingOctave (or first note if Sa not provided)
    const firstPc = noteIndices[0];
    let prevAbs = startingOctave * 12 + firstPc;

    arranged.push({
        noteIndex: firstPc,
        octave: startingOctave,
        frequency: getFrequencyFromNote(firstPc, startingOctave, selectedTonic)
    });

    for (let i = 1; i < noteIndices.length; i++) {
        const pc = noteIndices[i];
        // Find the highest octave for this pc that is strictly below prevAbs
        let octave = Math.floor(prevAbs / 12);
        if (pc >= (prevAbs % 12)) octave--;

        const abs = octave * 12 + pc;
        prevAbs = abs;
        arranged.push({
            noteIndex: pc,
            octave,
            frequency: getFrequencyFromNote(pc, octave, selectedTonic)
        });
    }

    // optionally finish on the next lower Sa if not already there
    if (includeLowerSa && noteIndices[noteIndices.length - 1] !== 0) {
        let octave = Math.floor(prevAbs / 12);
        if (0 >= (prevAbs % 12)) octave--;
        arranged.push({
            noteIndex: 0,
            octave,
            frequency: getFrequencyFromNote(0, octave, selectedTonic)
        });
    }

    return arranged;
};

export const arrangeChordNotes = (noteIndices, baseOctave = 3, selectedTonic = null) => {
    if (!noteIndices || noteIndices.length === 0) return [];

    // Sort chord notes to ensure bottom-up stacking
    const pcs = [...noteIndices].sort((a, b) => a - b);

    const arranged = [];
    let prevAbs = baseOctave * 12 + pcs[0];

    arranged.push({
        noteIndex: pcs[0],
        octave: baseOctave,
        frequency: getFrequencyFromNote(pcs[0], baseOctave, selectedTonic)
    });

    for (let i = 1; i < pcs.length; i++) {
        const pc = pcs[i];
        let octave = Math.floor(prevAbs / 12);
        if (pc < (prevAbs % 12)) octave++;

        const abs = octave * 12 + pc;
        arranged.push({
            noteIndex: pc,
            octave,
            frequency: getFrequencyFromNote(pc, octave, selectedTonic)
        });
        prevAbs = abs;
    }
    return arranged;
};
