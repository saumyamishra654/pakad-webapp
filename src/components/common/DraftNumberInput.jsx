/**
 * DraftNumberInput Component
 * Number input that can be typed freely and commits a clamped value on blur or Enter.
 * (Clamping on every keystroke made values like "16" or "0.8" impossible to type, and
 * half-typed values used to reach playback.)
 */

import React, { useState } from 'react';

/**
 * @param {Object} props
 * @param {number} props.value - Committed value
 * @param {Function} props.onCommit - Called with the new clamped number
 * @param {number} props.min
 * @param {number} props.max
 * @param {number} [props.step]
 * @param {boolean} [props.integer] - Parse as an integer
 * @param {number} [props.fallback] - Used when the draft isn't a number (default: keep the current value)
 */
export function DraftNumberInput({ value, onCommit, min, max, step = 1, integer = false, fallback, ...inputProps }) {
    const [draft, setDraft] = useState(null); // null = not editing, show the committed value

    const commit = () => {
        if (draft === null) return;
        const n = integer ? parseInt(draft, 10) : parseFloat(draft);
        onCommit(Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : (fallback ?? value));
        setDraft(null);
    };

    return (
        <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={draft ?? value}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
            {...inputProps}
        />
    );
}

export default DraftNumberInput;
