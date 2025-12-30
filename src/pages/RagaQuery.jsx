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

    // Play raga aaroh + avroh
    const playRaga = useCallback(async (raga) => {
        if (!pianoReady) {
            await resume();
            return;
        }

        const aarohNotes = patternToPitchClasses(raga.aarohPattern || raga.notePattern);
        const avrohNotes = [...patternToPitchClasses(raga.avrohPattern || raga.notePattern)].reverse();

        // Play ascending then descending
        const sequence = [
            ...aarohNotes.map((n, i) => ({ noteIndex: n, octave: n < aarohNotes[0] ? 5 : 4 })),
            ...avrohNotes.map((n) => ({ noteIndex: n, octave: 4 }))
        ];

        playSequence(sequence, 0.3);
    }, [pianoReady, resume, playSequence]);

    // Note selector grid
    const renderNoteSelector = (selected, excluded, onToggle, title) => (
        <div className="mb-4">
            {title && <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{title}</div>}
            <div className="flex flex-wrap gap-2">
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
                px-3 py-2 rounded-lg text-sm font-medium transition-all
                ${i === 0 ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed' :
                                    isExcluded ? 'bg-red-500 text-white' :
                                        isSelected ? 'bg-blue-500 text-white' :
                                            'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                }
              `}
                        >
                            {labels[i]}
                        </button>
                    );
                })}
            </div>
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Click to select (blue) • Click again to exclude (red) • Click again to reset
            </div>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
                    Raga Database Query
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                    Search {ragaList.length} {isCarnatic ? 'Carnatic' : 'Hindustani'} ragas by notes
                </p>
            </div>

            {/* Mode Toggle */}
            <div className="flex justify-center gap-2 mb-6">
                <button
                    onClick={() => setIsCarnatic(false)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${!isCarnatic ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                >
                    Hindustani ({HINDUSTANI_RAGAS.length})
                </button>
                <button
                    onClick={() => setIsCarnatic(true)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${isCarnatic ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                >
                    Carnatic ({MELAKARTA_72.length})
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {/* Name search */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Search by name
                        </label>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Enter raga name..."
                            className="w-full px-3 py-2 border rounded-lg bg-gray-700 border-gray-600"
                        />
                    </div>

                    {/* Scale type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Scale type
                        </label>
                        <select
                            value={scaleType}
                            onChange={e => setScaleType(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg bg-gray-700 border-gray-600"
                        >
                            <option value="all">All scales</option>
                            <option value="5">Pentatonic (5 notes)</option>
                            <option value="6">Hexatonic (6 notes)</option>
                            <option value="7">Heptatonic (7 notes)</option>
                        </select>
                    </div>

                    {/* Search mode */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Match mode
                        </label>
                        <select
                            value={searchMode}
                            onChange={e => setSearchMode(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg bg-gray-700 border-gray-600"
                        >
                            <option value="contains">Contains notes</option>
                            <option value="exact">Exact match</option>
                        </select>
                    </div>
                </div>

                {/* Note selector toggle */}
                <div className="flex items-center gap-4 mb-4">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                            type="checkbox"
                            checked={separateNoteSelection}
                            onChange={e => setSeparateNoteSelection(e.target.checked)}
                            className="w-4 h-4"
                        />
                        <span className="text-gray-700 dark:text-gray-300">Separate Aaroh/Avroh selection</span>
                    </label>
                </div>

                {/* Note selector */}
                {separateNoteSelection ? (
                    <>
                        {renderNoteSelector(selectedAarohNotes, excludedAarohNotes, handleNoteToggle, 'Aaroh notes')}
                        {renderNoteSelector(selectedAvrohNotes, excludedAvrohNotes, handleNoteToggle, 'Avroh notes')}
                    </>
                ) : (
                    renderNoteSelector(selectedNotes, excludedNotes, handleNoteToggle, null)
                )}

                {/* Piano toggle */}
                <button
                    onClick={() => setShowPiano(!showPiano)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                    {showPiano ? 'Hide piano' : 'Show piano keyboard'}
                </button>

                {showPiano && (
                    <div className="mt-4">
                        <PianoKeyboard
                            highlightedNotes={[...selectedNotes, ...(separateNoteSelection ? [...selectedAarohNotes, ...selectedAvrohNotes] : [])]}
                            isCarnatic={isCarnatic}
                        />
                    </div>
                )}
            </div>

            {/* Results */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                        Results ({filteredResults.length})
                    </h2>
                </div>

                {filteredResults.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        No ragas match your criteria
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredResults.slice(0, 50).map(raga => (
                            <div
                                key={raga.name}
                                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                        <span className="font-semibold text-gray-800 dark:text-white">
                                            {raga.name}
                                        </span>
                                        {isCarnatic && raga.number && (
                                            <span className="text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded">
                                                #{raga.number}
                                            </span>
                                        )}
                                        <span className="text-xs text-gray-500">
                                            {countNotes(raga.notePattern)} notes
                                        </span>
                                    </div>
                                    <div className="mt-2">
                                        <NotePatternBadges pattern={raga.notePattern} isCarnatic={isCarnatic} size="sm" />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 ml-4">
                                    {/* Play button */}
                                    <button
                                        onClick={() => playRaga(raga)}
                                        className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800/40"
                                        title="Play aaroh + avroh"
                                    >
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                                        </svg>
                                    </button>

                                    {/* Link to ChordTool */}
                                    <Link
                                        to={`/?raga=${encodeURIComponent(raga.name)}`}
                                        className="px-3 py-1 text-sm bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-800/40"
                                    >
                                        Chords →
                                    </Link>
                                </div>
                            </div>
                        ))}

                        {filteredResults.length > 50 && (
                            <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">
                                Showing first 50 of {filteredResults.length} results
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default RagaQuery;
