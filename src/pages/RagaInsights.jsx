/**
 * RagaInsights Page
 * Relationship analysis: same-notes, murchanna, subsets
 */

import React, { useState, useMemo } from 'react';
import { HINDUSTANI_RAGAS } from '../data/ragaData.js';
import { MELAKARTA_72 } from '../data/melakartaData.js';
import { NotePatternBadges } from '../components/common/NoteBadge.jsx';
import { countNotes } from '../utils/noteHelpers.js';
import { analyzeSameNotes, analyzeMurchanna, analyzeSubsets, filterAnalysisResults } from '../utils/analysisHelpers.js';

// The raga data is static, so analyse it once per session and reuse it on every visit
let cachedAnalysis = null;
function getAnalysis() {
    if (!cachedAnalysis) {
        cachedAnalysis = {
            sameNotes: analyzeSameNotes(HINDUSTANI_RAGAS, MELAKARTA_72),
            murchanna: analyzeMurchanna(HINDUSTANI_RAGAS, MELAKARTA_72),
            subsets: analyzeSubsets(HINDUSTANI_RAGAS, MELAKARTA_72)
        };
    }
    return cachedAnalysis;
}

const matchesName = (raga, query) => raga.name.toLowerCase().includes(query.trim().toLowerCase());

/**
 * RagaInsights page component
 */
