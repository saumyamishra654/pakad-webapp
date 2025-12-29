/**
 * PianoKeyboard Component
 * Interactive 3-octave piano keyboard with note highlighting
 */

import React, { useMemo, useCallback } from 'react';
import { SWAR_NAMES, CARNATIC_LABELS, getDisplayLabels } from '../utils/noteHelpers.js';

/**
 * Single octave piano keys layout
 * White keys: C, D, E, F, G, A, B (indices 0, 2, 4, 5, 7, 9, 11)
 * Black keys: C#, D#, F#, G#, A# (indices 1, 3, 6, 8, 10)
 */
const WHITE_KEY_INDICES = [0, 2, 4, 5, 7, 9, 11];
const BLACK_KEY_POSITIONS = [
    { index: 1, offset: 0 },   // C#
    { index: 3, offset: 1 },   // D#
    { index: 6, offset: 3 },   // F#
    { index: 8, offset: 4 },   // G#
    { index: 10, offset: 5 },  // A#
];

/**
 * Piano keyboard component
 * @param {Object} props
 * @param {Function} props.onNoteClick - Called with (noteIndex, octave) when key clicked
 * @param {number[]} props.highlightedNotes - Array of pitch classes (0-11) to highlight
 * @param {number[]} props.activeNotes - Array of pitch classes showing as "playing"
 * @param {boolean} props.isCarnatic - Use Carnatic labels
 * @param {number} props.tonic - Tonic offset (0-11)
 * @param {number} props.startOctave - Starting octave (default 3)
 * @param {number} props.numOctaves - Number of octaves to show (default 3)
 * @param {boolean} props.showLabels - Show note labels on keys
 * @param {boolean} props.collapsed - Start collapsed
 */
export function PianoKeyboard({
    onNoteClick,
    highlightedNotes = [],
    activeNotes = [],
    isCarnatic = false,
    tonic = 0,
    startOctave = 3,
    numOctaves = 3,
    showLabels = true,
    collapsed = false,
    className = ''
}) {
    const [isCollapsed, setIsCollapsed] = React.useState(collapsed);

    const labels = useMemo(() => getDisplayLabels(isCarnatic), [isCarnatic]);

    // Convert highlighted notes to a Set for O(1) lookup
    const highlightSet = useMemo(() => new Set(highlightedNotes), [highlightedNotes]);
    const activeSet = useMemo(() => new Set(activeNotes), [activeNotes]);

    const handleKeyClick = useCallback((noteIndex, octave) => {
        if (onNoteClick) {
            onNoteClick(noteIndex, octave);
        }
    }, [onNoteClick]);

    const getKeyClasses = useCallback((noteIndex, isBlack) => {
        const isHighlighted = highlightSet.has(noteIndex);
        const isActive = activeSet.has(noteIndex);

        let classes = isBlack ? 'black-key' : 'white-key';

        if (isHighlighted) {
            classes += isBlack ? ' bg-blue-600' : ' bg-blue-200';
        }
        if (isActive) {
            classes += ' ring-2 ring-yellow-400';
        }

        return classes;
    }, [highlightSet, activeSet]);

    const getLabel = useCallback((noteIndex) => {
        // Apply tonic offset for display
        const adjustedIndex = ((noteIndex - tonic % 12) + 12) % 12;
        return labels[adjustedIndex];
    }, [labels, tonic]);

    if (isCollapsed) {
        return (
            <button
                onClick={() => setIsCollapsed(false)}
                className={`w-full py-2 px-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${className}`}
            >
                🎹 Show Piano Keyboard
            </button>
        );
    }

    return (
        <div className={`piano-wrap ${className}`}>
            <div className="flex items-center gap-2 mb-2">
                <button
                    onClick={() => setIsCollapsed(true)}
                    className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                    ▼ Hide
                </button>
            </div>

            <div className="piano">
                {Array.from({ length: numOctaves }, (_, octaveOffset) => {
                    const octave = startOctave + octaveOffset;

                    return (
                        <div key={octave} className="octave">
                            {/* White keys */}
                            <div className="white-keys">
                                {WHITE_KEY_INDICES.map((noteIndex) => (
                                    <button
                                        key={`white-${octave}-${noteIndex}`}
                                        className={getKeyClasses(noteIndex, false)}
                                        onClick={() => handleKeyClick(noteIndex, octave)}
                                        title={getLabel(noteIndex)}
                                    >
                                        {showLabels && noteIndex === 0 && (
                                            <span className="text-xs text-gray-500 absolute bottom-1 left-1/2 -translate-x-1/2">
                                                {getLabel(noteIndex)}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Black keys */}
                            {BLACK_KEY_POSITIONS.map(({ index, offset }) => (
                                <button
                                    key={`black-${octave}-${index}`}
                                    className={getKeyClasses(index, true)}
                                    style={{ left: `${offset * 24 + 16}px` }}
                                    onClick={() => handleKeyClick(index, octave)}
                                    title={getLabel(index)}
                                >
                                    {showLabels && (
                                        <span className="text-[8px]">{getLabel(index)}</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default PianoKeyboard;
