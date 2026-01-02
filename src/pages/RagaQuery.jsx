/**
 * RagaQuery Page
 * Database search interface for finding ragas by note patterns
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { HINDUSTANI_RAGAS } from '../data/ragaData.js';
import { MELAKARTA_72 } from '../data/melakartaData.js';
import { NotePatternBadges } from '../components/common/NoteBadge.jsx';
import { PianoKeyboard } from '../components/common/PianoKeyboard.jsx';
import { getDisplayLabels, countNotes, hammingDistance, patternToPitchClasses, pitchClassesToPattern } from '../utils/noteHelpers.js';
import { useAudio } from '../hooks/useAudio.js';
import { usePianoSamples } from '../hooks/usePianoSamples.js';
import { arrangeNotesAscending, arrangeNotesDescending } from '../utils/audioHelpers.js';

// Carnatic 16-swara to 12-TET pitch class mapping
const CARNATIC_TO_12TET = {
    0: 0,   // S
    1: 1,   // R1
    2: 2,   // R2
    3: 2,   // G1 (same as R2)
    4: 3,   // R3
    5: 3,   // G2 (same as R3)
    6: 4,   // G3
    7: 5,   // M1
    8: 6,   // M2
    9: 7,   // P
    10: 8,  // D1
    11: 9,  // D2
    12: 9,  // N1 (same as D2)
    13: 10, // D3
    14: 10, // N2 (same as D3)
    15: 11  // N3
};

// Reverse mapping from 12-TET to Carnatic indices
const TET12_TO_CARNATIC = {
    0: [0],        // S
    1: [1],        // R1
    2: [2, 3],     // R2, G1
    3: [4, 5],     // R3, G2
    4: [6],        // G3
    5: [7],        // M1
    6: [8],        // M2
    7: [9],        // P
    8: [10],       // D1
    9: [11, 12],   // D2, N1
    10: [13, 14],  // D3, N2
    11: [15]       // N3
};


/**
 * RagaQuery page component
 */
