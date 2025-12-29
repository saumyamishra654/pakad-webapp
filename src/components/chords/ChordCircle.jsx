/**
 * ChordCircle Component
 * Circle of fifths visualization with chord arcs
 */

import React, { useMemo } from 'react';
import { getDisplayLabels } from '../../utils/noteHelpers.js';

/**
 * SVG Circle visualization for chords
 * @param {Object} props
 * @param {number[]} props.pattern - 12-element raga pattern
 * @param {Array} props.chords - Available chords to visualize
 * @param {Function} props.onNoteClick - Called when note clicked
 * @param {number} props.selectedNote - Currently selected/filtered note
 * @param {boolean} props.isCarnatic - Use Carnatic labels
 * @param {number} props.size - SVG size in pixels
 */
export function ChordCircle({
    pattern = [],
    chords = [],
    onNoteClick,
    selectedNote = null,
    isCarnatic = false,
    size = 300,
    className = ''
}) {
    const labels = useMemo(() => getDisplayLabels(isCarnatic), [isCarnatic]);

    const center = size / 2;
    const outerRadius = size * 0.42;
    const innerRadius = size * 0.25;
    const noteRadius = size * 0.38;

    // Calculate note positions around the circle
    const notePositions = useMemo(() => {
        return Array.from({ length: 12 }, (_, i) => {
            // Start from top (12 o'clock) and go clockwise
            const angle = (i * 30 - 90) * (Math.PI / 180);
            return {
                index: i,
                x: center + noteRadius * Math.cos(angle),
                y: center + noteRadius * Math.sin(angle),
                angle
            };
        });
    }, [center, noteRadius]);

    // Draw chord arcs connecting notes
    const chordArcs = useMemo(() => {
        if (!chords || chords.length === 0) return [];

        return chords.slice(0, 50).map((chord, idx) => {
            const notes = chord.notes || [];
            if (notes.length < 2) return null;

            // Create path connecting all chord notes
            const points = notes.map(n => notePositions[n]);
            const pathData = points.map((p, i) =>
                `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
            ).join(' ') + ' Z';

            return {
                id: `chord-${idx}`,
                path: pathData,
                color: chord.color || '#3b82f6',
                chord
            };
        }).filter(Boolean);
    }, [chords, notePositions]);

    const handleNoteClick = (noteIndex) => {
        if (onNoteClick) {
            onNoteClick(noteIndex);
        }
    };

    return (
        <div className={`chord-circle ${className}`}>
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className="mx-auto"
            >
                {/* Background circle */}
                <circle
                    cx={center}
                    cy={center}
                    r={outerRadius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    className="text-gray-200 dark:text-gray-700"
                />

                {/* Inner circle */}
                <circle
                    cx={center}
                    cy={center}
                    r={innerRadius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    className="text-gray-200 dark:text-gray-700"
                />

                {/* Chord polygons (behind notes) */}
                <g className="chord-preview" opacity="0.3">
                    {chordArcs.map(arc => (
                        <path
                            key={arc.id}
                            d={arc.path}
                            fill={arc.color}
                            fillOpacity="0.1"
                            stroke={arc.color}
                            strokeWidth="1"
                            strokeOpacity="0.5"
                        />
                    ))}
                </g>

                {/* Note circles and labels */}
                {notePositions.map(pos => {
                    const isInPattern = pattern[pos.index];
                    const isSelected = selectedNote === pos.index;

                    return (
                        <g key={pos.index}>
                            {/* Note circle */}
                            <circle
                                cx={pos.x}
                                cy={pos.y}
                                r={isSelected ? 20 : isInPattern ? 16 : 12}
                                fill={isInPattern ? '#3b82f6' : '#e5e7eb'}
                                stroke={isSelected ? '#facc15' : 'none'}
                                strokeWidth={isSelected ? 3 : 0}
                                className={`transition-all ${onNoteClick ? 'cursor-pointer hover:scale-110' : ''}`}
                                onClick={() => handleNoteClick(pos.index)}
                            />

                            {/* Note label */}
                            <text
                                x={pos.x}
                                y={pos.y}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fontSize={isInPattern ? 11 : 9}
                                fontWeight={isInPattern ? 'bold' : 'normal'}
                                fill={isInPattern ? 'white' : '#6b7280'}
                                className={onNoteClick ? 'cursor-pointer' : ''}
                                onClick={() => handleNoteClick(pos.index)}
                            >
                                {labels[pos.index]}
                            </text>
                        </g>
                    );
                })}

                {/* Center label */}
                <text
                    x={center}
                    y={center}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="14"
                    fontWeight="bold"
                    fill="currentColor"
                    className="text-gray-700 dark:text-gray-300"
                >
                    {chords.length} chords
                </text>
            </svg>
        </div>
    );
}

export default ChordCircle;
