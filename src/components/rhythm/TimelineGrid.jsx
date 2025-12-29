/**
 * TimelineGrid Component
 * Beat grid for placing chords in rhythm progressions
 */

import React, { useState, useCallback } from 'react';

/**
 * TimelineGrid for chord progression building
 * @param {Object} props
 * @param {number} props.beats - Number of beats
 * @param {Array} props.chords - Chords placed on beats [{beat, chord}]
 * @param {Function} props.onChordPlace - Called when chord dropped on beat
 * @param {Function} props.onChordRemove - Called when chord removed from beat
 * @param {number} props.currentBeat - Currently playing beat (for highlighting)
 * @param {string} props.breakpoints - Breakpoint pattern (e.g., "4-4" or "3-3-2")
 */
export function TimelineGrid({
    beats = 8,
    chords = [],
    onChordPlace,
    onChordRemove,
    currentBeat = -1,
    breakpoints = '',
    className = ''
}) {
    const [dragOverBeat, setDragOverBeat] = useState(null);

    // Parse breakpoints into accent positions
    const accentPositions = React.useMemo(() => {
        if (!breakpoints) return new Set([0]);

        const parts = breakpoints.split('-').map(Number).filter(n => !isNaN(n) && n > 0);
        const positions = new Set([0]);
        let pos = 0;

        for (const len of parts) {
            pos += len;
            if (pos <= beats) positions.add(pos);
        }

        return positions;
    }, [breakpoints, beats]);

    // Get chord at specific beat
    const getChordAtBeat = useCallback((beatIndex) => {
        return chords.find(c => c.beat === beatIndex);
    }, [chords]);

    // Handle drag over
    const handleDragOver = (e, beatIndex) => {
        e.preventDefault();
        setDragOverBeat(beatIndex);
    };

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

    // Handle click to remove
    const handleBeatClick = (beatIndex) => {
        const chord = getChordAtBeat(beatIndex);
        if (chord && onChordRemove) {
            onChordRemove(beatIndex);
        }
    };

    return (
        <div className={`${className}`}>
            {/* Beat grid */}
            <div className="flex gap-1 overflow-x-auto pb-2">
                {Array.from({ length: beats }, (_, i) => {
                    const chord = getChordAtBeat(i);
                    const isAccent = accentPositions.has(i);
                    const isPlaying = currentBeat === i;
                    const isDragOver = dragOverBeat === i;

                    return (
                        <div
                            key={i}
                            className={`
                flex-shrink-0 w-16 h-20 rounded-lg border-2 
                flex flex-col items-center justify-center
                transition-all cursor-pointer
                ${isAccent ? 'border-blue-400 dark:border-blue-600' : 'border-gray-300 dark:border-gray-600'}
                ${isPlaying ? 'bg-yellow-100 dark:bg-yellow-900/40 ring-2 ring-yellow-400' : 'bg-white dark:bg-gray-800'}
                ${isDragOver ? 'border-dashed border-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''}
                ${chord ? 'hover:bg-red-50 dark:hover:bg-red-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}
              `}
                            onDragOver={(e) => handleDragOver(e, i)}
                            onDragLeave={() => setDragOverBeat(null)}
                            onDrop={(e) => handleDrop(e, i)}
                            onClick={() => handleBeatClick(i)}
                        >
                            {/* Beat number */}
                            <span className={`text-xs ${isAccent ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
                                {i + 1}
                            </span>

                            {/* Chord display */}
                            {chord ? (
                                <div className="mt-1 text-center">
                                    <div
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                        style={{ backgroundColor: chord.chord?.color || '#3b82f6' }}
                                    >
                                        {chord.chord?.root !== undefined ? chord.chord.root : '?'}
                                    </div>
                                    <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 truncate w-14">
                                        {chord.chord?.name?.slice(0, 8) || ''}
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-1 text-gray-300 dark:text-gray-600 text-2xl">+</div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                <span>Drag chords to beats • Click to remove</span>
                {breakpoints && (
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
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
          p-2 rounded-full transition-colors
          ${isPlaying
                        ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                        : 'bg-green-500 hover:bg-green-600 text-white'
                    }
        `}
            >
                {isPlaying ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                    </svg>
                )}
            </button>

            {/* Stop */}
            <button
                onClick={onStop}
                className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
            >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                </svg>
            </button>

            {/* BPM */}
            <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 dark:text-gray-400">BPM</label>
                <input
                    type="number"
                    value={bpm}
                    onChange={e => onBpmChange(parseInt(e.target.value) || 120)}
                    min={40}
                    max={240}
                    className="w-16 px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-600"
                />
            </div>

            {/* Loop */}
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
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
                className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800/40"
            >
                Clear
            </button>
        </div>
    );
}

export default TimelineGrid;
