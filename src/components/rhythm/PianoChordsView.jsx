/**
 * PianoChordsView Component
 * Shows each chord of a progression on a small piano, voiced the same way as playback/MIDI
 */

import React from 'react';
import { arrangeChordNotes } from '../../utils/chordHelpers.js';

const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11];
const BLACK_PCS = [1, 3, 6, 8, 10];
const BLACK_LEFT_OFFSETS = [18, 42, 90, 114, 138];
const OCTAVE_WIDTH = 24 * 7;

// Keys are numbered octave * 12 + pitch class (arrangeChordNotes uses MIDI numbering, +12)
function getPianoKeys(notes, tonic) {
    return arrangeChordNotes(notes || [], 4).map(({ midiNote }) => midiNote - 12 + tonic);
}

function ChordPiano({ pianoKeys }) {
    // Draw enough octaves to fit the voicing (high tonics and 9ths reach octave 6)
    const firstOctave = pianoKeys.length ? Math.floor(Math.min(...pianoKeys) / 12) : 4;
    const lastOctave = pianoKeys.length ? Math.max(firstOctave + 1, Math.floor(Math.max(...pianoKeys) / 12)) : 5;
    const octaves = Array.from({ length: lastOctave - firstOctave + 1 }, (_, i) => firstOctave + i);

    return (
        <div className="piano-wrap" style={{ justifyContent: 'flex-start', padding: '2px' }}>
            <div className="piano" style={{ width: `${OCTAVE_WIDTH * octaves.length}px`, height: '60px', display: 'flex' }}>
                {octaves.map((octave) => (
                    <div key={octave} style={{ position: 'relative', display: 'inline-block', height: '60px', width: `${OCTAVE_WIDTH}px` }}>
                        {/* White keys */}
                        <div style={{ display: 'flex' }}>
                            {WHITE_PCS.map((pc) => (
                                <div
                                    key={pc}
                                    style={{
                                        width: '24px',
                                        height: '60px',
                                        background: '#ffffff',
                                        border: '1px solid #4b5563',
                                        borderBottomLeftRadius: '4px',
                                        borderBottomRightRadius: '4px',
                                        boxSizing: 'border-box',
                                        position: 'relative'
                                    }}
                                >
                                    {pianoKeys.includes(octave * 12 + pc) && (
                                        <div
                                            style={{
                                                position: 'absolute',
                                                top: '6px',
                                                left: '50%',
                                                transform: 'translateX(-50%)',
                                                width: '16px',
                                                height: '16px',
                                                background: '#3b82f6',
                                                borderRadius: '50%'
                                            }}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                        {/* Black keys */}
                        <div style={{ position: 'absolute', top: '0', left: '0', display: 'flex' }}>
                            {BLACK_PCS.map((pc, blackIdx) => (
                                <div
                                    key={pc}
                                    style={{
                                        position: 'absolute',
                                        left: `${BLACK_LEFT_OFFSETS[blackIdx]}px`,
                                        width: '12px',
                                        height: '36px',
                                        background: '#1f2937',
                                        borderBottomLeftRadius: '2px',
                                        borderBottomRightRadius: '2px',
                                        zIndex: 1
                                    }}
                                >
                                    {pianoKeys.includes(octave * 12 + pc) && (
                                        <div
                                            style={{
                                                position: 'absolute',
                                                top: '6px',
                                                left: '50%',
                                                transform: 'translateX(-50%)',
                                                width: '8px',
                                                height: '8px',
                                                background: '#f59e0b',
                                                borderRadius: '50%'
                                            }}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * @param {Object} props
 * @param {Array} props.chords - Progression items ({ id, beat, chord })
 * @param {string[]} props.labels - Swara labels indexed by pitch class
 * @param {number} props.tonic - Selected tonic (0 = C)
 */
export function PianoChordsView({ chords, labels, tonic }) {
    return (
        <div className="mt-4 p-3 rounded-lg border border-blue-700 bg-blue-900/30">
            <h3 className="text-md font-semibold text-blue-200 mb-3">Piano Chords</h3>
            <div className="space-y-3">
                {chords.map((item) => {
                    const chord = item.chord;
                    const chordName = chord.name || chord.type?.name || '';
                    return (
                        <div key={item.id} className="p-2 bg-gray-800 rounded border border-gray-600">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-sm font-medium text-white">
                                    Beat {item.beat + 1}: {labels[chord.root]} {chordName}
                                </span>
                                <span className="text-xs text-gray-400">
                                    {chord.notes.map(n => labels[n]).join(' - ')}
                                </span>
                            </div>
                            <ChordPiano pianoKeys={getPianoKeys(chord.notes, tonic)} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default PianoChordsView;
