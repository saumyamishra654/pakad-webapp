/**
 * MidiSettingsPanel Component
 * MIDI export options: tempo (follows the sequencer unless overridden), note length, gap,
 * velocity and which tracks to export
 */

import React from 'react';
import { DraftNumberInput } from '../common/DraftNumberInput.jsx';

function NumberField({ label, ...props }) {
    return (
        <label className="flex flex-col gap-1">
            <span className="text-gray-400">{label}</span>
            <DraftNumberInput {...props} className="px-2 py-1 border border-gray-600 rounded bg-gray-700 text-white" />
        </label>
    );
}

/**
 * @param {Object} props
 * @param {Object} props.settings - { tempoOverride (null = follow BPM), noteLengthBeats, gapBeats, velocity, scope }
 * @param {Function} props.onChange - Called with a partial settings object
 * @param {number} props.sequencerBpm - Current sequencer BPM, used when tempoOverride is null
 */
export function MidiSettingsPanel({ settings, onChange, sequencerBpm }) {
    const followsBpm = settings.tempoOverride === null;

    return (
        <div className="mb-4 p-4 rounded-lg border border-purple-700 bg-purple-900/30">
            <h4 className="text-sm font-semibold text-purple-200 mb-3">MIDI Export Settings</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="flex flex-col gap-1">
                    <label className="flex items-center gap-2 text-gray-400">
                        <input
                            type="checkbox"
                            checked={followsBpm}
                            onChange={e => onChange({ tempoOverride: e.target.checked ? null : sequencerBpm })}
                            className="w-4 h-4"
                        />
                        Tempo = sequencer BPM
                    </label>
                    {followsBpm ? (
                        <span className="px-2 py-1 text-gray-300">{sequencerBpm} BPM</span>
                    ) : (
                        <NumberField
                            label="Tempo"
                            value={settings.tempoOverride}
                            onCommit={v => onChange({ tempoOverride: v })}
                            min={20}
                            max={300}
                            fallback={sequencerBpm}
                            integer
                        />
                    )}
                </div>
                <NumberField
                    label="Note Length (beats)"
                    value={settings.noteLengthBeats}
                    onCommit={v => onChange({ noteLengthBeats: v })}
                    min={0.1}
                    max={32}
                    step={0.1}
                    fallback={3.2}
                />
                <NumberField
                    label="Gap (beats)"
                    value={settings.gapBeats}
                    onCommit={v => onChange({ gapBeats: v })}
                    min={0}
                    max={32}
                    step={0.1}
                    fallback={0.4}
                />
                <NumberField
                    label="Velocity"
                    value={settings.velocity}
                    onCommit={v => onChange({ velocity: v })}
                    min={1}
                    max={127}
                    fallback={96}
                    integer
                />
                <label className="flex flex-col gap-1">
                    <span className="text-gray-400">Export</span>
                    <select
                        value={settings.scope}
                        onChange={e => onChange({ scope: e.target.value })}
                        className="px-2 py-1 border border-gray-600 rounded bg-gray-700 text-white"
                    >
                        <option value="all">All tracks (multi-track file)</option>
                        <option value="current">Current track only</option>
                    </select>
                </label>
            </div>
        </div>
    );
}

export default MidiSettingsPanel;
