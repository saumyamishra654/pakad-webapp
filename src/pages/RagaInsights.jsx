/**
 * RagaInsights Page
 * Relationship analysis: same-notes, murchanna, subsets
 */

import React, { useState, useEffect, useMemo } from 'react';
import { HINDUSTANI_RAGAS } from '../data/ragaData.js';
import { MELAKARTA_72 } from '../data/melakartaData.js';
import { NotePatternBadges } from '../components/common/NoteBadge.jsx';
import { countNotes } from '../utils/noteHelpers.js';
import { analyzeSameNotes, analyzeMurchanna, analyzeSubsets, filterAnalysisResults } from '../utils/analysisHelpers.js';

/**
 * RagaInsights page component
 */
export function RagaInsights() {
    const [activeTab, setActiveTab] = useState('same-notes');
    const [isLoading, setIsLoading] = useState(true);

    // Analysis results
    const [sameNotesGroups, setSameNotesGroups] = useState([]);
    const [murchannaGroups, setMurchannaGroups] = useState([]);
    const [subsetRelations, setSubsetRelations] = useState([]);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [systemFilter, setSystemFilter] = useState('all');
    const [scaleTypeFilter, setScaleTypeFilter] = useState('all');
    const [showOnlyMatches, setShowOnlyMatches] = useState(false);

    // Expanded items
    const [expandedItems, setExpandedItems] = useState(new Set());

    // Run analysis on mount
    useEffect(() => {
        setIsLoading(true);

        // Use setTimeout to allow UI to render loading state
        setTimeout(() => {
            const sameNotes = analyzeSameNotes(HINDUSTANI_RAGAS, MELAKARTA_72);
            const murchanna = analyzeMurchanna(HINDUSTANI_RAGAS, MELAKARTA_72);
            const subsets = analyzeSubsets(HINDUSTANI_RAGAS, MELAKARTA_72);

            setSameNotesGroups(sameNotes);
            setMurchannaGroups(murchanna);
            setSubsetRelations(subsets);
            setIsLoading(false);
        }, 100);
    }, []);

    // Apply filters
    const filteredResults = useMemo(() => {
        const filters = { searchQuery, systemFilter, scaleTypeFilter, showOnlyMatches };

        return {
            sameNotes: filterAnalysisResults(sameNotesGroups, filters),
            murchanna: filterAnalysisResults(murchannaGroups, filters),
            subsets: filterAnalysisResults(subsetRelations, filters)
        };
    }, [sameNotesGroups, murchannaGroups, subsetRelations, searchQuery, systemFilter, scaleTypeFilter, showOnlyMatches]);

    const toggleExpanded = (id) => {
        setExpandedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const clearFilters = () => {
        setSearchQuery('');
        setSystemFilter('all');
        setScaleTypeFilter('all');
        setShowOnlyMatches(false);
    };

    // Render same-notes groups
    const renderSameNotes = () => (
        <div className="space-y-4">
            {filteredResults.sameNotes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No matches found</div>
            ) : (
                filteredResults.sameNotes.map((group, idx) => (
                    <div key={idx} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {group.ragas.map((raga, i) => (
                                        <span
                                            key={i}
                                            className={`px-2 py-1 rounded text-sm font-medium ${raga.type === 'hindustani'
                                                    ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                                                    : 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                                                }`}
                                        >
                                            {raga.name}
                                        </span>
                                    ))}
                                </div>
                                <NotePatternBadges pattern={group.pattern} size="sm" />
                            </div>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                {countNotes(group.pattern)} notes
                            </span>
                        </div>
                    </div>
                ))
            )}
        </div>
    );

    // Render murchanna groups
    const renderMurchanna = () => (
        <div className="space-y-4">
            {filteredResults.murchanna.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No matches found</div>
            ) : (
                filteredResults.murchanna.map((group, idx) => {
                    const isExpanded = expandedItems.has(`murchanna-${idx}`);

                    return (
                        <div key={idx} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                            <button
                                onClick={() => toggleExpanded(`murchanna-${idx}`)}
                                className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                <div>
                                    <span className="font-semibold text-gray-800 dark:text-white">
                                        {group.baseRaga.name}
                                    </span>
                                    <span className={`ml-2 text-xs px-2 py-0.5 rounded ${group.baseRaga.type === 'hindustani'
                                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                            : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                                        }`}>
                                        {group.baseRaga.type}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-500">
                                        {group.murchannas.length} rotations
                                    </span>
                                    <svg
                                        className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </button>

                            {isExpanded && (
                                <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/50">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {group.murchannas.map((m, i) => (
                                            <div key={i} className="bg-white dark:bg-gray-800 p-3 rounded border dark:border-gray-700">
                                                <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                                                    +{m.rotation} semitones
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                    {m.ragas.map((r, j) => (
                                                        <span
                                                            key={j}
                                                            className={`text-xs px-2 py-0.5 rounded ${r.type === 'hindustani'
                                                                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                                                    : 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                                                                }`}
                                                        >
                                                            {r.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })
            )}
        </div>
    );

    // Render subset relations
    const renderSubsets = () => (
        <div className="space-y-4">
            {filteredResults.subsets.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No matches found</div>
            ) : (
                filteredResults.subsets.map((rel, idx) => {
                    const isExpanded = expandedItems.has(`subset-${idx}`);

                    return (
                        <div key={idx} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                            <button
                                onClick={() => toggleExpanded(`subset-${idx}`)}
                                className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                <div>
                                    <span className="font-semibold text-gray-800 dark:text-white">
                                        {rel.subset.name}
                                    </span>
                                    <span className={`ml-2 text-xs px-2 py-0.5 rounded ${rel.subset.type === 'hindustani'
                                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                            : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                                        }`}>
                                        {countNotes(rel.subset.notePattern)} notes
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-500">
                                        found in {rel.supersets.length} ragas
                                    </span>
                                    <svg
                                        className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </button>

                            {isExpanded && (
                                <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-orange-50 dark:bg-orange-900/20">
                                    <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">
                                        Found in these larger ragas:
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {rel.supersets.slice(0, 12).map((superset, i) => (
                                            <div key={i} className="bg-white dark:bg-gray-800 p-3 rounded border dark:border-gray-700">
                                                <div className="font-medium text-gray-800 dark:text-gray-200">
                                                    {superset.name}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {superset.type} • {countNotes(superset.notePattern)} notes
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {rel.supersets.length > 12 && (
                                        <div className="text-sm text-gray-500 mt-3">
                                            +{rel.supersets.length - 12} more...
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })
            )}
        </div>
    );

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Analyzing raga relationships...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">Raga Insights</h1>

                {/* Stats */}
                <div className="flex items-center justify-center gap-6">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{HINDUSTANI_RAGAS.length}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Hindustani</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{MELAKARTA_72.length}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Carnatic</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{sameNotesGroups.length}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Same Notes</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">{murchannaGroups.length}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Murchanna</div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex justify-center mb-6">
                <div className="flex bg-white dark:bg-gray-800 rounded-lg p-1 shadow border border-gray-200 dark:border-gray-700">
                    {[
                        { id: 'same-notes', label: 'Same Notes', count: filteredResults.sameNotes.length },
                        { id: 'murchanna', label: 'Murchanna', count: filteredResults.murchanna.length },
                        { id: 'subsets', label: 'Subsets', count: filteredResults.subsets.length }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 rounded-md font-medium transition-colors ${activeTab === tab.id
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                        >
                            {tab.label}
                            <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${activeTab === tab.id
                                    ? 'bg-blue-500'
                                    : 'bg-gray-200 dark:bg-gray-600'
                                }`}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <input
                        type="text"
                        placeholder="Search ragas..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    />

                    <select
                        value={systemFilter}
                        onChange={e => setSystemFilter(e.target.value)}
                        className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    >
                        <option value="all">All Systems</option>
                        <option value="hindustani">Hindustani Only</option>
                        <option value="carnatic">Carnatic Only</option>
                        <option value="cross-system">Cross-System</option>
                    </select>

                    <select
                        value={scaleTypeFilter}
                        onChange={e => setScaleTypeFilter(e.target.value)}
                        className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    >
                        <option value="all">All Scales</option>
                        <option value="5">Pentatonic</option>
                        <option value="6">Hexatonic</option>
                        <option value="7">Heptatonic</option>
                    </select>

                    <button
                        onClick={clearFilters}
                        className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                        Clear Filters
                    </button>
                </div>

                {activeTab === 'same-notes' && (
                    <label className="flex items-center gap-2 mt-3 text-sm cursor-pointer">
                        <input
                            type="checkbox"
                            checked={showOnlyMatches}
                            onChange={e => setShowOnlyMatches(e.target.checked)}
                            className="w-4 h-4"
                        />
                        <span className="text-gray-700 dark:text-gray-300">Cross-system matches only</span>
                    </label>
                )}
            </div>

            {/* Content */}
            {activeTab === 'same-notes' && renderSameNotes()}
            {activeTab === 'murchanna' && renderMurchanna()}
            {activeTab === 'subsets' && renderSubsets()}
        </div>
    );
}

export default RagaInsights;
