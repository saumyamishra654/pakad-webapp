/**
 * ChordTool Page
 * Main chord formation interface with raga selection, chord visualization,
 * rhythm progression builder, and audio playback
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { HINDUSTANI_RAGAS } from '../data/ragaData.js';
import { MELAKARTA_72 } from '../data/melakartaData.js';
import { RagaSelector } from '../components/raga/RagaSelector.jsx';
import { ChordCircle } from '../components/chords/ChordCircle.jsx';
import { ChordCard, ChordGrid } from '../components/chords/ChordCard.jsx';
import { ChordTypeList } from '../components/chords/ChordTypeList.jsx';
import { PianoKeyboard } from '../components/common/PianoKeyboard.jsx';
import { TimelineGrid, PlaybackControls } from '../components/rhythm/TimelineGrid.jsx';
import { getAvailableChords, getChordsOutsidePattern, countChordsByType, arrangeChordNotes, filterChordsByNote } from '../utils/chordHelpers.js';
import { getDisplayLabels, patternToPitchClasses, WESTERN_NOTES_SHARP } from '../utils/noteHelpers.js';
import { arrangeNotesAscending, arrangeNotesDescending } from '../utils/audioHelpers.js';
import { buildMidiFromProgression, downloadMidi } from '../utils/midiExport.js';
import { useAudio } from '../hooks/useAudio.js';
import { usePianoSamples } from '../hooks/usePianoSamples.js';
import { useTanpura } from '../hooks/useTanpura.js';

/**
 * ChordTool main page component
 */
