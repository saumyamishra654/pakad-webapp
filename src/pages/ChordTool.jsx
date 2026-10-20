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
import { CustomScaleEditor } from '../components/raga/CustomScaleEditor.jsx';
import { ChordCircle } from '../components/chords/ChordCircle.jsx';
import { ChordCard, ChordGrid } from '../components/chords/ChordCard.jsx';
import { ChordTypeList } from '../components/chords/ChordTypeList.jsx';
import { PianoKeyboard } from '../components/common/PianoKeyboard.jsx';
import { TimelineGrid } from '../components/rhythm/TimelineGrid.jsx';
import { PianoChordsView } from '../components/rhythm/PianoChordsView.jsx';
import { MidiSettingsPanel } from '../components/rhythm/MidiSettingsPanel.jsx';
import { SequencerControls } from '../components/rhythm/SequencerControls.jsx';
import { EXTENDED_CHORD_TYPES } from '../data/chordTypes.js';
import { getAvailableChords, getChordsOutsidePattern, countChordsByType, arrangeChordNotes, filterChordsByNote } from '../utils/chordHelpers.js';
import { getDisplayLabels, patternToPitchClasses, patternsDiffer, WESTERN_NOTES_SHARP } from '../utils/noteHelpers.js';
import { buildChalan, transposeNote } from '../utils/chalan.js';
import { PLAY, STOP } from '../utils/glyphs.js';
import { buildMidiFromProgression, buildMidiFromTracks, downloadMidi } from '../utils/midiExport.js';
import { useAudio } from '../hooks/useAudio.js';
import { usePianoSamples } from '../hooks/usePianoSamples.js';
import { useTanpura } from '../hooks/useTanpura.js';
import { useSequencer } from '../hooks/useSequencer.js';

// Small uppercase label above form fields
const FIELD_LABEL = 'block mb-1.5 text-xs font-medium uppercase tracking-wide text-gray-400';

const DEFAULT_PROGRESSIONS = [1, 2, 3, 4].map(id => ({ id, name: String(id), chords: [], isPlaying: false, currentBeat: -1 }));

function loadSavedProgressions() {
    try {
        const parsed = JSON.parse(localStorage.getItem('pakad_progressions'));
        // Track ids must be 1-4 (playback and editing look tracks up by id)
        if (Array.isArray(parsed) && parsed.length === 4 && parsed.every((p, i) => p?.id === i + 1)) {
            return parsed.map(p => ({
                ...p,
                chords: Array.isArray(p.chords)
                    ? p.chords.filter(c => Array.isArray(c?.chord?.notes) && Number.isFinite(c.beat) && c.beat >= 0)
                    : [],
                isPlaying: false,
                currentBeat: -1
            }));
        }
    } catch {
        // Ignore storage errors
    }
    return DEFAULT_PROGRESSIONS;
}

/**
 * ChordTool main page component
 */
