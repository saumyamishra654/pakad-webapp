import React, { useRef, useEffect, memo, useCallback } from 'react';

// Constants moved outside component to prevent recreation
const OCTAVE_SEQUENCE = [3, 4, 5];
const WHITE_W = 24;
const BLACK_W = 16;
const WHITE_PC = [0, 2, 4, 5, 7, 9, 11];
const BLACK_PC = [1, 3, 6, 8, 10];

// Black key positions relative to the start of the octave
const BLACK_LEFTS = [
    WHITE_W - BLACK_W / 2,      // C# (between C and D)
    WHITE_W * 2 - BLACK_W / 2,  // D# (between D and E)
    WHITE_W * 4 - BLACK_W / 2,  // F# (between F and G)
    WHITE_W * 5 - BLACK_W / 2,  // G# (between G and A)
    WHITE_W * 6 - BLACK_W / 2   // A# (between A and B)
];

const SHORT_SWAR_LABELS = ['S', 'r', 'R', 'g', 'G', 'm', 'M', 'P', 'd', 'D', 'n', 'N'];

const getSwarLabel = (pc, rootNote) => {
    if (rootNote === null || rootNote === undefined) return null;
    const relative = (pc - rootNote + 12) % 12;
    return SHORT_SWAR_LABELS[relative];
};

// Extracted and Memoized Key Components
const WhiteKey = memo(({ pc, octaveValue, isActive, isHighlighted, swarLabel, onNoteClick }) => (
    <div
        onMouseDown={() => onNoteClick(pc, octaveValue)}
        onTouchStart={(e) => { e.preventDefault(); onNoteClick(pc, octaveValue); }}
        className={`white-key ${isActive ? 'active' : ''}`}
        role="button"
        aria-label={`Play ${pc} at octave ${octaveValue}`}
    >
        {isHighlighted && (
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center text-[9px] font-bold z-10 shadow-sm">
                {swarLabel}
            </div>
        )}
    </div>
));

const BlackKey = memo(({ pc, octaveValue, isActive, isHighlighted, swarLabel, index, onNoteClick }) => (
    <div
        onMouseDown={(e) => { e.stopPropagation(); onNoteClick(pc, octaveValue); }}
        onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); onNoteClick(pc, octaveValue); }}
        className={`black-key ${isActive ? 'active' : ''}`}
        style={{
            left: `${BLACK_LEFTS[index]}px`
        }}
        role="button"
        aria-label={`Play ${pc} at octave ${octaveValue}`}
    >
        {isHighlighted && (
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-red-600 text-white flex items-center justify-center text-[8px] font-bold z-30 shadow-sm">
                {swarLabel}
            </div>
        )}
    </div>
));

const Piano = ({ activeNotes = [], onNoteClick, rootNote = 0, ragaNotes = [], showRagaNotes = false }) => {
    const wrapRef = useRef(null);

    useEffect(() => {
        const el = wrapRef.current;
        if (el) {
            const target = Math.max(0, (el.scrollWidth - el.clientWidth) / 2);
            el.scrollLeft = target;
        }
    }, []);

    // Memoize callback to ensure props passed to React.memo(Key) are stable
    const handleNoteClick = useCallback((pc, oct) => {
        if (onNoteClick) onNoteClick(pc, oct);
    }, [onNoteClick]);

    // Helper to check if a specific key should be active
    const checkActive = (pc, octaveValue) => {
        return activeNotes.some(note => {
            if (typeof note === 'number') return note === pc; // Legacy/Generic Pitch Class Match
            return note.pc === pc && note.oct === octaveValue; // Specific Key Match
        });
    };

    return (
        <div ref={wrapRef} className="piano-wrap">
            <div className="piano" style={{ width: `${WHITE_W * 7 * OCTAVE_SEQUENCE.length}px` }}>
                {OCTAVE_SEQUENCE.map((octaveValue) => (
                    <div key={octaveValue} className="octave" style={{ width: `${WHITE_W * 7}px` }}>
                        {/* White Keys */}
                        <div className="white-keys">
                            {WHITE_PC.map((pc, i) => {
                                const isHighlighted = showRagaNotes && ragaNotes.length > 0 && ragaNotes[(pc - rootNote + 12) % 12] === 1;
                                const isActive = checkActive(pc, octaveValue);
                                const swarLabel = isHighlighted ? getSwarLabel(pc, rootNote) : null;

                                return (
                                    <WhiteKey
                                        key={i}
                                        pc={pc}
                                        octaveValue={octaveValue}
                                        isActive={isActive}
                                        isHighlighted={isHighlighted}
                                        swarLabel={swarLabel}
                                        onNoteClick={handleNoteClick}
                                    />
                                );
                            })}
                        </div>

                        {/* Black Keys */}
                        {BLACK_PC.map((pc, idx) => {
                            const isHighlighted = showRagaNotes && ragaNotes.length > 0 && ragaNotes[(pc - rootNote + 12) % 12] === 1;
                            const isActive = checkActive(pc, octaveValue);
                            const swarLabel = isHighlighted ? getSwarLabel(pc, rootNote) : null;

                            return (
                                <BlackKey
                                    key={idx}
                                    pc={pc}
                                    octaveValue={octaveValue}
                                    isActive={isActive}
                                    isHighlighted={isHighlighted}
                                    swarLabel={swarLabel}
                                    index={idx}
                                    onNoteClick={handleNoteClick}
                                />
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Piano;
