/**
 * SequencerControls Component
 * Beats, BPM, playback mode, arpeggio delay, note duration, play/stop, clear, loop and breakpoints
 */

import React from 'react';
import { PLAY, STOP } from '../../utils/glyphs.js';
import { DraftNumberInput } from '../common/DraftNumberInput.jsx';

const INPUT_CLASS = 'w-20';

function Field({ label, children }) {
    return (
        <label className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">{label}</span>
            {children}
        </label>
    );
}

/**
 * @param {Object} props
 * @param {Object} props.settings - { beats, bpm, mode, arpeggiationDelay, noteDuration, loop, breakpoints }
 * @param {Function} props.onChange - Called with a partial settings object
 * @param {boolean} props.isPlaying
 * @param {Function} props.onPlayStop
 * @param {Function} props.onClear
 */
export function SequencerControls({ settings, onChange, isPlaying, onPlayStop, onClear }) {
    const breakpointError = settings.breakpoints && !/^[0-9-]+$/.test(settings.breakpoints)
        ? 'Use numbers and dashes only'
        : '';

    return (
        <>
            <div className="flex flex-wrap items-center gap-3 mb-4">
                <Field label="Beats:">
                    <DraftNumberInput value={settings.beats} onCommit={beats => onChange({ beats })} min={2} max={18} integer className={INPUT_CLASS} />
                </Field>

                <Field label="BPM:">
                    <DraftNumberInput value={settings.bpm} onCommit={bpm => onChange({ bpm })} min={40} max={240} integer className={INPUT_CLASS} />
                </Field>

                <Field label="Mode:">
                    <select
                        value={settings.mode}
                        onChange={e => onChange({ mode: e.target.value })}
                        className="w-28"
                    >
                        <option value="unison">Unison</option>
                        <option value="melody">Melody</option>
                    </select>
                </Field>

                {settings.mode === 'melody' && (
                    <Field label="Arp Delay:">
                        <DraftNumberInput
                            value={settings.arpeggiationDelay}
                            onCommit={arpeggiationDelay => onChange({ arpeggiationDelay })}
                            min={0}
                            max={1}
                            step={0.01}
                            className={INPUT_CLASS}
                            title="Delay between notes in seconds"
                        />
                    </Field>
                )}

                <Field label="Duration:">
                    <DraftNumberInput
                        value={settings.noteDuration}
                        onCommit={noteDuration => onChange({ noteDuration })}
                        min={0.1}
                        max={5}
                        step={0.1}
                        className={INPUT_CLASS}
                        title="Note sustain duration in seconds"
                    />
                </Field>

                <div className="flex gap-2">
                    <button
                        onClick={onPlayStop}
                        className={`btn ${isPlaying ? 'btn-selected' : 'btn-primary'} min-w-[5.5rem]`}
                    >
                        {isPlaying ? `${STOP} Stop` : `${PLAY} Play`}
                    </button>
                    <button
                        onClick={onClear}
                        className="btn btn-danger"
                    >
                        Clear
                    </button>
                </div>

                <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                        type="checkbox"
                        checked={settings.loop}
                        onChange={e => onChange({ loop: e.target.checked })}
                    />
                    <span className="text-gray-400">Loop</span>
                </label>
            </div>

            <div className="flex items-center gap-3 mb-4">
                <Field label="Breakpoints:">
                    <input
                        type="text"
                        value={settings.breakpoints}
                        onChange={e => onChange({ breakpoints: e.target.value })}
                        placeholder="e.g., 4-4 or 3-3-2"
                        className="w-36"
                    />
                </Field>
                {breakpointError && (
                    <span className="text-xs text-red-400">{breakpointError}</span>
                )}
            </div>
        </>
    );
}

export default SequencerControls;
