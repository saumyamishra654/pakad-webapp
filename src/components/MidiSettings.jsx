import React from 'react';

const MIDI_PROGRAMS = [
    { p: 0, name: 'Acoustic Grand Piano' },
    { p: 24, name: 'Nylon Acoustic Guitar' },
    { p: 25, name: 'Steel Acoustic Guitar' },
    { p: 32, name: 'Acoustic Bass' },
    { p: 40, name: 'Violin' },
    { p: 41, name: 'Viola' },
    { p: 42, name: 'Cello' },
    { p: 56, name: 'Trumpet' },
    { p: 65, name: 'Alto Sax' },
    { p: 73, name: 'Flute' },
];

const MidiSettings = ({
    midiProgram, onSetMidiProgram,
    midiVelocity, onSetMidiVelocity,
    midiChannel, onSetMidiChannel,
    midiNoteLengthBeats, onSetMidiNoteLengthBeats,
    midiGapBeats, onSetMidiGapBeats,
    onExportJson
}) => {
    return (
        <div className="p-4 bg-gray-900/80 rounded-xl border border-gray-700 space-y-4 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-300">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-800 pb-2">
                Engineering & MIDI Settings
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 font-bold uppercase">Program (Instrument)</label>
                    <input
                        type="number" min="0" max="127"
                        value={midiProgram}
                        onChange={(e) => onSetMidiProgram(parseInt(e.target.value) || 0)}
                        className="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs text-gray-200 focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 font-bold uppercase">Velocity ({midiVelocity})</label>
                    <input
                        type="range" min="1" max="127" step="1"
                        value={midiVelocity}
                        onChange={(e) => onSetMidiVelocity(parseInt(e.target.value))}
                        className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500 mt-3"
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 font-bold uppercase">MIDI Channel</label>
                    <input
                        type="number" min="1" max="16"
                        value={midiChannel}
                        onChange={(e) => onSetMidiChannel(parseInt(e.target.value) || 1)}
                        className="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs text-gray-200 focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 font-bold uppercase">Note Length (beats)</label>
                    <input
                        type="number" min="0.1" max="64" step="0.1"
                        value={midiNoteLengthBeats}
                        onChange={(e) => onSetMidiNoteLengthBeats(parseFloat(e.target.value) || 3.2)}
                        className="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs text-gray-200 focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 font-bold uppercase">Gap (beats)</label>
                    <input
                        type="number" min="0" max="16" step="0.1"
                        value={midiGapBeats}
                        onChange={(e) => onSetMidiGapBeats(parseFloat(e.target.value) || 0)}
                        className="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs text-gray-200 focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                </div>
            </div>

            <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Common Programs</h4>
                    <button
                        onClick={onExportJson}
                        className="flex items-center gap-1.5 px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-600/30 rounded text-[9px] font-black uppercase tracking-tighter transition-all"
                        title="Export all tracks as JSON"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Export Project Data (.json)
                    </button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {MIDI_PROGRAMS.map(item => (
                        <button
                            key={item.p}
                            onClick={() => onSetMidiProgram(item.p)}
                            className={`px-2 py-1 rounded text-[9px] font-bold uppercase transition-all border ${midiProgram === item.p
                                ? 'bg-blue-600 border-blue-400 text-white shadow-lg'
                                : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                                }`}
                        >
                            {item.p}: {item.name}
                        </button>
                    ))}
                </div>
            </div>

            <div className="text-[9px] text-gray-500 italic mt-2 py-2 border-t border-gray-800/50">
                Chord progression MIDI includes tempo meta, Format 0 single-track, and program change.
            </div>
        </div>
    );
};

export default MidiSettings;
