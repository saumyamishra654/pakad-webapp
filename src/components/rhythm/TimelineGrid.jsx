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
        } catch (err) {
            console.warn('Invalid drop data');
        }
    };

    // Calculate layout - single row for <=10 beats, 2 rows for more
    const beatsPerRow = beats <= 10 ? beats : Math.ceil(beats / 2);
    const rows = beats <= 10 ? 1 : 2;

    return (
        <div className={`border-2 border-gray-300 rounded-lg p-4 bg-gray-50 ${className}`}>
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
                                        className={`
                                            border-2 rounded p-1 transition-all flex-1 min-w-0 relative group
                                            ${isPlaying
                                                ? 'bg-yellow-200 border-yellow-400'
                                                : isFirstBeat
                                                    ? 'bg-blue-50 border-blue-300'
                                                    : 'bg-white border-gray-300'
                                            }
                                            ${isDragOver ? 'border-dashed border-blue-500 bg-blue-50' : ''}
                                            ${isBreakpoint ? 'border-r-4 border-r-indigo-500' : ''}
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
                                    >
                                        {/* Beat number at top */}
                                        <div className="text-xs text-gray-500 font-semibold mb-1">
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
                                                        className="bg-white border rounded px-1 py-1 text-xs relative group shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                                                        style={{ borderColor: bgColor }}
                                                        title="Click remove button to delete"
                                                    >
                                                        <div className="flex items-center gap-1 mb-0.5">
                                                            <div
                                                                className="w-2 h-2 rounded-full flex-shrink-0"
                                                                style={{ backgroundColor: bgColor }}
                                                            />
                                                            <span className="font-medium text-gray-800 truncate text-xs">
                                                                {westernName || `${rootLabel} ${typeName}`}
                                                            </span>
                                                        </div>
                                                        {/* Delete button on hover */}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (onChordRemove) onChordRemove(beatIndex, chord.id);
                                                            }}
                                                            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 flex items-center justify-center font-bold transition-opacity shadow-md z-10"
                                                            title="Remove chord"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                );
                                            })()}

                                            {/* Empty state - plus icon */}
                                            {!chord && (
                                                <div className="text-gray-300 text-lg text-center">+</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                <span>Drag chords to beats</span>
                {breakpoints && (
                    <span className="px-2 py-0.5 bg-gray-100 rounded">
                        Pattern: {breakpoints}
                    </span>
                )}
            </div>
        </div>
    );
}

/**
 * Playback controls for timeline
 */
export function PlaybackControls({
    isPlaying,
    onPlayPause,
    onStop,
    onClear,
    bpm,
    onBpmChange,
    loop,
    onLoopToggle,
    className = ''
}) {
    return (
        <div className={`flex items-center gap-3 ${className}`}>
            {/* Play/Pause */}
            <button
                onClick={onPlayPause}
                className={`
                    px-3 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors
                    ${isPlaying
                        ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                        : 'bg-green-500 hover:bg-green-600 text-white'
                    }
                `}
            >
                {isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>

            {/* Stop */}
            <button
                onClick={onStop}
                className="px-3 py-2 rounded-lg font-medium text-sm bg-gray-200 hover:bg-gray-300 text-gray-700"
            >
                ⏹ Stop
            </button>

            {/* Loop */}
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                    type="checkbox"
                    checked={loop}
                    onChange={e => onLoopToggle(e.target.checked)}
                    className="w-4 h-4"
                />
                Loop
            </label>

            {/* Clear */}
            <button
                onClick={onClear}
                className="px-3 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
            >
                Clear
            </button>
        </div>
    );
}

export default TimelineGrid;