export function RagaInsights() {
    const [activeTab, setActiveTab] = useState('same-notes');

    // Analysis results (computed once per session, see getAnalysis)
    const { sameNotes: sameNotesGroups, murchanna: murchannaGroups, subsets: subsetRelations } = getAnalysis();

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    // Subsets tab: "subsets of X" lists the smaller ragas contained in X; "supersets of X" lists
    // the larger ragas that contain X
    const [subsetsOfQuery, setSubsetsOfQuery] = useState('');
    const [supersetsOfQuery, setSupersetsOfQuery] = useState('');
    const [systemFilter, setSystemFilter] = useState('all');
    const [scaleTypeFilter, setScaleTypeFilter] = useState('all');
    const [showOnlyMatches, setShowOnlyMatches] = useState(false);

    // Expanded items
    const [expandedItems, setExpandedItems] = useState(new Set());

    // Apply filters
    const filteredResults = useMemo(() => {
        const filters = { searchQuery, systemFilter, scaleTypeFilter, showOnlyMatches };

        return {
            sameNotes: filterAnalysisResults(sameNotesGroups, filters),
            murchanna: filterAnalysisResults(murchannaGroups, filters),
            // Subsets has its own subset/superset search bars instead of the general one
            subsets: filterAnalysisResults(subsetRelations, { ...filters, searchQuery: '' })
                .filter(rel => !supersetsOfQuery.trim() || matchesName(rel.subset, supersetsOfQuery))
                .map(rel => (subsetsOfQuery.trim()
                    ? { ...rel, supersets: rel.supersets.filter(s => matchesName(s, subsetsOfQuery)) }
                    : rel))
                .filter(rel => rel.supersets.length > 0)
        };
    }, [sameNotesGroups, murchannaGroups, subsetRelations, searchQuery, subsetsOfQuery, supersetsOfQuery, systemFilter, scaleTypeFilter, showOnlyMatches]);

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
        setSubsetsOfQuery('');
        setSupersetsOfQuery('');
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
                    <div key={idx} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
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
                filteredResults.murchanna.map((group) => {
                    // Key by raga, not list position, so expansion survives filtering
                    const itemId = `murchanna-${group.baseRaga.type}-${group.baseRaga.name}`;
                    const isExpanded = expandedItems.has(itemId);

                    return (
                        <div key={itemId} className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
                            <button
                                onClick={() => toggleExpanded(itemId)}
                                className="w-full p-4 text-left flex items-center justify-between gap-3 hover:bg-gray-800/60 transition-colors"
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
                                <div className="border-t border-gray-800 p-4 bg-gray-950/50">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {group.murchannas.map((m, i) => (
                                            <div key={i} className="bg-gray-900 p-3 rounded-md border border-gray-800">
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
                filteredResults.subsets.map((rel) => {
                    const itemId = `subset-${rel.subset.type}-${rel.subset.name}`;
                    // When searching supersets of a raga, the answer is the expanded list, so show it
                    const isExpanded = expandedItems.has(itemId) || !!supersetsOfQuery.trim();

                    return (
                        <div key={itemId} className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
                            <button
                                onClick={() => toggleExpanded(itemId)}
                                className="w-full p-4 text-left flex items-center justify-between gap-3 hover:bg-gray-800/60 transition-colors"
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
                                <div className="border-t border-gray-800 p-4 bg-gray-950/50">
                                    <h4 className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-3">
                                        Found in these larger ragas:
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {rel.supersets.slice(0, 12).map((superset, i) => (
                                            <div key={i} className="bg-gray-900 p-3 rounded-md border border-gray-800">
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

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-100">Raga Insights</h1>
                <p className="mt-1 text-gray-400">Relationships between ragas: shared notes, rotations and subsets</p>

                {/* Stats */}
                <dl className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: 'Hindustani ragas', value: HINDUSTANI_RAGAS.length },
                        { label: 'Melakartas', value: MELAKARTA_72.length },
                        { label: 'Same-note groups', value: sameNotesGroups.length },
                        { label: 'Murchanna groups', value: murchannaGroups.length }
                    ].map(stat => (
                        <div key={stat.label} className="rounded-lg border border-gray-800 bg-gray-900 px-4 py-3">
                            <dt className="text-xs text-gray-400">{stat.label}</dt>
                            <dd className="mt-0.5 text-2xl font-semibold text-gray-100 tabular-nums">{stat.value}</dd>
                        </div>
                    ))}
                </dl>
            </div>

            {/* Tabs */}
            <div className="grid grid-cols-3 sm:inline-grid mb-6 rounded-lg border border-gray-700 bg-gray-800 p-0.5" role="tablist">
                {[
                    { id: 'same-notes', label: 'Same Notes', count: filteredResults.sameNotes.length },
                    { id: 'murchanna', label: 'Murchanna', count: filteredResults.murchanna.length },
                    { id: 'subsets', label: 'Subsets', count: filteredResults.subsets.length }
                ].map(tab => (
                    <button
                        key={tab.id}
                        role="tab"
                        aria-selected={activeTab === tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-2 sm:px-4 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.id
                            ? 'bg-gray-600 text-gray-100'
                            : 'text-gray-400 hover:text-gray-100'
                            }`}
                    >
                        {tab.label}
                        <span className="ml-1.5 text-xs text-gray-400 tabular-nums">{tab.count}</span>
                    </button>
                ))}
            </div>

            {/* Filters */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 mb-6">
                <div className={`grid grid-cols-1 gap-4 ${activeTab === 'subsets' ? 'md:grid-cols-5' : 'md:grid-cols-4'}`}>
                    {activeTab === 'subsets' ? (
                        <>
                            <input
                                type="search"
                                placeholder="Subsets of… (raga name)"
                                aria-label="Find subsets of a raga"
                                value={subsetsOfQuery}
                                onChange={e => setSubsetsOfQuery(e.target.value)}
                                className="px-3 py-2 border rounded-lg bg-gray-700 border-gray-600"
                            />
                            <input
                                type="search"
                                placeholder="Supersets of… (raga name)"
                                aria-label="Find supersets of a raga"
                                value={supersetsOfQuery}
                                onChange={e => setSupersetsOfQuery(e.target.value)}
                                className="px-3 py-2 border rounded-lg bg-gray-700 border-gray-600"
                            />
                        </>
                    ) : (
                        <input
                            type="search"
                            placeholder="Search ragas..."
                            aria-label="Search ragas"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="px-3 py-2 border rounded-lg bg-gray-700 border-gray-600"
                        />
                    )}

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
                        className="btn btn-secondary"
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
