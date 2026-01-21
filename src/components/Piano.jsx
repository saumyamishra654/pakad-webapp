import React, { useRef, useEffect } from 'react';

const Piano = ({ activeNotes = [], onNoteClick, rootNote = 0, ragaNotes = [], showRagaNotes = false }) => {
    const wrapRef = useRef(null);

    useEffect(() => {
        const el = wrapRef.current;
        if (el) {
            const target = Math.max(0, (el.scrollWidth - el.clientWidth) / 2);
            el.scrollLeft = target;
        }
    }, []);

    const octaveSequence = [3, 4, 5];
    const WHITE_W = 24;
    const BLACK_W = 16;
    
    const whitePC = [0, 2, 4, 5, 7, 9, 11];
    const blackPC = [1, 3, 6, 8, 10];
    
    // Black key positions relative to the start of the octave
    const blackLefts = [
        WHITE_W - BLACK_W / 2,      // C# (between C and D)
        WHITE_W * 2 - BLACK_W / 2,  // D# (between D and E)
        WHITE_W * 4 - BLACK_W / 2,  // F# (between F and G)
        WHITE_W * 5 - BLACK_W / 2,  // G# (between G and A)
        WHITE_W * 6 - BLACK_W / 2   // A# (between A and B)
    ];

    const shortSwarLabels = ['S', 'r', 'R', 'g', 'G', 'm', 'M', 'P', 'd', 'D', 'n', 'N'];

    const getSwarLabel = (pc) => {
        if (rootNote === null || rootNote === undefined) return null;
        const relative = (pc - rootNote + 12) % 12;
        return shortSwarLabels[relative];
    };

    const isRagaNote = (pc) => {
        if (!showRagaNotes || !ragaNotes || ragaNotes.length === 0) return false;
        const relative = (pc - rootNote + 12) % 12;
        return ragaNotes[relative] === 1;
    };

    return (
        <div ref={wrapRef} className="piano-wrap">
            <div className="piano" style={{ width: `${WHITE_W * 7 * octaveSequence.length}px` }}>
                {octaveSequence.map((octaveValue) => (
                    <div key={octaveValue} className="octave" style={{ width: `${WHITE_W * 7}px` }}>
                        {/* White Keys */}
                        <div className="white-keys">
                            {whitePC.map((pc, i) => {
                                const isHighlighted = isRagaNote(pc);
                                const isActive = activeNotes.includes(pc);
                                const swarLabel = isHighlighted ? getSwarLabel(pc) : null;
                                
                                return (
                                    <div
                                        key={i}
                                        onMouseDown={() => onNoteClick && onNoteClick(pc, octaveValue)}
                                        onTouchStart={(e) => { e.preventDefault(); onNoteClick && onNoteClick(pc, octaveValue); }}
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
                                );
                            })}
                        </div>
                        
                        {/* Black Keys */}
                        {blackPC.map((pc, idx) => {
                            const isHighlighted = isRagaNote(pc);
                            const isActive = activeNotes.includes(pc);
                            const swarLabel = isHighlighted ? getSwarLabel(pc) : null;
                            
                            return (
                                <div
                                    key={idx}
                                    onMouseDown={(e) => { e.stopPropagation(); onNoteClick && onNoteClick(pc, octaveValue); }}
                                    onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); onNoteClick && onNoteClick(pc, octaveValue); }}
                                    className={`black-key ${isActive ? 'active' : ''}`}
                                    style={{ 
                                        left: `${blackLefts[idx]}px`
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
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Piano;
