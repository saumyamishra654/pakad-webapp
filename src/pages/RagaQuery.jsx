/**
 * RagaQuery Page
 * Database search interface for finding ragas by note patterns
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { HINDUSTANI_RAGAS } from '../data/ragaData.js';
import { MELAKARTA_72 } from '../data/melakartaData.js';
import { NotePatternBadges } from '../components/common/NoteBadge.jsx';
import { PianoKeyboard } from '../components/common/PianoKeyboard.jsx';
import { getDisplayLabels, countNotes, getJatiCount, hammingDistance, patternToPitchClasses, pitchClassesToPattern } from '../utils/noteHelpers.js';
import { useAudio } from '../hooks/useAudio.js';
import { usePianoSamples } from '../hooks/usePianoSamples.js';
import { buildChalan } from '../utils/chalan.js';

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


    // Audio
    const { audioContext } = useAudio();
    const { playSequence, ensureReady } = usePianoSamples(audioContext);

    // Get raga list based on mode
    const ragaList = useMemo(() => {
        return isCarnatic ? MELAKARTA_72 : HINDUSTANI_RAGAS;
    }, [isCarnatic]);

    const labels = useMemo(() => getDisplayLabels(isCarnatic), [isCarnatic]);

    // Toggle between Hindustani and Carnatic systems
    const toggleSystem = useCallback(() => {
        setIsCarnatic(prev => !prev);
        // Clear all filters when switching systems
        setSelectedNotes(new Set());
        setExcludedNotes(new Set());
        setSelectedAarohNotes(new Set());
        setExcludedAarohNotes(new Set());
        setSelectedAvrohNotes(new Set());
        setExcludedAvrohNotes(new Set());
        setSearchQuery('');
    }, []);

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
            filtered = filtered.filter(r => getJatiCount(r.notePattern, r.type) === targetCount);
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
        if (!(await ensureReady())) return;

        const patterns = { aaroh: raga.aarohPattern, avroh: raga.avrohPattern, all: raga.notePattern };
        const fullSequence = buildChalan(patterns, 'full', { step: 0.35, pause: 0 });

        playSequence(fullSequence, 0.35);
    }, [ensureReady, playSequence]);

    // Handle piano key click for note selection
    const handlePianoKeyClick = useCallback((noteIndex) => {
        // Sa is in every raga (the note grid hides it too); excluding it would empty the results
        if (noteIndex === 0) return;
        if (separateNoteSelection) {
            // The filter only reads the aaroh/avroh sets in this mode, so a key applies to both
            handleNoteToggle(noteIndex, setSelectedAarohNotes, setExcludedAarohNotes, selectedAarohNotes, excludedAarohNotes);
            handleNoteToggle(noteIndex, setSelectedAvrohNotes, setExcludedAvrohNotes, selectedAvrohNotes, excludedAvrohNotes);
        } else {
            handleNoteToggle(noteIndex, setSelectedNotes, setExcludedNotes, selectedNotes, excludedNotes);
        }
    }, [separateNoteSelection, handleNoteToggle, selectedNotes, excludedNotes,
        selectedAarohNotes, excludedAarohNotes, selectedAvrohNotes, excludedAvrohNotes]);

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
                ${i === 0 ? 'bg-gray-900 text-gray-600 cursor-not-allowed hidden' :
                                    isExcluded ? 'bg-red-100 text-red-800 border border-red-300 dark:bg-red-900/50 dark:text-red-200 dark:border-red-800' :
                                        isSelected ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' :
                                            'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700/50 hover:border-gray-600'
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
        // Hindustani jati counts swaras, so komal + shuddha of one swara (e.g. "Gg") counts once
        const aarohCount = getJatiCount(raga.aarohPattern || raga.notePattern, raga.type);
        const avrohCount = getJatiCount(raga.avrohPattern || raga.notePattern, raga.type);
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
        <div className="min-h-screen pb-12">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                {/* Header */}
                <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-bold text-gray-100">
                            Raga Database Query
                        </h1>
                        <p className="mt-1 text-gray-400">
                            Search {ragaList.length} {isCarnatic ? 'Carnatic' : 'Hindustani'} ragas by notes
                        </p>
                    </div>

                    {/* Music system */}
                    <div className="inline-flex rounded-lg border border-gray-700 bg-gray-800 p-0.5" role="group" aria-label="Music system">
                        {[
                            { carnatic: false, label: `Hindustani (${HINDUSTANI_RAGAS.length})` },
                            { carnatic: true, label: `Carnatic (${MELAKARTA_72.length})` }
                        ].map(({ carnatic, label }) => (
                            <button
                                key={label}
                                onClick={() => isCarnatic !== carnatic && toggleSystem()}
                                aria-pressed={isCarnatic === carnatic}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isCarnatic === carnatic
                                    ? 'bg-gray-600 text-gray-100'
                                    : 'text-gray-400 hover:text-gray-100'
                                    }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Filters */}
                <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 sm:p-6 mb-4">
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
                                    className="w-full px-4 py-2.5 rounded-lg bg-gray-900 border border-gray-800 text-gray-100 placeholder-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                                    className="w-full px-4 py-2.5 rounded-lg bg-gray-900 border border-gray-800 text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                                    className="w-full px-4 py-2.5 rounded-lg bg-gray-900 border border-gray-800 text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                                    <span className="text-sm text-gray-300 group-hover:text-gray-100 transition-colors">Separate aaroh/avroh note selection</span>
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
                            <div className="bg-gray-900 rounded-xl p-5 border border-gray-800/50 h-full">
                                <h3 className="text-xs font-sans font-medium uppercase tracking-wide text-gray-400 mb-4">Select notes (swaras)</h3>
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
                <div className="mb-4 flex justify-end">
                    <button
                        onClick={clearFilters}
                        className="btn btn-ghost"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Clear All Filters
                    </button>
                </div>

                {/* Results Section */}
                <div className="bg-gray-900 rounded-xl shadow-lg p-6 min-h-[500px]">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-100">
                            Results ({filteredResults.length})
                        </h2>
                    </div>

                    {filteredResults.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            No ragas match your criteria
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredResults.map(raga => (
                                <div
                                    key={raga.name}
                                    className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 p-4 bg-gray-950/50 border border-gray-800 rounded-lg hover:border-gray-700 transition-colors"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3">
                                            <span className="font-semibold text-gray-100">
                                                {raga.name}
                                            </span>
                                            {isCarnatic && raga.number && (
                                                <span className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 px-2 py-0.5 rounded">
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
                                                <strong className="text-gray-300">Avroh:</strong> Sa {getNoteSequence(raga.avrohPattern || raga.notePattern, false)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 sm:ml-4">
                                        {/* Play button */}
                                        <button
                                            onClick={() => playRaga(raga)}
                                            className="btn btn-sm btn-secondary !px-2" aria-label="Play aaroh and avroh"
                                            title="Play aaroh + avroh"
                                        >
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                                            </svg>
                                        </button>

                                        {/* Link to ChordTool */}
                                        <Link
                                            to={`/?raga=${encodeURIComponent(raga.name)}`}
                                            className="btn btn-sm btn-secondary"
                                        >
                                            Open in Chord Tool
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
