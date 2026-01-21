import React, { useMemo } from 'react';
import { swarNames } from '../utils/musicTheory';

const ProgressionTimeline = ({
    activeTrack,
    cycleBeats,
    onUpdateTrack,
    onPlayArpeggio,
    customBreakpoints = '4-4'
}) => {
    const getBreakpointPositions = () => {
        try {
            const parts = customBreakpoints.split('-').map(p => parseInt(p)).filter(p => !isNaN(p));
            let current = 0;
            const positions = [];
            for (let i = 0; i < parts.length - 1; i++) {
                current += parts[i];
                positions.push(current - 1);
            }
            return positions;
        } catch (e) {
            return [];
        }
    };

    const breakpointPositions = useMemo(getBreakpointPositions, [customBreakpoints]);

    const handleDrop = (e, beatIndex) => {
        e.preventDefault();
        try {
            const data = e.dataTransfer.getData('application/json');
            if (!data) return;
            const chord = JSON.parse(data);

            // Filter out any existing chords at this beat position
            const updatedChords = activeTrack.chords.filter(
                item => Math.floor(item.beat) !== beatIndex
            );

            // Add the new chord
            onUpdateTrack({
                chords: [...updatedChords, {
                    id: Date.now(),
                    chord,
                    beat: beatIndex,
                    duration: 1
                }]
            });
        } catch (err) {
            console.error("Drop error:", err);
        }
    };

    const handleRemoveChord = (e, chordId) => {
        e.stopPropagation();
        onUpdateTrack({
            chords: activeTrack.chords.filter(c => c.id !== chordId)
        });
    };

    // Responsive layout logic
    const beatsPerRow = cycleBeats <= 10 ? cycleBeats : Math.ceil(cycleBeats / 2);
    const rows = cycleBeats <= 10 ? 1 : 2;

    return (
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 shadow-inner">
            <div className="space-y-4">
                {Array.from({ length: rows }).map((_, rowIndex) => {
                    const startBeat = rowIndex * beatsPerRow;
                    const endBeat = Math.min(startBeat + beatsPerRow, cycleBeats);
                    const beatsInRow = endBeat - startBeat;

                    return (
                        <div key={rowIndex} className="flex gap-2">
                            {Array.from({ length: beatsInRow }).map((_, indexInRow) => {
                                const beatIndex = startBeat + indexInRow;
                                const isCurrentBeat = activeTrack.isPlaying && activeTrack.currentBeat === beatIndex;
                                const chordsOnBeat = activeTrack.chords.filter(item => Math.floor(item.beat) === beatIndex);
                                const isBreakpoint = breakpointPositions.includes(beatIndex) && beatIndex !== cycleBeats - 1;

                                return (
                                    <div
                                        key={beatIndex}
                                        className={`flex-1 min-w-[50px] min-h-[60px] border-2 rounded-lg p-1.5 transition-all relative ${isCurrentBeat
                                            ? 'bg-blue-600/30 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                                            : beatIndex === 0
                                                ? 'bg-blue-900/20 border-blue-800/50'
                                                : 'bg-gray-900/40 border-gray-700/50'
                                            } ${isBreakpoint ? 'mr-3 border-r-indigo-500/50' : ''}`}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={(e) => handleDrop(e, beatIndex)}
                                    >
                                        <div className="text-[9px] text-gray-500 font-bold mb-1">
                                            {beatIndex + 1}
                                        </div>

                                        <div className="space-y-1">
                                            {chordsOnBeat.map(item => {
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
                                                            onClick={(e) => handleRemoveChord(e, item.id)}
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
                            })}
                        </div>
                    );
                })}
            </div>

            <div className="mt-3 flex justify-between items-center text-[10px] text-gray-500 font-medium italic">
                <span>Drag chords from the list below onto beats</span>
                {activeTrack.isPlaying && (
                    <span className="flex items-center gap-1 text-blue-400 not-italic uppercase tracking-wider animate-pulse">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                        Playback Active: Beat {activeTrack.currentBeat + 1}
                    </span>
                )}
            </div>
        </div>
    );
};

export default ProgressionTimeline;
