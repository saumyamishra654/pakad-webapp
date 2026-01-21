import React, { useState } from 'react';
import SequencerControls from './SequencerControls';
import ProgressionTimeline from './ProgressionTimeline';
import MidiSettings from './MidiSettings';

/**
 * CompositionPanel - Unified component containing:
 * - Chord Progression Builder header
 * - Sequencer Controls (track tabs, play/stop, beats, BPM)
 * - Engineering & MIDI Settings toggle + panel
 * - Progression Timeline (drag-drop beats)
 */
const CompositionPanel = ({
    // Track state
    rhythmProgressions,
    activeTrackId,
    onSetActiveTrack,
    activeTrack,
    onUpdateTrack,

    // Cycle settings
    cycleBeats,
    onSetCycleBeats,
    cycleBpm,
    onSetCycleBpm,
    cycleLoop,
    onSetCycleLoop,
    customBreakpoints,
    onSetCustomBreakpoints,

    // Playback
    isPlaying,
    onStart,
    onStop,
    onClear,

    // MIDI
    midiProgram,
    onSetMidiProgram,
    midiVelocity,
    onSetMidiVelocity,
    midiChannel,
    onSetMidiChannel,
    midiNoteLengthBeats,
    onSetMidiNoteLengthBeats,
    midiGapBeats,
    onSetMidiGapBeats,
    onDownloadMIDI,
    onExportJson,

    // Chord interaction
    onPlayArpeggio
}) => {
    const [showMidiSettings, setShowMidiSettings] = useState(false);

    return (
        <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 rounded-2xl border border-gray-700/50 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-700/50 bg-gray-900/50">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-100 tracking-tight flex items-center gap-2">
                        <span className="w-1.5 h-5 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full"></span>
                        Chord Progression Builder
                    </h2>
                    <div className="flex items-center gap-3">
                        <span className="text-[9px] text-gray-500 uppercase font-black tracking-widest bg-gray-800/80 px-2 py-1 rounded border border-gray-700/50">
                            Multi-Track
                        </span>
                        <button
                            onClick={() => setShowMidiSettings(!showMidiSettings)}
                            className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all border ${showMidiSettings
                                ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/20'
                                : 'bg-gray-800/80 border-gray-700/50 text-gray-400 hover:text-gray-200 hover:border-gray-600'
                                }`}
                        >
                            {showMidiSettings ? '✕ Close' : '⚙ Engineering & MIDI'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="p-5 space-y-4">
                {/* Sequencer Controls */}
                <SequencerControls
                    rhythmProgressions={rhythmProgressions}
                    activeTrackId={activeTrackId}
                    onSetActiveTrack={onSetActiveTrack}
                    cycleBeats={cycleBeats}
                    onSetCycleBeats={onSetCycleBeats}
                    cycleBpm={cycleBpm}
                    onSetCycleBpm={onSetCycleBpm}
                    cycleLoop={cycleLoop}
                    onSetCycleLoop={onSetCycleLoop}
                    customBreakpoints={customBreakpoints}
                    onSetCustomBreakpoints={onSetCustomBreakpoints}
                    onStart={onStart}
                    onStop={onStop}
                    onClear={onClear}
                    onDownloadMIDI={onDownloadMIDI}
                    isPlaying={isPlaying}
                />

                {/* MIDI Settings (Collapsible) */}
                {showMidiSettings && (
                    <MidiSettings
                        midiProgram={midiProgram}
                        onSetMidiProgram={onSetMidiProgram}
                        midiVelocity={midiVelocity}
                        onSetMidiVelocity={onSetMidiVelocity}
                        midiChannel={midiChannel}
                        onSetMidiChannel={onSetMidiChannel}
                        midiNoteLengthBeats={midiNoteLengthBeats}
                        onSetMidiNoteLengthBeats={onSetMidiNoteLengthBeats}
                        midiGapBeats={midiGapBeats}
                        onSetMidiGapBeats={onSetMidiGapBeats}
                        onExportJson={onExportJson}
                    />
                )}

                {/* Timeline */}
                <ProgressionTimeline
                    activeTrack={activeTrack}
                    cycleBeats={cycleBeats}
                    onUpdateTrack={onUpdateTrack}
                    onPlayArpeggio={onPlayArpeggio}
                    customBreakpoints={customBreakpoints}
                />
            </div>
        </div>
    );
};

export default CompositionPanel;
