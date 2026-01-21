import React, { useMemo, useCallback } from 'react';
import BeatCell from './BeatCell';

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

    // Performance Optimization: Create a lookup map for chords by beat
    // This avoids filtering the entire chord list for every beat render O(N) -> O(1)
    const chordsByBeat = useMemo(() => {
        const map = new Map();
        if (activeTrack && activeTrack.chords) {
            activeTrack.chords.forEach(item => {
                const beatIndex = Math.floor(item.beat);
                if (!map.has(beatIndex)) {
                    map.set(beatIndex, []);
                }
                map.get(beatIndex).push(item);
            });
        }
        return map;
    }, [activeTrack.chords]);

    const handleDrop = useCallback((e, beatIndex) => {
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
    }, [activeTrack.chords, onUpdateTrack]);

    const handleRemoveChord = useCallback((chordId) => {
        onUpdateTrack({
            chords: activeTrack.chords.filter(c => c.id !== chordId)
        });
    }, [activeTrack.chords, onUpdateTrack]);

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
                                const chordsOnBeat = chordsByBeat.get(beatIndex) || [];
                                const isBreakpoint = breakpointPositions.includes(beatIndex) && beatIndex !== cycleBeats - 1;

                                return (
                                    <BeatCell
                                        key={beatIndex}
                                        beatIndex={beatIndex}
                                        isCurrentBeat={isCurrentBeat}
                                        chords={chordsOnBeat}
                                        isBreakpoint={isBreakpoint}
                                        onDrop={handleDrop}
                                        onPlayArpeggio={onPlayArpeggio}
                                        onRemoveChord={handleRemoveChord}
                                    />
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
