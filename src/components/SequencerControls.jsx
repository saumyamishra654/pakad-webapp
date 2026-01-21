import React from 'react';

const SequencerControls = ({
    rhythmProgressions,
    activeTrackId,
    onSetActiveTrack,
    cycleBeats,
    onSetCycleBeats,
    cycleBpm,
    onSetCycleBpm,
    cycleLoop,
    onSetCycleLoop,
    customBreakpoints,
    onSetCustomBreakpoints,
    onStart,
    onStop,
    onClear,
    onDownloadMIDI,
    isPlaying
}) => {
    const activeTrack = rhythmProgressions.find(t => t.id === activeTrackId);

    // Validate breakpoints pattern
    const validateBreakpoints = (pattern) => {
        if (!/^[\d-]+$/.test(pattern)) return { valid: false, error: 'Only numbers and hyphens' };
        const parts = pattern.split('-').filter(p => p.length > 0);
        if (parts.length === 0) return { valid: false, error: 'Invalid pattern' };
        const numbers = parts.map(p => parseInt(p, 10));
        if (numbers.some(n => isNaN(n) || n <= 0)) return { valid: false, error: 'Positive numbers only' };
        const sum = numbers.reduce((a, b) => a + b, 0);
        if (sum !== cycleBeats) return { valid: false, error: `Sum must = ${cycleBeats}` };
        return { valid: true };
    };

    const breakpointValidation = validateBreakpoints(customBreakpoints);

    return (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 shadow-lg">
            <div className="flex flex-col gap-4">
                {/* Track Selection and Main Controls */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2 bg-gray-900/50 p-1 rounded-lg border border-gray-700">
                        {rhythmProgressions.map(track => (
                            <button
                                key={track.id}
                                onClick={() => onSetActiveTrack(track.id)}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${activeTrackId === track.id
                                    ? 'bg-blue-600 text-white shadow-lg'
                                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                                    }`}
                            >
                                Track {track.name}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        {!isPlaying ? (
                            <button
                                onClick={onStart}
                                className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-bold uppercase tracking-widest shadow-lg shadow-green-900/20 transition-all active:scale-95"
                            >
                                ▶ Play
                            </button>
                        ) : (
                            <button
                                onClick={onStop}
                                className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold uppercase tracking-widest shadow-lg shadow-red-900/20 transition-all active:scale-95 animate-pulse"
                            >
                                ⏹ Stop
                            </button>
                        )}
                        <button
                            onClick={onClear}
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
                        >
                            Clear
                        </button>
                        <button
                            onClick={onDownloadMIDI}
                            disabled={!activeTrack?.chords?.length}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
                        >
                            MIDI ↓
                        </button>
                    </div>
                </div>

                {/* Parameters */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-4 border-t border-gray-700">
                    <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 font-bold uppercase">Beats</label>
                        <input
                            type="number" min="2" max="32" step="1"
                            value={cycleBeats}
                            onChange={(e) => onSetCycleBeats(parseInt(e.target.value) || 8)}
                            className="w-full px-2 py-1.5 bg-gray-900 border border-gray-600 rounded text-sm text-gray-200 text-center"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 font-bold uppercase">BPM</label>
                        <input
                            type="number" min="40" max="240" step="1"
                            value={cycleBpm}
                            onChange={(e) => onSetCycleBpm(parseInt(e.target.value) || 120)}
                            className="w-full px-2 py-1.5 bg-gray-900 border border-gray-600 rounded text-sm text-gray-200 text-center"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 font-bold uppercase">Divisions</label>
                        <input
                            type="text"
                            value={customBreakpoints}
                            onChange={(e) => onSetCustomBreakpoints(e.target.value)}
                            placeholder="4-4"
                            className={`w-full px-2 py-1.5 bg-gray-900 border rounded text-sm text-gray-200 text-center ${!breakpointValidation.valid ? 'border-red-500' : 'border-gray-600'
                                }`}
                            title="Beat groupings (e.g., 4-4, 3-3-2)"
                        />
                        {!breakpointValidation.valid && (
                            <p className="text-[9px] text-red-400">{breakpointValidation.error}</p>
                        )}
                    </div>

                    <div className="flex items-center gap-2 self-end pb-1">
                        <label className="inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={cycleLoop}
                                onChange={(e) => onSetCycleLoop(e.target.checked)}
                                className="form-checkbox h-4 w-4 text-blue-500 rounded border-gray-600 bg-gray-900 focus:ring-0"
                            />
                            <span className="ml-2 text-[10px] text-gray-400 font-bold uppercase">Loop</span>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SequencerControls;
