/**
 * Harmonisation helpers: pick a chord for each melody note by best-path search
 */

/**
 * Number of pitch classes two chords share.
 */
export function commonTones(a, b) {
    return a.notes.filter(n => b.notes.includes(n)).length;
}

/**
 * Score the root movement between two chords (pitch classes): fourths/fifths best,
 * steps next, repeating the same root worst.
 */
export function rootMotionScore(from, to) {
    const d = (to - from + 12) % 12;
    if (d === 0) return -5;
    if (d === 5 || d === 7) return 3;
    if (d === 1 || d === 2 || d === 10 || d === 11) return 2;
    return 1;
}

function nodeScore(chord, note, isEdge) {
    return (chord.root === note ? 2 : 0)
        + (isEdge && note === 0 && chord.root === 0 ? 4 : 0)
        - (chord.notes.length > 3 ? 1 : 0);
}

/**
 * Choose one chord per melody note (pitch classes relative to Sa).
 * Each chord must contain its note; a note no candidate covers yields null and the
 * path continues from the previous chord. Ties go to the earlier candidate.
 * @returns {Array<Object|null>} same length as melody
 */
export function harmonizeLine(melody, candidates) {
    const last = melody.length - 1;
    const result = new Array(melody.length).fill(null);
    // layers[k] = { index, options: [{ chord, score, back }] } for covered positions only
    const layers = [];

    melody.forEach((note, i) => {
        const fits = candidates.filter(ch => ch.notes.includes(note));
        if (fits.length === 0) return;
        const prev = layers.length ? layers[layers.length - 1].options : null;
        const options = fits.map(chord => {
            const own = nodeScore(chord, note, i === 0 || i === last);
            if (!prev) return { chord, score: own, back: -1 };
            let best = -1;
            let bestScore = -Infinity;
            prev.forEach((p, j) => {
                const s = p.score + commonTones(p.chord, chord) + rootMotionScore(p.chord.root, chord.root);
                if (s > bestScore) { bestScore = s; best = j; }
            });
            return { chord, score: bestScore + own, back: best };
        });
        layers.push({ index: i, options });
    });

    if (layers.length === 0) return result;
    let pick = 0;
    layers[layers.length - 1].options.forEach((o, j) => {
        if (o.score > layers[layers.length - 1].options[pick].score) pick = j;
    });
    for (let k = layers.length - 1; k >= 0; k--) {
        const o = layers[k].options[pick];
        result[layers[k].index] = o.chord;
        pick = o.back;
    }
    return result;
}

/**
 * Rank candidate chords as the next chord after `prev`.
 * @returns {Array<{chord: Object, score: number, reasons: string[]}>}
 */
export function suggestNextChords(prev, candidates, { limit = 6, towardTonic = false } = {}) {
    return candidates
        .filter(ch => !(ch.root === prev.root && ch.type === prev.type))
        .map(chord => {
            const n = commonTones(prev, chord);
            const d = (chord.root - prev.root + 12) % 12;
            const tonic = towardTonic && chord.root === 0 && (chord.type === 'major' || chord.type === 'minor');
            const reasons = [];
            if (n > 0) reasons.push(`shares ${n} note${n === 1 ? '' : 's'}`);
            if (d === 5) reasons.push('root up a 4th');
            else if (d === 7) reasons.push('root down a 4th');
            else if (d === 1 || d === 2 || d === 10 || d === 11) reasons.push('step');
            else if (d === 6) reasons.push('tritone');
            else reasons.push('third');
            if (tonic) reasons.push('resolves to Sa');
            return { chord, score: 2 * n + rootMotionScore(prev.root, chord.root) + (tonic ? 4 : 0), reasons };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
}
