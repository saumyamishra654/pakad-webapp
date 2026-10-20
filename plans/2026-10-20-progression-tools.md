# Progression Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Western-theory progression tools to the Chord Tool: Roman numeral labels, a raga-aware progression template library, "harmonise the chalan", and next-chord suggestions.

**Architecture:** All music logic lives in pure, tested modules under `src/utils/` and `src/data/` that take chords and 12-slot patterns and return plain data. Two small components render the template library and the suggestions; `ChordTool.jsx` only wires them to the current patterns and the active track. Every chord the tools create uses the same object shape as `getAvailableChords`, so the timeline, playback and MIDI export need no changes.

**Tech Stack:** React 19, Vite 7, Tailwind v4, Vitest + Testing Library (jsdom). Run tests with `npx vitest run <path>`, lint with `npx eslint src`.

**Spec:** The 2026-10-20 brainstorm, items 1–3 (Roman numerals; template library with raga-fit check and thaat-to-mode bridge; harmonise the chalan and next-chord suggestions). Decisions taken where the brainstorm left a choice are listed below.

## Design Decisions

- **Numerals are relative to Sa** and independent of the tonic. Pitch class 6 is written `♯IV` (tivra Ma, as in Yaman), not `♭V`.
- **Raga fit uses the full pattern** (aaroh ∪ avroh), so compound notes such as "Gg" allow either form. Each step also reports whether it is valid in the aaroh, the avroh, or both.
- **Fit status:** `fits` = every step in the raga; `close` = exactly one step outside; `none` = more than one outside.
- **Inserting a template or harmonisation replaces the active track's chords**, asking `window.confirm` first when the track is not empty. If the progression has more steps than the cycle, raise Beats to the step count (max 18); otherwise spread the steps evenly over the cycle.
- **Vadi/samvadi and tala-aware ideas are out of scope** (item 4).

## Global Constraints

- Chord objects created by these tools must have exactly the `getAvailableChords` shape: `{ root, type, name, notes, intervals, color, isExtended }`, with `notes` as pitch classes 0–11 relative to Sa.
- No new dependencies.
- UI uses the existing design system: `.btn btn-sm btn-secondary` / `btn-ghost` / `btn-selected`, panels `rounded-lg border border-gray-800 bg-gray-950/50`, uppercase section labels `text-xs font-medium uppercase tracking-wide text-gray-400`. No emojis; `PLAY`/`STOP` from `src/utils/glyphs.js` are allowed.
- Must work in Hindustani, Carnatic and Custom Scale modes. The patterns always come from `getCurrentPatterns()` (`{ all, aaroh, avroh }`).
- Lint stays at 0 problems; all existing tests keep passing. Commit after each task; no Co-Authored-By or other trailers.

## Review Focus

1. **Pentatonic ragas** (e.g. Bhupali, where most qualities are missing): templates report `none` without crashing; harmonising a melody note that no chord contains leaves that beat empty instead of throwing. Tests in Tasks 2 and 4.
2. **Replacing a non-empty track:** cancelling the confirm leaves the track untouched. Test in Task 3.
3. **More steps than beats** (the 12-bar blues on an 8-beat cycle): Beats becomes 12 and every step gets its own beat. Test in Task 2 (`layoutSteps`).
4. **Tonic changes:** numerals do not change when the tonic changes; only Western names do. Test in Task 1.
5. **Separate aaroh/avroh:** harmonising the aaroh only uses chords valid in the aaroh pattern. Test in Task 4.

---

## File Structure

- `src/utils/romanNumerals.js` (create): `getRomanNumeral(chord)`.
- `src/data/progressionTemplates.js` (create): `PROGRESSION_TEMPLATES`, `THAATS`.
- `src/utils/progressionHelpers.js` (create): `buildChord`, `matchThaats`, `templateFit`, `templateToChords`, `layoutSteps`.
- `src/utils/harmonyHelpers.js` (create): `harmonizeLine`, `suggestNextChords`.
- `src/components/rhythm/ProgressionTemplates.jsx` (create): the template library panel.
- `src/components/rhythm/ChordSuggestions.jsx` (create): the next-chord strip.
- `src/components/chords/ChordCard.jsx`, `src/components/rhythm/TimelineGrid.jsx`, `src/components/rhythm/PianoChordsView.jsx` (modify): show numerals.
- `src/pages/ChordTool.jsx` (modify): wiring only.
- Tests: `src/__tests__/utils/romanNumerals.test.js`, `src/__tests__/utils/progressionHelpers.test.js`, `src/__tests__/utils/harmonyHelpers.test.js`, plus additions to `src/__tests__/pages/ChordTool.test.jsx`.