export function ChordTool() {
    const [searchParams] = useSearchParams();

    // Core state
    const [isCarnatic, setIsCarnatic] = useState(false);
    const [selectedRagaName, setSelectedRagaName] = useState('');
    const [selectedTonic, setSelectedTonic] = useState(0); // 0 = C

    // Chord filtering
    const [selectedChordType, setSelectedChordType] = useState('all');
    const [showExtended, setShowExtended] = useState(false);
    const [separateAarohAvroh, setSeparateAarohAvroh] = useState(false);
    const [showOutsideChords, setShowOutsideChords] = useState(false);
    const [outsideMinAllowed, setOutsideMinAllowed] = useState(1);
    const [outsideMaxAllowed, setOutsideMaxAllowed] = useState(1);

    // UI state
    const [showPiano, setShowPiano] = useState(false);
    const [activeTab, setActiveTab] = useState('chords'); // 'chords', 'custom'
    const [showRagaNotesOnKeyboard, setShowRagaNotesOnKeyboard] = useState(false);
    const [selectedNote, setSelectedNote] = useState(null);
    const [noteFilterMode, setNoteFilterMode] = useState('root'); // 'root' or 'any'
    const [showMoreAaroh, setShowMoreAaroh] = useState(false);
    const [showMoreAvroh, setShowMoreAvroh] = useState(false);
    const [showMoreAll, setShowMoreAll] = useState(false);

    // Custom scale state
    const [customScaleMode, setCustomScaleMode] = useState(false);
    const [customNotePattern, setCustomNotePattern] = useState(Array.from({ length: 12 }, (_, i) => i === 0 ? true : false));
    const [customAarohPattern, setCustomAarohPattern] = useState(Array.from({ length: 12 }, (_, i) => i === 0 ? true : false));
    const [customAvrohPattern, setCustomAvrohPattern] = useState(Array.from({ length: 12 }, (_, i) => i === 0 ? true : false));

    // Custom chord builder state
    const [customRoot, setCustomRoot] = useState(0);
    const [customIntervalsAbs, setCustomIntervalsAbs] = useState([0]); // Absolute intervals from root

    // Multiple rhythm progressions (4 tabs like original)
    const [rhythmProgressions, setRhythmProgressions] = useState([
        { id: 1, name: '1', chords: [], isPlaying: false, currentBeat: 0 },
        { id: 2, name: '2', chords: [], isPlaying: false, currentBeat: 0 },
        { id: 3, name: '3', chords: [], isPlaying: false, currentBeat: 0 },
        { id: 4, name: '4', chords: [], isPlaying: false, currentBeat: 0 }
    ]);
    const [activeProgressionId, setActiveProgressionId] = useState(1);
    const progressionIntervalRefs = useRef({});
    const nextChordIdRef = useRef(1);

    // Get active progression
    const activeProgression = useMemo(() => {
        return rhythmProgressions.find(p => p.id === activeProgressionId) || rhythmProgressions[0];
    }, [rhythmProgressions, activeProgressionId]);

    // Update a specific progression
    const updateProgression = useCallback((id, updates) => {
        setRhythmProgressions(prev => prev.map(p =>
            p.id === id ? { ...p, ...updates } : p
        ));
    }, []);

    // Rhythm/beat state
    const [beats, setBeats] = useState(8);
    const [bpm, setBpm] = useState(120);
    const [currentBeat, setCurrentBeat] = useState(-1);
    const [loop, setLoop] = useState(true);

    // Enhanced progression controls (matching original)
    const [rhythmPlaybackMode, setRhythmPlaybackMode] = useState('unison'); // 'unison' or 'melody'
    const [arpeggiationDelay, setArpeggiationDelay] = useState(0.08);
    const [chordNoteDuration, setChordNoteDuration] = useState(1.0);
    const [customBreakpoints, setCustomBreakpoints] = useState('');
    const [breakpointError, setBreakpointError] = useState('');

    // localStorage persistence for progressions
    useEffect(() => {
        try {
            const raw = localStorage.getItem('pakad_progressions');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length === 4) {
                    setRhythmProgressions(parsed.map(p => ({ ...p, isPlaying: false, currentBeat: 0 })));
                    // Ensure ID counter is ahead
                    const maxId = parsed.flatMap(p => p.chords || []).reduce((m, c) => Math.max(m, c.id || 0), 0);
                    nextChordIdRef.current = maxId + 1;
                }
            }
        } catch { }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem('pakad_progressions', JSON.stringify(rhythmProgressions));
        } catch { }
    }, [rhythmProgressions]);

    // MIDI settings
    const [showMidiSettings, setShowMidiSettings] = useState(false);
    const [showPianoChords, setShowPianoChords] = useState(false);
    const [midiTempo, setMidiTempo] = useState(120);
    const [midiProgram, setMidiProgram] = useState(0);
    const [midiVelocity, setMidiVelocity] = useState(96);
    const [midiNoteLengthBeats, setMidiNoteLengthBeats] = useState(3.2);
    const [midiGapBeats, setMidiGapBeats] = useState(0.4);
    const [midiChannel, setMidiChannel] = useState(1);

    // Audio
    const { audioContext, resume } = useAudio();
    const { playNote, playChord, isReady: pianoReady } = usePianoSamples(audioContext);
    const { isPlaying: isTanpuraPlaying, toggle: toggleTanpura, changeTonic } = useTanpura();

    // Get raga list
    const ragaList = useMemo(() => {
        return isCarnatic ? MELAKARTA_72 : HINDUSTANI_RAGAS;
    }, [isCarnatic]);

    // Handle URL param for raga selection (search both lists)
    useEffect(() => {
        const ragaParam = searchParams.get('raga');
        if (ragaParam) {
            const decodedName = decodeURIComponent(ragaParam);

            // Check Hindustani first
            const hindustaniMatch = HINDUSTANI_RAGAS.find(r => r.name === decodedName);
            if (hindustaniMatch) {
                setIsCarnatic(false);
                setSelectedRagaName(decodedName);
                return;
            }

            // Check Carnatic
            const carnaticMatch = MELAKARTA_72.find(r => r.name === decodedName);
            if (carnaticMatch) {
                setIsCarnatic(true);
                setSelectedRagaName(decodedName);
                return;
            }
        }
    }, [searchParams]);

    // Auto-select first raga if none selected AND no URL param
    useEffect(() => {
        // Don't auto-select if we're trying to load from URL
        if (searchParams.get('raga')) return;

        if (!selectedRagaName && ragaList.length > 0) {
            setSelectedRagaName(ragaList[0].name);
        }
    }, [ragaList, selectedRagaName, searchParams]);

    // Get selected raga object
    const selectedRaga = useMemo(() => {
        return ragaList.find(r => r.name === selectedRagaName) || null;
    }, [ragaList, selectedRagaName]);

    // Auto-set separateAarohAvroh when raga has different aaroh/avroh patterns
    useEffect(() => {
        if (selectedRaga && !customScaleMode) {
            // Sort both patterns to compare notes regardless of order
            const aarohSorted = [...selectedRaga.aarohPattern].sort();
            const avrohSorted = [...selectedRaga.avrohPattern].sort();
            const aarohStr = JSON.stringify(aarohSorted);
            const avrohStr = JSON.stringify(avrohSorted);
            if (aarohStr !== avrohStr) {
                setSeparateAarohAvroh(true);
            } else {
                setSeparateAarohAvroh(false);
            }
        }
    }, [selectedRaga, customScaleMode]);

    // current patterns from selected raga or custom scale
    const getCurrentPatterns = useCallback(() => {
        if (customScaleMode) {
            if (separateAarohAvroh) {
                const aar = customAarohPattern.map(v => v ? 1 : 0);
                const avr = customAvrohPattern.map(v => v ? 1 : 0);
                const all = aar.map((x, i) => (x || avr[i]) ? 1 : 0);
                return { all, aaroh: aar, avroh: avr };
            }
            const all = customNotePattern.map(v => v ? 1 : 0);
            return { all, aaroh: all, avroh: all };
        }
        if (!selectedRaga) return { all: [], aaroh: [], avroh: [] };
        return { all: selectedRaga.notePattern, aaroh: selectedRaga.aarohPattern, avroh: selectedRaga.avrohPattern };
    }, [customScaleMode, separateAarohAvroh, customNotePattern, customAarohPattern, customAvrohPattern, selectedRaga]);

    // Handle note click - cycle through: any -> root -> clear
    const handleNoteClick = useCallback((noteIndex) => {
        if (selectedNote === noteIndex) {
            // Same note clicked - cycle to next mode or clear
            if (noteFilterMode === 'any') {
                setNoteFilterMode('root');
            } else {
                // Was 'root', clear selection
                setSelectedNote(null);
                setNoteFilterMode('any'); // Reset for next selection
            }
        } else {
            // Different note clicked - start with 'any' mode
            setSelectedNote(noteIndex);
            setNoteFilterMode('any');
        }
    }, [selectedNote, noteFilterMode]);

    // Compute available chords
    const chordData = useMemo(() => {
        const patterns = getCurrentPatterns();
        if (patterns.all.length === 0) {
            return { all: [], aaroh: [], avroh: [], outside: [], counts: {} };
        }

        const all = getAvailableChords(patterns.all, selectedChordType, showExtended);
        const aaroh = separateAarohAvroh
            ? getAvailableChords(patterns.aaroh, selectedChordType, showExtended)
            : [];
        const avroh = separateAarohAvroh
            ? getAvailableChords(patterns.avroh, selectedChordType, showExtended)
            : [];

        // Outside chords
        let outside = [];
        let outsideAaroh = [];
        let outsideAvroh = [];
        if (showOutsideChords) {
            if (separateAarohAvroh) {
                outsideAaroh = getChordsOutsidePattern(patterns.aaroh, outsideMinAllowed, outsideMaxAllowed, selectedChordType, showExtended);
                outsideAvroh = getChordsOutsidePattern(patterns.avroh, outsideMinAllowed, outsideMaxAllowed, selectedChordType, showExtended);
            } else {
                outside = getChordsOutsidePattern(patterns.all, outsideMinAllowed, outsideMaxAllowed, selectedChordType, showExtended);
            }
        }

        // Apply note filter if selectedNote is set
        const applyNoteFilter = (chords) => {
            if (selectedNote === null) return chords;
            return filterChordsByNote(chords, selectedNote, noteFilterMode);
        };

        return {
            all: applyNoteFilter(all),
            aaroh: applyNoteFilter(aaroh),
            avroh: applyNoteFilter(avroh),
            outside: applyNoteFilter(outside),
            outsideAaroh: applyNoteFilter(outsideAaroh),
            outsideAvroh: applyNoteFilter(outsideAvroh),
            counts: countChordsByType(all)
        };
    }, [getCurrentPatterns, selectedChordType, showExtended, separateAarohAvroh, showOutsideChords, outsideMinAllowed, outsideMaxAllowed, selectedNote, noteFilterMode]);

    // Get current chords based on active tab
    const currentChords = useMemo(() => {
        switch (activeTab) {
            case 'aaroh': return chordData.aaroh;
            case 'avroh': return chordData.avroh;
            case 'outside': return chordData.outside;
            default: return chordData.all;
        }
    }, [activeTab, chordData]);

    // Handle raga selection
    const handleRagaSelect = useCallback((raga) => {
        setSelectedRagaName(raga.name);
    }, []);

    // Custom chord builder helpers
    const addStack = useCallback((interval) => {
        setCustomIntervalsAbs(prev => {
            const last = prev[prev.length - 1];
            return [...prev, last + interval];
        });
    }, []);

    const removeLast = useCallback(() => {
        setCustomIntervalsAbs(prev => prev.length > 1 ? prev.slice(0, -1) : prev);
    }, []);

    const resetCustom = useCallback(() => {
        setCustomIntervalsAbs([0]);
    }, []);

    // Compute custom chord notes
    const customNotesAll = useMemo(() => {
        return customIntervalsAbs.map(i => (customRoot + i) % 12);
    }, [customRoot, customIntervalsAbs]);

    // Validate custom chord against raga patterns
    const customValidation = useMemo(() => {
        const patterns = getCurrentPatterns();
        const checkValid = (pattern) => {
            if (pattern.length === 0) return false;
            return customNotesAll.every(n => pattern[n]);
        };
        return {
            all: checkValid(patterns.all),
            aaroh: checkValid(patterns.aaroh),
            avroh: checkValid(patterns.avroh)
        };
    }, [customNotesAll, getCurrentPatterns]);

    // Validate breakpoints pattern
    const validateBreakpoints = useCallback((pattern, totalBeats) => {
        if (!pattern.trim()) return { valid: true, error: '' };
        const parts = pattern.split('-').map(s => parseInt(s.trim()));
        if (parts.some(isNaN)) return { valid: false, error: 'Invalid format. Use numbers separated by dashes (e.g., 4-4)' };
        const sum = parts.reduce((a, b) => a + b, 0);
        if (sum !== totalBeats) return { valid: false, error: `Sum (${sum}) must equal beats (${totalBeats})` };
        return { valid: true, error: '' };
    }, []);

    // Handle mode change
    const handleModeChange = useCallback((carnatic) => {
        setIsCarnatic(carnatic);
        setSelectedRagaName(''); // Reset selection
    }, []);

    // Play a chord (isUnison=true for all notes at once, false for melody/arpeggiated)
    const handlePlayChord = useCallback(async (chord, isUnison = true) => {
        if (!pianoReady) {
            await resume();
            return;
        }

        const arranged = arrangeChordNotes(chord.notes, 4);
        const duration = chordNoteDuration || 0.8;

        if (isUnison) {
            // Play all notes at once
            for (const { noteIndex, octave } of arranged) {
                // Apply tonic offset and recalculate both note and octave
                const totalSemitones = noteIndex + selectedTonic + octave * 12;
                const transposedNote = ((totalSemitones % 12) + 12) % 12;
                const transposedOctave = Math.floor(totalSemitones / 12);
                playNote(transposedNote, transposedOctave, duration, 0, 0.8);
            }
        } else {
            // Play notes as a melody (arpeggiated)
            const delay = (arpeggiationDelay || 0.08) * 1000; // Convert to ms
            arranged.forEach(({ noteIndex, octave }, i) => {
                // Apply tonic offset and recalculate both note and octave
                const totalSemitones = noteIndex + selectedTonic + octave * 12;
                const transposedNote = ((totalSemitones % 12) + 12) % 12;
                const transposedOctave = Math.floor(totalSemitones / 12);
                setTimeout(() => playNote(transposedNote, transposedOctave, duration * 0.6, 0, 0.6), i * delay);
            });
        }
    }, [pianoReady, resume, playNote, selectedTonic, chordNoteDuration, arpeggiationDelay]);

    // Add chord to progression
    const handleChordPlace = useCallback((beatIndex, chord) => {
        const existingChords = activeProgression.chords.filter(c => Math.floor(c.beat) !== beatIndex);
        const newChord = {
            id: nextChordIdRef.current++,
            chord,
            beat: beatIndex,
            duration: 1
        };
        updateProgression(activeProgressionId, {
            chords: [...existingChords, newChord].sort((a, b) => a.beat - b.beat)
        });
    }, [activeProgression, activeProgressionId, updateProgression]);

    // Remove chord from progression
    const handleChordRemove = useCallback((beatIndex, chordId) => {
        if (chordId !== undefined) {
            updateProgression(activeProgressionId, {
                chords: activeProgression.chords.filter(c => c.id !== chordId)
            });
        } else {
            updateProgression(activeProgressionId, {
                chords: activeProgression.chords.filter(c => Math.floor(c.beat) !== beatIndex)
            });
        }
    }, [activeProgression, activeProgressionId, updateProgression]);

    // Playback controls
    const handlePlayPause = useCallback(() => {
        if (activeProgression.isPlaying) {
            updateProgression(activeProgressionId, { isPlaying: false, currentBeat: -1 });
        } else {
            updateProgression(activeProgressionId, { isPlaying: true, currentBeat: 0 });
        }
    }, [activeProgression, activeProgressionId, updateProgression]);

    const handleStop = useCallback(() => {
        updateProgression(activeProgressionId, { isPlaying: false, currentBeat: -1 });
    }, [activeProgressionId, updateProgression]);

    const handleClear = useCallback(() => {
        updateProgression(activeProgressionId, { chords: [], isPlaying: false, currentBeat: -1 });
    }, [activeProgressionId, updateProgression]);

    // Download progression as MIDI
    const handleDownloadMidi = useCallback(() => {
        if (activeProgression.chords.length === 0) return;

        const midiData = buildMidiFromProgression({
            progression: activeProgression.chords,
            tempo: midiTempo,
            noteLengthBeats: midiNoteLengthBeats,
            gapBeats: midiGapBeats,
            velocity: midiVelocity,
            channel: midiChannel,
            program: midiProgram,
            baseOctave: 4
        });

        if (midiData) {
            const filename = selectedRagaName
                ? `${selectedRagaName.replace(/\s+/g, '_')}_progression_${activeProgressionId}`
                : `chord_progression_${activeProgressionId}`;
            downloadMidi(midiData, filename);
        }
    }, [activeProgression, activeProgressionId, midiTempo, midiNoteLengthBeats, midiGapBeats, midiVelocity, midiChannel, midiProgram, selectedRagaName]);

    // Playback interval for active progression
    useEffect(() => {
        if (!activeProgression.isPlaying) return;

        const msPerBeat = 60000 / bpm;

        // Play chord at beat 0 immediately when playback starts
        const chordAtBeat0 = activeProgression.chords.find(c => Math.floor(c.beat) === 0);
        if (chordAtBeat0 && activeProgression.currentBeat === 0) {
            const isUnison = rhythmPlaybackMode === 'unison';
            handlePlayChord(chordAtBeat0.chord, isUnison);
        }

        const interval = setInterval(() => {
            setRhythmProgressions(prev => prev.map(p => {
                if (p.id !== activeProgressionId || !p.isPlaying) return p;

                const next = p.currentBeat + 1;
                if (next >= beats) {
                    if (loop) {
                        // Loop back and play chord at beat 0
                        const chordAt0 = p.chords.find(c => Math.floor(c.beat) === 0);
                        if (chordAt0) {
                            const isUnison = rhythmPlaybackMode === 'unison';
                            handlePlayChord(chordAt0.chord, isUnison);
                        }
                        return { ...p, currentBeat: 0 };
                    }
                    return { ...p, isPlaying: false, currentBeat: -1 };
                }

                // Play chord at this beat
                const chordAtBeat = p.chords.find(c => Math.floor(c.beat) === next);
                if (chordAtBeat) {
                    const isUnison = rhythmPlaybackMode === 'unison';
                    handlePlayChord(chordAtBeat.chord, isUnison);
                }

                return { ...p, currentBeat: next };
            }));
        }, msPerBeat);

        return () => clearInterval(interval);
    }, [activeProgression.isPlaying, activeProgression.currentBeat, activeProgression.chords, activeProgressionId, bpm, beats, loop, handlePlayChord, rhythmPlaybackMode]);

    // Update tanpura when tonic changes (only if already playing)
    // Use a ref to track previous tonic to only react to actual changes
    const prevTonicRef = useRef(selectedTonic);
    useEffect(() => {
        // Only change tonic if it actually changed and tanpura is playing
        if (prevTonicRef.current !== selectedTonic && isTanpuraPlaying) {
            changeTonic(selectedTonic, true); // true = autoPlay after changing
        }
        prevTonicRef.current = selectedTonic;
    }, [selectedTonic]); // eslint-disable-line react-hooks/exhaustive-deps

    const labels = useMemo(() => getDisplayLabels(isCarnatic), [isCarnatic]);

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 dark:text-gray-200">
            {/* Page Header */}
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2">
                    Raga-Based Chord Formation
                </h1>
                <p className="text-gray-600 dark:text-gray-400 text-lg">
                    Generate chords within raga frameworks
                </p>
            </div>

            {/* Top Control Bar - Exact match to index.html */}
            <div className="bg-white dark:bg-[#1f1b38] rounded-xl p-4 mb-8 shadow-lg border border-gray-200 dark:border-gray-700 text-xs">
                <div className="flex flex-col md:flex-row md:flex-wrap lg:flex-nowrap gap-6 justify-between items-start">
                    {/* Music System Toggle */}
                    <div className="px-2">
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 invisible">
                            &nbsp;
                        </label>
                        <div className="flex items-center gap-3">
                            <span className={`text-xs whitespace-nowrap ${!isCarnatic ? 'font-semibold text-blue-600' : 'text-gray-600 dark:text-gray-400'}`}>Hindustani</span>
                            <button
                                onClick={() => handleModeChange(!isCarnatic)}
                                className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors flex-shrink-0 ${isCarnatic ? 'bg-blue-600' : 'bg-gray-300'}`}
                                title="Toggle between Hindustani and Carnatic"
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isCarnatic ? 'translate-x-5' : 'translate-x-1'}`} />
                            </button>
                            <span className={`text-xs whitespace-nowrap ${isCarnatic ? 'font-semibold text-blue-600' : 'text-gray-600 dark:text-gray-400'}`}>Carnatic</span>
                        </div>
                    </div>

                    {/* Raga Selection */}
                    <div className="px-2 flex-1 min-w-[200px]">
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Selected {isCarnatic ? 'Melakarta' : 'Raga'}:
                        </label>
                        <select
                            value={selectedRagaName}
                            onChange={(e) => setSelectedRagaName(e.target.value)}
                            className="w-full p-2 text-xs border border-gray-600 rounded-lg bg-[#334155] text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">Select…</option>
                            {ragaList.map(r => (
                                <option key={r.name} value={r.name}>
                                    {isCarnatic && r.number ? `${r.number}. ${r.name}` : r.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Tonic Selection */}
                    <div className="px-2">
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Tonic:
                        </label>
                        <select
                            value={selectedTonic}
                            onChange={(e) => setSelectedTonic(parseInt(e.target.value))}
                            className="w-25 p-2 text-xs border border-gray-600 rounded-lg bg-[#334155] text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">No Tonic</option>
                            {WESTERN_NOTES_SHARP.map((note, index) => (
                                <option key={index} value={index}>
                                    {note}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Toggles & Custom Section */}
                    <div className="px-3 flex gap-6">
                        <div className="flex flex-wrap items-center gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1 invisible">
                                    &nbsp;
                                </label>
                                <label className="inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={separateAarohAvroh}
                                        onChange={e => setSeparateAarohAvroh(e.target.checked)}
                                        className="w-4 h-4"
                                    />
                                    <span className="ml-2 text-xs text-gray-700 dark:text-gray-300">
                                        Separate Aaroh/Avroh
                                    </span>
                                </label>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1 invisible">
                                    &nbsp;
                                </label>
                                <label className={`inline-flex items-center ${customScaleMode ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                                    <input
                                        type="checkbox"
                                        checked={showOutsideChords && !customScaleMode}
                                        onChange={e => {
                                            if (!customScaleMode) {
                                                setShowOutsideChords(e.target.checked);
                                            }
                                        }}
                                        disabled={customScaleMode}
                                        className="form-checkbox h-4 w-4 text-orange-600 rounded focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                    <span className="ml-2 text-xs text-gray-700 dark:text-gray-300">
                                        Show Chords Outside Raga
                                    </span>
                                </label>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1 invisible">
                                    &nbsp;
                                </label>
                                <label className="inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={showRagaNotesOnKeyboard}
                                        onChange={e => setShowRagaNotesOnKeyboard(e.target.checked)}
                                        className="form-checkbox h-4 w-4 text-purple-600 rounded focus:ring-purple-500"
                                    />
                                    <span className="ml-2 text-xs text-gray-700 dark:text-gray-300">
                                        Show Raga Notes on Keyboard
                                    </span>
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1 invisible">
                                &nbsp;
                            </label>
                            <div>
                                <label className="inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={customScaleMode}
                                        onChange={e => setCustomScaleMode(e.target.checked)}
                                        className="form-checkbox h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                                    />
                                    <span className="ml-2 text-xs text-gray-700 dark:text-gray-300">Custom Scale</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Second Row - Play buttons and toggles */}
                <div className="flex flex-wrap items-center justify-center gap-3 mt-4 pt-4 border-t border-gray-600">
                    {/* Play Aaroh */}
                    <button
                        onClick={() => {
                            if (!pianoReady) { resume(); return; }
                            const patterns = getCurrentPatterns();
                            const aarohPcs = patternToPitchClasses(patterns.aaroh.length ? patterns.aaroh : patterns.all);
                            const baseOctave = 4;

                            // Use arrangeNotesAscending (matches original index.html)
                            const aarohNotesBase = arrangeNotesAscending(aarohPcs, baseOctave);

                            // Add higher Sa at the end
                            const higherSaOctave = aarohNotesBase.length > 0
                                ? Math.max(...aarohNotesBase.map(n => n.octave)) + 1
                                : baseOctave + 1;
                            const aarohNotes = [...aarohNotesBase, { noteIndex: 0, octave: higherSaOctave }];

                            // Play with tonic transposition
                            aarohNotes.forEach((note, i) => {
                                const totalSemitones = note.noteIndex + selectedTonic + note.octave * 12;
                                const transposedNote = ((totalSemitones % 12) + 12) % 12;
                                const transposedOctave = Math.floor(totalSemitones / 12);
                                setTimeout(() => playNote(transposedNote, transposedOctave, 0.6), i * 400);
                            });
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm flex items-center gap-2 hover:bg-blue-700 transition-colors"
                    >
                        <span>▶</span> Aaroh
                    </button>

                    {/* Play Avroh */}
                    <button
                        onClick={() => {
                            if (!pianoReady) { resume(); return; }
                            const patterns = getCurrentPatterns();
                            const avrohPcs = patternToPitchClasses(patterns.avroh.length ? patterns.avroh : patterns.all);
                            const baseOctave = 4;

                            // First determine upper Sa octave from aaroh to be consistent
                            const aarohPcs = patternToPitchClasses(patterns.aaroh.length ? patterns.aaroh : patterns.all);
                            const aarohNotesBase = arrangeNotesAscending(aarohPcs, baseOctave);
                            const higherSaOctave = aarohNotesBase.length > 0
                                ? Math.max(...aarohNotesBase.map(n => n.octave)) + 1
                                : baseOctave + 1;

                            // Use arrangeNotesDescending (matches original index.html)
                            const avrohNotes = arrangeNotesDescending(avrohPcs, higherSaOctave, true, baseOctave);

                            // Play with tonic transposition
                            avrohNotes.forEach((note, i) => {
                                const totalSemitones = note.noteIndex + selectedTonic + note.octave * 12;
                                const transposedNote = ((totalSemitones % 12) + 12) % 12;
                                const transposedOctave = Math.floor(totalSemitones / 12);
                                setTimeout(() => playNote(transposedNote, transposedOctave, 0.6), i * 400);
                            });
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium text-sm flex items-center gap-2 hover:bg-green-700 transition-colors"
                    >
                        <span>▶</span> Avroh
                    </button>

                    {/* Play Full Raga */}
                    <button
                        onClick={() => {
                            if (!pianoReady) { resume(); return; }
                            const patterns = getCurrentPatterns();
                            const baseOctave = 4;

                            // Build aaroh (matches original index.html)
                            const aarohPcs = patternToPitchClasses(patterns.aaroh.length ? patterns.aaroh : patterns.all);
                            const aarohNotesBase = arrangeNotesAscending(aarohPcs, baseOctave);
                            const higherSaOctave = aarohNotesBase.length > 0
                                ? Math.max(...aarohNotesBase.map(n => n.octave)) + 1
                                : baseOctave + 1;
                            const aarohNotes = [...aarohNotesBase, { noteIndex: 0, octave: higherSaOctave }];

                            // Build avroh starting from higherSa octave (matches original)
                            const avrohPcs = patternToPitchClasses(patterns.avroh.length ? patterns.avroh : patterns.all);
                            const avrohNotes = arrangeNotesDescending(avrohPcs, higherSaOctave, true, baseOctave);

                            // Play aaroh first
                            aarohNotes.forEach((note, i) => {
                                const totalSemitones = note.noteIndex + selectedTonic + note.octave * 12;
                                const transposedNote = ((totalSemitones % 12) + 12) % 12;
                                const transposedOctave = Math.floor(totalSemitones / 12);
                                setTimeout(() => playNote(transposedNote, transposedOctave, 0.6), i * 400);
                            });

                            // Then play avroh after aaroh + small pause
                            const aarohDuration = aarohNotes.length * 400;
                            const pauseBetween = 300;

                            avrohNotes.forEach((note, i) => {
                                const totalSemitones = note.noteIndex + selectedTonic + note.octave * 12;
                                const transposedNote = ((totalSemitones % 12) + 12) % 12;
                                const transposedOctave = Math.floor(totalSemitones / 12);
                                setTimeout(() => playNote(transposedNote, transposedOctave, 0.6), aarohDuration + pauseBetween + (i * 400));
                            });
                        }}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium text-sm flex items-center gap-2 hover:bg-purple-700 transition-colors"
                    >
                        <span>▶</span> Full Raga
                    </button>

                    {/* Show/Hide Keyboard Toggle */}
                    <button
                        onClick={() => setShowPiano(!showPiano)}
                        className="px-4 py-2 rounded-lg font-medium text-sm bg-gray-600 text-white hover:bg-gray-500 transition-colors"
                    >
                        {showPiano ? 'Hide Keyboard' : 'Show Keyboard'}
                    </button>

                    {/* Tanpura Toggle */}
                    <button
                        onClick={() => toggleTanpura(selectedTonic)}
                        className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors ${isTanpuraPlaying
                            ? 'bg-orange-500 text-white'
                            : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                            }`}
                    >
                        <span>▶</span> Tanpura
                    </button>

                    {/* Outside Chords Min/Max Controls */}
                    {showOutsideChords && !customScaleMode && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-gray-700 rounded-lg">
                            <span className="text-xs text-orange-300">Outside:</span>
                            <select
                                value={outsideMinAllowed}
                                onChange={e => {
                                    const newMin = parseInt(e.target.value, 10);
                                    setOutsideMinAllowed(newMin);
                                    if (outsideMaxAllowed < newMin) setOutsideMaxAllowed(newMin);
                                }}
                                className="w-12 p-1 border border-gray-500 rounded text-xs bg-gray-600 text-white"
                                title="Min notes outside"
                            >
                                <option value={1}>1</option>
                                <option value={2}>2</option>
                                <option value={3}>3</option>
                            </select>
                            <span className="text-xs text-gray-400">-</span>
                            <select
                                value={outsideMaxAllowed}
                                onChange={e => {
                                    const newMax = parseInt(e.target.value, 10);
                                    setOutsideMaxAllowed(newMax);
                                    if (outsideMinAllowed > newMax) setOutsideMinAllowed(newMax);
                                }}
                                className="w-12 p-1 border border-gray-500 rounded text-xs bg-gray-600 text-white"
                                title="Max notes outside"
                            >
                                <option value={1}>1</option>
                                <option value={2}>2</option>
                                <option value={3}>3</option>
                            </select>
                        </div>
                    )}
                </div>

                {/* Custom Scale Editor - shown when customScaleMode is enabled */}
                {customScaleMode && (
                    <div className="mt-4 p-4 rounded-lg border border-gray-600 bg-gray-800/50">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-gray-300">Custom Scale Editor</h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setCustomNotePattern(Array.from({ length: 12 }, (_, i) => i === 0));
                                        setCustomAarohPattern(Array.from({ length: 12 }, (_, i) => i === 0));
                                        setCustomAvrohPattern(Array.from({ length: 12 }, (_, i) => i === 0));
                                    }}
                                    className="px-2 py-1 text-xs rounded border border-gray-500 bg-gray-700 hover:bg-gray-600 text-gray-300"
                                >
                                    Clear
                                </button>
                                <button
                                    onClick={() => {
                                        if (!selectedRaga) return;
                                        setCustomNotePattern(selectedRaga.notePattern.map((v, i) => i === 0 ? true : !!v));
                                        setCustomAarohPattern((selectedRaga.aarohPattern || selectedRaga.notePattern).map((v, i) => i === 0 ? true : !!v));
                                        setCustomAvrohPattern((selectedRaga.avrohPattern || selectedRaga.notePattern).map((v, i) => i === 0 ? true : !!v));
                                    }}
                                    className="px-2 py-1 text-xs rounded border border-gray-500 bg-gray-700 hover:bg-gray-600 text-gray-300"
                                >
                                    Copy From Raga
                                </button>
                            </div>
                        </div>

                        {!separateAarohAvroh ? (
                            <div>
                                <div className="text-xs text-gray-400 mb-2">Select notes for the scale</div>
                                <div className="flex flex-wrap gap-1">
                                    {labels.map((s, i) => (
                                        <button
                                            key={i}
                                            onClick={() => i !== 0 && setCustomNotePattern(prev => prev.map((v, idx) => idx === i ? !v : v))}
                                            disabled={i === 0}
                                            className={`px-2 py-1 text-xs rounded border transition-colors ${customNotePattern[i]
                                                ? 'bg-emerald-600 border-emerald-400 text-white'
                                                : 'bg-gray-700 border-gray-500 hover:bg-gray-600 text-gray-300'
                                                } ${i === 0 ? 'opacity-70 cursor-not-allowed' : ''}`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <div className="text-xs text-gray-400 mb-2">Aaroh (Ascending)</div>
                                    <div className="flex flex-wrap gap-1">
                                        {labels.map((s, i) => {
                                            const active = customAarohPattern[i];
                                            return (
                                                <button
                                                    key={`aar-${i}`}
                                                    onClick={() => i !== 0 && setCustomAarohPattern(prev => prev.map((v, idx) => idx === i ? !v : v))}
                                                    disabled={i === 0}
                                                    className={`px-2 py-1 text-xs rounded border transition-colors ${active
                                                        ? 'bg-emerald-600 border-emerald-400 text-white'
                                                        : 'bg-gray-700 border-gray-500 hover:bg-gray-600 text-gray-300'
                                                        } ${i === 0 ? 'opacity-70 cursor-not-allowed' : ''}`}
                                                >
                                                    {s}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-400 mb-2">Avroh (Descending)</div>
                                    <div className="flex flex-wrap gap-1">
                                        {labels.map((s, i) => {
                                            const active = customAvrohPattern[i];
                                            return (
                                                <button
                                                    key={`avr-${i}`}
                                                    onClick={() => i !== 0 && setCustomAvrohPattern(prev => prev.map((v, idx) => idx === i ? !v : v))}
                                                    disabled={i === 0}
                                                    className={`px-2 py-1 text-xs rounded border transition-colors ${active
                                                        ? 'bg-emerald-600 border-emerald-400 text-white'
                                                        : 'bg-gray-700 border-gray-500 hover:bg-gray-600 text-gray-300'
                                                        } ${i === 0 ? 'opacity-70 cursor-not-allowed' : ''}`}
                                                >
                                                    {s}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Piano Keyboard - positioned between control bar and circles */}
            {showPiano && selectedRaga && (
                <div className="bg-[#1f1b38] rounded-xl shadow-lg p-6 border border-gray-700 mb-6">
                    <PianoKeyboard
                        highlightedNotes={showRagaNotesOnKeyboard ? patternToPitchClasses(getCurrentPatterns().all) : []}
                        isCarnatic={isCarnatic}
                        tonic={selectedTonic}
                        onNoteClick={(noteIndex, octave) => playNote((noteIndex + selectedTonic) % 12, octave, 0.5)}
                        swarLabels={showRagaNotesOnKeyboard ? getCurrentPatterns().all.map((p, i) => p ? i : null) : null}
                    />
                </div>
            )}


            {/* Tab Navigation */}
            <div className="mt-4 mb-3">
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('chords')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'chords'
                            ? 'bg-blue-500 text-white'
                            : 'border border-gray-600 text-gray-300 hover:bg-gray-700'
                            }`}
                    >
                        Chord Visualization
                    </button>
                    <button
                        onClick={() => setActiveTab('custom')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'custom'
                            ? 'bg-pink-500 text-white'
                            : 'border border-gray-600 text-gray-300 hover:bg-gray-700'
                            }`}
                    >
                        Custom Chords
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'chords' && (
                <div className="flex flex-col xl:flex-row gap-6">
                    {/* Left sidebar - Chord type buttons */}
                    <div className="w-full xl:w-80 flex-shrink-0">
                        <h2 className="text-lg font-semibold text-white mb-4">Chord Types</h2>
                        <ChordTypeList
                            selected={selectedChordType}
                            onSelect={setSelectedChordType}
                            counts={chordData.counts}
                            showExtended={showExtended}
                            onToggleExtended={setShowExtended}
                        />
                    </div>

                    {/* Right main content area */}
                    <div className="flex-1 w-full">
                        {separateAarohAvroh ? (
                            <div>
                                {/* Click hint - shown once */}
                                <div className="flex items-center justify-center gap-2 mb-4 px-3 py-1 bg-blue-900/40 rounded-full w-fit mx-auto">
                                    <svg width="12" height="12" viewBox="0 0 12 12" className="text-blue-400">
                                        <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="1" />
                                        <circle cx="6" cy="6" r="2" fill="currentColor" />
                                    </svg>
                                    <span className="text-xs text-blue-300 font-medium">Click notes to filter chords</span>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div className="text-center">
                                        <h3 className="text-lg font-medium text-blue-300 mb-3">Aaroh (Ascending)</h3>
                                        <ChordCircle
                                            pattern={getCurrentPatterns().aaroh}
                                            chords={chordData.aaroh}
                                            onNoteClick={handleNoteClick}
                                            selectedNote={selectedNote}
                                            noteFilterMode={noteFilterMode}
                                            isCarnatic={isCarnatic}
                                            size={340}
                                            hideLegend={true}
                                            hideClickHint={true}
                                        />
                                    </div>
                                    <div className="text-center">
                                        <h3 className="text-lg font-medium text-green-300 mb-3">Avroh (Descending)</h3>
                                        <ChordCircle
                                            pattern={getCurrentPatterns().avroh}
                                            chords={chordData.avroh}
                                            onNoteClick={handleNoteClick}
                                            selectedNote={selectedNote}
                                            noteFilterMode={noteFilterMode}
                                            isCarnatic={isCarnatic}
                                            size={340}
                                            hideLegend={true}
                                            hideClickHint={true}
                                        />
                                    </div>
                                </div>

                                {/* Legend - shown once */}
                                <div className="mt-4 text-center">
                                    <div className="flex items-center justify-center gap-4 text-sm flex-wrap">
                                        <div className="flex items-center gap-1">
                                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                            <span className="text-gray-400">Available Notes</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                                            <span className="text-gray-400">Chord Roots</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                                            <span className="text-gray-400">Any Position</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
                                            <span className="text-gray-400">As Root Only</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex justify-center">
                                <ChordCircle
                                    pattern={getCurrentPatterns().all}
                                    chords={chordData.all}
                                    onNoteClick={handleNoteClick}
                                    selectedNote={selectedNote}
                                    noteFilterMode={noteFilterMode}
                                    isCarnatic={isCarnatic}
                                    size={340}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Custom Chord Tab */}
            {activeTab === 'custom' && (
                <div className="flex flex-col xl:flex-row gap-6">
                    {/* Left sidebar - Custom Chord Builder */}
                    <div className="w-full xl:w-80 flex-shrink-0">
                        <h2 className="text-lg font-semibold text-white mb-4">Custom Chord Builder</h2>
                        <div className="space-y-4 bg-[#1f1b38] rounded-xl p-4 border border-gray-700">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Root</label>
                                <select
                                    value={customRoot}
                                    onChange={e => setCustomRoot(parseInt(e.target.value))}
                                    className="w-full p-2 text-sm border border-gray-600 rounded-lg bg-gray-700 text-white"
                                >
                                    {labels.map((s, idx) => (
                                        <option key={idx} value={idx}>{s}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Add Intervals</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => addStack(3)} className="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-200">+m3</button>
                                    <button onClick={() => addStack(4)} className="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-200">+M3</button>
                                    <button onClick={() => addStack(5)} className="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-200">+4th</button>
                                    <button onClick={() => addStack(6)} className="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-200">+Tritone</button>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={removeLast} disabled={customIntervalsAbs.length <= 1} className="flex-1 px-2 py-1 text-xs rounded border border-gray-600 bg-gray-700 hover:bg-gray-600 text-gray-200 disabled:opacity-50">Undo</button>
                                <button onClick={resetCustom} className="flex-1 px-2 py-1 text-xs rounded border border-gray-600 bg-gray-700 hover:bg-gray-600 text-gray-200">Reset</button>
                            </div>
                            <div className="text-xs text-gray-300 space-y-2 p-3 bg-gray-800 rounded">
                                <div><strong>Steps:</strong> {customIntervalsAbs.map((v, i, arr) => i === 0 ? '0' : `+${v - arr[i - 1]}`).join(' ')}</div>
                                <div><strong>Notes:</strong> {customNotesAll.map(i => labels[i]).join(' - ')}</div>
                                <div className="flex gap-1 flex-wrap">
                                    <span className={`px-2 py-0.5 rounded text-xs ${customValidation.all ? 'bg-green-800 text-green-200' : 'bg-red-800 text-red-200'}`}>All {customValidation.all ? '✓' : '✗'}</span>
                                    <span className={`px-2 py-0.5 rounded text-xs ${customValidation.aaroh ? 'bg-green-800 text-green-200' : 'bg-red-800 text-red-200'}`}>Aaroh {customValidation.aaroh ? '✓' : '✗'}</span>
                                    <span className={`px-2 py-0.5 rounded text-xs ${customValidation.avroh ? 'bg-green-800 text-green-200' : 'bg-red-800 text-red-200'}`}>Avroh {customValidation.avroh ? '✓' : '✗'}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    if (!pianoReady) { resume(); return; }
                                    customNotesAll.forEach((n, i) => {
                                        setTimeout(() => playNote((n + selectedTonic) % 12, 4, 0.8), i * 80);
                                    });
                                }}
                                className="w-full py-2 rounded-lg font-medium bg-pink-600 text-white hover:bg-pink-700"
                            >
                                ▶ Play Custom Chord
                            </button>
                        </div>
                    </div>

                    {/* Right main content area */}
                    <div className="flex-1 w-full flex justify-center">
                        <ChordCircle
                            pattern={getCurrentPatterns().all}
                            chords={[]}
                            customNotes={customNotesAll}
                            isCarnatic={isCarnatic}
                            size={340}
                        />
                    </div>
                </div>
            )}

            {/* Main Content Wrapper */}
            <div className="space-y-6 mt-6">


                {/* Available Chords (with Progression Builder inside) */}
                <div className="bg-[#1f1b38] rounded-xl shadow-lg p-6 border border-gray-700">
                    <h2 className="text-xl font-semibold text-white mb-4">
                        Available Chords
                    </h2>

                    {!separateAarohAvroh ? (
                        <div className="max-h-64 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                                {currentChords.map((chord, index) => (
                                    <ChordCard
                                        key={`all-${chord.root}-${chord.type}-${index}`}
                                        chord={chord}
                                        onPlayUnison={() => handlePlayChord(chord, true)}
                                        onPlayMelody={() => handlePlayChord(chord, false)}
                                        tonic={selectedTonic}
                                        isCarnatic={isCarnatic}
                                        isExtended={chord.isExtended}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-6">
                            {/* Aaroh Chords - Scrollable */}
                            <div>
                                <h3 className="text-lg font-medium text-blue-300 mb-3">Aaroh Chords ({chordData.aaroh.length})</h3>
                                <div className="max-h-64 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        {chordData.aaroh.map((chord, index) => (
                                            <ChordCard
                                                key={`aaroh-${chord.root}-${chord.type}-${index}`}
                                                chord={chord}
                                                onPlayUnison={() => handlePlayChord(chord, true)}
                                                onPlayMelody={() => handlePlayChord(chord, false)}
                                                tonic={selectedTonic}
                                                isCarnatic={isCarnatic}
                                                isExtended={chord.isExtended}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                            {/* Avroh Chords - Scrollable */}
                            <div>
                                <h3 className="text-lg font-medium text-green-300 mb-3">Avroh Chords ({chordData.avroh.length})</h3>
                                <div className="max-h-64 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        {chordData.avroh.map((chord, index) => (
                                            <ChordCard
                                                key={`avroh-${chord.root}-${chord.type}-${index}`}
                                                chord={chord}
                                                onPlayUnison={() => handlePlayChord(chord, true)}
                                                onPlayMelody={() => handlePlayChord(chord, false)}
                                                tonic={selectedTonic}
                                                isCarnatic={isCarnatic}
                                                isExtended={chord.isExtended}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Chords Outside Raga Section */}
                    {showOutsideChords && !customScaleMode && (
                        (separateAarohAvroh ? (chordData.outsideAaroh.length > 0 || chordData.outsideAvroh.length > 0) : chordData.outside.length > 0)
                    ) && (
                            <div className="mt-6 pt-6 border-t border-gray-600">
                                <h3 className="text-lg font-semibold text-orange-300 mb-2">
                                    Chords Outside Raga
                                </h3>
                                <p className="text-sm text-gray-400 mb-4">
                                    Chords with {outsideMinAllowed === outsideMaxAllowed
                                        ? `${outsideMinAllowed} note${outsideMinAllowed > 1 ? 's' : ''}`
                                        : `${outsideMinAllowed}-${outsideMaxAllowed} notes`
                                    } outside the raga. Notes outside are highlighted in yellow.
                                </p>

                                {separateAarohAvroh ? (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        {/* Outside Aaroh */}
                                        {chordData.outsideAaroh.length > 0 && (
                                            <div>
                                                <h4 className="text-md font-medium text-blue-300 mb-3">Aaroh ({chordData.outsideAaroh.length})</h4>
                                                <div className="max-h-48 overflow-y-auto pr-2">
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                        {chordData.outsideAaroh.map((chord, index) => (
                                                            <ChordCard
                                                                key={`outside-aaroh-${chord.root}-${chord.type}-${index}`}
                                                                chord={chord}
                                                                onPlayUnison={() => handlePlayChord(chord, true)}
                                                                onPlayMelody={() => handlePlayChord(chord, false)}
                                                                tonic={selectedTonic}
                                                                isCarnatic={isCarnatic}
                                                                isExtended={chord.isExtended}
                                                                isOutside={true}
                                                                ragaPattern={getCurrentPatterns().aaroh}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {/* Outside Avroh */}
                                        {chordData.outsideAvroh.length > 0 && (
                                            <div>
                                                <h4 className="text-md font-medium text-green-300 mb-3">Avroh ({chordData.outsideAvroh.length})</h4>
                                                <div className="max-h-48 overflow-y-auto pr-2">
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                        {chordData.outsideAvroh.map((chord, index) => (
                                                            <ChordCard
                                                                key={`outside-avroh-${chord.root}-${chord.type}-${index}`}
                                                                chord={chord}
                                                                onPlayUnison={() => handlePlayChord(chord, true)}
                                                                onPlayMelody={() => handlePlayChord(chord, false)}
                                                                tonic={selectedTonic}
                                                                isCarnatic={isCarnatic}
                                                                isExtended={chord.isExtended}
                                                                isOutside={true}
                                                                ragaPattern={getCurrentPatterns().avroh}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="max-h-64 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                                            {chordData.outside.map((chord, index) => (
                                                <ChordCard
                                                    key={`outside-${chord.root}-${chord.type}-${index}`}
                                                    chord={chord}
                                                    onPlayUnison={() => handlePlayChord(chord, true)}
                                                    onPlayMelody={() => handlePlayChord(chord, false)}
                                                    tonic={selectedTonic}
                                                    isCarnatic={isCarnatic}
                                                    isExtended={chord.isExtended}
                                                    isOutside={true}
                                                    ragaPattern={getCurrentPatterns().all}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                    {/* Chord Progression Builder - now inside Available Chords */}
                    <div className="mt-6 pt-6 border-t border-gray-600">
                        <h3 className="text-lg font-semibold text-white mb-4">
                            Chord Progression Builder
                        </h3>

                        {/* Progression Tabs */}
                        <div className="flex gap-2 mb-4">
                            {rhythmProgressions.map(prog => (
                                <button
                                    key={prog.id}
                                    onClick={() => setActiveProgressionId(prog.id)}
                                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeProgressionId === prog.id
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }`}
                                >
                                    {prog.name}
                                    {prog.chords.length > 0 && (
                                        <span className="ml-1 text-xs opacity-70">
                                            ({prog.chords.length})
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Global Controls Row */}
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                            {/* Beats */}
                            <label className="flex items-center gap-2 text-sm">
                                <span className="text-gray-300">Beats:</span>
                                <input
                                    type="number"
                                    min="2"
                                    max="18"
                                    value={beats}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '') setBeats('');
                                        else {
                                            const num = parseInt(val);
                                            if (!isNaN(num)) setBeats(Math.max(2, Math.min(18, num)));
                                        }
                                    }}
                                    className="w-16 px-2 py-1 border border-gray-600 rounded text-sm bg-gray-700 text-white"
                                />
                            </label>

                            {/* BPM */}
                            <label className="flex items-center gap-2 text-sm">
                                <span className="text-gray-300">BPM:</span>
                                <input
                                    type="number"
                                    min="40"
                                    max="240"
                                    value={bpm}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '') setBpm('');
                                        else {
                                            const num = parseInt(val);
                                            if (!isNaN(num)) setBpm(Math.max(40, Math.min(240, num)));
                                        }
                                    }}
                                    className="w-16 px-2 py-1 border border-gray-600 rounded text-sm bg-gray-700 text-white"
                                />
                            </label>

                            {/* Mode */}
                            <label className="flex items-center gap-2 text-sm">
                                <span className="text-gray-300">Mode:</span>
                                <select
                                    value={rhythmPlaybackMode}
                                    onChange={(e) => setRhythmPlaybackMode(e.target.value)}
                                    className="px-2 py-1 border border-gray-600 rounded text-sm bg-gray-700 text-white"
                                >
                                    <option value="unison">Unison</option>
                                    <option value="melody">Melody</option>
                                </select>
                            </label>

                            {/* Arp Delay (only when melody mode) */}
                            {rhythmPlaybackMode === 'melody' && (
                                <label className="flex items-center gap-2 text-sm">
                                    <span className="text-gray-300">Arp Delay:</span>
                                    <input
                                        type="number"
                                        min="0"
                                        max="1"
                                        step="0.01"
                                        value={arpeggiationDelay}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === '') setArpeggiationDelay('');
                                            else {
                                                const num = parseFloat(val);
                                                if (!isNaN(num)) setArpeggiationDelay(num);
                                            }
                                        }}
                                        className="w-16 px-2 py-1 border border-gray-600 rounded text-sm bg-gray-700 text-white"
                                        title="Delay between notes in seconds"
                                    />
                                </label>
                            )}

                            {/* Duration */}
                            <label className="flex items-center gap-2 text-sm">
                                <span className="text-gray-300">Duration:</span>
                                <input
                                    type="number"
                                    min="0.1"
                                    max="5"
                                    step="0.1"
                                    value={chordNoteDuration}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '') setChordNoteDuration('');
                                        else {
                                            const num = parseFloat(val);
                                            if (!isNaN(num)) setChordNoteDuration(num);
                                        }
                                    }}
                                    className="w-16 px-2 py-1 border border-gray-600 rounded text-sm bg-gray-700 text-white"
                                    title="Note sustain duration in seconds"
                                />
                            </label>

                            {/* Playback Controls */}
                            <div className="flex gap-2">
                                <button
                                    onClick={handlePlayPause}
                                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeProgression.isPlaying
                                        ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                                        : 'bg-green-500 hover:bg-green-600 text-white'
                                        }`}
                                >
                                    {activeProgression.isPlaying ? '⏸ Pause' : '▶ Play'}
                                </button>
                                <button
                                    onClick={handleClear}
                                    className="px-4 py-2 rounded-lg font-medium text-sm bg-red-600 hover:bg-red-700 text-white"
                                >
                                    Clear
                                </button>
                            </div>

                            {/* Loop Toggle */}
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={loop}
                                    onChange={(e) => setLoop(e.target.checked)}
                                    className="w-4 h-4"
                                />
                                <span className="text-gray-300">Loop</span>
                            </label>
                        </div>

                        {/* Breakpoint Pattern */}
                        <div className="flex items-center gap-3 mb-4">
                            <label className="flex items-center gap-2 text-sm">
                                <span className="text-gray-300">Breakpoints:</span>
                                <input
                                    type="text"
                                    value={customBreakpoints}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setCustomBreakpoints(val);
                                        // Validate
                                        if (val && !/^[0-9\-]+$/.test(val)) {
                                            setBreakpointError('Use numbers and dashes only');
                                        } else {
                                            setBreakpointError('');
                                        }
                                    }}
                                    placeholder="e.g., 4-4 or 3-3-2"
                                    className="w-28 px-2 py-1 border border-gray-600 rounded text-sm bg-gray-700 text-white"
                                />
                            </label>
                            {breakpointError && (
                                <span className="text-xs text-red-400">{breakpointError}</span>
                            )}
                        </div>

                        {/* MIDI Controls */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            <button
                                onClick={() => setShowMidiSettings(!showMidiSettings)}
                                className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
                            >
                                ⚙ MIDI Settings
                            </button>
                            <button
                                onClick={handleDownloadMidi}
                                disabled={activeProgression.chords.length === 0}
                                className="px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                ⬇ Download MIDI
                            </button>
                            <button
                                onClick={() => setShowPianoChords(!showPianoChords)}
                                className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                            >
                                🎹 {showPianoChords ? 'Hide' : 'Show'} Piano Chords
                            </button>
                        </div>

                        {/* MIDI Settings Panel */}
                        {showMidiSettings && (
                            <div className="mb-4 p-4 rounded-lg border border-purple-700 bg-purple-900/30">
                                <h4 className="text-sm font-semibold text-purple-200 mb-3">MIDI Export Settings</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                    <label className="flex flex-col gap-1">
                                        <span className="text-gray-400">Tempo</span>
                                        <input type="number" value={midiTempo} onChange={e => setMidiTempo(parseInt(e.target.value) || 120)} className="px-2 py-1 border border-gray-600 rounded bg-gray-700 text-white" />
                                    </label>
                                    <label className="flex flex-col gap-1">
                                        <span className="text-gray-400">Note Length</span>
                                        <input type="number" step="0.1" value={midiNoteLengthBeats} onChange={e => setMidiNoteLengthBeats(parseFloat(e.target.value) || 1)} className="px-2 py-1 border border-gray-600 rounded bg-gray-700 text-white" />
                                    </label>
                                    <label className="flex flex-col gap-1">
                                        <span className="text-gray-400">Gap</span>
                                        <input type="number" step="0.1" value={midiGapBeats} onChange={e => setMidiGapBeats(parseFloat(e.target.value) || 0)} className="px-2 py-1 border border-gray-600 rounded bg-gray-700 text-white" />
                                    </label>
                                    <label className="flex flex-col gap-1">
                                        <span className="text-gray-400">Velocity</span>
                                        <input type="number" min="0" max="127" value={midiVelocity} onChange={e => setMidiVelocity(parseInt(e.target.value) || 96)} className="px-2 py-1 border border-gray-600 rounded bg-gray-700 text-white" />
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Timeline Grid */}
                        <TimelineGrid
                            beats={beats}
                            chords={activeProgression.chords}
                            onChordPlace={handleChordPlace}
                            onChordRemove={handleChordRemove}
                            currentBeat={activeProgression.currentBeat}
                            breakpoints={customBreakpoints}
                            isCarnatic={isCarnatic}
                        />

                        <div className="mt-4 text-sm text-gray-400">
                            Drag chords from above and drop onto the timeline • Hover to remove
                        </div>

                        {/* Piano Chords View - below timeline */}
                        {showPianoChords && activeProgression.chords.length > 0 && (
                            <div className="mt-4 p-3 rounded-lg border border-blue-700 bg-blue-900/30">
                                <h3 className="text-md font-semibold text-blue-200 mb-3">Piano Chords</h3>
                                <div className="space-y-3">
                                    {activeProgression.chords.map((item, idx) => {
                                        const chord = item.chord;
                                        const rootLabel = labels[chord.root];
                                        const chordName = chord.name || chord.type?.name || '';
                                        const noteLabels = chord.notes.map(n => labels[n]).join(' - ');

                                        // getPianoKeyPositions logic from original index.html
                                        const getPianoKeys = () => {
                                            if (!chord.notes || chord.notes.length === 0) return [];
                                            const tonicOffset = selectedTonic !== null ? selectedTonic : 0;
                                            const baseOctave = 4;

                                            // Get the root note (first note in the chord)
                                            const rootNote = (chord.notes[0] + tonicOffset) % 12;

                                            // Arrange chord notes properly starting from root
                                            const arrangedNotes = [];
                                            const rootMidi = baseOctave * 12 + rootNote;
                                            arrangedNotes.push(rootMidi);

                                            // Add other chord notes in the next octave if they would be lower than previous
                                            for (let i = 1; i < chord.notes.length; i++) {
                                                const noteIndex = (chord.notes[i] + tonicOffset) % 12;
                                                let midiNote = baseOctave * 12 + noteIndex;

                                                // If this note is lower than the previous note, move it to next octave
                                                if (midiNote <= arrangedNotes[arrangedNotes.length - 1]) {
                                                    midiNote += 12;
                                                }

                                                arrangedNotes.push(midiNote);
                                            }

                                            return arrangedNotes;
                                        };

                                        const pianoKeys = getPianoKeys();

                                        return (
                                            <div key={idx} className="p-2 bg-gray-800 rounded border border-gray-600">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className="text-sm font-medium text-white">
                                                        Beat {item.beat + 1}: {rootLabel} {chordName}
                                                    </span>
                                                    <span className="text-xs text-gray-400">
                                                        {noteLabels}
                                                    </span>
                                                </div>
                                                {/* 2 octave piano visualization - matching original */}
                                                <div className="piano-wrap" style={{ justifyContent: 'flex-start', padding: '2px' }}>
                                                    <div className="piano" style={{ width: `${24 * 7 * 2}px`, height: '60px', display: 'flex' }}>
                                                        {/* 2 full octaves starting from C4 */}
                                                        {[0, 1].map((octaveIdx) => (
                                                            <div key={octaveIdx} style={{ position: 'relative', display: 'inline-block', height: '60px', width: `${24 * 7}px` }}>
                                                                {/* White keys */}
                                                                <div style={{ display: 'flex' }}>
                                                                    {[0, 2, 4, 5, 7, 9, 11].map((pc) => {
                                                                        const midiNote = (4 + octaveIdx) * 12 + pc;
                                                                        const isActive = pianoKeys.includes(midiNote);
                                                                        return (
                                                                            <div
                                                                                key={pc}
                                                                                style={{
                                                                                    width: '24px',
                                                                                    height: '60px',
                                                                                    background: '#ffffff',
                                                                                    border: '1px solid #4b5563',
                                                                                    borderBottomLeftRadius: '4px',
                                                                                    borderBottomRightRadius: '4px',
                                                                                    boxSizing: 'border-box',
                                                                                    position: 'relative'
                                                                                }}
                                                                            >
                                                                                {isActive && (
                                                                                    <div
                                                                                        style={{
                                                                                            position: 'absolute',
                                                                                            top: '6px',
                                                                                            left: '50%',
                                                                                            transform: 'translateX(-50%)',
                                                                                            width: '16px',
                                                                                            height: '16px',
                                                                                            background: '#3b82f6',
                                                                                            borderRadius: '50%'
                                                                                        }}
                                                                                    />
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                                {/* Black keys */}
                                                                <div style={{ position: 'absolute', top: '0', left: '0', display: 'flex' }}>
                                                                    {[1, 3, 6, 8, 10].map((pc, blackIdx) => {
                                                                        const midiNote = (4 + octaveIdx) * 12 + pc;
                                                                        const isActive = pianoKeys.includes(midiNote);
                                                                        const leftOffset = [18, 42, 90, 114, 138][blackIdx];
                                                                        return (
                                                                            <div
                                                                                key={pc}
                                                                                style={{
                                                                                    position: 'absolute',
                                                                                    left: `${leftOffset}px`,
                                                                                    width: '12px',
                                                                                    height: '36px',
                                                                                    background: '#1f2937',
                                                                                    borderBottomLeftRadius: '2px',
                                                                                    borderBottomRightRadius: '2px',
                                                                                    zIndex: 1
                                                                                }}
                                                                            >
                                                                                {isActive && (
                                                                                    <div
                                                                                        style={{
                                                                                            position: 'absolute',
                                                                                            top: '6px',
                                                                                            left: '50%',
                                                                                            transform: 'translateX(-50%)',
                                                                                            width: '8px',
                                                                                            height: '8px',
                                                                                            background: '#f59e0b',
                                                                                            borderRadius: '50%'
                                                                                        }}
                                                                                    />
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div >
        </div >
    );
}

export default ChordTool;
