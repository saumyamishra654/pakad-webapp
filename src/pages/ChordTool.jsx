import React, { useState, useEffect, useMemo } from 'react';
import RagaSelector from '../components/RagaSelector';
import Piano from '../components/Piano';
import ChordDisplay from '../components/ChordDisplay';
import RagaCircle from '../components/RagaCircle';
import CompositionPanel from '../components/CompositionPanel';
import { loadHindustaniRagas, loadMelakartaRagas } from '../utils/dataLoader';
import {
    availableChordsForPattern,
    availableChordsAllowingOutside,
    attachWesternNames,
    filterChordsByNote,
    CHORD_TYPES
} from '../utils/musicTheory';
import { playNote, playChord, playTanpura, stopTanpura, playSequence, audioEngine } from '../utils/audioEngine';
import { arrangeNotesAscending, arrangeNotesDescending, arrangeChordNotes } from '../utils/musicTheory';
import { buildMidiFromChords, downloadMidi, downloadProjectJson } from '../utils/midiUtils';

const ChordTool = () => {
    console.log("ChordTool component rendering");
    const [hindustaniRagas, setHindustaniRagas] = useState([]);
    const [melakartaRagas, setMelakartaRagas] = useState([]);
    const [ragas, setRagas] = useState([]);
    const [selectedRaga, setSelectedRaga] = useState(null);
    const [rootNote, setRootNote] = useState(0); // 0 = C
    const [activeNotes, setActiveNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Settings
    const [selectedChordType, setSelectedChordType] = useState('all');
    const [allowOutsideNotes, setAllowOutsideNotes] = useState(false);
    const [maxOutside, setMaxOutside] = useState(1);
    const [isTanpuraPlaying, setIsTanpuraPlaying] = useState(false);
    const [isTanpuraLoading, setIsTanpuraLoading] = useState(false);
    const [showKeyboard, setShowKeyboard] = useState(true);
    const [scaleMode, setScaleMode] = useState('full'); // 'aaroha', 'avroha', 'full'

    // New Modes & Interaction
    const [isCarnaticMode, setIsCarnaticMode] = useState(false);
    const [separateAarohAvroh, setSeparateAarohAvroh] = useState(false);
    const [showRagaNotesOnKeyboard, setShowRagaNotesOnKeyboard] = useState(false);
    const [selectedNoteFilter, setSelectedNoteFilter] = useState(null);
    const [noteFilterMode, setNoteFilterMode] = useState('root'); // 'root', 'any'
    const [arpeggiationDelay, setArpeggiationDelay] = useState(0.04); // seconds
    const [chordNoteDuration, setChordNoteDuration] = useState(2.5); // seconds
    const [playbackMode, setPlaybackMode] = useState('melody'); // 'unison' or 'melody'

    // Custom Scale Mode
    const [customScaleMode, setCustomScaleMode] = useState(false);
    const [customNotePattern, setCustomNotePattern] = useState([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]); // Initialize with just Sa
    const [customAarohPattern, setCustomAarohPattern] = useState([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]); // Custom Aaroha
    const [customAvrohPattern, setCustomAvrohPattern] = useState([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]); // Custom Avroha
    // Custom Chord Builder
    const [showCustomChordBuilder, setShowCustomChordBuilder] = useState(false);
    const [customChordRoot, setCustomChordRoot] = useState(0); // Root note index (0-11)
    const [customIntervalsAbs, setCustomIntervalsAbs] = useState([0]); // Absolute stacked intervals from root

    // Rhythm Cycle & Progression State
    const [cycleBeats, setCycleBeats] = useState(8);
    const [cycleBpm, setCycleBpm] = useState(120);
    const [cycleLoop, setCycleLoop] = useState(true);
    const [customBreakpoints, setCustomBreakpoints] = useState('4-4'); // Beat groupings like 4-4, 3-3-2

    // MIDI Export Settings
    const [midiProgram, setMidiProgram] = useState(0);
    const [midiVelocity, setMidiVelocity] = useState(96);
    const [midiChannel, setMidiChannel] = useState(1);
    const [midiNoteLengthBeats, setMidiNoteLengthBeats] = useState(3.2); // beats per chord
    const [midiGapBeats, setMidiGapBeats] = useState(0.4); // gap between chords in beats
    const [rhythmProgressions, setRhythmProgressions] = useState([
        { id: 1, name: 'T1', chords: [], isPlaying: false, currentBeat: 0 },
        { id: 2, name: 'T2', chords: [], isPlaying: false, currentBeat: 0 },
        { id: 3, name: 'T3', chords: [], isPlaying: false, currentBeat: 0 },
        { id: 4, name: 'T4', chords: [], isPlaying: false, currentBeat: 0 }
    ]);
    const [activeTrackId, setActiveTrackId] = useState(1);
    const playbackIntervalRef = React.useRef(null);

    // Load data
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [hindustani, melakarta] = await Promise.all([
                    loadHindustaniRagas(),
                    loadMelakartaRagas()
                ]);

                setHindustaniRagas(hindustani);
                setMelakartaRagas(melakarta);

                // Default to Hindustani
                setRagas(hindustani);
                if (hindustani.length > 0) {
                    setSelectedRaga(hindustani[0]);
                }
                setError(null);
            } catch (err) {
                console.error('Failed to load ragas:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Handle mode switching
    useEffect(() => {
        if (isCarnaticMode) {
            setRagas(melakartaRagas);
            if (melakartaRagas.length > 0 && (!selectedRaga || !selectedRaga.isMelakarta)) {
                setSelectedRaga(melakartaRagas[0]);
            }
        } else {
            setRagas(hindustaniRagas);
            if (hindustaniRagas.length > 0 && (!selectedRaga || selectedRaga.isMelakarta)) {
                setSelectedRaga(hindustaniRagas[0]);
            }
        }
    }, [isCarnaticMode, hindustaniRagas, melakartaRagas]);

    // Auto-select separate aaroh/avroh if patterns differ for selected raga
    useEffect(() => {
        if (!selectedRaga) return;
        try {
            const aar = Array.isArray(selectedRaga.aarohaPattern) ? selectedRaga.aarohaPattern : [];
            const avr = Array.isArray(selectedRaga.avrohaPattern) ? selectedRaga.avrohaPattern : [];
            const differ = aar.length !== avr.length || aar.some((v, i) => v !== avr[i]);
            setSeparateAarohAvroh(differ);
        } catch (err) {
            console.warn('Could not compare aaroh/avroh patterns', err);
        }
    }, [selectedRaga]);

    // Initialize custom scale patterns from selected raga when entering custom mode
    useEffect(() => {
        if (customScaleMode && selectedRaga) {
            // Copy the selected raga's patterns to custom patterns
            if (selectedRaga.pattern) {
                setCustomNotePattern([...selectedRaga.pattern]);
            }
            if (selectedRaga.aarohaPattern) {
                setCustomAarohPattern([...selectedRaga.aarohaPattern]);
            }
            if (selectedRaga.avrohaPattern) {
                setCustomAvrohPattern([...selectedRaga.avrohaPattern]);
            }
        }
    }, [customScaleMode]); // Only run when customScaleMode changes, not when raga changes

    // Persist progressions
    useEffect(() => {
        try {
            const saved = localStorage.getItem('samvad_progressions');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) setRhythmProgressions(parsed);
            }
        } catch (e) {
            console.error("Failed to load progressions:", e);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('samvad_progressions', JSON.stringify(rhythmProgressions));
    }, [rhythmProgressions]);

    // Chord types with 'all' option
    const chordTypes = useMemo(() => [
        { id: 'all', name: 'All', intervals: [], color: '#6366f1', isSpecial: true },
        ...CHORD_TYPES
    ], []);

    // Compute counts per chord type
    const countsByType = useMemo(() => {
        if (!selectedRaga) return {};

        const counts = {};
        const pattern = selectedRaga.pattern;

        chordTypes.forEach(ct => {
            if (ct.id === 'all') {
                let sum = 0;
                CHORD_TYPES.forEach(realType => {
                    const normalChords = availableChordsForPattern(pattern, realType.id, false, isCarnaticMode);
                    const extendedChords = availableChordsForPattern(pattern, realType.id, true, isCarnaticMode);
                    sum += normalChords.length + extendedChords.length;
                });
                counts[ct.id] = sum;
            } else {
                const normalChords = availableChordsForPattern(pattern, ct.id, false, isCarnaticMode);
                const extendedChords = availableChordsForPattern(pattern, ct.id, true, isCarnaticMode);
                counts[ct.id] = normalChords.length + extendedChords.length;
            }
        });

        return counts;
    }, [selectedRaga, isCarnaticMode, chordTypes]);

    // Calculate chords
    const chords = useMemo(() => {
        // Determine which pattern to use
        const useCustomScale = customScaleMode && (
            customNotePattern.some(n => n === 1) ||
            customAarohPattern.some(n => n === 1) ||
            customAvrohPattern.some(n => n === 1)
        );

        if (!useCustomScale && !selectedRaga) return [];

        let allChords = [];
        let patternsToProcess = [];

        if (useCustomScale) {
            // Use custom scale patterns
            if (separateAarohAvroh) {
                // Separate Aaroha and Avroha patterns for custom scale
                patternsToProcess.push({ pattern: customAarohPattern, label: 'Aaroha' });
                patternsToProcess.push({ pattern: customAvrohPattern, label: 'Avroha' });
            } else {
                // Single full pattern
                patternsToProcess.push({ pattern: customNotePattern, label: 'Custom' });
            }
        } else if (separateAarohAvroh && selectedRaga.aarohaPattern && selectedRaga.avrohaPattern) {
            patternsToProcess.push({ pattern: selectedRaga.aarohaPattern, label: 'Aaroha' });
            patternsToProcess.push({ pattern: selectedRaga.avrohaPattern, label: 'Avroha' });
        } else {
            patternsToProcess.push({ pattern: selectedRaga.pattern, label: 'Full' });
        }

        patternsToProcess.forEach(({ pattern, label }) => {
            let normalChords = availableChordsForPattern(pattern, selectedChordType, false, isCarnaticMode);
            let extendedChords = availableChordsForPattern(pattern, selectedChordType, true, isCarnaticMode);
            let outsideChords = allowOutsideNotes ? availableChordsAllowingOutside(pattern, selectedChordType, false, 1, maxOutside, true, isCarnaticMode) : [];

            let currentChords = [...normalChords, ...extendedChords, ...outsideChords].map(c => ({ ...c, source: label }));
            allChords = [...allChords, ...currentChords];
        });

        const uniqueChords = [];
        const chordMap = new Map();

        allChords.forEach(chord => {
            const key = `${chord.root}-${chord.type.name}-${chord.isExtended ? 'ext' : 'base'}`;
            if (chordMap.has(key)) {
                const existing = chordMap.get(key);
                if (existing.source !== chord.source && existing.source !== 'Both') {
                    existing.source = 'Both';
                }
            } else {
                chordMap.set(key, { ...chord });
                uniqueChords.push(chordMap.get(key));
            }
        });

        // Apply Note Filter
        let filteredChords = uniqueChords;
        if (selectedNoteFilter !== null) {
            filteredChords = filterChordsByNote(uniqueChords, selectedNoteFilter, noteFilterMode);
        }

        return attachWesternNames(filteredChords, rootNote);
    }, [selectedRaga, selectedChordType, allowOutsideNotes, maxOutside, rootNote, isCarnaticMode, separateAarohAvroh, selectedNoteFilter, noteFilterMode, customScaleMode, customNotePattern, customAarohPattern, customAvrohPattern]);

    // Custom Chord Builder helpers
    const SWAR_NAMES = ['Sa', 'Re♭', 'Re', 'Ga♭', 'Ga', 'Ma', 'Ma♯', 'Pa', 'Dha♭', 'Dha', 'Ni♭', 'Ni'];

    const customChordNotes = useMemo(() => {
        return customIntervalsAbs.map(interval => (customChordRoot + interval) % 12);
    }, [customChordRoot, customIntervalsAbs]);

    const customChordValidation = useMemo(() => {
        if (!selectedRaga && !customScaleMode) return { all: false, aaroh: false, avroh: false };

        const pattern = customScaleMode ? customNotePattern : selectedRaga?.pattern || [];
        const aarohPattern = customScaleMode ? customAarohPattern : selectedRaga?.aarohaPattern || [];
        const avrohPattern = customScaleMode ? customAvrohPattern : selectedRaga?.avrohaPattern || [];

        const allValid = customChordNotes.every(note => pattern[note] === 1);
        const aarohValid = customChordNotes.every(note => aarohPattern[note] === 1);
        const avrohValid = customChordNotes.every(note => avrohPattern[note] === 1);

        return { all: allValid, aaroh: aarohValid, avroh: avrohValid };
    }, [customChordNotes, selectedRaga, customScaleMode, customNotePattern, customAarohPattern, customAvrohPattern]);

    const addInterval = (semitones) => {
        setCustomIntervalsAbs(prev => [...prev, prev[prev.length - 1] + semitones]);
    };

    const removeLastInterval = () => {
        setCustomIntervalsAbs(prev => prev.length > 1 ? prev.slice(0, -1) : prev);
    };

    const resetCustomChord = () => {
        setCustomIntervalsAbs([0]);
    };

    const degreeLabel = (semitone) => {
        const labels = ['1', '♭2', '2', '♭3', '3', '4', '♭5', '5', '♯5', '6', '♭7', '7'];
        return labels[((semitone % 12) + 12) % 12];
    };

    const playCustomChord = () => {
        const voiced = arrangeChordNotes(customChordNotes, 3, rootNote);
        const delay = playbackMode === 'unison' ? 0 : arpeggiationDelay;
        playChord(voiced, chordNoteDuration, delay);
    };

    // Handle interactions
    const handleNoteClick = (noteIndex, octave = 4) => {
        // Play note
        playNote(noteIndex, octave);

        // Visual feedback (Specific key only)
        setActiveNotes([{ pc: noteIndex, oct: octave }]);
        setTimeout(() => setActiveNotes([]), 500);
    };

    const handleChordClick = (chord, mode = 'unison') => {
        // Arrange chord notes in appropriate octaves
        const arranged = arrangeChordNotes(chord.notes, 3, rootNote);

        // Set active notes for visual feedback
        setActiveNotes(chord.notes.map(n => (n + rootNote) % 12));

        if (mode === 'melody' || arpeggiationDelay > 0) {
            playChord(arranged, chordNoteDuration, arpeggiationDelay);
        } else {
            playChord(arranged, chordNoteDuration, 0);
        }

        setTimeout(() => setActiveNotes([]), 1000);
    };

    const playChalan = async (mode) => {
        if (!selectedRaga) return;

        const sequence = mode === 'avroha' ? selectedRaga.avrohaChalan : selectedRaga.aarohaChalan;
        const arranged = mode === 'avroha'
            ? arrangeNotesDescending(sequence, 4, true, 3, rootNote)
            : arrangeNotesAscending(sequence, 3, rootNote);

        // Visual follow along
        for (const note of arranged) {
            const absNote = (note.noteIndex + (rootNote || 0)) % 12;
            setActiveNotes([absNote]);
            await new Promise(r => setTimeout(r, 450));
        }

        playSequence(arranged, 0.5, 0.1);
        setTimeout(() => setActiveNotes([]), 500);
    };

    const toggleTanpura = async () => {
        if (isTanpuraPlaying) {
            stopTanpura();
            setIsTanpuraPlaying(false);
        } else {
            try {
                setIsTanpuraLoading(true);
                await playTanpura(rootNote);
                setIsTanpuraPlaying(true);
            } catch (error) {
                console.error('Failed to play tanpura:', error);
                alert('Tanpura file not available for this key.');
                setIsTanpuraPlaying(false);
            } finally {
                setIsTanpuraLoading(false);
            }
        }
    };

    // Update tanpura if root changes while playing
    useEffect(() => {
        if (isTanpuraPlaying) {
            const updateTanpura = async () => {
                try {
                    setIsTanpuraLoading(true);
                    await playTanpura(rootNote);
                } catch (error) {
                    console.error('Failed to update tanpura:', error);
                    setIsTanpuraPlaying(false);
                } finally {
                    setIsTanpuraLoading(false);
                }
            };
            updateTanpura();
        }
    }, [rootNote, isTanpuraPlaying]);

    // Sequencing Functions
    const activeTrack = useMemo(() =>
        rhythmProgressions.find(p => p.id === activeTrackId) || rhythmProgressions[0]
        , [rhythmProgressions, activeTrackId]);

    const updateActiveTrack = (updates) => {
        setRhythmProgressions(prev => prev.map(p =>
            p.id === activeTrackId ? { ...p, ...updates } : p
        ));
    };

    const handleClearTrack = () => {
        if (window.confirm('Clear all chords in this track?')) {
            updateActiveTrack({ chords: [] });
        }
    };

    const handleDownloadMIDI = () => {
        const bytes = buildMidiFromChords({
            chords: activeTrack.chords,
            tempoBPM: cycleBpm,
            velocity: midiVelocity,
            channel: midiChannel,
            program: midiProgram,
            tonicOffset: rootNote,
            baseOctave: 3,
            noteLengthBeats: midiNoteLengthBeats,
            gapBeats: midiGapBeats
        });
        downloadMidi(bytes, `${selectedRaga?.name || 'samvad'}_progression.mid`);
    };

    const handleExportProject = () => {
        const projectData = {
            rhythmProgressions,
            cycleBeats,
            cycleBpm,
            selectedRaga: selectedRaga?.name,
            rootNote,
            timestamp: new Date().toISOString()
        };
        downloadProjectJson(projectData, `samvad_project_${selectedRaga?.name || 'export'}.json`);
    };

    const stopPlayback = () => {
        if (playbackIntervalRef.current) {
            clearInterval(playbackIntervalRef.current);
            playbackIntervalRef.current = null;
        }
        setRhythmProgressions(prev => prev.map(p => ({ ...p, isPlaying: false, currentBeat: 0 })));
    };

    const startPlayback = async () => {
        if (activeTrack.isPlaying) {
            stopPlayback();
            return;
        }

        // Ensure AudioContext is running
        if (audioEngine.context.state === 'suspended') {
            await audioEngine.context.resume();
        }

        updateActiveTrack({ isPlaying: true, currentBeat: 0 });

        const beatMs = (60 / cycleBpm) * 1000;
        let beatIdx = 0;

        playbackIntervalRef.current = setInterval(() => {
            // Play chords on current beat
            const chordsToPlay = activeTrack.chords.filter(c => Math.floor(c.beat) === beatIdx);
            chordsToPlay.forEach(item => {
                const voiced = arrangeChordNotes(item.chord.notes, 3, rootNote);
                const delay = playbackMode === 'unison' ? 0 : arpeggiationDelay;
                playChord(voiced, chordNoteDuration, delay);
            });

            beatIdx = (beatIdx + 1) % cycleBeats;
            updateActiveTrack({ currentBeat: beatIdx });

            if (beatIdx === 0 && !cycleLoop) {
                stopPlayback();
            }
        }, beatMs);
    };

    useEffect(() => {
        return () => stopPlayback();
    }, []);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-gray-100 mb-2">
                    Raga-Based Chord Formation
                </h1>
                <p className="text-gray-400 text-lg">
                    Generate chords within raga frameworks
                </p>
            </div>

            {loading && (
                <div className="text-center p-8">
                    <p className="text-lg text-gray-400">Loading raga data...</p>
                </div>
            )}

            {error && (
                <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
                    <p className="text-red-300 font-semibold">Error loading data:</p>
                    <p className="text-red-400">{error}</p>
                </div>
            )}

            {!loading && !error && (
                <>
                    {/* Controls Panel */}
                    <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-700 text-xs text-gray-800">
                        <div className="flex flex-col md:flex-row md:flex-wrap lg:flex-nowrap gap-6 justify-between items-start">
                            {/* Raga Selection */}
                            <div className="px-2 flex-1 min-w-[200px]">
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Selected Raga:
                                </label>
                                <select
                                    value={selectedRaga?.id || ''}
                                    onChange={(e) => {
                                        const raga = ragas.find(r => r.id === e.target.value);
                                        setSelectedRaga(raga);
                                    }}
                                    className="w-full p-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="">Select…</option>
                                    {ragas.map(r => (
                                        <option key={r.id} value={r.id}>
                                            {r.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Tonic Selection */}
                            <div className="px-2">
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Tonic:
                                </label>
                                <select
                                    value={rootNote}
                                    onChange={(e) => setRootNote(parseInt(e.target.value))}
                                    className="w-25 p-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    {['C', 'C#/D♭', 'D', 'D#/E♭', 'E', 'F', 'F#/G♭', 'G', 'G#/A♭', 'A', 'A#', 'B'].map((note, index) => (
                                        <option key={index} value={index}>
                                            {note}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Toggles */}
                            <div className="px-3 flex gap-6">
                                <div className="flex flex-wrap items-center gap-4">
                                    <div>
                                        <label className="inline-flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={isCarnaticMode}
                                                onChange={e => setIsCarnaticMode(e.target.checked)}
                                                className="form-checkbox h-4 w-4 text-purple-600 rounded focus:ring-purple-500"
                                            />
                                            <span className="ml-2 text-xs text-gray-700">Carnatic Mode</span>
                                        </label>
                                    </div>
                                    <div>
                                        <label className="inline-flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={separateAarohAvroh}
                                                onChange={e => setSeparateAarohAvroh(e.target.checked)}
                                                className="form-checkbox h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                                            />
                                            <span className="ml-2 text-xs text-gray-700">Sep. Aaroh/Avroh</span>
                                        </label>
                                    </div>
                                    <div>
                                        <label className="inline-flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={customScaleMode}
                                                onChange={e => setCustomScaleMode(e.target.checked)}
                                                className="form-checkbox h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                                            />
                                            <span className="ml-2 text-xs text-gray-700">Custom Scale</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Audio Controls */}
                            <div className="flex items-center gap-4 px-4 border-l border-gray-200">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => playChalan('aaroha')}
                                        disabled={!selectedRaga?.aarohaChalan}
                                        className="px-3 py-2 text-xs rounded-lg font-medium transition-colors border border-blue-700 bg-blue-900/30 hover:bg-blue-800/30 text-blue-300 disabled:opacity-30"
                                        title="Play authentic ascending sequence"
                                    >
                                        Aaroh Chalan
                                    </button>
                                    <button
                                        onClick={() => playChalan('avroha')}
                                        disabled={!selectedRaga?.avrohaChalan}
                                        className="px-3 py-2 text-xs rounded-lg font-medium transition-colors border border-blue-700 bg-blue-900/30 hover:bg-blue-800/30 text-blue-300 disabled:opacity-30"
                                        title="Play authentic descending sequence"
                                    >
                                        Avroh Chalan
                                    </button>
                                </div>

                                {/* Audio Settings */}
                                <div className="flex items-center gap-4 ml-auto border-l border-gray-700 pl-4">
                                    <div className="flex flex-col">
                                        <label className="text-[10px] text-gray-400 uppercase font-bold">Arp Delay ({Math.round(arpeggiationDelay * 1000)}ms)</label>
                                        <input
                                            type="range" min="0" max="0.2" step="0.01"
                                            value={arpeggiationDelay}
                                            onChange={(e) => setArpeggiationDelay(parseFloat(e.target.value))}
                                            disabled={playbackMode === 'unison'}
                                            className="h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-50"
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <label className="text-[10px] text-gray-400 uppercase font-bold">Duration ({chordNoteDuration}s)</label>
                                        <input
                                            type="range" min="0.5" max="5" step="0.1"
                                            value={chordNoteDuration}
                                            onChange={(e) => setChordNoteDuration(parseFloat(e.target.value))}
                                            className="h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <label className="text-[10px] text-gray-400 uppercase font-bold">Playback</label>
                                        <select
                                            value={playbackMode}
                                            onChange={(e) => setPlaybackMode(e.target.value)}
                                            className="text-[10px] bg-gray-700 border border-gray-600 rounded px-2 py-1 text-gray-200"
                                        >
                                            <option value="unison">Unison</option>
                                            <option value="melody">Melody (Arp)</option>
                                        </select>
                                    </div>
                                </div>

                                <button
                                    onClick={toggleTanpura}
                                    disabled={isTanpuraLoading}
                                    className={`ml-2 p-2 rounded-full transition-all ${isTanpuraPlaying
                                        ? 'bg-red-100 text-red-600'
                                        : 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                                        }`}
                                    title={isTanpuraPlaying ? 'Stop Tanpura' : 'Play Tanpura'}
                                >
                                    {isTanpuraLoading ? (
                                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Custom Scale Editor */}
                    {customScaleMode && (
                        <div className="bg-gradient-to-r from-emerald-900/30 to-teal-900/30 rounded-xl p-4 border border-emerald-700/50">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                                    <span className="w-1.5 h-4 bg-emerald-500 rounded-full"></span>
                                    Custom Scale Editor {separateAarohAvroh ? '(Separate Aaroh/Avroh)' : '(Full Scale)'}
                                </h3>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            const clear = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
                                            setCustomNotePattern(clear);
                                            setCustomAarohPattern(clear);
                                            setCustomAvrohPattern(clear);
                                        }}
                                        className="text-[10px] px-2 py-1 bg-gray-800 text-gray-400 rounded hover:bg-gray-700 border border-gray-700"
                                    >
                                        Clear All
                                    </button>
                                    <button
                                        onClick={() => {
                                            const major = [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1];
                                            setCustomNotePattern(major);
                                            setCustomAarohPattern(major);
                                            setCustomAvrohPattern(major);
                                        }}
                                        className="text-[10px] px-2 py-1 bg-gray-800 text-gray-400 rounded hover:bg-gray-700 border border-gray-700"
                                    >
                                        Major
                                    </button>
                                    <button
                                        onClick={() => {
                                            const minor = [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0];
                                            setCustomNotePattern(minor);
                                            setCustomAarohPattern(minor);
                                            setCustomAvrohPattern(minor);
                                        }}
                                        className="text-[10px] px-2 py-1 bg-gray-800 text-gray-400 rounded hover:bg-gray-700 border border-gray-700"
                                    >
                                        Minor
                                    </button>
                                </div>
                            </div>

                            {separateAarohAvroh ? (
                                /* Separate Aaroha and Avroha editors */
                                <div className="space-y-4">
                                    {/* Aaroha Pattern */}
                                    <div>
                                        <p className="text-[10px] text-blue-400 uppercase font-bold mb-2">Aaroha (Ascending)</p>
                                        <div className="flex items-center justify-center gap-1 flex-wrap">
                                            {['Sa', 'Re♭', 'Re', 'Ga♭', 'Ga', 'Ma', 'Ma♯', 'Pa', 'Dha♭', 'Dha', 'Ni♭', 'Ni'].map((note, idx) => {
                                                const isBlackKey = [1, 3, 6, 8, 10].includes(idx);
                                                const isActive = customAarohPattern[idx] === 1;
                                                return (
                                                    <button
                                                        key={idx}
                                                        onClick={() => {
                                                            const newPattern = [...customAarohPattern];
                                                            newPattern[idx] = newPattern[idx] === 1 ? 0 : 1;
                                                            setCustomAarohPattern(newPattern);
                                                        }}
                                                        className={`
                                                            w-10 h-10 rounded-lg text-[10px] font-bold transition-all border-2
                                                            ${isActive
                                                                ? 'bg-blue-500 border-blue-300 text-white shadow-lg shadow-blue-500/30'
                                                                : isBlackKey
                                                                    ? 'bg-gray-900 border-gray-700 text-gray-500 hover:border-gray-500'
                                                                    : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-400'
                                                            }
                                                        `}
                                                    >
                                                        {note}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <p className="text-[9px] text-gray-500 text-center mt-1">
                                            {customAarohPattern.filter(n => n === 1).length} notes
                                        </p>
                                    </div>

                                    {/* Avroha Pattern */}
                                    <div>
                                        <p className="text-[10px] text-purple-400 uppercase font-bold mb-2">Avroha (Descending)</p>
                                        <div className="flex items-center justify-center gap-1 flex-wrap">
                                            {['Sa', 'Re♭', 'Re', 'Ga♭', 'Ga', 'Ma', 'Ma♯', 'Pa', 'Dha♭', 'Dha', 'Ni♭', 'Ni'].map((note, idx) => {
                                                const isBlackKey = [1, 3, 6, 8, 10].includes(idx);
                                                const isActive = customAvrohPattern[idx] === 1;
                                                return (
                                                    <button
                                                        key={idx}
                                                        onClick={() => {
                                                            const newPattern = [...customAvrohPattern];
                                                            newPattern[idx] = newPattern[idx] === 1 ? 0 : 1;
                                                            setCustomAvrohPattern(newPattern);
                                                        }}
                                                        className={`
                                                            w-10 h-10 rounded-lg text-[10px] font-bold transition-all border-2
                                                            ${isActive
                                                                ? 'bg-purple-500 border-purple-300 text-white shadow-lg shadow-purple-500/30'
                                                                : isBlackKey
                                                                    ? 'bg-gray-900 border-gray-700 text-gray-500 hover:border-gray-500'
                                                                    : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-400'
                                                            }
                                                        `}
                                                    >
                                                        {note}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <p className="text-[9px] text-gray-500 text-center mt-1">
                                            {customAvrohPattern.filter(n => n === 1).length} notes
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                /* Single full scale editor */
                                <>
                                    <div className="flex items-center justify-center gap-1 flex-wrap">
                                        {['Sa', 'Re♭', 'Re', 'Ga♭', 'Ga', 'Ma', 'Ma♯', 'Pa', 'Dha♭', 'Dha', 'Ni♭', 'Ni'].map((note, idx) => {
                                            const isBlackKey = [1, 3, 6, 8, 10].includes(idx);
                                            const isActive = customNotePattern[idx] === 1;
                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => {
                                                        const newPattern = [...customNotePattern];
                                                        newPattern[idx] = newPattern[idx] === 1 ? 0 : 1;
                                                        setCustomNotePattern(newPattern);
                                                    }}
                                                    className={`
                                                        w-12 h-12 rounded-lg text-xs font-bold transition-all border-2
                                                        ${isActive
                                                            ? isBlackKey
                                                                ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-500/30'
                                                                : 'bg-emerald-500 border-emerald-300 text-white shadow-lg shadow-emerald-500/30'
                                                            : isBlackKey
                                                                ? 'bg-gray-900 border-gray-700 text-gray-500 hover:border-gray-500'
                                                                : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-400'
                                                        }
                                                    `}
                                                >
                                                    {note}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <p className="text-[10px] text-gray-500 text-center mt-2">
                                        Click notes to toggle • {customNotePattern.filter(n => n === 1).length} notes selected
                                    </p>
                                </>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-8">
                        {/* Piano Keyboard */}
                        {showKeyboard && (
                            <div className="p-4 bg-gray-900 rounded-xl border border-gray-700 shadow-inner">
                                <Piano
                                    rootNote={rootNote}
                                    activeNotes={activeNotes}
                                    onNoteClick={handleNoteClick}
                                    showRagaNotes={showRagaNotesOnKeyboard}
                                    ragaNotes={customScaleMode ? customNotePattern : (selectedRaga?.pattern || [])}
                                />
                                <div className="mt-4 flex justify-end">
                                    <label className="inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={showRagaNotesOnKeyboard}
                                            onChange={e => setShowRagaNotesOnKeyboard(e.target.checked)}
                                            className="form-checkbox h-3 w-3 text-blue-500 rounded"
                                        />
                                        <span className="ml-2 text-[10px] text-gray-400 uppercase font-bold">Show Raga Swaras</span>
                                    </label>
                                </div>
                            </div>
                        )}

                        {selectedRaga && (
                            <div className="flex flex-col lg:flex-row gap-8">
                                {/* Sidebar with Tab Navigation */}
                                <div className="lg:w-64 flex-shrink-0">
                                    {/* Tab Buttons */}
                                    <div className="flex mb-4 p-1 bg-gray-800 rounded-lg">
                                        <button
                                            onClick={() => setShowCustomChordBuilder(false)}
                                            className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all ${!showCustomChordBuilder
                                                ? 'bg-blue-600 text-white shadow-sm'
                                                : 'text-gray-400 hover:text-gray-200'
                                                }`}
                                        >
                                            Chord Types
                                        </button>
                                        <button
                                            onClick={() => setShowCustomChordBuilder(true)}
                                            className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all ${showCustomChordBuilder
                                                ? 'bg-purple-600 text-white shadow-sm'
                                                : 'text-gray-400 hover:text-gray-200'
                                                }`}
                                        >
                                            Custom Chords
                                        </button>
                                    </div>

                                    {/* Chord Types Panel */}
                                    {!showCustomChordBuilder && (
                                        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                            {chordTypes.map(chord => {
                                                const count = countsByType[chord.id] ?? 0;
                                                return (
                                                    <button
                                                        key={chord.id}
                                                        className={`w-full text-left px-3 py-1.5 rounded-md border transition-all ${selectedChordType === chord.id
                                                            ? 'border-blue-500 bg-blue-50 shadow-sm'
                                                            : 'border-gray-200 bg-white hover:bg-gray-50'
                                                            }`}
                                                        onClick={() => setSelectedChordType(chord.id)}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                <div
                                                                    className="w-2 h-2 rounded-full flex-shrink-0"
                                                                    style={{ backgroundColor: chord.color }}
                                                                ></div>
                                                                <span className="font-medium text-xs truncate text-gray-800">{chord.name}</span>
                                                                {!chord.isSpecial && chord.intervals && (
                                                                    <span className="text-xs text-gray-400 truncate">
                                                                        {chord.intervals.join('-')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-800 flex-shrink-0 ml-1">
                                                                {count}
                                                            </span>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Custom Chord Builder Panel */}
                                    {showCustomChordBuilder && (
                                        <div className="p-4 bg-gradient-to-br from-purple-900/40 to-indigo-900/40 rounded-xl border border-purple-700/50 space-y-4">
                                            {/* Root Selector */}
                                            <div>
                                                <label className="block text-[10px] text-purple-300 uppercase font-bold mb-1">Root Note</label>
                                                <select
                                                    value={customChordRoot}
                                                    onChange={(e) => setCustomChordRoot(parseInt(e.target.value))}
                                                    className="w-full p-2 text-sm bg-gray-800 border border-gray-600 rounded-lg text-gray-200"
                                                >
                                                    {SWAR_NAMES.map((s, idx) => (
                                                        <option key={idx} value={idx}>{s}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Add Intervals */}
                                            <div>
                                                <label className="block text-[10px] text-purple-300 uppercase font-bold mb-2">Add Intervals</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button onClick={() => addInterval(1)} className="px-2 py-1.5 text-xs rounded bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-200">+m2</button>
                                                    <button onClick={() => addInterval(2)} className="px-2 py-1.5 text-xs rounded bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-200">+M2</button>
                                                    <button onClick={() => addInterval(3)} className="px-2 py-1.5 text-xs rounded bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-200">+m3</button>
                                                    <button onClick={() => addInterval(4)} className="px-2 py-1.5 text-xs rounded bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-200">+M3</button>
                                                    <button onClick={() => addInterval(5)} className="px-2 py-1.5 text-xs rounded bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-200">+4th</button>
                                                    <button onClick={() => addInterval(6)} className="px-2 py-1.5 text-xs rounded bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-200">+Tritone</button>
                                                    <button onClick={() => addInterval(7)} className="px-2 py-1.5 text-xs rounded bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-200">+5th</button>
                                                    <button onClick={() => addInterval(12)} className="px-2 py-1.5 text-xs rounded bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-200">+Octave</button>
                                                </div>
                                            </div>

                                            {/* Undo/Reset */}
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={removeLastInterval}
                                                    disabled={customIntervalsAbs.length <= 1}
                                                    className="flex-1 px-2 py-1.5 text-xs rounded border border-gray-600 hover:bg-gray-700 disabled:opacity-50 text-gray-300"
                                                >
                                                    Undo
                                                </button>
                                                <button
                                                    onClick={resetCustomChord}
                                                    className="flex-1 px-2 py-1.5 text-xs rounded border border-gray-600 hover:bg-gray-700 text-gray-300"
                                                >
                                                    Reset
                                                </button>
                                            </div>

                                            {/* Current Chord Display */}
                                            <div className="p-3 bg-gray-900/60 rounded-lg space-y-2 text-xs">
                                                <div className="text-gray-400">
                                                    <strong className="text-purple-300">Steps:</strong>{' '}
                                                    {customIntervalsAbs.map((v, i, arr) => i === 0 ? '0' : `+${v - arr[i - 1]}`).join(' ')}
                                                </div>
                                                <div className="text-gray-400">
                                                    <strong className="text-purple-300">Degrees:</strong>{' '}
                                                    {customIntervalsAbs.map(v => degreeLabel(v)).join(' - ')}
                                                </div>
                                                <div className="text-gray-300 font-medium">
                                                    <strong className="text-purple-300">Notes:</strong>{' '}
                                                    {customChordNotes.map(n => SWAR_NAMES[n]).join(' - ')}
                                                </div>
                                                <div className="flex gap-1 flex-wrap mt-2">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${customChordValidation.all ? 'bg-green-900/50 text-green-300 border border-green-700' : 'bg-red-900/50 text-red-300 border border-red-700'}`}>
                                                        Full {customChordValidation.all ? '✓' : '✗'}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${customChordValidation.aaroh ? 'bg-green-900/50 text-green-300 border border-green-700' : 'bg-red-900/50 text-red-300 border border-red-700'}`}>
                                                        Aaroh {customChordValidation.aaroh ? '✓' : '✗'}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${customChordValidation.avroh ? 'bg-green-900/50 text-green-300 border border-green-700' : 'bg-red-900/50 text-red-300 border border-red-700'}`}>
                                                        Avroh {customChordValidation.avroh ? '✓' : '✗'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Play Button */}
                                            <button
                                                onClick={playCustomChord}
                                                className="w-full py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-purple-500/20"
                                            >
                                                ♪ Play Chord
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Raga Circle */}
                                <div className="flex-1 p-6 bg-gradient-to-b from-gray-900/50 to-gray-800/50 rounded-xl border border-gray-700">
                                    <RagaCircle
                                        notes={customScaleMode
                                            ? (separateAarohAvroh
                                                ? customAarohPattern.map((v, i) => (v || customAvrohPattern[i]) ? 1 : 0)
                                                : customNotePattern)
                                            : selectedRaga.pattern}
                                        title={customScaleMode ? 'Custom Scale - Chord Circle' : `${selectedRaga.name} - Chord Circle`}
                                        availableChords={chords}
                                        isCarnaticMode={isCarnaticMode}
                                        separateAarohAvroh={separateAarohAvroh}
                                        aarohaPattern={customScaleMode ? customAarohPattern : selectedRaga.aarohaPattern}
                                        avrohaPattern={customScaleMode ? customAvrohPattern : selectedRaga.avrohaPattern}
                                        onNoteClick={handleNoteClick}
                                        selectedNote={selectedNoteFilter}
                                    />
                                    <div className="mt-4 flex justify-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-gray-400 uppercase font-bold">Filter Mode:</span>
                                            <select
                                                value={noteFilterMode}
                                                onChange={(e) => setNoteFilterMode(e.target.value)}
                                                className="bg-gray-800 border border-gray-700 rounded text-[10px] text-gray-300 p-1"
                                            >
                                                <option value="root">Root Note</option>
                                                <option value="any">Contains Note</option>
                                            </select>
                                        </div>
                                        {selectedNoteFilter !== null && (
                                            <button
                                                onClick={() => setSelectedNoteFilter(null)}
                                                className="text-[10px] text-red-400 uppercase font-bold hover:text-red-300"
                                            >
                                                Clear Filter
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Composition Panel - Between Raga Circle and Chords */}
                        <CompositionPanel
                            rhythmProgressions={rhythmProgressions}
                            activeTrackId={activeTrackId}
                            onSetActiveTrack={setActiveTrackId}
                            activeTrack={activeTrack}
                            onUpdateTrack={updateActiveTrack}
                            cycleBeats={cycleBeats}
                            onSetCycleBeats={setCycleBeats}
                            cycleBpm={cycleBpm}
                            onSetCycleBpm={setCycleBpm}
                            cycleLoop={cycleLoop}
                            onSetCycleLoop={setCycleLoop}
                            customBreakpoints={customBreakpoints}
                            onSetCustomBreakpoints={setCustomBreakpoints}
                            isPlaying={activeTrack.isPlaying}

                            onStart={startPlayback}
                            onStop={stopPlayback}
                            onClear={handleClearTrack}
                            midiProgram={midiProgram}
                            onSetMidiProgram={setMidiProgram}
                            midiVelocity={midiVelocity}
                            onSetMidiVelocity={setMidiVelocity}
                            midiChannel={midiChannel}
                            onSetMidiChannel={setMidiChannel}
                            midiNoteLengthBeats={midiNoteLengthBeats}
                            onSetMidiNoteLengthBeats={setMidiNoteLengthBeats}
                            midiGapBeats={midiGapBeats}
                            onSetMidiGapBeats={setMidiGapBeats}
                            onDownloadMIDI={handleDownloadMIDI}
                            onExportJson={handleExportProject}
                            onPlayArpeggio={handleChordClick}
                        />

                        {/* Chords Display */}
                        <div>
                            <h2 className="text-xl font-semibold mb-4 text-gray-200">Available Chords ({chords.length})</h2>
                            <ChordDisplay
                                chords={chords}
                                separateAarohAvroh={separateAarohAvroh}
                                onChordClick={handleChordClick}
                            />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default ChordTool;
