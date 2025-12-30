/**
 * ChordCircle Component
 * Circle visualization for raga notes and chord connections - matches original design
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
 * @param {string} props.noteFilterMode - 'root', 'any', or 'none'
 * @param {boolean} props.isCarnatic - Use Carnatic labels
 * @param {number} props.size - SVG size in pixels
 */
export function ChordCircle({
    pattern = [],
    chords = [],
    onNoteClick,
    selectedNote = null,
    noteFilterMode = 'root',
    isCarnatic = false,
    size = 340,
    customNotes = null,
    hideLegend = false,
    hideClickHint = false,
    className = ''
}) {
    const labels = useMemo(() => getDisplayLabels(isCarnatic), [isCarnatic]);

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size * 0.35; // 120 for 340px

    // Calculate note position on outer ring
    const getPointPosition = (noteIndex) => {
        const angle = (noteIndex * 30 - 90) * (Math.PI / 180);
        return {
            x: centerX + (radius + 20) * Math.cos(angle),
            y: centerY + (radius + 20) * Math.sin(angle)
        };
    };

    // Get roots present in available chords
    const chordRoots = useMemo(() => {
        const roots = new Set();
        chords.forEach(chord => {
            if (chord.root !== undefined) roots.add(chord.root);
        });
        return roots;
    }, [chords]);

    // Get notes that appear in extended chords
    const extendedChordNotes = useMemo(() => {
        const notes = new Set();
        chords.forEach(chord => {
            if (chord.isExtended && chord.notes) {
                chord.notes.forEach(n => notes.add(n));
            }
        });
        return notes;
    }, [chords]);

    return (
        <div className={`flex flex-col items-center ${className}`}>
            {/* Click hint */}
            {onNoteClick && !hideClickHint && (
                <div className="flex items-center gap-2 mb-3 px-3 py-1 bg-blue-900/40 rounded-full">
                    <svg width="12" height="12" viewBox="0 0 12 12" className="text-blue-400">
                        <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="1" />
                        <circle cx="6" cy="6" r="2" fill="currentColor" />
                    </svg>
                    <span className="text-xs text-blue-300 font-medium">Click notes to filter chords</span>
                </div>
            )}

            <div className="relative">
                <svg width={size} height={size} className="chord-circle">
                    {/* Background circle */}
                    <circle
                        cx={centerX}
                        cy={centerY}
                        r={radius + 20}
                        fill="none"
                        stroke="#475569"
                        strokeWidth="2"
                    />

                    {/* Custom chord overlay */}
                    {customNotes && customNotes.length > 1 && (
                        <g className="chord-preview">
                            {customNotes.map((noteIndex, i) => {
                                const nextIndex = (i + 1) % customNotes.length;
                                const pos1 = getPointPosition(noteIndex);
                                const pos2 = getPointPosition(customNotes[nextIndex]);
                                return (
                                    <line
                                        key={`custom-${i}`}
                                        x1={pos1.x}
                                        y1={pos1.y}
                                        x2={pos2.x}
                                        y2={pos2.y}
                                        stroke="#f43f5e"
                                        strokeWidth="3"
                                        strokeDasharray="4,4"
                                    />
                                );
                            })}
                        </g>
                    )}


                    {/* Chord preview lines */}
                    {chords.slice(0, 50).map((chord, chordIndex) => (
                        <g key={chordIndex} className="chord-preview">
                            {chord.notes && chord.notes.map((noteIndex, i) => {
                                const nextIndex = (i + 1) % chord.notes.length;
                                if (chord.notes.length === 3 && i === chord.notes.length - 1) {
                                    // For triads, connect last to first
                                    const pos1 = getPointPosition(noteIndex);
                                    const pos2 = getPointPosition(chord.notes[0]);
                                    return (
                                        <line
                                            key={`${chordIndex}-${i}-close`}
                                            x1={pos1.x}
                                            y1={pos1.y}
                                            x2={pos2.x}
                                            y2={pos2.y}
                                            stroke={chord.color || '#3b82f6'}
                                            strokeWidth={chord.isExtended ? "3" : "2"}
                                            strokeDasharray={chord.isExtended ? "5,5" : "none"}
                                        />
                                    );
                                } else if (chord.notes.length > 3) {
                                    // For extended chords, create more complex shapes
                                    const pos1 = getPointPosition(noteIndex);
                                    const pos2 = getPointPosition(chord.notes[nextIndex]);
                                    return (
                                        <line
                                            key={`${chordIndex}-${i}`}
                                            x1={pos1.x}
                                            y1={pos1.y}
                                            x2={pos2.x}
                                            y2={pos2.y}
                                            stroke={chord.color || '#3b82f6'}
                                            strokeWidth="3"
                                            strokeDasharray="5,5"
                                        />
                                    );
                                } else if (i < chord.notes.length - 1) {
                                    // Regular connections
                                    const pos1 = getPointPosition(noteIndex);
                                    const pos2 = getPointPosition(chord.notes[nextIndex]);
                                    return (
                                        <line
                                            key={`${chordIndex}-${i}`}
                                            x1={pos1.x}
                                            y1={pos1.y}
                                            x2={pos2.x}
                                            y2={pos2.y}
                                            stroke={chord.color || '#3b82f6'}
                                            strokeWidth="2"
                                        />
                                    );
                                }
                                return null;
                            })}
                        </g>
                    ))}

                    {/* Note dots */}
                    {labels.map((swara, index) => {
                        const pos = getPointPosition(index);
                        const isPresent = pattern[index];
                        const isRoot = chordRoots.has(index);
                        const isSelected = selectedNote === index;
                        const isInExtendedChord = extendedChordNotes.has(index);

                        // Determine fill color based on state
                        let fillColor;
                        if (isSelected) {
                            fillColor = noteFilterMode === 'root' ? '#9333ea' : '#dc2626'; // Purple for root, red for any
                        } else if (isPresent) {
                            if (isRoot) {
                                fillColor = '#f59e0b'; // Amber for chord roots
                            } else if (isInExtendedChord) {
                                fillColor = '#fbbf24'; // Light amber for extended chord notes
                            } else {
                                fillColor = '#10b981'; // Green for available notes
                            }
                        } else {
                            fillColor = '#475569'; // Gray for unavailable
                        }

                        // Determine stroke color
                        let strokeColor;
                        if (isSelected) {
                            strokeColor = noteFilterMode === 'root' ? '#e9d5ff' : '#fecaca';
                        } else {
                            strokeColor = isPresent ? '#ffffff' : '#64748b';
                        }

                        return (
                            <g key={index}>
                                <circle
                                    cx={pos.x}
                                    cy={pos.y}
                                    r={isPresent ? (isRoot ? 14 : 12) : 12}
                                    fill={fillColor}
                                    stroke={strokeColor}
                                    strokeWidth={isSelected ? "3" : "2"}
                                    className="note-dot cursor-pointer hover:opacity-80"
                                    onClick={() => onNoteClick && onNoteClick(index)}
                                    style={{ cursor: onNoteClick ? 'pointer' : 'default' }}
                                />
                                <text
                                    x={pos.x}
                                    y={pos.y + 4}
                                    textAnchor="middle"
                                    fontSize={isRoot ? "9" : "10"}
                                    fill="#cbd5e1"
                                    fontWeight="bold"
                                >
                                    {swara}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </div>

            {/* Legend */}
            {!hideLegend && (
                <div className="mt-4 text-center">
                    <div className="flex items-center justify-center gap-4 text-sm flex-wrap">
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span className="text-gray-400">Available Notes</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                            <span className="text-gray-400">Chord Roots</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                            <span className="text-gray-400">Any Position</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
                            <span className="text-gray-400">As Root Only</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ChordCircle;
