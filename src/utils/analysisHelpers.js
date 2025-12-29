/**
 * Analysis Helper Utilities
 * Functions for raga relationship analysis (murchanna, subsets, same-notes)
 */

import { rotateBinary, patternToString, countNotes, isSubset, hammingDistance } from './noteHelpers.js';

/**
 * Find groups of ragas with identical note patterns
 * @param {Array} hindustaniRagas - Array of Hindustani raga objects
 * @param {Array} carnaticRagas - Array of Carnatic raga objects
 * @returns {Array} - Groups with {pattern, ragas}
 */
export function analyzeSameNotes(hindustaniRagas, carnaticRagas) {
    const groups = new Map();

    // Add type to each raga for identification
    const allRagas = [
        ...hindustaniRagas.map(r => ({ ...r, type: 'hindustani' })),
        ...carnaticRagas.map(r => ({ ...r, type: 'carnatic' }))
    ];

    // Group by note pattern string
    for (const raga of allRagas) {
        const key = patternToString(raga.notePattern);
        if (!groups.has(key)) {
            groups.set(key, { pattern: raga.notePattern, ragas: [] });
        }
        groups.get(key).ragas.push(raga);
    }

    // Filter to groups with multiple ragas or cross-system matches
    const results = Array.from(groups.values())
        .filter(group => {
            const hasHindustani = group.ragas.some(r => r.type === 'hindustani');
            const hasCarnatic = group.ragas.some(r => r.type === 'carnatic');
            return (hasHindustani && hasCarnatic) || group.ragas.length > 1;
        })
        .sort((a, b) => b.ragas.length - a.ragas.length);

    return results;
}

/**
 * Find murchanna (modal rotation) relationships between ragas
 * @param {Array} hindustaniRagas - Hindustani ragas
 * @param {Array} carnaticRagas - Carnatic ragas
 * @returns {Array} - Murchanna groups with base raga and rotations
 */
export function analyzeMurchanna(hindustaniRagas, carnaticRagas) {
    const allRagas = [
        ...hindustaniRagas.map(r => ({ ...r, type: 'hindustani' })),
        ...carnaticRagas.map(r => ({ ...r, type: 'carnatic' }))
    ];

    const processedPatterns = new Set();
    const groups = [];

    for (const raga of allRagas) {
        const basePattern = patternToString(raga.notePattern);
        if (processedPatterns.has(basePattern)) continue;

        const murchannaGroup = {
            baseRaga: raga,
            basePattern: raga.notePattern,
            murchannas: []
        };

        // Find all rotations of this pattern
        for (let rotation = 1; rotation < 12; rotation++) {
            const rotatedPattern = rotateBinary(raga.notePattern, rotation);
            const rotatedKey = patternToString(rotatedPattern);

            const matchingRagas = allRagas.filter(r =>
                patternToString(r.notePattern) === rotatedKey
            );

            if (matchingRagas.length > 0) {
                murchannaGroup.murchannas.push({
                    rotation,
                    pattern: rotatedPattern,
                    ragas: matchingRagas
                });
            }
        }

        // Only include if there are actual relationships
        if (murchannaGroup.murchannas.length > 0) {
            groups.push(murchannaGroup);
            processedPatterns.add(basePattern);
        }
    }

    return groups.sort((a, b) => b.murchannas.length - a.murchannas.length);
}

/**
 * Find subset/superset relationships between ragas
 * @param {Array} hindustaniRagas - Hindustani ragas
 * @param {Array} carnaticRagas - Carnatic ragas
 * @returns {Array} - Grouped by subset raga with array of supersets
 */