export function ChordTool() {
    const [searchParams, setSearchParams] = useSearchParams();

    // Core state
    const [isCarnatic, setIsCarnatic] = useState(false);
    const [selectedRagaName, setSelectedRagaName] = useState('');
    const [selectedTonic, setSelectedTonic] = useState(0); // 0 = C
    const [noTonic, setNoTonic] = useState(false); // "No Tonic" plays and names as C

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


    // Custom scale state
    const [customScaleMode, setCustomScaleMode] = useState(false);
    const [customNotePattern, setCustomNotePattern] = useState(Array.from({ length: 12 }, (_, i) => i === 0 ? true : false));
    const [customAarohPattern, setCustomAarohPattern] = useState(Array.from({ length: 12 }, (_, i) => i === 0 ? true : false));
    const [customAvrohPattern, setCustomAvrohPattern] = useState(Array.from({ length: 12 }, (_, i) => i === 0 ? true : false));

    // Custom chord builder state
    const [customRoot, setCustomRoot] = useState(0);
    const [customIntervalsAbs, setCustomIntervalsAbs] = useState([0]); // Absolute intervals from root

    // Multiple rhythm progressions (4 tabs like original)
    // Restored synchronously so the save effect never overwrites saved data with defaults
    const [rhythmProgressions, setRhythmProgressions] = useState(loadSavedProgressions);
    const [activeProgressionId, setActiveProgressionId] = useState(1);

    const nextChordIdRef = useRef(null);
    if (nextChordIdRef.current === null) {
        nextChordIdRef.current = rhythmProgressions
            .flatMap(p => p.chords || [])
            .reduce((m, c) => Math.max(m, c.id || 0), 0) + 1;
    }

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
    // Always valid numbers: SequencerControls commits typed values on blur/Enter
    const [beats, setBeats] = useState(8);
    const [bpm, setBpm] = useState(120);

    const [loop, setLoop] = useState(true);

    // Enhanced progression controls (matching original)
    const [rhythmPlaybackMode, setRhythmPlaybackMode] = useState('unison'); // 'unison' or 'melody'
    const [arpeggiationDelay, setArpeggiationDelay] = useState(0.08);
    const [chordNoteDuration, setChordNoteDuration] = useState(1.0);
    const [customBreakpoints, setCustomBreakpoints] = useState('');

    // localStorage persistence for progressions (playback state is not persisted)
    const lastSavedRef = useRef(null);
    useEffect(() => {
        try {
            const data = JSON.stringify(rhythmProgressions.map(p => ({ id: p.id, name: p.name, chords: p.chords })));
            if (data === lastSavedRef.current) return; // currentBeat ticks don't need a write
            lastSavedRef.current = data;
            localStorage.setItem('pakad_progressions', data);
        } catch {
            // Ignore storage errors
        }
    }, [rhythmProgressions]);

    // MIDI settings
    const [showMidiSettings, setShowMidiSettings] = useState(false);
    const [showPianoChords, setShowPianoChords] = useState(false);
    const [midiSettings, setMidiSettings] = useState({
        tempoOverride: null, // null = use the sequencer BPM
        noteLengthBeats: 3.2,
        gapBeats: 0.4,
        velocity: 96,
        scope: 'all' // 'all' tracks or 'current'
    });

    // Audio
    const { audioContext } = useAudio();

    const { playNote, isLoading: isPianoLoading, ensureReady, hasSamples } = usePianoSamples(audioContext);
    const { isPlaying: isTanpuraPlaying, isLoading: isTanpuraLoading, toggle: toggleTanpura, changeTonic } = useTanpura();

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
                setTimeout(() => {
                    setIsCarnatic(prev => {
                        if (prev !== false) return false;
                        return prev;
                    });
                    setSelectedRagaName(decodedName);
                }, 0);
                return;
            }

            // Check Carnatic
            const carnaticMatch = MELAKARTA_72.find(r => r.name === decodedName);
            if (carnaticMatch) {
                setTimeout(() => {
                    setIsCarnatic(prev => {
                        if (prev !== true) return true;
                        return prev;
                    });
                    setSelectedRagaName(decodedName);
                }, 0);
                return;
            }
        }
    }, [searchParams]);

    // Auto-select first raga if none selected AND no URL param
    useEffect(() => {
        // Don't auto-select if a valid ?raga= link is being applied
        const ragaParam = searchParams.get('raga');
        if (ragaParam) {
            const name = decodeURIComponent(ragaParam);
            if (HINDUSTANI_RAGAS.some(r => r.name === name) || MELAKARTA_72.some(r => r.name === name)) return;
        }

        if (!selectedRagaName && ragaList.length > 0) {
            setTimeout(() => {
                setSelectedRagaName(prev => {
                    if (prev !== ragaList[0].name) return ragaList[0].name;
                    return prev;
                });
            }, 0);
        }
    }, [ragaList, selectedRagaName, searchParams]);

    // Get selected raga object
    const selectedRaga = useMemo(() => {
        return ragaList.find(r => r.name === selectedRagaName) || null;
    }, [ragaList, selectedRagaName]);

    // Auto-set separateAarohAvroh when raga has different aaroh/avroh patterns
    useEffect(() => {
        if (selectedRaga && !customScaleMode) {
            if (patternsDiffer(selectedRaga.aarohPattern, selectedRaga.avrohPattern)) {
                setTimeout(() => {
                    setSeparateAarohAvroh(prev => {
                        if (prev !== true) return true;
                        return prev;
                    });
                }, 0);
            } else {
                setTimeout(() => {
                    setSeparateAarohAvroh(prev => {
                        if (prev !== false) return false;
                        return prev;
                    });
                }, 0);
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

        // Always compute counts from ALL chord types (unfiltered) so they remain stable
        const allForCounts = getAvailableChords(patterns.all, 'all', showExtended);

        const all = selectedChordType === 'all'
            ? allForCounts
            : getAvailableChords(patterns.all, selectedChordType, showExtended);
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
            counts: countChordsByType(allForCounts)
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



    // Handle mode change
    const handleModeChange = useCallback((carnatic) => {
        setIsCarnatic(carnatic);
        setSelectedRagaName(''); // Reset selection
        // A ?raga= link would otherwise keep blocking auto-selection in the new mode
        if (searchParams.get('raga')) setSearchParams({}, { replace: true });
    }, [searchParams, setSearchParams]);

    // Play a chord (isUnison=true for all notes at once, false for melody/arpeggiated)
    // Schedule a chord on the audio clock, `delay` seconds from now (samples must be loaded).
    // Returns what it scheduled so the sequencer can cancel notes that haven't started.
    const scheduleChord = useCallback((chord, isUnison, delay = 0) => {
        const duration = Number.isFinite(chordNoteDuration) && chordNoteDuration > 0 ? chordNoteDuration : 0.8;
        const arpDelay = Number.isFinite(arpeggiationDelay) ? Math.max(0, arpeggiationDelay) : 0.08;
        const now = audioContext?.currentTime ?? 0;

        return arrangeChordNotes(chord.notes, 4).flatMap(({ noteIndex, octave }, i) => {
            const note = transposeNote(noteIndex, octave, selectedTonic);
            const at = isUnison ? delay : delay + i * arpDelay;
            const source = isUnison
                ? playNote(note.noteIndex, note.octave, duration, at, 0.8)
                : playNote(note.noteIndex, note.octave, duration * 0.6, at, 0.6);
            return source ? [{ source, startAt: now + at }] : [];
        });
    }, [audioContext, playNote, selectedTonic, chordNoteDuration, arpeggiationDelay]);

    // Play a chord now (isUnison=true for all notes at once, false for melody/arpeggiated)
    const playRequestRef = useRef(0);
    const handlePlayChord = useCallback(async (chord, isUnison = true) => {
        const request = ++playRequestRef.current;
        if (!(await ensureReady())) return;
        // Requests made while samples were loading would otherwise all sound at once
        if (request !== playRequestRef.current) return;
        scheduleChord(chord, isUnison);
    }, [ensureReady, scheduleChord]);

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

    // Tap-to-place (touch screens can't drag): arm a chord, then tap a beat
    const [pendingChord, setPendingChord] = useState(null);
    const isPendingChord = useCallback((chord) => (
        !!pendingChord && pendingChord.root === chord.root && pendingChord.type === chord.type
    ), [pendingChord]);
    const handleBeatClick = useCallback((beatIndex) => {
        if (!pendingChord) return;
        handleChordPlace(beatIndex, pendingChord);
        setPendingChord(null);
    }, [pendingChord, handleChordPlace]);

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
    const [playStartToken, setPlayStartToken] = useState(0); // bumps on Play so the loop restarts at beat 0
    const handlePlayPause = useCallback(() => {
        if (activeProgression.isPlaying) {
            updateProgression(activeProgressionId, { isPlaying: false, currentBeat: -1 });
        } else {
            ensureReady(); // resume audio and start loading samples; beats are skipped until ready
            setPlayStartToken(t => t + 1);
            updateProgression(activeProgressionId, { isPlaying: true, currentBeat: -1 });
        }
    }, [activeProgression, activeProgressionId, updateProgression, ensureReady]);

    // Switching tracks stops playback so a hidden track never keeps playing
    const handleSelectProgression = useCallback((id) => {
        setRhythmProgressions(prev => prev.map(p => (p.isPlaying ? { ...p, isPlaying: false, currentBeat: -1 } : p)));
        setActiveProgressionId(id);
    }, []);

    const handleClear = useCallback(() => {
        updateProgression(activeProgressionId, { chords: [], isPlaying: false, currentBeat: -1 });
    }, [activeProgressionId, updateProgression]);

    // Download progression(s) as MIDI
    const handleDownloadMidi = useCallback(() => {
        // Chords left beyond the cycle (after lowering Beats) are hidden, so don't export them
        const inCycle = (progression) => progression.chords.filter(c => c.beat < beats);
        const options = {
            tonic: selectedTonic,
            tempo: midiSettings.tempoOverride ?? bpm,
            noteLengthBeats: midiSettings.noteLengthBeats,
            gapBeats: midiSettings.gapBeats,
            velocity: midiSettings.velocity,
            channel: 1,
            program: 0,
            baseOctave: 4
        };

        const midiData = midiSettings.scope === 'all'
            ? buildMidiFromTracks({
                ...options,
                tracks: rhythmProgressions.map(p => ({ name: `Track ${p.name}`, progression: inCycle(p) }))
            })
            : buildMidiFromProgression({ ...options, progression: inCycle(activeProgression) });

        if (!midiData) {
            alert('No chords within the current cycle to export.');
            return;
        }

        const raga = selectedRagaName ? selectedRagaName.replace(/\s+/g, '_') : 'chord';
        downloadMidi(midiData, midiSettings.scope === 'all'
            ? `${raga}_progressions`
            : `${raga}_progression_${activeProgressionId}`);
    }, [activeProgression, activeProgressionId, rhythmProgressions, beats, bpm, selectedTonic, midiSettings, selectedRagaName]);

    // Sequencer: beats are scheduled on the audio clock; chords/settings are read live
    const scheduleBeat = useCallback((beat, delay) => {
        if (!hasSamples()) {
            ensureReady(); // still loading: skip this beat rather than queue it
            return [];
        }
        const item = activeProgression.chords.find(c => Math.floor(c.beat) === beat);
        return item ? scheduleChord(item.chord, rhythmPlaybackMode === 'unison', delay) : [];
    }, [activeProgression.chords, hasSamples, ensureReady, scheduleChord, rhythmPlaybackMode]);

    useSequencer({
        audioContext,
        isPlaying: activeProgression.isPlaying,
        startToken: playStartToken,
        beats,
        bpm,
        loop,
        scheduleBeat,
        onBeat: (beat) => updateProgression(activeProgressionId, { currentBeat: beat }),
        onFinished: () => updateProgression(activeProgressionId, { isPlaying: false, currentBeat: -1 })
    });

    // Aaroh / Avroh / Full Raga playback, scheduled on the audio clock so it can be stopped mid-phrase
    const [chalanMode, setChalanMode] = useState(null);
    const chalanRef = useRef({ sources: [], timer: null });

    const stopChalan = useCallback(() => {
        const { sources, timer } = chalanRef.current;
        sources.forEach(source => { try { source.stop(); } catch { /* already stopped */ } });
        clearTimeout(timer);
        chalanRef.current = { sources: [], timer: null };
        setChalanMode(null);
    }, []);

    const playChalan = useCallback(async (mode) => {
        const wasPlaying = chalanMode;
        stopChalan();
        if (wasPlaying === mode) return; // clicking the playing button stops it
        if (!(await ensureReady())) return;

        const notes = buildChalan(getCurrentPatterns(), mode);
        const sources = notes.map(({ noteIndex, octave, at }) => {
            const note = transposeNote(noteIndex, octave, selectedTonic);
            return playNote(note.noteIndex, note.octave, 0.6, at);
        }).filter(Boolean);
        const endMs = ((notes.at(-1)?.at ?? 0) + 0.6) * 1000;
        chalanRef.current = { sources, timer: setTimeout(() => setChalanMode(null), endMs) };
        setChalanMode(mode);
    }, [chalanMode, stopChalan, ensureReady, getCurrentPatterns, selectedTonic, playNote]);

    useEffect(() => stopChalan, [stopChalan]); // stop on unmount

    // Update tanpura when tonic changes (only if already playing)
    // Use a ref to track previous tonic to only react to actual changes
    const prevTonicRef = useRef(selectedTonic);
    useEffect(() => {
        // Only change tonic if it actually changed and tanpura is playing
        if (prevTonicRef.current !== selectedTonic && (isTanpuraPlaying || isTanpuraLoading)) {
            changeTonic(selectedTonic, true); // true = autoPlay after changing
        }
        prevTonicRef.current = selectedTonic;
    }, [selectedTonic]); // eslint-disable-line react-hooks/exhaustive-deps

    const labels = useMemo(() => getDisplayLabels(isCarnatic), [isCarnatic]);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 text-gray-200">
            {/* Page Header */}
            <div className="mb-6">
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-100">
                    Raga-Based Chord Formation
                </h1>
                <p className="mt-1 text-gray-400">
                    Generate chords within raga frameworks
                </p>
            </div>

            {/* Top Control Panel */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 sm:p-5 mb-8">
                <div className="flex flex-wrap items-end gap-4">
                    {/* Music system */}
                    <div>
                        <span className={FIELD_LABEL}>System</span>
                        <div className="inline-flex rounded-lg border border-gray-700 bg-gray-800 p-0.5" role="group" aria-label="Music system">
                            {[{ value: false, label: 'Hindustani' }, { value: true, label: 'Carnatic' }].map(({ value, label }) => (
                                <button
                                    key={label}
                                    onClick={() => isCarnatic !== value && handleModeChange(value)}
                                    aria-pressed={isCarnatic === value}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isCarnatic === value
                                        ? 'bg-gray-600 text-gray-100'
                                        : 'text-gray-400 hover:text-gray-100'
                                        }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Raga Selection */}
                    <label className="flex-1 min-w-[12rem]">
                        <span className={FIELD_LABEL}>{isCarnatic ? 'Melakarta' : 'Raga'}</span>
                        <select
                            value={selectedRagaName}
                            onChange={(e) => {
                                setSelectedRagaName(e.target.value);
                                // Otherwise a ?raga= link keeps blocking auto-selection after "Select…"
                                if (searchParams.get('raga')) setSearchParams({}, { replace: true });
                            }}
                            className="w-full"
                        >
                            <option value="">Select…</option>
                            {ragaList.map(r => (
                                <option key={r.name} value={r.name}>
                                    {isCarnatic && r.number ? `${r.number}. ${r.name}` : r.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    {/* Tonic Selection */}
                    <label className="w-32">
                        <span className={FIELD_LABEL}>Tonic</span>
                        <select
                            value={noTonic ? '' : selectedTonic}
                            onChange={(e) => {
                                // parseInt('') is NaN, which broke names, playback, MIDI and tanpura
                                const none = e.target.value === '';
                                setNoTonic(none);
                                setSelectedTonic(none ? 0 : parseInt(e.target.value, 10));
                            }}
                            className="w-full"
                        >
                            <option value="">No Tonic</option>
                            {WESTERN_NOTES_SHARP.map((note, index) => (
                                <option key={index} value={index}>
                                    {note}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                {/* Options */}
                <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4 text-sm text-gray-300">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={separateAarohAvroh}
                            onChange={e => setSeparateAarohAvroh(e.target.checked)}
                        />
                        Separate Aaroh/Avroh
                    </label>
                    <label className={`inline-flex items-center gap-2 ${customScaleMode ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                        <input
                            type="checkbox"
                            checked={showOutsideChords && !customScaleMode}
                            onChange={e => {
                                if (!customScaleMode) {
                                    setShowOutsideChords(e.target.checked);
                                }
                            }}
                            disabled={customScaleMode}
                        />
                        Show chords outside raga
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={showRagaNotesOnKeyboard}
                            onChange={e => setShowRagaNotesOnKeyboard(e.target.checked)}
                        />
                        Show raga notes on keyboard
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={customScaleMode}
                            onChange={e => setCustomScaleMode(e.target.checked)}
                        />
                        Custom scale
                    </label>
                </div>

                {/* Playback actions */}
                <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-800">
                    {/* Aaroh / Avroh / Full Raga (click again to stop) */}
                    {[
                        { mode: 'aaroh', label: 'Aaroh' },
                        { mode: 'avroh', label: 'Avroh' },
                        { mode: 'full', label: 'Full Raga' }
                    ].map(({ mode, label }) => (
                        <button
                            key={mode}
                            onClick={() => playChalan(mode)}
                            className={`btn ${chalanMode === mode ? 'btn-selected' : 'btn-secondary'}`}
                        >
                            {chalanMode === mode ? `${STOP} Stop` : `${PLAY} ${label}`}
                        </button>
                    ))}

                    {/* Tanpura Toggle */}
                    <button
                        onClick={() => toggleTanpura(selectedTonic)}
                        aria-pressed={isTanpuraPlaying}
                        className={`btn ${isTanpuraPlaying ? 'btn-selected' : 'btn-secondary'}`}
                    >
                        {isTanpuraPlaying ? `${STOP} Tanpura` : `${PLAY} Tanpura`}
                    </button>

                    {/* Show/Hide Keyboard Toggle */}
                    <button
                        onClick={() => setShowPiano(!showPiano)}
                        className="btn btn-ghost"
                    >
                        {showPiano ? 'Hide keyboard' : 'Show keyboard'}
                    </button>

                    {isPianoLoading && (
                        <span className="text-xs text-gray-400 animate-pulse">
                            Loading sounds…
                        </span>
                    )}

                    {/* Outside Chords Min/Max Controls */}
                    {showOutsideChords && !customScaleMode && (
                        <div className="flex items-center gap-2 ml-auto text-sm text-gray-400">
                            <span>Notes outside raga</span>
                            <select
                                value={outsideMinAllowed}
                                onChange={e => {
                                    const newMin = parseInt(e.target.value, 10);
                                    setOutsideMinAllowed(newMin);
                                    if (outsideMaxAllowed < newMin) setOutsideMaxAllowed(newMin);
                                }}
                                aria-label="Minimum notes outside"
                            >
                                <option value={1}>1</option>
                                <option value={2}>2</option>
                                <option value={3}>3</option>
                            </select>
                            <span>to</span>
                            <select
                                value={outsideMaxAllowed}
                                onChange={e => {
                                    const newMax = parseInt(e.target.value, 10);
                                    setOutsideMaxAllowed(newMax);
                                    if (outsideMinAllowed > newMax) setOutsideMinAllowed(newMax);
                                }}
                                aria-label="Maximum notes outside"
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
                    <CustomScaleEditor
                        labels={labels}
                        separateAarohAvroh={separateAarohAvroh}
                        patterns={{ note: customNotePattern, aaroh: customAarohPattern, avroh: customAvrohPattern }}
                        onChange={({ note, aaroh, avroh }) => {
                            if (note) setCustomNotePattern(note);
                            if (aaroh) setCustomAarohPattern(aaroh);
                            if (avroh) setCustomAvrohPattern(avroh);
                        }}
                        selectedRaga={selectedRaga}
                    />
                )}
            </div>

            {/* Piano Keyboard - positioned between control bar and circles */}
            {showPiano && selectedRaga && (
                <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 sm:p-6 mb-6">
                    <PianoKeyboard
                        highlightedNotes={showRagaNotesOnKeyboard ? patternToPitchClasses(getCurrentPatterns().all) : []}
                        isCarnatic={isCarnatic}
                        tonic={selectedTonic}
                        onNoteClick={async (noteIndex, octave) => {
                            if (!(await ensureReady())) return;
                            // Carry into the next octave so keys above the tonic still rise in pitch
                            const note = transposeNote(noteIndex, octave, selectedTonic);
                            playNote(note.noteIndex, note.octave, 0.5);
                        }}
                        swarLabels={showRagaNotesOnKeyboard ? getCurrentPatterns().all.map((p, i) => p ? i : null) : null}
                    />
                </div>
            )}


            {/* Tab Navigation */}
            <div className="flex gap-6 border-b border-gray-800 mb-6" role="tablist">
                {[{ id: 'chords', label: 'Chord Visualization' }, { id: 'custom', label: 'Custom Chords' }].map(tab => (
                    <button
                        key={tab.id}
                        role="tab"
                        aria-selected={activeTab === tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`-mb-px pb-2.5 pt-1 border-b-2 text-sm font-medium transition-colors ${activeTab === tab.id
                            ? 'border-blue-500 text-gray-100'
                            : 'border-transparent text-gray-400 hover:text-gray-200'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
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
                            onToggleExtended={(checked) => {
                                setShowExtended(checked);
                                if (!checked && EXTENDED_CHORD_TYPES.some(t => t.id === selectedChordType)) {
                                    setSelectedChordType('all');
                                }
                            }}
                        />
                    </div>

                    {/* Right main content area */}
                    <div className="flex-1 w-full">
                        {separateAarohAvroh ? (
                            <div>
                                {/* Click hint - shown once */}
                                <p className="mb-4 text-center text-xs text-gray-400">Click a note to filter chords</p>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div className="text-center">
                                        <h3 className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-3">Aaroh (Ascending)</h3>
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
                                        <h3 className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-3">Avroh (Descending)</h3>
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
                        <div className="space-y-4 rounded-xl border border-gray-800 bg-gray-900 p-4">
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
                                    <button onClick={() => addStack(3)} className="btn btn-sm btn-secondary">+m3</button>
                                    <button onClick={() => addStack(4)} className="btn btn-sm btn-secondary">+M3</button>
                                    <button onClick={() => addStack(5)} className="btn btn-sm btn-secondary">+4th</button>
                                    <button onClick={() => addStack(6)} className="btn btn-sm btn-secondary">+Tritone</button>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={removeLast} disabled={customIntervalsAbs.length <= 1} className="btn btn-sm btn-secondary flex-1">Undo</button>
                                <button onClick={resetCustom} className="btn btn-sm btn-secondary flex-1">Reset</button>
                            </div>
                            <div className="text-xs text-gray-300 space-y-2 p-3 bg-gray-800 rounded">
                                <div><strong>Steps:</strong> {customIntervalsAbs.map((v, i, arr) => i === 0 ? '0' : `+${v - arr[i - 1]}`).join(' ')}</div>
                                <div><strong>Notes:</strong> {customNotesAll.map(i => labels[i]).join(' - ')}</div>
                                <div className="flex gap-1 flex-wrap">
                                    <span className={`px-2 py-0.5 rounded text-xs ${customValidation.all ? 'bg-green-800 text-green-200' : 'bg-red-800 text-red-200'}`}>All: {customValidation.all ? 'in scale' : 'outside'}</span>
                                    <span className={`px-2 py-0.5 rounded text-xs ${customValidation.aaroh ? 'bg-green-800 text-green-200' : 'bg-red-800 text-red-200'}`}>Aaroh: {customValidation.aaroh ? 'in scale' : 'outside'}</span>
                                    <span className={`px-2 py-0.5 rounded text-xs ${customValidation.avroh ? 'bg-green-800 text-green-200' : 'bg-red-800 text-red-200'}`}>Avroh: {customValidation.avroh ? 'in scale' : 'outside'}</span>
                                </div>
                            </div>
                            <button
                                onClick={async () => {
                                    if (!(await ensureReady())) return;
                                    // Voice from the stacked intervals so compound intervals (e.g. 9ths) keep their octave
                                    customIntervalsAbs.forEach((interval, i) => {
                                        const note = transposeNote(customRoot + interval, 4, selectedTonic);
                                        playNote(note.noteIndex, note.octave, 0.8, i * 0.08);
                                    });
                                }}
                                className="btn btn-primary w-full"
                            >
                                {PLAY} Play Custom Chord
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
                <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 sm:p-6">
                    <h2 className="text-2xl font-semibold text-gray-100 mb-4">
                        Available Chords
                    </h2>

                    {!separateAarohAvroh ? (
                        <div className="max-h-[22rem] overflow-y-auto pr-1">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                {currentChords.map((chord, index) => (
                                    <ChordCard
                                        key={`all-${chord.root}-${chord.type}-${index}`}
                                        chord={chord}
                                        onPlayUnison={() => handlePlayChord(chord, true)}
                                        onPlayMelody={() => handlePlayChord(chord, false)}
                                        onSelect={setPendingChord}
                                        isSelected={isPendingChord(chord)}
                                        tonic={selectedTonic}
                                        isCarnatic={isCarnatic}
                                        isExtended={chord.isExtended}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-6 min-h-[250px]">
                            {/* Aaroh Chords - Scrollable */}
                            <div>
                                <h3 className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-3">Aaroh Chords ({chordData.aaroh.length})</h3>
                                <div className="max-h-[22rem] overflow-y-auto pr-1">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {chordData.aaroh.map((chord, index) => (
                                            <ChordCard
                                                key={`aaroh-${chord.root}-${chord.type}-${index}`}
                                                chord={chord}
                                                onPlayUnison={() => handlePlayChord(chord, true)}
                                                onPlayMelody={() => handlePlayChord(chord, false)}
                                                onSelect={setPendingChord}
                                                isSelected={isPendingChord(chord)}
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
                                <h3 className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-3">Avroh Chords ({chordData.avroh.length})</h3>
                                <div className="max-h-[22rem] overflow-y-auto pr-1">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {chordData.avroh.map((chord, index) => (
                                            <ChordCard
                                                key={`avroh-${chord.root}-${chord.type}-${index}`}
                                                chord={chord}
                                                onPlayUnison={() => handlePlayChord(chord, true)}
                                                onPlayMelody={() => handlePlayChord(chord, false)}
                                                onSelect={setPendingChord}
                                                isSelected={isPendingChord(chord)}
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
                                                <h4 className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-3">Aaroh ({chordData.outsideAaroh.length})</h4>
                                                <div className="max-h-48 overflow-y-auto pr-2">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        {chordData.outsideAaroh.map((chord, index) => (
                                                            <ChordCard
                                                                key={`outside-aaroh-${chord.root}-${chord.type}-${index}`}
                                                                chord={chord}
                                                                onPlayUnison={() => handlePlayChord(chord, true)}
                                                                onPlayMelody={() => handlePlayChord(chord, false)}
                                                                onSelect={setPendingChord}
                                                                isSelected={isPendingChord(chord)}
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
                                                <h4 className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-3">Avroh ({chordData.outsideAvroh.length})</h4>
                                                <div className="max-h-48 overflow-y-auto pr-2">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        {chordData.outsideAvroh.map((chord, index) => (
                                                            <ChordCard
                                                                key={`outside-avroh-${chord.root}-${chord.type}-${index}`}
                                                                chord={chord}
                                                                onPlayUnison={() => handlePlayChord(chord, true)}
                                                                onPlayMelody={() => handlePlayChord(chord, false)}
                                                                onSelect={setPendingChord}
                                                                isSelected={isPendingChord(chord)}
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
                                    <div className="max-h-[22rem] overflow-y-auto pr-1">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                            {chordData.outside.map((chord, index) => (
                                                <ChordCard
                                                    key={`outside-${chord.root}-${chord.type}-${index}`}
                                                    chord={chord}
                                                    onPlayUnison={() => handlePlayChord(chord, true)}
                                                    onPlayMelody={() => handlePlayChord(chord, false)}
                                                    onSelect={setPendingChord}
                                                    isSelected={isPendingChord(chord)}
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
                    <div className="mt-8 pt-6 border-t border-gray-800">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                            <h3 className="text-xl font-semibold text-gray-100">
                                Chord Progression Builder
                            </h3>

                            {/* Track selector */}
                            <div className="inline-flex rounded-lg border border-gray-700 bg-gray-800 p-0.5" role="group" aria-label="Track">
                                {rhythmProgressions.map(prog => (
                                    <button
                                        key={prog.id}
                                        onClick={() => handleSelectProgression(prog.id)}
                                        aria-pressed={activeProgressionId === prog.id}
                                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${activeProgressionId === prog.id
                                            ? 'bg-gray-600 text-gray-100'
                                            : 'text-gray-400 hover:text-gray-100'
                                            }`}
                                    >
                                        Track {prog.name}
                                        {prog.chords.length > 0 && (
                                            <span className="ml-1 text-xs text-gray-400">
                                                {prog.chords.length}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <SequencerControls
                            settings={{
                                beats,
                                bpm,
                                mode: rhythmPlaybackMode,
                                arpeggiationDelay,
                                noteDuration: chordNoteDuration,
                                loop,
                                breakpoints: customBreakpoints
                            }}
                            onChange={(changes) => {
                                if ('beats' in changes) setBeats(changes.beats);
                                if ('bpm' in changes) setBpm(changes.bpm);
                                if ('mode' in changes) setRhythmPlaybackMode(changes.mode);
                                if ('arpeggiationDelay' in changes) setArpeggiationDelay(changes.arpeggiationDelay);
                                if ('noteDuration' in changes) setChordNoteDuration(changes.noteDuration);
                                if ('loop' in changes) setLoop(changes.loop);
                                if ('breakpoints' in changes) setCustomBreakpoints(changes.breakpoints);
                            }}
                            isPlaying={activeProgression.isPlaying}
                            onPlayStop={handlePlayPause}
                            onClear={handleClear}
                        />

                        {/* MIDI Controls */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            <button
                                onClick={() => setShowMidiSettings(!showMidiSettings)}
                                className="btn btn-sm btn-secondary"
                            >
                                MIDI Settings
                            </button>
                            <button
                                onClick={handleDownloadMidi}
                                disabled={activeProgression.chords.length === 0}
                                className="btn btn-sm btn-secondary"
                            >
                                Download MIDI
                            </button>
                            <button
                                onClick={() => setShowPianoChords(!showPianoChords)}
                                className="btn btn-sm btn-ghost"
                            >
                                {showPianoChords ? 'Hide' : 'Show'} Piano Chords
                            </button>
                        </div>

                        {/* MIDI Settings Panel */}
                        {showMidiSettings && (
                            <MidiSettingsPanel
                                settings={midiSettings}
                                onChange={(changes) => setMidiSettings(prev => ({ ...prev, ...changes }))}
                                sequencerBpm={bpm}
                            />
                        )}

                        {/* Tap-to-place prompt, fixed so it stays visible while scrolling to the timeline */}
                        {pendingChord && (
                            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2 rounded-full bg-blue-500 text-white text-sm font-medium shadow-lg shadow-black/40">
                                <span>Tap a beat to place {labels[pendingChord.root]} {pendingChord.name}</span>
                                <button
                                    onClick={() => setPendingChord(null)}
                                    className="px-2 py-0.5 rounded-full bg-white/15 hover:bg-white/25"
                                >
                                    Cancel
                                </button>
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
                            isPlacing={!!pendingChord}
                            onBeatClick={handleBeatClick}
                        />

                        <div className="mt-3 text-xs text-gray-500">
                            Drag chords onto the timeline (on a touch screen, tap a chord and then a beat). Hover over a placed chord to remove it.
                        </div>

                        {/* Piano Chords View - below timeline */}
                        {showPianoChords && activeProgression.chords.length > 0 && (
                            <PianoChordsView chords={activeProgression.chords} labels={labels} tonic={selectedTonic} />
                        )}
                    </div>
                </div>
            </div >
        </div >
    );
}

export default ChordTool;
