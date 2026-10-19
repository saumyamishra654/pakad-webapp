/**
 * CustomScaleEditor Component
 * Toggle the notes of a custom scale, either as one pattern or as separate aaroh/avroh patterns.
 * Sa is always present and can't be toggled.
 */

import React from 'react';

const saOnly = () => Array.from({ length: 12 }, (_, i) => i === 0);
const togglePc = (pattern, pc) => pattern.map((v, i) => (i === pc ? !v : v));
const withSa = (pattern) => pattern.map((v, i) => (i === 0 ? true : !!v));

function NoteToggleRow({ labels, pattern, onChange }) {
    return (
        <div className="flex flex-wrap gap-1">
            {labels.map((label, i) => (
                <button
                    key={i}
                    onClick={() => i !== 0 && onChange(togglePc(pattern, i))}
                    disabled={i === 0}
                    className={`px-2 py-1 text-xs rounded border transition-colors ${pattern[i]
                        ? 'bg-emerald-600 border-emerald-400 text-white'
                        : 'bg-gray-700 border-gray-500 hover:bg-gray-600 text-gray-300'
                        } ${i === 0 ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                    {label}
                </button>
            ))}
        </div>
    );
}

/**
 * @param {Object} props
 * @param {string[]} props.labels - Swara labels indexed by pitch class
 * @param {boolean} props.separateAarohAvroh - Edit aaroh and avroh separately
 * @param {Object} props.patterns - { note, aaroh, avroh } boolean[12] patterns
 * @param {Function} props.onChange - Called with a partial { note, aaroh, avroh } object
 * @param {Object|null} props.selectedRaga - Raga to copy from
 */
export function CustomScaleEditor({ labels, separateAarohAvroh, patterns, onChange, selectedRaga }) {
    return (
        <div className="mt-4 p-4 rounded-lg border border-gray-600 bg-gray-800/50">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-300">Custom Scale Editor</h3>
                <div className="flex gap-2">
                    <button
                        onClick={() => onChange({ note: saOnly(), aaroh: saOnly(), avroh: saOnly() })}
                        className="px-2 py-1 text-xs rounded border border-gray-500 bg-gray-700 hover:bg-gray-600 text-gray-300"
                    >
                        Clear
                    </button>
                    <button
                        onClick={() => {
                            if (!selectedRaga) return;
                            onChange({
                                note: withSa(selectedRaga.notePattern),
                                aaroh: withSa(selectedRaga.aarohPattern || selectedRaga.notePattern),
                                avroh: withSa(selectedRaga.avrohPattern || selectedRaga.notePattern)
                            });
                        }}
                        className="px-2 py-1 text-xs rounded border border-gray-500 bg-gray-700 hover:bg-gray-600 text-gray-300"
                    >
                        Copy From Raga
                    </button>
                </div>
            </div>

            {!separateAarohAvroh ? (
                <div>
                    <div className="text-xs text-gray-400 mb-2">Select notes for the scale</div>
                    <NoteToggleRow labels={labels} pattern={patterns.note} onChange={note => onChange({ note })} />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <div className="text-xs text-gray-400 mb-2">Aaroh (Ascending)</div>
                        <NoteToggleRow labels={labels} pattern={patterns.aaroh} onChange={aaroh => onChange({ aaroh })} />
                    </div>
                    <div>
                        <div className="text-xs text-gray-400 mb-2">Avroh (Descending)</div>
                        <NoteToggleRow labels={labels} pattern={patterns.avroh} onChange={avroh => onChange({ avroh })} />
                    </div>
                </div>
            )}
        </div>
    );
}

export default CustomScaleEditor;
