/**
 * ChordCard Component - Matches original chord display styling
 */

import React from 'react';
import { getChordNotation } from '../../utils/chordHelpers.js';
import { getDisplayLabels } from '../../utils/noteHelpers.js';

/**
 * Single chord display card - matches original chord-shape styling
 */
export function ChordCard({
    chord,
    onPlayUnison,
    onPlayMelody,
    tonic = 0,
    isCarnatic = false,
    isExtended = false,
    className = ''
}) {
    if (!chord) return null;

    const labels = getDisplayLabels(isCarnatic);
    const westernName = getChordNotation(chord, tonic);
    const rootLabel = labels[chord.root];
    const noteLabels = chord.notes.map(n => labels[n]).join(' - ');
    const chordTypeName = chord.name || chord.type?.name || '';

    return (
        <div
            className={`p-3 rounded-lg border ${isExtended
                    ? 'bg-gradient-to-br from-yellow-600 to-orange-600 text-white border-yellow-400'
                    : 'bg-gray-800 border-gray-600'
                } ${className}`}
            draggable
            onDragStart={(e) => {
                e.dataTransfer.setData('application/json', JSON.stringify(chord));
            }}
        >
            {/* Header with color dot and chord name */}
            <div className="flex items-center gap-2 mb-2">
                <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: chord.color || '#3b82f6' }}
                />
                <span className="font-semibold text-white">
                    {rootLabel} {chordTypeName}
                </span>
            </div>

            {/* Notes and western name */}
            <p className={`text-sm ${isExtended ? 'text-gray-100' : 'text-gray-400'} mb-3`}>
                Notes: {noteLabels}
                {westernName && (
                    <span className="block mt-1 font-medium text-gray-500">{westernName}</span>
                )}
            </p>

            {/* Chord playback buttons */}
            <div className="flex gap-2">
                <button
                    onClick={(e) => { e.stopPropagation(); onPlayUnison && onPlayUnison(chord); }}
                    className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                    ♪ Unison
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onPlayMelody && onPlayMelody(chord); }}
                    className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                >
                    ♫ Melody
                </button>
            </div>
        </div>
    );
}

/**
 * Grid of chord cards - matches original layout
 */
export function ChordGrid({
    chords,
    onPlayChord,
    tonic = 0,
    isCarnatic = false,
    className = ''
}) {
    if (!chords || chords.length === 0) {
        return (
            <div className="text-center py-8 text-gray-400">
                No chords available for current selection
            </div>
        );
    }

    return (
        <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 ${className}`}>
            {chords.map((chord, index) => (
                <ChordCard
                    key={`${chord.root}-${chord.type}-${index}`}
                    chord={chord}
                    onPlayUnison={onPlayChord ? () => onPlayChord(chord, true) : undefined}
                    onPlayMelody={onPlayChord ? () => onPlayChord(chord, false) : undefined}
                    tonic={tonic}
                    isCarnatic={isCarnatic}
                    isExtended={chord.isExtended}
                />
            ))}
        </div>
    );
}

export default ChordCard;
