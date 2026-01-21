import React, { useMemo } from 'react';
import { swarNames, carnaticLabels } from '../utils/musicTheory';

const RADIUS = 120;
const CENTER_X = 170;
const CENTER_Y = 170;

const getPointPosition = (index, r = RADIUS) => {
    const angle = (index * 30 - 90) * (Math.PI / 180);
    return {
        x: CENTER_X + r * Math.cos(angle),
        y: CENTER_Y + r * Math.sin(angle)
    };
};

const CircleRenderer = ({
    notesPattern,
    circleTitle,
    chordsForCircle,
    displaySwarNames,
    onNoteClick,
    selectedNote
}) => {
    return (
        <div className="flex flex-col items-center">
            {circleTitle && <h4 className="text-sm font-medium text-gray-300 mb-2">{circleTitle}</h4>}
            <svg width="340" height="340" className="chord-circle" style={{ filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15))' }}>
                {/* Background circle */}
                <circle
                    cx={CENTER_X}
                    cy={CENTER_Y}
                    r={RADIUS + 20}
                    fill="none"
                    stroke="#475569"
                    strokeWidth="2"
                />

                {/* Chord preview lines */}
                {chordsForCircle.map((chord, chordIndex) => (
                    <g key={chordIndex} className="chord-preview" style={{ opacity: 0.4 }}>
                        {chord.notes.map((noteIndex, i) => {
                            const nextIndex = (i + 1) % chord.notes.length;
                            const pos1 = getPointPosition(noteIndex);
                            let pos2 = getPointPosition(chord.notes[nextIndex]);

                            if (chord.notes.length === 3 && i === chord.notes.length - 1) {
                                // For triads, connect last to first
                                pos2 = getPointPosition(chord.notes[0]);
                                return (
                                    <line
                                        key={`${i}-close`}
                                        x1={pos1.x}
                                        y1={pos1.y}
                                        x2={pos2.x}
                                        y2={pos2.y}
                                        stroke={chord.type.color}
                                        strokeWidth={chord.isExtended ? "3" : "2"}
                                        strokeDasharray={chord.isExtended ? "5,5" : "none"}
                                    />
                                );
                            } else if (chord.notes.length > 3) {
                                // For extended chords, create more complex shapes
                                return (
                                    <line
                                        key={i}
                                        x1={pos1.x}
                                        y1={pos1.y}
                                        x2={pos2.x}
                                        y2={pos2.y}
                                        stroke={chord.type.color}
                                        strokeWidth="3"
                                        strokeDasharray="5,5"
                                    />
                                );
                            } else if (i < chord.notes.length - 1) {
                                // Regular connections
                                return (
                                    <line
                                        key={i}
                                        x1={pos1.x}
                                        y1={pos1.y}
                                        x2={pos2.x}
                                        y2={pos2.y}
                                        stroke={chord.type.color}
                                        strokeWidth="2"
                                    />
                                );
                            }
                            return null;
                        })}
                    </g>
                ))}

                {/* Note dots */}
                {displaySwarNames.map((swara, index) => {
                    const pos = getPointPosition(index, RADIUS + 20);
                    const isPresent = notesPattern && notesPattern[index];
                    const isRoot = chordsForCircle.some(chord => chord.root === index);
                    const isSelected = selectedNote === index;
                    const isInExtendedChord = chordsForCircle.some(chord =>
                        chord.isExtended && chord.notes.includes(index)
                    );

                    return (
                        <g key={index}>
                            <circle
                                cx={pos.x}
                                cy={pos.y}
                                r={isPresent ? (isRoot ? 14 : 12) : 12}
                                fill={isSelected ? "#9333ea" :
                                    isPresent ?
                                        (isRoot ? "#f59e0b" :
                                            isInExtendedChord ? "#fbbf24" : "#10b981") :
                                        ("#475569")}
                                stroke={isSelected ? "#e9d5ff" :
                                    (isPresent ? "#ffffff" : "#64748b")}
                                strokeWidth={isSelected ? "3" : "2"}
                                className="note-dot cursor-pointer hover:opacity-80 transition-opacity"
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
                                style={{ pointerEvents: 'none' }}
                            >
                                {swara}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};

const RagaCircle = ({
    notes,
    title = "Raga Notes",
    availableChords = [],
    onNoteClick = null,
    selectedNote = null,
    isCarnaticMode = false,
    aarohaPattern = null,
    avrohaPattern = null,
    separateAarohAvroh = false
}) => {
    const displaySwarNames = isCarnaticMode ? carnaticLabels : swarNames;
    const hasSeparatePatterns = !!separateAarohAvroh && !!aarohaPattern && !!avrohaPattern;

    const aarohaChords = useMemo(() =>
        hasSeparatePatterns
            ? availableChords.filter(c => c.source === 'Aaroha' || c.source === 'Both')
            : availableChords,
        [hasSeparatePatterns, availableChords]
    );

    const avrohaChords = useMemo(() =>
        hasSeparatePatterns
            ? availableChords.filter(c => c.source === 'Avroha' || c.source === 'Both')
            : availableChords,
        [hasSeparatePatterns, availableChords]
    );

    return (
        <div className="flex flex-col items-center">
            <h3 className="text-lg font-semibold text-gray-200 mb-2">{title}</h3>
            {onNoteClick && (
                <div className="flex items-center gap-2 mb-3 px-3 py-1 bg-blue-900/30 rounded-full border border-blue-700">
                    <svg width="12" height="12" viewBox="0 0 12 12" className="text-blue-400">
                        <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="1" />
                        <circle cx="6" cy="6" r="2" fill="currentColor" />
                    </svg>
                    <span className="text-xs text-blue-300 font-medium">Click notes to filter chords</span>
                </div>
            )}

            {hasSeparatePatterns ? (
                <div className="flex flex-col lg:flex-row gap-8 items-center justify-center">
                    <CircleRenderer
                        notesPattern={aarohaPattern}
                        circleTitle="Aaroha (Ascending)"
                        chordsForCircle={aarohaChords}
                        displaySwarNames={displaySwarNames}
                        onNoteClick={onNoteClick}
                        selectedNote={selectedNote}
                    />
                    <CircleRenderer
                        notesPattern={avrohaPattern}
                        circleTitle="Avroha (Descending)"
                        chordsForCircle={avrohaChords}
                        displaySwarNames={displaySwarNames}
                        onNoteClick={onNoteClick}
                        selectedNote={selectedNote}
                    />
                </div>
            ) : (
                <div className="relative">
                    <CircleRenderer
                        notesPattern={notes}
                        circleTitle={null}
                        chordsForCircle={availableChords}
                        displaySwarNames={displaySwarNames}
                        onNoteClick={onNoteClick}
                        selectedNote={selectedNote}
                    />
                </div>
            )}

            {/* Legend */}
            <div className="mt-4 text-center">
                <div className="flex items-center justify-center gap-4 text-xs flex-wrap">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-[#10b981] border-2 border-white"></div>
                        <span className="text-gray-300">Raga Note</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-[#f59e0b] border-2 border-white"></div>
                        <span className="text-gray-300">Chord Root</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-[#fbbf24] border-2 border-white"></div>
                        <span className="text-gray-300">Extended</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-[#475569] border-2 border-[#64748b]"></div>
                        <span className="text-gray-300">Not in Raga</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RagaCircle;