export function RagaQuery() {
    // State
    const [isCarnatic, setIsCarnatic] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [scaleType, setScaleType] = useState('all'); // 'all', '5', '6', '7'
    const [searchMode, setSearchMode] = useState('contains'); // 'contains' or 'exact'
    const [separateNoteSelection, setSeparateNoteSelection] = useState(false);

    // Note selection states (tri-state: neutral, selected, excluded)
    const [selectedNotes, setSelectedNotes] = useState(new Set());
    const [excludedNotes, setExcludedNotes] = useState(new Set());
    const [selectedAarohNotes, setSelectedAarohNotes] = useState(new Set());
    const [excludedAarohNotes, setExcludedAarohNotes] = useState(new Set());
    const [selectedAvrohNotes, setSelectedAvrohNotes] = useState(new Set());
    const [excludedAvrohNotes, setExcludedAvrohNotes] = useState(new Set());

    const [showPiano, setShowPiano] = useState(false);
    const [results, setResults] = useState([]);

    // Audio
    const { audioContext, resume } = useAudio();
    const { playSequence, isReady: pianoReady } = usePianoSamples(audioContext);

    // Get raga list based on mode
    const ragaList = useMemo(() => {
        return isCarnatic ? MELAKARTA_72 : HINDUSTANI_RAGAS;
    }, [isCarnatic]);

    const labels = useMemo(() => getDisplayLabels(isCarnatic), [isCarnatic]);

    // Clear filters when mode changes
    useEffect(() => {
        setSelectedNotes(new Set());
        setExcludedNotes(new Set());
        setSelectedAarohNotes(new Set());
        setExcludedAarohNotes(new Set());
        setSelectedAvrohNotes(new Set());
        setExcludedAvrohNotes(new Set());
        setSearchQuery('');
    }, [isCarnatic]);

    // Handle tri-state note toggle (neutral -> selected -> excluded -> neutral)
    const handleNoteToggle = useCallback((noteIndex, setSelected, setExcluded, selected, excluded) => {
        if (excluded.has(noteIndex)) {
            // excluded -> neutral
            setExcluded(prev => { const n = new Set(prev); n.delete(noteIndex); return n; });
        } else if (selected.has(noteIndex)) {
            // selected -> excluded
            setSelected(prev => { const n = new Set(prev); n.delete(noteIndex); return n; });
            setExcluded(prev => new Set(prev).add(noteIndex));
        } else {
            // neutral -> selected
            setSelected(prev => new Set(prev).add(noteIndex));
        }
    }, []);

    // Filter ragas
    const filteredResults = useMemo(() => {
        let filtered = [...ragaList];

        // Name search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(r => r.name.toLowerCase().includes(query));
        }

        // Scale type filter
        if (scaleType !== 'all') {
            const targetCount = parseInt(scaleType);
            filtered = filtered.filter(r => countNotes(r.notePattern) === targetCount);
        }

        // Note filtering
        const applyNoteFilter = (ragas, selected, excluded, patternKey = 'notePattern') => {
            if (selected.size === 0 && excluded.size === 0) return ragas;

            return ragas.filter(r => {
                const pattern = r[patternKey];

                // Check excluded notes are NOT present
                for (const ex of excluded) {
                    if (pattern[ex]) return false;
                }

                // Check selected notes based on mode
                if (selected.size > 0) {
                    if (searchMode === 'exact') {
                        // Exact: raga must have EXACTLY these notes (plus Sa)
                        const ragaNotes = patternToPitchClasses(pattern);
                        const selectedWithSa = new Set(selected);
                        selectedWithSa.add(0); // Always include Sa
                        if (ragaNotes.length !== selectedWithSa.size) return false;
                        return ragaNotes.every(n => selectedWithSa.has(n));
                    } else {
                        // Contains: raga must contain all selected notes
                        for (const sel of selected) {
                            if (!pattern[sel]) return false;
                        }
                    }
                }

                return true;
            });
        };

        if (separateNoteSelection) {
            filtered = applyNoteFilter(filtered, selectedAarohNotes, excludedAarohNotes, 'aarohPattern');
            filtered = applyNoteFilter(filtered, selectedAvrohNotes, excludedAvrohNotes, 'avrohPattern');
        } else {
            filtered = applyNoteFilter(filtered, selectedNotes, excludedNotes, 'notePattern');
        }

        // Sort by similarity if notes are selected
        const activeSelected = separateNoteSelection
            ? new Set([...selectedAarohNotes, ...selectedAvrohNotes])
            : selectedNotes;

        if (activeSelected.size > 0) {
            const targetPattern = pitchClassesToPattern([...activeSelected]);
            filtered.sort((a, b) =>
                hammingDistance(a.notePattern, targetPattern) - hammingDistance(b.notePattern, targetPattern)
            );
        }

        return filtered;
    }, [ragaList, searchQuery, scaleType, searchMode, separateNoteSelection,
        selectedNotes, excludedNotes, selectedAarohNotes, excludedAarohNotes,
        selectedAvrohNotes, excludedAvrohNotes]);

    // Play raga aaroh + avroh with proper octave arrangement
    const playRaga = useCallback(async (raga) => {
        if (!pianoReady) {
            await resume();
            return;
        }

        const baseOctave = 4;
        const aarohPcs = patternToPitchClasses(raga.aarohPattern || raga.notePattern);
        const avrohPcs = patternToPitchClasses(raga.avrohPattern || raga.notePattern);

        // Arrange notes ascending for aaroh
        const aarohArranged = arrangeNotesAscending(aarohPcs, baseOctave);

        // Add higher Sa at the end of aaroh
        const highSaOctave = aarohArranged.length > 0
            ? Math.max(...aarohArranged.map(n => n.octave)) + 1
            : baseOctave + 1;
        const aarohSequence = [...aarohArranged, { noteIndex: 0, octave: highSaOctave }];

        // Arrange notes descending for avroh (starting from high Sa)
        const avrohSequence = arrangeNotesDescending(avrohPcs, highSaOctave, true, baseOctave);

        // Combine sequences with a small gap
        const fullSequence = [...aarohSequence, ...avrohSequence];

        playSequence(fullSequence, 0.35);
    }, [pianoReady, resume, playSequence]);

    // Handle piano key click for note selection
    const handlePianoKeyClick = useCallback((noteIndex, octave) => {
        // Use the current note selection context
        if (separateNoteSelection) {
            // In separate mode, clicking adds to general selection for now
            handleNoteToggle(noteIndex, setSelectedNotes, setExcludedNotes, selectedNotes, excludedNotes);
        } else {
            handleNoteToggle(noteIndex, setSelectedNotes, setExcludedNotes, selectedNotes, excludedNotes);
        }
    }, [separateNoteSelection, handleNoteToggle, selectedNotes, excludedNotes]);

    // Note selector grid
    const renderNoteSelector = (selected, excluded, onToggle, title) => (
        <div className="mb-4">
            {title && <div className="text-sm font-medium text-gray-400 mb-2">{title}</div>}
            <div className={`grid grid-cols-3 sm:grid-cols-4 gap-2`}>
                {Array.from({ length: 12 }, (_, i) => {
                    const isSelected = selected.has(i);
                    const isExcluded = excluded.has(i);

                    return (
                        <button
                            key={i}
                            onClick={() => handleNoteToggle(i,
                                title?.includes('Aaroh') ? setSelectedAarohNotes :
                                    title?.includes('Avroh') ? setSelectedAvrohNotes : setSelectedNotes,
                                title?.includes('Aaroh') ? setExcludedAarohNotes :
                                    title?.includes('Avroh') ? setExcludedAvrohNotes : setExcludedNotes,
                                selected, excluded
                            )}
                            disabled={i === 0} // Can't toggle Sa
                            className={`
                px-2 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center
                ${i === 0 ? 'bg-[#0f172a] text-gray-600 cursor-not-allowed hidden' :
                                    isExcluded ? 'bg-red-900/50 text-red-200 border border-red-800' :
                                        isSelected ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' :
                                            'bg-[#1e293b] text-gray-300 hover:bg-[#334155] border border-gray-700/50 hover:border-gray-600'
                                }
              `}
                        >
                            {labels[i]}
                        </button>
                    );
                }).filter((_, i) => i !== 0)}
            </div>
            <div className="mt-3 text-xs text-gray-500 flex justify-between px-1">
                <span>• Click to Include (Blue)</span>
                <span>• Twice to Exclude (Red)</span>
            </div>
        </div>
    );


    // Helper to get jati label
    const getJatiLabel = (count) => {
        if (count === 5) return 'Audav';
        if (count === 6) return 'Shadav';
        if (count === 7) return 'Sampoorna';
        return '';
    };

    // Helper to get formatted Jati string
    const getJatiString = (raga) => {
        const aarohCount = countNotes(raga.aarohPattern || raga.notePattern);
        const avrohCount = countNotes(raga.avrohPattern || raga.notePattern);
        const aarohLabel = getJatiLabel(aarohCount);
        const avrohLabel = getJatiLabel(avrohCount);
        if (!aarohLabel || !avrohLabel) return '';
        return `${aarohLabel} - ${avrohLabel}`;
    };

    // Helper to get note sequence for display
    const getNoteSequence = (pattern, isAscending) => {
        const pcs = patternToPitchClasses(pattern);
        if (!isAscending) pcs.reverse();

        // Convert to labels
        // Use Carnatic labels if in Carnatic mode, otherwise standard labels
        // Note: For Carnatic, this is an approximation if we don't have the specific 16-swara pattern stored
        // But for display purposes, we can map 12-TET back to standard labels

        return pcs.map(pc => {
            // Simple mapping for display
            if (isCarnatic) {
                // Find standard label for this pitch class
                // This is a simplification; ideal would be using raga's specific swaras if available
                return labels[pc] || '?';
            } else {
                return labels[pc];
            }
        }).join(' ');
    };

    const clearFilters = () => {
        setSearchQuery('');
        setScaleType('all');
        setSearchMode('contains');
        setSeparateNoteSelection(false);
        setSelectedNotes(new Set());
        setExcludedNotes(new Set());
        setSelectedAarohNotes(new Set());
        setExcludedAarohNotes(new Set());
        setSelectedAvrohNotes(new Set());
        setExcludedAvrohNotes(new Set());
    };

    return (
        <div className="min-h-screen pb-12 bg-black transition-colors">
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Raga Database Query
                    </h1>
                    <p className="text-gray-400">
                        Search {ragaList.length} {isCarnatic ? 'Carnatic' : 'Hindustani'} ragas by notes
                    </p>
                </div>

                {/* Mode Toggle */}
                {/* Mode Toggle */}
                <div className="flex justify-center items-center gap-3 mb-6">
                    <span className={`text-sm font-medium ${!isCarnatic ? 'text-blue-400' : 'text-gray-400'}`}>
                        Hindustani ({HINDUSTANI_RAGAS.length})
                    </span>

                    <button
                        onClick={() => setIsCarnatic(!isCarnatic)}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${isCarnatic ? 'bg-purple-600' : 'bg-blue-600'}`}
                        title="Toggle Music System"
                    >
                        <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${isCarnatic ? 'translate-x-6' : 'translate-x-1'}`}
                        />
                    </button>

                    <span className={`text-sm font-medium ${isCarnatic ? 'text-purple-400' : 'text-gray-400'}`}>
                        Carnatic ({MELAKARTA_72.length})
                    </span>
                </div>

                {/* Filters */}
                {/* Filters */}
                <div className="bg-[#071126] rounded-xl shadow-lg p-6 mb-8">
                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* Left Column: Inputs & Toggles */}
                        <div className="lg:w-1/3 space-y-5">
                            {/* Search */}
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1.5">
                                    Search by name
                                </label>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Enter raga name..."
                                    className="w-full px-4 py-2.5 rounded-lg bg-[#0f172a] border border-gray-800 text-white placeholder-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                />
                            </div>

                            {/* Scale Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1.5">
                                    Scale Type
                                </label>
                                <select
                                    value={scaleType}
                                    onChange={e => setScaleType(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-lg bg-[#0f172a] border border-gray-800 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                >
                                    <option value="all">Any Scale Type</option>
                                    <option value="5">Audav (5 notes)</option>
                                    <option value="6">Shadav (6 notes)</option>
                                    <option value="7">Sampoorna (7 notes)</option>
                                </select>
                            </div>

                            {/* Match Mode */}
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1.5">
                                    Note Search Mode
                                </label>
                                <select
                                    value={searchMode}
                                    onChange={e => setSearchMode(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-lg bg-[#0f172a] border border-gray-800 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                >
                                    <option value="contains">Contains selected notes</option>
                                    <option value="exact">Exact match</option>
                                </select>
                            </div>

                            {/* Toggles */}
                            <div className="pt-2">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className={`w-5 h-5 flex items-center justify-center rounded border ${separateNoteSelection ? 'bg-blue-600 border-blue-600' : 'border-gray-600'}`}>
                                        {separateNoteSelection && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={separateNoteSelection}
                                        onChange={e => setSeparateNoteSelection(e.target.checked)}
                                        className="hidden"
                                    />
                                    <span className="text-gray-300 group-hover:text-white transition-colors">Enable separate Aaroh/Avroh note selection</span>
                                </label>
                            </div>

                            {/* Piano Toggle */}
                            <button
                                onClick={() => setShowPiano(!showPiano)}
                                className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                </svg>
                                {showPiano ? 'Hide Piano' : 'Show Piano Keyboard'}
                            </button>
                        </div>

                        {/* Right Column: Note Selector */}
                        <div className="lg:w-2/3">
                            <div className="bg-[#0b1226] rounded-xl p-5 border border-gray-800/50 h-full">
                                <h3 className="text-sm font-medium text-gray-400 mb-4">Select Notes (Swaras):</h3>
                                <p className="text-xs text-gray-500 mb-4">Sa is always included. Click once to include, twice to exclude.</p>

                                {separateNoteSelection ? (
                                    <div className="space-y-6">
                                        {renderNoteSelector(selectedAarohNotes, excludedAarohNotes, handleNoteToggle, 'Aaroh Notes')}
                                        {renderNoteSelector(selectedAvrohNotes, excludedAvrohNotes, handleNoteToggle, 'Avroh Notes')}
                                    </div>
                                ) : (
                                    renderNoteSelector(selectedNotes, excludedNotes, handleNoteToggle, null)
                                )}

                                {showPiano && (
                                    <div className="mt-8 pt-6 border-t border-gray-800">
                                        <PianoKeyboard
                                            onNoteClick={handlePianoKeyClick}
                                            highlightedNotes={[...selectedNotes, ...(separateNoteSelection ? [...selectedAarohNotes, ...selectedAvrohNotes] : [])]}
                                            isCarnatic={isCarnatic}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Clear Filters Button */}
                {/* Clear Filters Button */}
                <div className="mb-6 flex justify-end">
                    <button
                        onClick={clearFilters}
                        className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 transition-colors border border-black"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Clear All Filters
                    </button>
                </div>

                {/* Results */}
                <div className="bg-[#071126] rounded-xl shadow-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-white">
                            Results ({filteredResults.length})
                        </h2>
                    </div>

                    {filteredResults.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                            No ragas match your criteria
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredResults.map(raga => (
                                <div
                                    key={raga.name}
                                    className="flex items-center justify-between p-4 bg-[#071126] border border-[#1f2937] rounded-lg hover:bg-[#0b1226] transition-colors"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <span className="font-semibold text-[#e5e7eb]">
                                                {raga.name}
                                            </span>
                                            {isCarnatic && raga.number && (
                                                <span className="text-xs bg-purple-900/40 text-purple-300 px-2 py-0.5 rounded">
                                                    #{raga.number}
                                                </span>
                                            )}
                                            <span className="text-xs text-gray-500 hidden sm:inline">
                                                {countNotes(raga.notePattern)} notes
                                            </span>
                                        </div>

                                        {/* Jati and Note Sequences */}
                                        <div className="mt-1 text-sm text-gray-400">
                                            {getJatiString(raga)}
                                        </div>

                                        <div className="mt-2">
                                            <NotePatternBadges pattern={raga.notePattern} isCarnatic={isCarnatic} size="sm" />
                                        </div>

                                        <div className="mt-2 space-y-1">
                                            <div className="text-xs text-gray-400">
                                                <strong className="text-gray-300">Aaroh:</strong> {getNoteSequence(raga.aarohPattern || raga.notePattern, true)} Sa
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                <strong className="text-gray-300">Avroh:</strong> {getNoteSequence(raga.avrohPattern || raga.notePattern, false)} Sa
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 ml-4 self-start">
                                        {/* Play button */}
                                        <button
                                            onClick={() => playRaga(raga)}
                                            className="p-2 rounded-full bg-blue-900/40 text-blue-400 hover:bg-blue-800/40"
                                            title="Play aaroh + avroh"
                                        >
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                                            </svg>
                                        </button>

                                        {/* Link to ChordTool */}
                                        <Link
                                            to={`/?raga=${encodeURIComponent(raga.name)}`}
                                            className="px-3 py-1 text-sm bg-green-900/40 text-green-300 rounded-lg hover:bg-green-800/40"
                                        >
                                            Chords →
                                        </Link>
                                    </div>
                                </div>
                            ))}

                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default RagaQuery;