export function analyzeSubsets(hindustaniRagas, carnaticRagas) {
    const allRagas = [
        ...hindustaniRagas.map(r => ({ ...r, type: 'hindustani' })),
        ...carnaticRagas.map(r => ({ ...r, type: 'carnatic' }))
    ];

    const relations = [];

    for (let i = 0; i < allRagas.length; i++) {
        for (let j = 0; j < allRagas.length; j++) {
            if (i === j) continue;

            const raga1 = allRagas[i];
            const raga2 = allRagas[j];

            // Check if raga1 is a subset of raga2
            if (isSubset(raga1.notePattern, raga2.notePattern)) {
                const count1 = countNotes(raga1.notePattern);
                const count2 = countNotes(raga2.notePattern);

                // Only include if subset has fewer notes
                if (count1 < count2) {
                    relations.push({
                        subset: raga1,
                        superset: raga2,
                        subsetCount: count1,
                        supersetCount: count2,
                        difference: count2 - count1
                    });
                }
            }
        }
    }

    // Group by subset raga
    const grouped = {};
    for (const rel of relations) {
        const key = `${rel.subset.name}_${rel.subset.type}`;
        if (!grouped[key]) {
            grouped[key] = { subset: rel.subset, supersets: [] };
        }
        grouped[key].supersets.push(rel.superset);
    }

    return Object.values(grouped).sort((a, b) => b.supersets.length - a.supersets.length);
}

/**
 * Rank ragas by similarity to a target pattern (using Hamming distance)
 * @param {Array} ragas - Array of raga objects
 * @param {number[]} targetPattern - Target 12-element pattern
 * @returns {Array} - Ragas sorted by similarity (closest first)
 */
export function rankBySimilarity(ragas, targetPattern) {
    return [...ragas]
        .map(raga => ({
            ...raga,
            distance: hammingDistance(raga.notePattern, targetPattern)
        }))
        .sort((a, b) => a.distance - b.distance);
}

/**
 * Filter analysis results based on criteria
 * @param {Array} results - Analysis results
 * @param {Object} filters - Filter options
 * @returns {Array} - Filtered results
 */
export function filterAnalysisResults(results, {
    searchQuery = '',
    systemFilter = 'all', // 'all', 'hindustani', 'carnatic', 'cross-system'
    scaleTypeFilter = 'all', // 'all', '5', '6', '7', '8+'
    showOnlyMatches = false
} = {}) {
    let filtered = [...results];

    // Search filter
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(item => {
            // Handle different result structures
            if (item.ragas) {
                return item.ragas.some(r => r.name.toLowerCase().includes(query));
            }
            if (item.baseRaga) {
                return item.baseRaga.name.toLowerCase().includes(query) ||
                    item.murchannas?.some(m => m.ragas.some(r => r.name.toLowerCase().includes(query)));
            }
            if (item.subset) {
                return item.subset.name.toLowerCase().includes(query) ||
                    item.supersets?.some(s => s.name.toLowerCase().includes(query));
            }
            return true;
        });
    }

    // System filter
    if (systemFilter !== 'all') {
        filtered = filtered.filter(item => {
            const getAllRagas = (item) => {
                if (item.ragas) return item.ragas;
                if (item.baseRaga) return [item.baseRaga, ...(item.murchannas?.flatMap(m => m.ragas) || [])];
                if (item.subset) return [item.subset, ...(item.supersets || [])];
                return [];
            };

            const allRagas = getAllRagas(item);
            const hasHindustani = allRagas.some(r => r.type === 'hindustani');
            const hasCarnatic = allRagas.some(r => r.type === 'carnatic');

            if (systemFilter === 'hindustani') return hasHindustani;
            if (systemFilter === 'carnatic') return hasCarnatic;
            if (systemFilter === 'cross-system') return hasHindustani && hasCarnatic;
            return true;
        });
    }

    // Scale type filter
    if (scaleTypeFilter !== 'all') {
        filtered = filtered.filter(item => {
            const pattern = item.pattern || item.basePattern || item.subset?.notePattern;
            if (!pattern) return true;

            const noteCount = countNotes(pattern);
            if (scaleTypeFilter === '8+') return noteCount >= 8;
            return noteCount === parseInt(scaleTypeFilter);
        });
    }

    // Cross-system only (for same-notes)
    if (showOnlyMatches) {
        filtered = filtered.filter(item => {
            if (!item.ragas) return true;
            const hasHindustani = item.ragas.some(r => r.type === 'hindustani');
            const hasCarnatic = item.ragas.some(r => r.type === 'carnatic');
            return hasHindustani && hasCarnatic;
        });
    }

    return filtered;
}

export default {
    analyzeSameNotes,
    analyzeMurchanna,
    analyzeSubsets,
    rankBySimilarity,
    filterAnalysisResults
};
