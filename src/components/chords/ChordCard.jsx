/**
 * ChordCard Component
 * Displays a chord with play button and note information
 */

import React from 'react';
import { getChordNotation } from '../../utils/chordHelpers.js';
import { getDisplayLabels } from '../../utils/noteHelpers.js';

/**
 * Single chord display card
 * @param {Object} props
 * @param {Object} props.chord - Chord object with root, type, notes, color
 * @param {Function} props.onPlay - Called when play button clicked
 * @param {number} props.tonic - Tonic offset for Western names
 * @param {boolean} props.isCarnatic - Use Carnatic labels
 * @param {boolean} props.showWesternName - Show Western chord notation
 * @param {boolean} props.isExtended - Is this an extended chord
 */
export function ChordCard({
    chord,
    onPlay,
    tonic = 0,
    isCarnatic = false,
    showWesternName = true,
    isExtended = false,
    className = ''
}) {
    if (!chord) return null;

    const labels = getDisplayLabels(isCarnatic);
    const westernName = showWesternName ? getChordNotation(chord, tonic) : null;
    const rootLabel = labels[chord.root];

    // Display notes as swar names
    const noteLabels = chord.notes.map(n => labels[n]).join(' - ');

    return (
        <div
            className={`
        bg-white dark:bg-gray-800 rounded-lg border-2 p-3
        hover:shadow-lg transition-all cursor-pointer
        ${isExtended ? 'extended-chord' : ''}
        ${className}
      `}
            style={{ borderColor: chord.color || '#3b82f6' }}
            onClick={onPlay}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    {/* Root badge */}
                    <span
                        className="px-2 py-0.5 rounded text-white text-sm font-bold"
                        style={{ backgroundColor: chord.color || '#3b82f6' }}
                    >
                        {rootLabel}
                    </span>

                    {/* Chord type */}
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                        {chord.name}
                    </span>
                </div>

                {/* Play button */}
                {onPlay && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onPlay(); }}
                        className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        title="Play chord"
                    >
                        <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Western name */}
            {westernName && (
                <div className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1">
                    {westernName}
                </div>
            )}

            {/* Notes */}
            <div className="text-xs text-gray-500 dark:text-gray-400">
                {noteLabels}
            </div>

            {/* Extended badge */}
            {isExtended && (
                <div className="mt-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300">
                        Extended
                    </span>
                </div>
            )}
        </div>
    );
}

/**
 * Grid of chord cards
 */
export function ChordGrid({
    chords,
    onPlayChord,
    tonic = 0,
    isCarnatic = false,
    showWesternName = true,
    className = ''
}) {
    if (!chords || chords.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No chords available for current selection
            </div>
        );
    }

    return (
        <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 ${className}`}>
            {chords.map((chord, index) => (
                <ChordCard
                    key={`${chord.root}-${chord.type}-${index}`}
                    chord={chord}
                    onPlay={onPlayChord ? () => onPlayChord(chord) : undefined}
                    tonic={tonic}
                    isCarnatic={isCarnatic}
                    showWesternName={showWesternName}
                    isExtended={chord.isExtended}
                />
            ))}
        </div>
    );
}

export default ChordCard;
