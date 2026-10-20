/**
 * ChordSuggestions Component
 * A strip of likely next chords for the first empty beat of the progression
 */

import React from 'react';
import { getRomanNumeral } from '../../utils/romanNumerals.js';
import { getChordNotation } from '../../utils/chordHelpers.js';

/**
 * @param {Object} props
 * @param {Array<{chord: Object, reasons: string[]}>} props.suggestions
 * @param {number} props.targetBeat - Zero-based beat the suggestions are for
 * @param {number} props.tonic - Tonic pitch class, for Western chord names
 * @param {Function} props.onPlace - Called with the chosen chord
 * @param {Function} props.onPreview - Called with a chord to audition it
 */
export function ChordSuggestions({ suggestions, targetBeat, tonic = 0, onPlace, onPreview }) {
    if (!suggestions || suggestions.length === 0) return null;
    return (
        <div className="mt-3">
            <div className="text-xs text-gray-400 mb-1">Next for beat {targetBeat + 1}</div>
            <div className="flex flex-wrap gap-2">
                {suggestions.map(({ chord, reasons }) => (
                    <button
                        key={`${chord.root}-${chord.type}`}
                        type="button"
                        className="btn btn-sm btn-secondary"
                        title={reasons.join(', ')}
                        onMouseEnter={() => onPreview?.(chord)}
                        onClick={() => onPlace(chord)}
                    >
                        {getRomanNumeral(chord)} {getChordNotation(chord, tonic)}
                    </button>
                ))}
            </div>
        </div>
    );
}