---

### Task 1: Roman numeral labels

**Files:**
- Create: `src/utils/romanNumerals.js`
- Modify: `src/components/chords/ChordCard.jsx`, `src/components/rhythm/TimelineGrid.jsx` (chip label, around line 135), `src/components/rhythm/PianoChordsView.jsx` (header line)
- Test: `src/__tests__/utils/romanNumerals.test.js`, `src/__tests__/components/ChordCard.test.jsx`

**Interfaces:**
- Produces: `getRomanNumeral(chord: { root: number, type: string }) => string`.

- [ ] **Step 1: Write the failing tests** in `romanNumerals.test.js`:

```js
import { getRomanNumeral } from '../../utils/romanNumerals.js';
const c = (root, type) => ({ root, type });

it('uses upper case for major-family and lower case for minor-family chords', () => {
    expect(getRomanNumeral(c(0, 'major'))).toBe('I');
    expect(getRomanNumeral(c(2, 'minor'))).toBe('ii');
    expect(getRomanNumeral(c(7, 'dom7'))).toBe('V7');
    expect(getRomanNumeral(c(9, 'minor7'))).toBe('vi7');
});
it('marks altered degrees relative to Sa', () => {
    expect(getRomanNumeral(c(1, 'major'))).toBe('♭II');
    expect(getRomanNumeral(c(10, 'major'))).toBe('♭VII');
    expect(getRomanNumeral(c(6, 'major'))).toBe('♯IV');
});
it('uses standard symbols for diminished, half-diminished and augmented', () => {
    expect(getRomanNumeral(c(11, 'diminished'))).toBe('vii°');
    expect(getRomanNumeral(c(11, 'dim7'))).toBe('vii°7');
    expect(getRomanNumeral(c(11, 'm7b5'))).toBe('viiø7');
    expect(getRomanNumeral(c(0, 'augmented'))).toBe('I+');
});
it('covers every chord type', () => {
    for (const t of ALL_CHORD_TYPES) expect(getRomanNumeral(c(0, t.id))).toMatch(/^[Ii]/);
});
```

Add to `ChordCard.test.jsx`: rendering with `tonic={2}` and with `tonic={0}` both show the same numeral text (`'I'` for the default C major chord).

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/__tests__/utils/romanNumerals.test.js src/__tests__/components/ChordCard.test.jsx`
Expected: FAIL (module not found / numeral missing).

- [ ] **Step 3: Implement `getRomanNumeral` in `src/utils/romanNumerals.js`**

Degree names by semitone: `['I','♭II','II','♭III','III','IV','♯IV','V','♭VI','VI','♭VII','VII']`. Lower-case the letters (keep ♭/♯) for `minor, minor7, min6, madd9, min9, minMaj7, diminished, dim7, m7b5`. Suffix by type:

| type | suffix | type | suffix |
|---|---|---|---|
| major, minor | `''` | diminished | `°` |
| dim7 | `°7` | m7b5 | `ø7` |
| augmented | `+` | aug7 | `+7` |
| major7 | `maj7` | dom7, minor7 | `7` |
| maj6, min6 | `6` | sus2 / sus4 | `sus2` / `sus4` |
| add9, madd9 | `add9` | maj9 | `maj9` |
| min9, dom9 | `9` | 7sus4 | `7sus4` |
| minMaj7 | `(maj7)` | | |

Display: in `ChordCard`, show the numeral as a small muted label (`text-xs text-gray-500 tabular-nums`) before the Western name in the header row. In `TimelineGrid` chips, show `numeral · westernName`. In `PianoChordsView`, append the numeral to the "Beat n:" line.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/__tests__/utils/romanNumerals.test.js src/__tests__/components/ChordCard.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**: `git commit -m "Show Roman numerals relative to Sa on chords"`

---

### Task 2: Template data, thaat matching and raga fit (pure logic)

**Files:**
- Create: `src/data/progressionTemplates.js`, `src/utils/progressionHelpers.js`
- Test: `src/__tests__/utils/progressionHelpers.test.js`

**Interfaces:**
- Consumes: `getChordType(id)` from `src/data/chordTypes.js`, `getRomanNumeral` (Task 1).
- Produces:
  - `PROGRESSION_TEMPLATES: Array<{ id, name, description, modes: string[], steps: Array<{ degree: number, type: string }> }>`
  - `THAATS: Array<{ id, name, mode: string|null, pattern: number[12] }>`
  - `buildChord(root: number, typeId: string) => Chord` (the `getAvailableChords` shape)
  - `matchThaats(pattern: number[12]) => { exact: Thaat|null, containing: Thaat[] }`: `exact` when the pattern equals a thaat; `containing` lists thaats the pattern is a subset of.
  - `templateFit(template, patterns: {all, aaroh, avroh}) => { status: 'fits'|'close'|'none', steps: Array<{ chord: Chord, inRaga: boolean, inAaroh: boolean, inAvroh: boolean }> }`
  - `templateToChords(template) => Chord[]`
  - `layoutSteps(stepCount: number, beats: number) => { beats: number, beatIndices: number[] }`

- [ ] **Step 1: Write the failing tests** in `progressionHelpers.test.js` (patterns via `pitchClassesToPattern`):

```js
const bilawal = pitchClassesToPattern([0, 2, 4, 5, 7, 9, 11]);
const kafi = pitchClassesToPattern([0, 2, 3, 5, 7, 9, 10]);
const bhupali = pitchClassesToPattern([0, 2, 4, 7, 9]);
const tpl = id => PROGRESSION_TEMPLATES.find(t => t.id === id);
const P = p => ({ all: p, aaroh: p, avroh: p });

