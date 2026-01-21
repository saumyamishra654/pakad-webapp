import React, { memo } from 'react';

const BeatCell = memo(({
    beatIndex,
    isCurrentBeat,
    chords,
    isBreakpoint,
    onDrop,
    onPlayArpeggio,
    onRemoveChord,
    currentBeat // Used for debugging or display if needed, but mainly isCurrentBeat covers the state
}) => {
    return (
        <div
            className={`flex-1 min-w-[50px] min-h-[60px] border-2 rounded-lg p-1.5 transition-all relative ${isCurrentBeat
                ? 'bg-blue-600/30 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                : beatIndex === 0
                    ? 'bg-blue-900/20 border-blue-800/50'
                    : 'bg-gray-900/40 border-gray-700/50'
                } ${isBreakpoint ? 'mr-3 border-r-indigo-500/50' : ''}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(e, beatIndex)}
        >
            <div className="text-[9px] text-gray-500 font-bold mb-1">
                {beatIndex + 1}
            </div>

            <div className="space-y-1">
                {chords.map(item => {
                    const chordType = item.chord.type || {};
                    const bgColor = chordType.color || '#3b82f6';
                    return (
                        <div
                            key={item.id}
                            className="group bg-gray-800 border rounded p-1 text-[9px] relative cursor-pointer hover:border-gray-500 transition-all active:scale-95"
                            style={{ borderLeftWidth: '3px', borderLeftColor: bgColor }}
                            onClick={() => onPlayArpeggio(item.chord)}
                            title="Click to play"
                        >
                            <div className="font-bold text-gray-200 truncate pr-3 leading-tight">
                                {item.chord.westernName || `${item.chord.rootName} ${chordType.name || ''}`}
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemoveChord(item.id);
                                }}
                                className="absolute top-0.5 right-0.5 w-3 h-3 bg-red-500/80 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-[8px] opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                ×
                            </button>
                        </div>
                    );
                })}
            </div>

            {isBreakpoint && (
                <div className="absolute top-0 -right-2 w-1 h-full bg-indigo-500/20 rounded-full" />
            )}
        </div>
    );
});

export default BeatCell;
