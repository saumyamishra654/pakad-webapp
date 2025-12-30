/**
 * ChordTypeList Component - Matches original chord type button styling
 */

import React from 'react';
import { CHORD_TYPES, EXTENDED_CHORD_TYPES, ALL_CHORDS_OPTION } from '../../data/chordTypes.js';

/**
 * Chord type filter sidebar - exact match to original
 */
export function ChordTypeList({
    selected = 'all',
    onSelect,
    counts = {},
    showExtended = false,
    onToggleExtended,
    className = ''
}) {
    const allTypes = [
        ALL_CHORDS_OPTION,
        ...CHORD_TYPES,
        ...(showExtended ? EXTENDED_CHORD_TYPES : [])
    ];

    const totalCount = Object.values(counts).reduce((sum, c) => sum + c, 0);

    return (
        <div className={`space-y-1 ${className}`}>
            {/* Extended toggle */}
            {onToggleExtended && (
                <label className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                    <input
                        type="checkbox"
                        checked={showExtended}
                        onChange={e => onToggleExtended(e.target.checked)}
                        className="w-4 h-4 text-orange-500 rounded"
                    />
                    <span>Show extended chords</span>
                </label>
            )}

            {/* Type list - exact match to original styling */}
            {allTypes.map(type => {
                const count = type.id === 'all' ? totalCount : (counts[type.id] || 0);
                const isSelected = selected === type.id;

                return (
                    <button
                        key={type.id}
                        onClick={() => onSelect(type.id)}
                        className={`chord-type-btn ${isSelected ? 'active' : ''}`}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                {/* Color dot */}
                                <div
                                    className="w-2 h-2 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: type.color }}
                                />
                                <span className="font-medium text-xs truncate">{type.name}</span>
                                {!type.isSpecial && type.intervals && (
                                    <span className="text-xs text-gray-400 truncate">
                                        {type.intervals.join('-')}
                                    </span>
                                )}
                            </div>

                            {/* Count badge */}
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 flex-shrink-0 ml-1">
                                {count}
                            </span>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}

export default ChordTypeList;