it('buildChord matches the getAvailableChords shape', () => {
    expect(buildChord(7, 'dom7')).toMatchObject({ root: 7, type: 'dom7', notes: [7, 11, 2, 5], isExtended: false });
});
it('matches thaats exactly and by containment', () => {
    expect(matchThaats(kafi).exact.id).toBe('kafi');
    expect(matchThaats(kafi).exact.mode).toBe('Dorian');
    expect(matchThaats(bhupali).exact).toBeNull();
    expect(matchThaats(bhupali).containing.map(t => t.id)).toEqual(expect.arrayContaining(['bilawal', 'kalyan', 'khamaj']));
});
it('rates template fit', () => {
    expect(templateFit(tpl('authentic-cadence'), P(bilawal)).status).toBe('fits');
    expect(templateFit(tpl('dorian-vamp'), P(kafi)).status).toBe('fits');
    expect(templateFit(tpl('mixolydian'), P(bilawal)).status).toBe('close'); // only ♭VII (needs Ni♭) is outside
    expect(templateFit(tpl('authentic-cadence'), P(kafi)).status).toBe('none'); // I and V both need notes Kafi lacks
    expect(templateFit(tpl('ii-v-i'), P(bhupali)).status).toBe('none');        // no crash on a pentatonic raga
});
it('reports aaroh/avroh validity per step', () => {
    const fit = templateFit(tpl('authentic-cadence'), { all: bilawal, aaroh: pitchClassesToPattern([0, 2, 4, 7, 9, 11]), avroh: bilawal });
    expect(fit.steps[1]).toMatchObject({ inRaga: true, inAaroh: false, inAvroh: true }); // IV needs Ma
});
it('lays steps out over the cycle', () => {
    expect(layoutSteps(4, 8)).toEqual({ beats: 8, beatIndices: [0, 2, 4, 6] });
    expect(layoutSteps(12, 8)).toEqual({ beats: 12, beatIndices: [0,1,2,3,4,5,6,7,8,9,10,11] });
    expect(layoutSteps(20, 8).beats).toBe(18); // capped at the max cycle; extra steps dropped
});
it('every template step uses a known chord type', () => {
    for (const t of PROGRESSION_TEMPLATES) for (const s of t.steps) expect(getChordType(s.type)).toBeTruthy();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/__tests__/utils/progressionHelpers.test.js`
Expected: FAIL (modules not found).

- [ ] **Step 3: Implement the data and helpers.** `PROGRESSION_TEMPLATES` contains exactly these (degree = semitones above Sa; type = chord type id):

| id | name | modes | steps |
|---|---|---|---|
| authentic-cadence | I – IV – V – I | Ionian | 0 major, 5 major, 7 major, 0 major |
| plagal-cadence | IV – I | Ionian, Mixolydian | 5 major, 0 major |
| pop-axis | I – V – vi – IV | Ionian | 0 major, 7 major, 9 minor, 5 major |
| fifties | I – vi – IV – V | Ionian | 0 major, 9 minor, 5 major, 7 major |
| ii-v-i | ii7 – V7 – Imaj7 | Ionian | 2 minor7, 7 dom7, 0 major7 |
| twelve-bar-blues | 12-bar blues | Mixolydian | I7 ×4, IV7 ×2, I7 ×2, V7, IV7, I7, V7 (all dom7) |
| mixolydian | I – ♭VII – IV – I | Mixolydian | 0 major, 10 major, 5 major, 0 major |
| lydian | I – II | Lydian | 0 major, 2 major |
| dorian-vamp | i – IV | Dorian | 0 minor, 5 major |
| aeolian-rock | i – ♭VII – ♭VI – ♭VII | Aeolian | 0 minor, 10 major, 8 major, 10 major |
| andalusian | i – ♭VII – ♭VI – V | Aeolian | 0 minor, 10 major, 8 major, 7 major |
| phrygian-cadence | ♭II – i | Phrygian | 1 major, 0 minor |
| double-harmonic | I – ♭II | (none) | 0 major, 1 major |

Write each `description` as one plain sentence on its character, e.g. "Dorian vamp; the raised 6th (shuddha Dha) gives the IV chord its brightness". `THAATS` holds the ten thaats with these patterns (as pitch-class lists) and modes: Bilawal `[0,2,4,5,7,9,11]` Ionian; Kalyan `[0,2,4,6,7,9,11]` Lydian; Khamaj `[0,2,4,5,7,9,10]` Mixolydian; Kafi `[0,2,3,5,7,9,10]` Dorian; Asavari `[0,2,3,5,7,8,10]` Aeolian; Bhairavi `[0,1,3,5,7,8,10]` Phrygian; Bhairav `[0,1,4,5,7,8,11]`, Poorvi `[0,1,4,6,7,8,11]`, Marwa `[0,1,4,6,7,9,11]`, Todi `[0,1,3,6,7,8,11]` (mode `null`). `buildChord` derives `notes` as `intervals.map(i => (root + i) % 12)` and `isExtended` as `category === 'extended'`. `layoutSteps`: if `stepCount <= beats`, spread evenly with `Math.floor(i * beats / stepCount)`; otherwise `beats = Math.min(stepCount, 18)` and one step per beat (extra steps beyond 18 are dropped).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/__tests__/utils/progressionHelpers.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**: `git commit -m "Add progression templates, thaat matching and raga-fit logic"`

---

### Task 3: Template library panel

**Files:**
- Create: `src/components/rhythm/ProgressionTemplates.jsx`
- Modify: `src/pages/ChordTool.jsx` (a "Templates" toggle button beside "MIDI Settings", the panel above the timeline, and a `replaceTrack(chords)` handler)
- Test: `src/__tests__/pages/ChordTool.test.jsx`

**Interfaces:**
- Consumes: `PROGRESSION_TEMPLATES`, `matchThaats`, `templateFit`, `templateToChords`, `layoutSteps` (Task 2); `getRomanNumeral` (Task 1).
- Produces: `<ProgressionTemplates patterns labels tonic onUse={(chords: Chord[]) => void} onPreview={(chord) => void} />`, and in `ChordTool`, `replaceTrack(chords: Chord[]): boolean` (lays the chords out with `layoutSteps`, updates Beats, confirms before overwriting a non-empty track, returns whether it replaced). Task 4 reuses `replaceTrack`.

- [ ] **Step 1: Write the failing tests** in `ChordTool.test.jsx` (default raga is Abheri Todi; switch the Raga select to "Kafi", whose notes are exactly the Kafi thaat):

```js
it('lists templates with a fit badge and suggests ones matching the thaat first', async () => {
    // after selecting Kafi and opening Templates:
    expect(screen.getByText(/Kafi thaat · Dorian/)).toBeTruthy();
    const first = screen.getAllByTestId('template-row')[0];
    expect(first.textContent).toMatch(/i – IV/);   // the Dorian template is suggested first
    expect(first.textContent).toMatch(/Fits/);
});
it('Use places the template on the active track and asks before overwriting', async () => {
    // click "Use" on "I – IV – V – I": saved track 1 has 4 chords at beats 0,2,4,6
    // click "Use" again with window.confirm returning false: track unchanged
});
it('12-bar blues raises Beats to 12', async () => { /* Beats input shows 12 */ });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/__tests__/pages/ChordTool.test.jsx`
Expected: FAIL (no Templates button).

- [ ] **Step 3: Implement the panel.** Header line: the thaat match ("Kafi thaat · Dorian"; "Within Bilawal, Kalyan, Khamaj" when only contained; "No matching thaat" otherwise; thaats without a mode show just "Bhairav thaat"). Rows sorted by: templates whose `modes` include the exact thaat's mode first, then by status (`fits`, `close`, `none`). Each row (`data-testid="template-row"`) shows the name, the per-step numerals (outside steps in `text-red-400` with a title explaining which notes are outside), the description, a status badge (Fits / One chord outside / Doesn't fit), and a `btn btn-sm btn-secondary` "Use" button. Clicking a numeral previews that chord. `Use` is enabled for every status. `replaceTrack` builds timeline items `{ id: nextChordIdRef.current++, chord, beat, duration: 1 }`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/__tests__/pages/ChordTool.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**: `git commit -m "Add a raga-aware progression template library"`

---

### Task 4: Harmonise the chalan

**Files:**
- Create: `src/utils/harmonyHelpers.js` (`harmonizeLine` and the shared scoring helpers)
- Modify: `src/pages/ChordTool.jsx` (three `btn btn-sm btn-secondary` buttons, "Harmonise aaroh", "Harmonise avroh" and "Harmonise full raga", in the progression builder, calling `replaceTrack`)
- Test: `src/__tests__/utils/harmonyHelpers.test.js`, `src/__tests__/pages/ChordTool.test.jsx`

**Interfaces:**
- Consumes: `buildChalan(patterns, mode)` from `src/utils/chalan.js`; `getAvailableChords(pattern, 'all', false)`; `replaceTrack` (Task 3).
- Produces: `harmonizeLine(melody: number[], candidates: Chord[]) => Array<Chord|null>` (same length as `melody`), plus exported helpers `commonTones(a: Chord, b: Chord) => number` and `rootMotionScore(from: number, to: number) => number` for Task 5.

- [ ] **Step 1: Write the failing tests** in `harmonyHelpers.test.js`:

```js
const bilawalChords = getAvailableChords(bilawal, 'all', false);
it('returns one chord per melody note, each containing that note', () => {
    const melody = [0, 2, 4, 5, 7, 9, 11, 0];
    const out = harmonizeLine(melody, bilawalChords);
    expect(out).toHaveLength(8);
    out.forEach((ch, i) => expect(ch.notes).toContain(melody[i]));
});
it('starts and ends a line on Sa with a chord rooted on Sa', () => {
    const out = harmonizeLine([0, 4, 7, 0], bilawalChords);
    expect(out[0].root).toBe(0);
    expect(out[3].root).toBe(0);
});
it('avoids repeating the same chord when another fits', () => {
    const out = harmonizeLine([0, 4, 7], bilawalChords);
    expect(new Set(out.map(c => `${c.root}${c.type}`)).size).toBeGreaterThan(1);
});
it('leaves a gap when no chord contains the note', () => {
    expect(harmonizeLine([0, 1, 0], bilawalChords)[1]).toBeNull(); // Re♭ is not in Bilawal
});
it('commonTones and rootMotionScore', () => {
    expect(commonTones(buildChord(0, 'major'), buildChord(9, 'minor'))).toBe(2);
    expect(rootMotionScore(0, 5)).toBe(3); // up a 4th
    expect(rootMotionScore(0, 2)).toBe(2); // step
    expect(rootMotionScore(0, 4)).toBe(1); // third
    expect(rootMotionScore(0, 0)).toBe(-5); // repeat
});
```

In `ChordTool.test.jsx`: select "Alhaiya Bilawal" (its aaroh skips Ma, its avroh uses it; Separate Aaroh/Avroh switches on automatically); "Harmonise aaroh" places no chord containing Ma (pitch class 5).

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/__tests__/utils/harmonyHelpers.test.js`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `harmonizeLine` as a best-path search** (dynamic programming over melody positions). For position `i`, the options are the candidates containing `melody[i]`; if there are none, the position is `null` and the path continues from the previous chord. Score:

```
nodeScore(ch, i)      = (ch.root === melody[i] ? 2 : 0)
                      + ((i === 0 || i === last) && melody[i] === 0 && ch.root === 0 ? 4 : 0)
                      - (ch.notes.length > 3 ? 1 : 0)            // prefer triads
transition(prev, ch)  = commonTones(prev, ch) + rootMotionScore(prev.root, ch.root)
```

Pick the highest-scoring path. Ties go to the earlier candidate in `getAvailableChords` order, which makes the result deterministic. `rootMotionScore(from, to)` uses the interval `d = (to - from + 12) % 12`: `d === 0 → -5`; `d ∈ {5, 7} → 3`; `d ∈ {1, 2, 10, 11} → 2`; otherwise `1`. In `ChordTool`, the melody is `buildChalan(getCurrentPatterns(), mode).map(n => n.noteIndex)`. The candidates come from the aaroh pattern for "aaroh", the avroh pattern for "avroh", and `all` for "full raga"; `null` entries become empty beats.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/__tests__/utils/harmonyHelpers.test.js src/__tests__/pages/ChordTool.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**: `git commit -m "Harmonise the aaroh/avroh into a progression"`

---

### Task 5: Next-chord suggestions

**Files:**
- Modify: `src/utils/harmonyHelpers.js` (add `suggestNextChords`)
- Create: `src/components/rhythm/ChordSuggestions.jsx`
- Modify: `src/pages/ChordTool.jsx` (render the strip under the timeline)
- Test: `src/__tests__/utils/harmonyHelpers.test.js`, `src/__tests__/pages/ChordTool.test.jsx`

**Interfaces:**
- Consumes: `commonTones`, `rootMotionScore` (Task 4); `getRomanNumeral` (Task 1).
- Produces: `suggestNextChords(prev: Chord, candidates: Chord[], { limit = 6, towardTonic = false }) => Array<{ chord: Chord, score: number, reasons: string[] }>`, and `<ChordSuggestions suggestions targetBeat labels onPlace={(chord) => void} onPreview={(chord) => void} />`.

- [ ] **Step 1: Write the failing tests**:

```js
it('ranks fifth/fourth motion and shared tones above repeats', () => {
    const out = suggestNextChords(buildChord(0, 'major'), bilawalChords);
    expect(out.length).toBeLessThanOrEqual(6);
    expect(out.some(s => s.chord.root === 0 && s.chord.type === 'major')).toBe(false); // never suggests the same chord
    expect(out[0].score).toBeGreaterThanOrEqual(out[out.length - 1].score);
    expect(out[0].reasons.length).toBeGreaterThan(0);
});
it('pulls toward the Sa chord at the end of a cycle', () => {
    const out = suggestNextChords(buildChord(7, 'major'), bilawalChords, { towardTonic: true });
    expect(out[0].chord.root).toBe(0);
    expect(out[0].reasons).toContain('resolves to Sa');
});
```

In `ChordTool.test.jsx`: with a chord on beat 1 and the rest empty, the strip reads "Next for beat 2" and clicking a suggestion places it on beat 2 (index 1). With no chords placed, the strip is hidden.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/__tests__/utils/harmonyHelpers.test.js`
Expected: FAIL (`suggestNextChords` not exported).

- [ ] **Step 3: Implement.** `score = 2 * commonTones + rootMotionScore + (towardTonic && root === 0 && type ∈ {major, minor} ? 4 : 0)`. Exclude the identical chord, sort descending, and take `limit`. `reasons` uses this exact copy, in order: `` `shares ${n} note${n === 1 ? '' : 's'}` `` when n > 0; `'root up a 4th'` (d = 5), `'root down a 4th'` (d = 7), `'step'` (d ∈ {1, 2, 10, 11}), `'third'` (otherwise); and `'resolves to Sa'` when the tonic bonus applied. In `ChordTool`, the target beat is the first empty beat after the last placed chord (hidden when there is none). `towardTonic` is true when the target beat is the last beat of the cycle, and the candidates are `getAvailableChords(getCurrentPatterns().all, 'all', showExtended)`. Each suggestion is a `btn btn-sm btn-secondary` showing the numeral and the Western name, with the reasons as its `title`.

- [ ] **Step 4: Run all tests and lint**

Run: `npx vitest run && npx eslint src`
Expected: all tests PASS; eslint prints nothing.

- [ ] **Step 5: Commit**: `git commit -m "Suggest next chords in the progression builder"`
