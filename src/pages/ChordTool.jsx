/**
 * ChordTool Page
 * Main chord formation interface with raga selection, chord visualization,
 * rhythm progression builder, and audio playback
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { HINDUSTANI_RAGAS } from '../data/ragaData.js';
import { MELAKARTA_72 } from '../data/melakartaData.js';
import { RagaSelector } from '../components/raga/RagaSelector.jsx';
import { ChordCircle } from '../components/chords/ChordCircle.jsx';
import { ChordCard, ChordGrid } from '../components/chords/ChordCard.jsx';
import { ChordTypeList } from '../components/chords/ChordTypeList.jsx';
import { PianoKeyboard } from '../components/common/PianoKeyboard.jsx';
import { TimelineGrid, PlaybackControls } from '../components/rhythm/TimelineGrid.jsx';
import { getAvailableChords, getChordsOutsidePattern, countChordsByType, arrangeChordNotes } from '../utils/chordHelpers.js';
import { getDisplayLabels, patternToPitchClasses, WESTERN_NOTES_SHARP } from '../utils/noteHelpers.js';
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

    // UI state
    const [showPiano, setShowPiano] = useState(false);
    const [activeTab, setActiveTab] = useState('chords'); // 'chords', 'custom'
    const [showRagaNotesOnKeyboard, setShowRagaNotesOnKeyboard] = useState(false);
    const [selectedNote, setSelectedNote] = useState(null);
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

    // Rhythm state
    const [progressionChords, setProgressionChords] = useState([]);
    const [beats, setBeats] = useState(8);
    const [bpm, setBpm] = useState(120);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentBeat, setCurrentBeat] = useState(-1);
    const [loop, setLoop] = useState(true);

    // Enhanced progression controls (matching original)
    const [rhythmPlaybackMode, setRhythmPlaybackMode] = useState('unison'); // 'unison' or 'melody'
    const [arpeggiationDelay, setArpeggiationDelay] = useState(0.08);
    const [chordNoteDuration, setChordNoteDuration] = useState(1.0);
    const [customBreakpoints, setCustomBreakpoints] = useState('');
    const [breakpointError, setBreakpointError] = useState('');

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
    const { isPlaying: isTanpuraPlaying, toggle: toggleTanpura, changeTonic } = useTanpura(audioContext);

    // Get raga list
    const ragaList = useMemo(() => {
        return isCarnatic ? MELAKARTA_72 : HINDUSTANI_RAGAS;
    }, [isCarnatic]);

    // Handle URL param for raga selection
    useEffect(() => {
        const ragaParam = searchParams.get('raga');
        if (ragaParam) {
            const found = ragaList.find(r => r.name === decodeURIComponent(ragaParam));
            if (found) {
                setSelectedRagaName(found.name);
            }
        }
    }, [searchParams, ragaList]);

    // Auto-select first raga if none selected
    useEffect(() => {
        if (!selectedRagaName && ragaList.length > 0) {
            setSelectedRagaName(ragaList[0].name);
        }
    }, [ragaList, selectedRagaName]);

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
        const outside = showOutsideChords
            ? getChordsOutsidePattern(patterns.all, 1, 2, selectedChordType, showExtended)
            : [];

        return {
            all,
            aaroh,
            avroh,
            outside,
            counts: countChordsByType(all)
        };
    }, [getCurrentPatterns, selectedChordType, showExtended, separateAarohAvroh, showOutsideChords]);

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
                const transposedNote = (noteIndex + selectedTonic) % 12;
                playNote(transposedNote, octave, duration, 0, 0.8);
            }
        } else {
            // Play notes as a melody (arpeggiated)
            const delay = (arpeggiationDelay || 0.08) * 1000; // Convert to ms
            arranged.forEach(({ noteIndex, octave }, i) => {
                const transposedNote = (noteIndex + selectedTonic) % 12;
                setTimeout(() => playNote(transposedNote, octave, duration * 0.6, 0, 0.6), i * delay);
            });
        }
    }, [pianoReady, resume, playNote, selectedTonic, chordNoteDuration, arpeggiationDelay]);

    // Add chord to progression
    const handleChordPlace = useCallback((beatIndex, chord) => {
        setProgressionChords(prev => {
            // Remove any existing chord at this beat
            const filtered = prev.filter(c => c.beat !== beatIndex);
            return [...filtered, { beat: beatIndex, chord }].sort((a, b) => a.beat - b.beat);
        });
    }, []);

    // Remove chord from progression
    const handleChordRemove = useCallback((beatIndex) => {
        setProgressionChords(prev => prev.filter(c => c.beat !== beatIndex));
    }, []);

    // Playback controls
    const handlePlayPause = useCallback(() => {
        if (isPlaying) {
            setIsPlaying(false);
            setCurrentBeat(-1);
        } else {
            setIsPlaying(true);
            setCurrentBeat(0);
        }
    }, [isPlaying]);

    const handleStop = useCallback(() => {
        setIsPlaying(false);
        setCurrentBeat(-1);
    }, []);

    const handleClear = useCallback(() => {
        setProgressionChords([]);
        handleStop();
    }, [handleStop]);

    // Download progression as MIDI
    const handleDownloadMidi = useCallback(() => {
        if (progressionChords.length === 0) return;

        const midiData = buildMidiFromProgression({
            progression: progressionChords,
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
                ? `${selectedRagaName.replace(/\s+/g, '_')}_progression`
                : 'chord_progression';
            downloadMidi(midiData, filename);
        }
    }, [progressionChords, midiTempo, midiNoteLengthBeats, midiGapBeats, midiVelocity, midiChannel, midiProgram, selectedRagaName]);

    // Playback interval
    useEffect(() => {
        if (!isPlaying) return;

        const msPerBeat = 60000 / bpm;

        const interval = setInterval(() => {
            setCurrentBeat(prev => {
                const next = prev + 1;
                if (next >= beats) {
                    if (loop) return 0;
                    setIsPlaying(false);
                    return -1;
                }

                // Play chord at this beat using current rhythm mode
                const chordAtBeat = progressionChords.find(c => c.beat === next);
                if (chordAtBeat) {
                    const isUnison = rhythmPlaybackMode === 'unison';
                    handlePlayChord(chordAtBeat.chord, isUnison);
                }

                return next;
            });
        }, msPerBeat);

        return () => clearInterval(interval);
    }, [isPlaying, bpm, beats, loop, progressionChords, handlePlayChord, rhythmPlaybackMode]);

    // Update tanpura when tonic changes
    useEffect(() => {
        if (isTanpuraPlaying) {
            changeTonic(selectedTonic);
        }
    }, [selectedTonic, isTanpuraPlaying, changeTonic]);

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
                            const notes = patternToPitchClasses(patterns.aaroh.length ? patterns.aaroh : patterns.all);
                            const sequence = notes.map(n => ({ noteIndex: (n + selectedTonic) % 12, octave: 4 }));
                            // Play ascending
                            sequence.forEach((note, i) => {
                                setTimeout(() => playNote(note.noteIndex, note.octave, 0.5), i * 300);
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
                            const notes = patternToPitchClasses(patterns.avroh.length ? patterns.avroh : patterns.all).reverse();
                            const sequence = notes.map(n => ({ noteIndex: (n + selectedTonic) % 12, octave: 4 }));
                            sequence.forEach((note, i) => {
                                setTimeout(() => playNote(note.noteIndex, note.octave, 0.5), i * 300);
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
                            const aarohNotes = patternToPitchClasses(patterns.aaroh.length ? patterns.aaroh : patterns.all);
                            const avrohNotes = patternToPitchClasses(patterns.avroh.length ? patterns.avroh : patterns.all).reverse();
                            const allNotes = [...aarohNotes, ...avrohNotes];
                            allNotes.forEach((n, i) => {
                                setTimeout(() => playNote((n + selectedTonic) % 12, 4, 0.5), i * 300);
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
                                            onNoteClick={(noteIndex) => setSelectedNote(selectedNote === noteIndex ? null : noteIndex)}
                                            selectedNote={selectedNote}
                                            noteFilterMode="root"
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
                                            onNoteClick={(noteIndex) => setSelectedNote(selectedNote === noteIndex ? null : noteIndex)}
                                            selectedNote={selectedNote}
                                            noteFilterMode="any"
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
                                    onNoteClick={(noteIndex) => setSelectedNote(selectedNote === noteIndex ? null : noteIndex)}
                                    selectedNote={selectedNote}
                                    noteFilterMode="root"
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
                        <div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                                {(showMoreAll ? currentChords : currentChords.slice(0, 12)).map((chord, index) => (
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
                            {currentChords.length > 12 && (
                                <button
                                    onClick={() => setShowMoreAll(v => !v)}
                                    className="mt-3 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                                >
                                    {showMoreAll ? `Show Less` : `Show More (${currentChords.length - 12} more)`}
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-6">
                            {/* Aaroh Chords */}
                            <div>
                                <h3 className="text-lg font-medium text-blue-300 mb-3">Aaroh Chords ({chordData.aaroh.length})</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {(showMoreAaroh ? chordData.aaroh : chordData.aaroh.slice(0, 6)).map((chord, index) => (
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
                                {chordData.aaroh.length > 6 && (
                                    <button
                                        onClick={() => setShowMoreAaroh(v => !v)}
                                        className="mt-3 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                                    >
                                        {showMoreAaroh ? `Show Less` : `Show More (${chordData.aaroh.length - 6} more)`}
                                    </button>
                                )}
                            </div>
                            {/* Avroh Chords */}
                            <div>
                                <h3 className="text-lg font-medium text-green-300 mb-3">Avroh Chords ({chordData.avroh.length})</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {(showMoreAvroh ? chordData.avroh : chordData.avroh.slice(0, 6)).map((chord, index) => (
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
                                {chordData.avroh.length > 6 && (
                                    <button
                                        onClick={() => setShowMoreAvroh(v => !v)}
                                        className="mt-3 px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                                    >
                                        {showMoreAvroh ? `Show Less` : `Show More (${chordData.avroh.length - 6} more)`}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Chord Progression Builder - now inside Available Chords */}
                    <div className="mt-6 pt-6 border-t border-gray-600">
                        <h3 className="text-lg font-semibold text-white mb-4">
                            Chord Progression Builder
                        </h3>

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

                            {/* Breakpoints */}
                            <label className="flex items-center gap-2 text-sm">
                                <span className="text-gray-300">Breakpoints:</span>
                                <input
                                    type="text"
                                    value={customBreakpoints}
                                    onChange={(e) => {
                                        const pattern = e.target.value;
                                        setCustomBreakpoints(pattern);
                                        const result = validateBreakpoints(pattern, beats);
                                        setBreakpointError(result.valid ? '' : result.error);
                                    }}
                                    className={`w-20 px-2 py-1 border rounded text-sm bg-gray-700 text-white ${breakpointError ? 'border-red-500' : 'border-gray-600'}`}
                                    title="Enter beat groupings (e.g., 3-3-2 for 8 beats)"
                                    placeholder="4-4"
                                />
                            </label>

                            {/* Loop */}
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={loop}
                                    onChange={(e) => setLoop(e.target.checked)}
                                    className="w-4 h-4 text-blue-600"
                                />
                                <span className="text-gray-300">Loop</span>
                            </label>
                        </div>

                        {/* Breakpoint Error */}
                        {breakpointError && (
                            <div className="text-red-400 text-xs mb-3">
                                {breakpointError}
                            </div>
                        )}

                        {/* Playback Controls Row */}
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                            <button
                                onClick={handlePlayPause}
                                className={`px-4 py-2 rounded text-sm font-medium ${isPlaying
                                    ? 'bg-red-500 hover:bg-red-600 text-white'
                                    : 'bg-green-500 hover:bg-green-600 text-white'
                                    }`}
                            >
                                {isPlaying ? '⏸ Stop' : '▶ Play'}
                            </button>
                            <button
                                onClick={handleClear}
                                className="px-3 py-2 rounded text-sm bg-gray-700 hover:bg-gray-600 text-gray-200"
                            >
                                Clear
                            </button>
                            <button
                                onClick={() => setShowMidiSettings(v => !v)}
                                className="px-2 py-2 text-xs rounded border border-gray-600 bg-gray-700 hover:bg-gray-600 text-gray-200"
                            >
                                {showMidiSettings ? 'Hide MIDI Settings' : 'MIDI Settings'}
                            </button>
                            <button
                                onClick={() => setShowPianoChords(v => !v)}
                                className="px-2 py-2 text-xs rounded border border-gray-600 bg-gray-700 hover:bg-gray-600 text-gray-200"
                                disabled={progressionChords.length === 0}
                            >
                                {showPianoChords ? 'Hide Piano' : 'Piano Chords'}
                            </button>
                            <button
                                onClick={handleDownloadMidi}
                                disabled={progressionChords.length === 0}
                                className="px-3 py-2 rounded text-sm bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Download MIDI
                            </button>
                        </div>

                        {/* MIDI Settings Panel */}
                        {showMidiSettings && (
                            <div className="mb-4 p-4 rounded-lg border border-gray-600 bg-gray-800">
                                <h3 className="text-sm font-semibold text-gray-200 mb-3">MIDI Settings</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                                    <label className="text-xs text-gray-300">
                                        Tempo (BPM)
                                        <input type="number" min="1" max="400" value={midiTempo}
                                            onChange={e => setMidiTempo(parseInt(e.target.value) || 120)}
                                            className="mt-1 w-full p-2 border border-gray-600 rounded text-sm bg-gray-700 text-white" />
                                    </label>
                                    <label className="text-xs text-gray-300">
                                        Program (0-127)
                                        <input type="number" min="0" max="127" value={midiProgram}
                                            onChange={e => setMidiProgram(parseInt(e.target.value) || 0)}
                                            className="mt-1 w-full p-2 border border-gray-600 rounded text-sm bg-gray-700 text-white" />
                                    </label>
                                    <label className="text-xs text-gray-300">
                                        Velocity (1-127)
                                        <input type="number" min="1" max="127" value={midiVelocity}
                                            onChange={e => setMidiVelocity(parseInt(e.target.value) || 96)}
                                            className="mt-1 w-full p-2 border border-gray-600 rounded text-sm bg-gray-700 text-white" />
                                    </label>
                                    <label className="text-xs text-gray-300">
                                        Note length (beats)
                                        <input type="number" min="0.1" max="64" step="0.1" value={midiNoteLengthBeats}
                                            onChange={e => setMidiNoteLengthBeats(parseFloat(e.target.value) || 3.2)}
                                            className="mt-1 w-full p-2 border border-gray-600 rounded text-sm bg-gray-700 text-white" />
                                    </label>
                                    <label className="text-xs text-gray-300">
                                        Gap (beats)
                                        <input type="number" min="0" max="16" step="0.1" value={midiGapBeats}
                                            onChange={e => setMidiGapBeats(parseFloat(e.target.value) || 0.4)}
                                            className="mt-1 w-full p-2 border border-gray-600 rounded text-sm bg-gray-700 text-white" />
                                    </label>
                                    <label className="text-xs text-gray-300">
                                        Channel (1-16)
                                        <input type="number" min="1" max="16" value={midiChannel}
                                            onChange={e => setMidiChannel(parseInt(e.target.value) || 1)}
                                            className="mt-1 w-full p-2 border border-gray-600 rounded text-sm bg-gray-700 text-white" />
                                    </label>
                                </div>
                                <div className="mt-3 text-xs text-gray-500">
                                    Common programs: 0 = Piano, 24 = Nylon Guitar, 25 = Steel Guitar, 40 = Violin, 72 = Flute
                                </div>
                            </div>
                        )}

                        {/* Piano Chord Visualization */}
                        {showPianoChords && progressionChords.length > 0 && (
                            <div className="mb-4 p-4 rounded-lg border border-blue-700 bg-blue-900/30">
                                <h3 className="text-lg font-semibold text-blue-200 mb-4">Piano Chords</h3>
                                <div className="space-y-3">
                                    {progressionChords.map((item, idx) => {
                                        const chord = item.chord;
                                        const rootLabel = labels[chord.root];
                                        const chordName = chord.name || chord.type?.name || '';
                                        const noteLabels = chord.notes.map(n => labels[n]).join(' - ');

                                        return (
                                            <div key={idx} className="p-3 bg-gray-800 rounded border border-gray-600">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className="font-medium text-white">
                                                        Beat {item.beat + 1}: {rootLabel} {chordName}
                                                    </span>
                                                </div>
                                                <div className="text-sm text-gray-400">
                                                    Notes: {noteLabels}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Timeline Grid */}
                        <TimelineGrid
                            beats={beats}
                            chords={progressionChords}
                            onChordPlace={handleChordPlace}
                            onChordRemove={handleChordRemove}
                            currentBeat={currentBeat}
                            breakpoints={customBreakpoints}
                        />

                        <div className="mt-4 text-sm text-gray-400">
                            Drag chords from above and drop onto the timeline • Click to remove
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ChordTool;
