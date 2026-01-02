/**
 * PianoKeyboard Component
 * Interactive 3-octave piano keyboard - matches original HTML styling exactly
 */

import React, { useMemo, useCallback } from 'react';
import { SWAR_NAMES, CARNATIC_LABELS, getDisplayLabels } from '../../utils/noteHelpers.js';

/**
 * White keys: C, D, E, F, G, A, B (indices 0, 2, 4, 5, 7, 9, 11)
 * Black keys: C#, D#, F#, G#, A# (indices 1, 3, 6, 8, 10)
 */
const WHITE_KEY_INDICES = [0, 2, 4, 5, 7, 9, 11];
const BLACK_KEY_POSITIONS = [
    { index: 1, offset: 0 },
    { index: 3, offset: 1 },
    { index: 6, offset: 3 },
    { index: 8, offset: 4 },
    { index: 10, offset: 5 },
];

/**
 * Piano keyboard component - exact match to original
 */
export function PianoKeyboard({
    onNoteClick,
    highlightedNotes = [],
    swarLabels = null,
    isCarnatic = false,
    octaveSequence = [3, 4, 5],
    className = ''
}) {
    const labels = useMemo(() => getDisplayLabels(isCarnatic), [isCarnatic]);
    const highlightSet = useMemo(() => new Set(highlightedNotes), [highlightedNotes]);

    const handleKeyClick = useCallback((noteIndex, octave) => {
        if (onNoteClick) {
            onNoteClick(noteIndex, octave);
        }
    }, [onNoteClick]);

    const isHighlighted = useCallback((noteIndex) => {
        return highlightSet.has(noteIndex);
    }, [highlightSet]);

    const getSwarLabel = useCallback((noteIndex) => {
        if (swarLabels && swarLabels[noteIndex] !== undefined) {
            return labels[swarLabels[noteIndex]];
        }
        return null;
    }, [swarLabels, labels]);

    return (
        <div className={`piano-wrap ${className}`}>
            <div className="piano">
                {octaveSequence.map((octave) => (
                    <div key={octave} className="octave">
                        {/* White keys */}
                        <div className="white-keys">
                            {WHITE_KEY_INDICES.map((noteIndex) => {
                                const highlighted = isHighlighted(noteIndex);
                                const label = getSwarLabel(noteIndex);

                                return (
                                    <button
                                        key={`white-${octave}-${noteIndex}`}
                                        className={`white-key ${highlighted ? 'highlighted' : ''}`}
                                        onClick={() => handleKeyClick(noteIndex, octave)}
                                        data-label={label || ''}
                                    >
                                        {label && highlighted && (
                                            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white">
                                                {label}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Black keys */}
                        {BLACK_KEY_POSITIONS.map(({ index, offset }) => {
                            const highlighted = isHighlighted(index);
                            const label = getSwarLabel(index);

                            return (
                                <button
                                    key={`black-${octave}-${index}`}
                                    className={`black-key ${highlighted ? 'highlighted' : ''}`}
                                    style={{ left: `${offset * 24 + 16}px` }}
                                    onClick={() => handleKeyClick(index, octave)}
                                >
                                    {label && highlighted && (
                                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-bold text-white">
                                            {label}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default PianoKeyboard;
