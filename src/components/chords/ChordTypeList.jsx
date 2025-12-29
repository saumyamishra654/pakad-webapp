/**
 * ChordTypeList Component
 * Sidebar showing chord types with counts
 */

import React from 'react';
import { CHORD_TYPES, EXTENDED_CHORD_TYPES, ALL_CHORDS_OPTION } from '../../data/chordTypes.js';

/**
 * Chord type filter sidebar
 * @param {Object} props
 * @param {string} props.selected - Selected chord type ID
 * @param {Function} props.onSelect - Called when type selected
 * @param {Object} props.counts - Map of typeId -> count
 * @param {boolean} props.showExtended - Show extended chord types
 * @param {Function} props.onToggleExtended - Toggle extended types
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

            {/* Type list */}
            {allTypes.map(type => {
                const count = type.id === 'all' ? totalCount : (counts[type.id] || 0);
                const isSelected = selected === type.id;

                return (
                    <button
                        key={type.id}
                        onClick={() => onSelect(type.id)}
                        className={`
              w-full px-3 py-2 rounded-lg text-left text-sm
              flex items-center justify-between
              transition-colors
              ${isSelected
                                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }
            `}
                    >
                        <div className="flex items-center gap-2">
                            {/* Color dot */}
                            <span
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: type.color }}
                            />
                            <span>{type.name}</span>
                        </div>

                        {/* Count badge */}
                        <span className={`
              text-xs px-2 py-0.5 rounded-full
              ${isSelected
                                ? 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                            }
            `}>
                            {count}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

export default ChordTypeList;
