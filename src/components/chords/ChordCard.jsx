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
    isOutside = false,
    ragaPattern = null,
    onSelect,
    isSelected = false,
    className = ''
}) {
    if (!chord) return null;

    const labels = getDisplayLabels(isCarnatic);
    const westernName = getChordNotation(chord, tonic);
    const rootLabel = labels[chord.root];
    const chordTypeName = chord.name || chord.type?.name || '';

    // Render notes with highlighting for notes outside the raga
    const renderNotes = () => {
        return chord.notes.map((n, i) => {
            const isNoteOutside = isOutside && ragaPattern && !ragaPattern[n];
            const label = labels[n];
            return (
                <span key={i}>
                    {i > 0 && ' - '}
                    <span data-outside={isNoteOutside || undefined} className={isNoteOutside ? 'text-red-300 font-semibold' : ''}>
                        {label}
                    </span>
                </span>
            );
        });
    };

    const variant = isExtended ? 'extended' : isOutside ? 'outside' : 'normal';

    return (
        <div
            data-variant={variant}
            className={`p-3 rounded-lg border bg-gray-950/60 cursor-grab active:cursor-grabbing transition-colors hover:border-gray-600 ${isExtended
                ? 'border-amber-500/40'
                : isOutside
                    ? 'border-red-500/40'
                    : 'border-gray-800'
                } ${isSelected ? 'ring-2 ring-blue-500' : ''} ${className}`}
            // Touch screens can't drag: tapping the card arms it, then tapping a beat places it
            onClick={() => {
                if (onSelect && window.matchMedia?.('(hover: none)').matches) {
                    onSelect(isSelected ? null : chord);
                }
            }}
            draggable
            onDragStart={(e) => {
                e.dataTransfer.setData('application/json', JSON.stringify(chord));
            }}
        >
            {/* Header: colour dot, chord name, western name */}
            <div className="flex items-baseline gap-2">
                <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0 self-center"
                    style={{ backgroundColor: chord.color || '#5b7cfa' }}
                />
                <span className="font-medium text-sm text-gray-100 truncate">
                    {rootLabel} {chordTypeName}
                </span>
                {westernName && (
                    <span className="ml-auto text-xs text-gray-400 whitespace-nowrap">{westernName}</span>
                )}
            </div>

            {/* Notes */}
            <p className="mt-1 mb-2.5 text-xs text-gray-400">
                Notes: {renderNotes()}
                {isExtended && <span className="ml-1.5 text-amber-300/80">extended</span>}
            </p>

            {/* Chord playback buttons */}
            <div className="flex gap-1.5">
                <button
                    onClick={(e) => { e.stopPropagation(); onPlayUnison && onPlayUnison(chord); }}
                    className="btn btn-sm btn-secondary"
                >
                    Unison
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onPlayMelody && onPlayMelody(chord); }}
                    className="btn btn-sm btn-secondary"
                >
                    Melody
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
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 ${className}`}>
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
