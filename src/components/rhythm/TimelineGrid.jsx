/**
 * TimelineGrid Component
 * Beat grid for placing chords in rhythm progressions
 * Updated to match original styling
 */

import React, { useState, useCallback } from 'react';
import { getDisplayLabels } from '../../utils/noteHelpers.js';

/**
 * TimelineGrid for chord progression building - matches original light theme styling
 */
export function TimelineGrid({
    beats = 8,
    chords = [],
    onChordPlace,
    onChordRemove,
    currentBeat = -1,
    breakpoints = '',
    isCarnatic = false,
    onBeatClick, // tap-to-place: called with the beat index when a chord is armed
    isPlacing = false,
    className = ''
}) {
    const [dragOverBeat, setDragOverBeat] = useState(null);
    const labels = getDisplayLabels(isCarnatic);

    // Parse breakpoints into positions
    const breakpointPositions = React.useMemo(() => {
        if (!breakpoints) return [];
        const parts = breakpoints.split('-').map(Number).filter(n => !isNaN(n) && n > 0);
        const positions = [];
        let pos = 0;
        for (const len of parts) {
            pos += len;
            if (pos < beats) positions.push(pos - 1); // Mark the beat BEFORE the break
        }
        return positions;
    }, [breakpoints, beats]);

    // Get chord at specific beat
    const getChordAtBeat = useCallback((beatIndex) => {
        return chords.find(c => Math.floor(c.beat) === beatIndex);
    }, [chords]);

    // Handle drop
    const handleDrop = (e, beatIndex) => {
        e.preventDefault();
        setDragOverBeat(null);
        try {
            const chordData = JSON.parse(e.dataTransfer.getData('application/json'));
            if (onChordPlace) {
                onChordPlace(beatIndex, chordData);
            }
        } catch {
            console.warn('Invalid drop data');
        }
    };

    // Calculate layout - single row for <=10 beats, 2 rows for more
    const beatsPerRow = beats <= 10 ? beats : Math.ceil(beats / 2);
    const rows = beats <= 10 ? 1 : 2;

    return (
        <div className={`rounded-lg border border-gray-800 bg-gray-950/60 p-3 sm:p-4 ${className}`}>
            <div className="space-y-2">
                {Array.from({ length: rows }).map((_, rowIndex) => {
                    const startBeat = rowIndex * beatsPerRow;
                    const endBeat = Math.min(startBeat + beatsPerRow, beats);

                    return (
                        <div key={rowIndex} className="flex gap-1">
                            {Array.from({ length: endBeat - startBeat }).map((_, indexInRow) => {
                                const beatIndex = startBeat + indexInRow;
                                const chord = getChordAtBeat(beatIndex);
                                const isPlaying = currentBeat === beatIndex;
                                const isDragOver = dragOverBeat === beatIndex;
                                const isBreakpoint = breakpointPositions.includes(beatIndex);
                                const isFirstBeat = beatIndex === 0;

                                return (
                                    <div
                                        key={beatIndex}
                                        data-beat={beatIndex}
                                        className={`
                                            border rounded-md p-1 transition-colors flex-1 min-w-0 relative group
                                            ${isPlaying
                                                ? 'bg-blue-500/15 border-blue-500'
                                                : isFirstBeat
                                                    ? 'bg-gray-900 border-gray-600'
                                                    : 'bg-gray-900 border-gray-800'
                                            }
                                            ${isDragOver ? 'border-dashed !border-blue-500 !bg-blue-500/10' : ''}
                                            ${isBreakpoint ? 'border-r-2 border-r-gray-500' : ''}
                                            ${isPlacing ? 'cursor-pointer hover:!border-blue-500' : ''}
                                        `}
                                        style={{
                                            minHeight: '70px',
                                            marginRight: isBreakpoint ? '0.5rem' : '0'
                                        }}
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            setDragOverBeat(beatIndex);
                                        }}
                                        onDragLeave={() => setDragOverBeat(null)}
                                        onDrop={(e) => handleDrop(e, beatIndex)}
                                        onClick={() => { if (isPlacing && onBeatClick) onBeatClick(beatIndex); }}
                                    >
                                        {/* Beat number at top */}
                                        <div className="text-[11px] text-gray-500 font-medium mb-1 tabular-nums">
                                            {beatIndex + 1}
                                        </div>

                                        {/* Chord chips */}
                                        <div className="space-y-1">
                                            {chord && (() => {
                                                const chordType = chord.chord?.type || {};
                                                const bgColor = chord.chord?.color || chordType.color || '#6366f1';
                                                const rootLabel = labels[chord.chord?.root] || '';
                                                const typeName = chord.chord?.name || chordType.name || '';
                                                const westernName = chord.chord?.westernName;

                                                return (
                                                    <div
                                                        className="bg-gray-800 border border-gray-700 rounded px-1.5 py-1 text-xs relative group"
                                                        style={{ borderColor: bgColor }}
                                                        title="Click remove button to delete"
                                                    >
                                                        <div className="flex items-center gap-1 mb-0.5">
                                                            <div
                                                                className="w-2 h-2 rounded-full flex-shrink-0"
                                                                style={{ backgroundColor: bgColor }}
                                                            />
                                                            <span className="font-medium text-gray-100 truncate text-xs">
                                                                {westernName || `${rootLabel} ${typeName}`}
                                                            </span>
                                                        </div>
                                                        {/* Delete button on hover */}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (onChordRemove) onChordRemove(beatIndex, chord.id);
                                                            }}
                                                            className="absolute -top-1 -right-1 w-4 h-4 bg-gray-600 hover:bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 flex items-center justify-center font-bold transition-opacity shadow-md z-10"
                                                            title="Remove chord"
                                                        >
                                                            <svg viewBox="0 0 10 10" className="w-2 h-2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                                                                <path d="M2 2l6 6M8 2l-6 6" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                );
                                            })()}

                                            {/* Empty state - plus icon */}
                                            {!chord && (
                                                <div className="text-gray-600 text-lg text-center">+</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>

            {/* Beat grouping */}
            {breakpoints && (
                <div className="mt-3 text-xs text-gray-500">
                    Grouping: <span className="text-gray-400 tabular-nums">{breakpoints}</span>
                </div>
            )}
        </div>
    );
}

export default TimelineGrid;
