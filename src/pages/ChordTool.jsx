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
import { ChordGrid } from '../components/chords/ChordCard.jsx';
import { ChordTypeList } from '../components/chords/ChordTypeList.jsx';
import { PianoKeyboard } from '../components/common/PianoKeyboard.jsx';
import { TimelineGrid, PlaybackControls } from '../components/rhythm/TimelineGrid.jsx';
import { getAvailableChords, getChordsOutsidePattern, countChordsByType, arrangeChordNotes } from '../utils/chordHelpers.js';
import { getDisplayLabels, patternToPitchClasses, WESTERN_NOTES_SHARP } from '../utils/noteHelpers.js';
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
    const [showPiano, setShowPiano] = useState(true);
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'aaroh', 'avroh', 'outside'

    // Rhythm state
    const [progressionChords, setProgressionChords] = useState([]);
    const [beats, setBeats] = useState(8);
    const [bpm, setBpm] = useState(120);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentBeat, setCurrentBeat] = useState(-1);
    const [loop, setLoop] = useState(true);

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

    // Compute available chords
    const chordData = useMemo(() => {
        if (!selectedRaga) {
            return { all: [], aaroh: [], avroh: [], outside: [], counts: {} };
        }

        const all = getAvailableChords(selectedRaga.notePattern, selectedChordType, showExtended);
        const aaroh = separateAarohAvroh
            ? getAvailableChords(selectedRaga.aarohPattern, selectedChordType, showExtended)
            : [];
        const avroh = separateAarohAvroh
            ? getAvailableChords(selectedRaga.avrohPattern, selectedChordType, showExtended)
            : [];
        const outside = showOutsideChords
            ? getChordsOutsidePattern(selectedRaga.notePattern, 1, 2, selectedChordType, showExtended)
            : [];

        return {
            all,
            aaroh,
            avroh,
            outside,
            counts: countChordsByType(all)
        };
    }, [selectedRaga, selectedChordType, showExtended, separateAarohAvroh, showOutsideChords]);

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

    // Handle mode change
    const handleModeChange = useCallback((carnatic) => {
        setIsCarnatic(carnatic);
        setSelectedRagaName(''); // Reset selection
    }, []);

    // Play a chord
    const handlePlayChord = useCallback(async (chord) => {
        if (!pianoReady) {
            await resume();
            return;
        }

        const arranged = arrangeChordNotes(chord.notes, 4);
        for (const { noteIndex, octave } of arranged) {
            const transposedNote = (noteIndex + selectedTonic) % 12;
            playNote(transposedNote, octave, 0.8, 0, 0.8);
        }
    }, [pianoReady, resume, playNote, selectedTonic]);

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

                // Play chord at this beat
                const chordAtBeat = progressionChords.find(c => c.beat === next);
                if (chordAtBeat) {
                    handlePlayChord(chordAtBeat.chord);
                }

                return next;
            });
        }, msPerBeat);

        return () => clearInterval(interval);
    }, [isPlaying, bpm, beats, loop, progressionChords, handlePlayChord]);

    // Update tanpura when tonic changes
    useEffect(() => {
        if (isTanpuraPlaying) {
            changeTonic(selectedTonic);
        }
    }, [selectedTonic, isTanpuraPlaying, changeTonic]);

    const labels = useMemo(() => getDisplayLabels(isCarnatic), [isCarnatic]);

    return (
        <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Left Sidebar - Controls */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Raga Selector */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
                        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
                            Select Raga
                        </h2>
                        <RagaSelector
                            selectedRaga={selectedRagaName}
                            onSelect={handleRagaSelect}
                            isCarnatic={isCarnatic}
                            onModeChange={handleModeChange}
                        />

                        {/* Tonic selector */}
                        <div className="mt-4">
                            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                                Tonic (Sa = )
                            </label>
                            <select
                                value={selectedTonic}
                                onChange={e => setSelectedTonic(parseInt(e.target.value))}
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                            >
                                {WESTERN_NOTES_SHARP.map((note, i) => (
                                    <option key={i} value={i}>{note}</option>
                                ))}
                            </select>
                        </div>

                        {/* Tanpura toggle */}
                        <button
                            onClick={() => toggleTanpura(selectedTonic)}
                            className={`mt-3 w-full py-2 rounded-lg font-medium transition-colors ${isTanpuraPlaying
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                                }`}
                        >
                            🎵 Tanpura {isTanpuraPlaying ? 'ON' : 'OFF'}
                        </button>
                    </div>

                    {/* Chord Type Filter */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
                        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
                            Chord Types
                        </h2>
                        <ChordTypeList
                            selected={selectedChordType}
                            onSelect={setSelectedChordType}
                            counts={chordData.counts}
                            showExtended={showExtended}
                            onToggleExtended={setShowExtended}
                        />
                    </div>

                    {/* Options */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 space-y-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={separateAarohAvroh}
                                onChange={e => setSeparateAarohAvroh(e.target.checked)}
                                className="w-4 h-4"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                Separate Aaroh/Avroh
                            </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={showOutsideChords}
                                onChange={e => setShowOutsideChords(e.target.checked)}
                                className="w-4 h-4"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                Show chords outside raga
                            </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={showPiano}
                                onChange={e => setShowPiano(e.target.checked)}
                                className="w-4 h-4"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                Show piano keyboard
                            </span>
                        </label>
                    </div>
                </div>

                {/* Main Content */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Chord Circle */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                                {selectedRaga?.name || 'Select a Raga'}
                            </h2>
                            {selectedRaga && (
                                <span className="text-sm text-gray-500">
                                    {currentChords.length} chords available
                                </span>
                            )}
                        </div>

                        {selectedRaga && (
                            <div className="flex flex-col lg:flex-row items-start gap-6">
                                <ChordCircle
                                    pattern={selectedRaga.notePattern}
                                    chords={currentChords}
                                    isCarnatic={isCarnatic}
                                    size={280}
                                />

                                {/* Tabs for aaroh/avroh */}
                                {(separateAarohAvroh || showOutsideChords) && (
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => setActiveTab('all')}
                                            className={`px-3 py-1 rounded text-sm ${activeTab === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
                                                }`}
                                        >
                                            All ({chordData.all.length})
                                        </button>
                                        {separateAarohAvroh && (
                                            <>
                                                <button
                                                    onClick={() => setActiveTab('aaroh')}
                                                    className={`px-3 py-1 rounded text-sm ${activeTab === 'aaroh' ? 'bg-green-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
                                                        }`}
                                                >
                                                    Aaroh ({chordData.aaroh.length})
                                                </button>
                                                <button
                                                    onClick={() => setActiveTab('avroh')}
                                                    className={`px-3 py-1 rounded text-sm ${activeTab === 'avroh' ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
                                                        }`}
                                                >
                                                    Avroh ({chordData.avroh.length})
                                                </button>
                                            </>
                                        )}
                                        {showOutsideChords && (
                                            <button
                                                onClick={() => setActiveTab('outside')}
                                                className={`px-3 py-1 rounded text-sm ${activeTab === 'outside' ? 'bg-orange-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
                                                    }`}
                                            >
                                                Outside ({chordData.outside.length})
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Piano Keyboard */}
                    {showPiano && selectedRaga && (
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                            <PianoKeyboard
                                highlightedNotes={patternToPitchClasses(selectedRaga.notePattern)}
                                isCarnatic={isCarnatic}
                                tonic={selectedTonic}
                                onNoteClick={(noteIndex, octave) => playNote((noteIndex + selectedTonic) % 12, octave, 0.5)}
                            />
                        </div>
                    )}

                    {/* Chord Grid */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                            Available Chords
                        </h2>
                        <ChordGrid
                            chords={currentChords}
                            onPlayChord={handlePlayChord}
                            tonic={selectedTonic}
                            isCarnatic={isCarnatic}
                        />
                    </div>

                    {/* Rhythm Progression */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                            Chord Progression Builder
                        </h2>

                        <PlaybackControls
                            isPlaying={isPlaying}
                            onPlayPause={handlePlayPause}
                            onStop={handleStop}
                            onClear={handleClear}
                            bpm={bpm}
                            onBpmChange={setBpm}
                            loop={loop}
                            onLoopToggle={setLoop}
                            className="mb-4"
                        />

                        <TimelineGrid
                            beats={beats}
                            chords={progressionChords}
                            onChordPlace={handleChordPlace}
                            onChordRemove={handleChordRemove}
                            currentBeat={currentBeat}
                        />

                        <div className="mt-4 text-sm text-gray-500">
                            Drag chords from above and drop onto the timeline
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ChordTool;
