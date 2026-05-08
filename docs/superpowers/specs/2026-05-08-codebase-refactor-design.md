# Samvad Codebase Refactor — Design Spec

**Date:** 2026-05-08
**Scope:** Phase B (bug fixes + cleanup + engineering improvements). Phase C (god component decomposition, context/hooks extraction) is deferred to a follow-up pass.

---

## Overview

23 issues were identified in a full code review. This spec covers 21 of them (issues 1-7, 10-23). Issues #8 (god component) and #9 (prop drilling) are deferred to Phase C, to be done after Phase B is stable.

The refactor is organized into three groups executed in order:

1. **Bug fixes** — broken user-facing functionality (issues 1-7)
2. **Cleanup & engineering** — dead code, caching, CSS, correctness (issues 10-18)
3. **Polish** — error recovery, consistency, dev ergonomics (issues 19-23)

---

## Group 1: Bug Fixes

### Issue 1 — Aaroh/Avroh filter string mismatch

**File:** `src/components/ChordDisplay.jsx:116`

ChordTool tags chords with `source: 'Aaroha'` but ChordDisplay filters for `source === 'Aaroh'`. The strings don't match, so Aaroha-exclusive chords never appear in the Aaroh section.

**Change:** Replace `'Aaroh'` with `'Aaroha'` on line 116.

### Issue 2 — Note filter on RagaCircle cannot be set

**Files:** `src/pages/ChordTool.jsx`, `src/components/RagaCircle.jsx`

The circle's note dots call `onNoteClick(index)` which plays the note but never sets `selectedNoteFilter`. No code path ever calls `setSelectedNoteFilter(value)`. The filter UI is non-functional.

**Change:**
- Add a new prop `onNoteFilterClick` to `RagaCircle` and `CircleRenderer`.
- In `CircleRenderer`, the note dot's `onClick` calls `onNoteFilterClick(index)` instead of `onNoteClick(index)`.
- In ChordTool, pass `onNoteFilterClick={setSelectedNoteFilter}` to `RagaCircle`.
- Keep `onNoteClick` available for cases where audio playback from the circle is desired (currently not wired — can be added later).

### Issue 3 — playChalan audio and visuals out of sync

**File:** `src/pages/ChordTool.jsx:337-354`

The visual follow-along loop runs to completion before `playSequence` is called. Audio and visual are completely decoupled.

**Change:** Replace the two-phase approach with a single unified loop:
- Pre-schedule all notes with `audioEngine` at precise `AudioContext` times (like `playSequence` does internally).
- For each note, also schedule a `setTimeout` aligned to the same timing to update `activeNotes` for visual feedback.
- Remove the separate `playSequence` call after the visual loop.

### Issue 4 — Stale closure in sequencer playback

**File:** `src/pages/ChordTool.jsx:460-476`

`startPlayback` captures `activeTrack.chords` at call time. The `setInterval` callback references this stale snapshot.

**Change:**
- Add a `chordsRef` using `useRef`, kept in sync via a `useEffect` that updates `chordsRef.current = activeTrack.chords` on every change.
- Inside the `setInterval` callback, read from `chordsRef.current` instead of the closed-over `activeTrack.chords`.

### Issue 5 — countsByType ignores custom scale mode

**File:** `src/pages/ChordTool.jsx:177-200`

The sidebar chord counts always use `selectedRaga.pattern` even in custom scale mode.

**Change:** Apply the same pattern-selection logic used in the `chords` useMemo:
- If `customScaleMode` is active and has notes, use `customNotePattern`.
- Otherwise use `selectedRaga.pattern`.
- Add `customScaleMode` and `customNotePattern` to the dependency array.

### Issue 6 — localStorage restore race condition

**File:** `src/pages/ChordTool.jsx:153-168`

Two separate `useEffect`s for loading and saving progressions. The save effect fires on mount with the initial empty state, overwriting localStorage.

**Change:** Replace with lazy initialization:
```js
const [rhythmProgressions, setRhythmProgressions] = useState(() => {
  try {
    const saved = localStorage.getItem('samvad_progressions');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error("Failed to load progressions:", e);
  }
  return [
    { id: 1, name: 'T1', chords: [], isPlaying: false, currentBeat: 0 },
    { id: 2, name: 'T2', chords: [], isPlaying: false, currentBeat: 0 },
    { id: 3, name: 'T3', chords: [], isPlaying: false, currentBeat: 0 },
    { id: 4, name: 'T4', chords: [], isPlaying: false, currentBeat: 0 }
  ];
});
```
Delete the load-from-localStorage `useEffect` (lines 153-164). Keep only the save effect.

### Issue 7 — playChord doesn't check AudioContext state

**File:** `src/utils/audioEngine.js:143`

`playChord` doesn't call `ctx.resume()` unlike `playNote` and `playSequence`.

**Change:** Add at the top of `playChord`:
```js
if (ctx.state === 'suspended') await ctx.resume();
```

---

## Group 2: Cleanup & Engineering

### Issue 10 — CSS overrides to design tokens

**Files:** `src/index.css`, `tailwind.config.js`, new file `src/styles/tokens.css`, all components using overridden classes

The current `index.css` overrides Tailwind utilities like `.bg-white` with `!important`, breaking their semantic meaning.

**Change:**
1. Create `src/styles/tokens.css` with CSS custom properties:
   ```css
   :root {
     --bg-base: #000000;
     --bg-surface: #1f1b38;
     --bg-elevated: #334155;
     --bg-input: #334155;
     --text-primary: #e2e8f0;
     --text-secondary: #cbd5e1;
     --text-muted: #94a3b8;
     --border-default: #475569;
     --border-subtle: #64748b;
     --accent-blue: #3b82f6;
     --accent-purple: #8b5cf6;
     --accent-emerald: #10b981;
   }
   ```
2. Import `tokens.css` in `index.css` (before Tailwind directives).
3. Extend `tailwind.config.js`:
   ```js
   theme: {
     extend: {
       colors: {
         surface: 'var(--bg-surface)',
         elevated: 'var(--bg-elevated)',
         'input-bg': 'var(--bg-input)',
       },
       textColor: {
         primary: 'var(--text-primary)',
         secondary: 'var(--text-secondary)',
         muted: 'var(--text-muted)',
       },
       borderColor: {
         default: 'var(--border-default)',
         subtle: 'var(--border-subtle)',
       }
     }
   }
   ```
4. In components, replace overridden classes:
   - `bg-white` -> `bg-surface`
   - `bg-gray-50` -> `bg-elevated`
   - `text-gray-800` -> `text-primary`
   - `text-gray-600`, `text-gray-700` -> `text-secondary`
   - `border-gray-200` -> `border-default`
   - `bg-blue-50` -> appropriate dark equivalent
5. Delete all `!important` overrides from `index.css` (lines 35-75).
6. Update the global `input, select, textarea` rule to use token variables instead of hardcoded hex.

### Issue 11 — Remove debug console.logs

**Files:** `src/App.jsx:41`, `src/pages/ChordTool.jsx:20`

**Change:** Delete both `console.log` statements.

### Issue 12 — Remove dead code

**Changes:**
- Delete `src/components/SearchFilters.jsx`
- Delete `src/components/RagaCard.jsx`
- Remove `import RagaSelector` from `ChordTool.jsx:2`
- Remove `const [scaleMode, setScaleMode] = useState('full')` from `ChordTool.jsx:37`
- Remove `loadBuffer` function from `audioEngine.js:14-39` (its caching logic is absorbed into the new `resolveNoteBuffer`)
- Remove `getPianoKeyPositions` function from `musicTheory.js:137-166`
- Remove `frequency` property computation from `arrangeNotesAscending`, `arrangeNotesDescending`, `arrangeChordNotes` in `musicTheory.js` (return only `{ noteIndex, octave }`)
- Remove unused `getFrequencyFromNote` from `musicTheory.js:128-135` (nothing will use it after frequency removal)
- Remove `import { Link }` from `App.jsx:2` (keep the other imports from react-router-dom)

### Issue 13 — Duplicate SWAR_NAMES

**File:** `src/pages/ChordTool.jsx:268`

**Change:** Delete the inline `SWAR_NAMES` array. Import `swarNames` from `../utils/musicTheory` (already imported on line 9). Replace all `SWAR_NAMES` references with `swarNames`.

### Issue 14 — Audio caching overhaul + background preload

**File:** `src/utils/audioEngine.js`

The current `getNoteFilename` fetches and decodes on every call. `loadBuffer` has proper caching but is never used.

**Change:**
1. Create a `resolveNoteBuffer(noteIndex, octave)` function that:
   - Builds a cache key like `${noteIndex}-${octave}`
   - Checks `bufferCache[key]` — if found, returns it immediately
   - Otherwise, runs the existing `getNoteFilename` logic (try naming variants, fetch, decode)
   - Stores result in `bufferCache[key]`
   - Returns the buffer (or null)

2. Refactor `playNote` and `playChord` to call `resolveNoteBuffer` instead of `getNoteFilename`.

3. Add `preloadAllPianoSamples()` export:
   ```js
   export const preloadAllPianoSamples = async () => {
     const octaves = [3, 4, 5];
     const notes = Array.from({ length: 12 }, (_, i) => i);
     await Promise.all(
       octaves.flatMap(oct =>
         notes.map(note => resolveNoteBuffer(note, oct))
       )
     );
   };
   ```

4. In `ChordTool.jsx`, add a post-render preload effect:
   ```js
   useEffect(() => {
     if (!loading) {
       const id = requestIdleCallback(() => preloadAllPianoSamples());
       return () => cancelIdleCallback(id);
     }
   }, [loading]);
   ```

### Issue 15 — Tanpura fallback naming fix

**File:** `src/utils/audioEngine.js:228-235`

**Change:** Replace the broken `fileName.replace('b', '#')` with a proper mapping:
```js
const FLAT_TO_SHARP = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };

const namingVariants = [
  fileName,
  FLAT_TO_SHARP[fileName.replace('.mp3', '')]
    ? `${FLAT_TO_SHARP[fileName.replace('.mp3', '')]}.mp3`
    : null,
  'C.mp3'
].filter(Boolean);
```

### Issue 16 — Redundant ragas state

**File:** `src/pages/ChordTool.jsx`

**Change:**
- Replace `const [ragas, setRagas] = useState([])` with a derived value: `const ragas = isCarnaticMode ? melakartaRagas : hindustaniRagas;`
- Delete the mode-switching `useEffect` (lines 110-122).
- Move the "select first raga" logic into the data-loading `useEffect` and the `isCarnaticMode` change handler (inline in the checkbox `onChange`), or a simpler `useEffect` that only handles initial raga selection when the list changes.

### Issue 17 — CSV parsing hardening

**File:** `src/utils/dataLoader.js`

**Change:** Add HTTP status checks to both loader functions:
```js
const response = await fetch('/aarohavroha.csv');
if (!response.ok) throw new Error(`Failed to load ragas: HTTP ${response.status}`);
```
Same for `loadMelakartaRagas`. No CSV library needed — the current data doesn't contain commas in fields.

### Issue 18 — Unison button doesn't respect mode

**File:** `src/pages/ChordTool.jsx:328-331`

**Change:** Replace:
```js
if (mode === 'melody' || arpeggiationDelay > 0) {
```
With:
```js
const delay = mode === 'unison' ? 0 : arpeggiationDelay;
playChord(arranged, chordNoteDuration, delay);
```
Remove the if/else entirely — always call `playChord` with the appropriate delay.

---

## Group 3: Polish

### Issue 19 — ErrorBoundary recovery

**File:** `src/App.jsx:24-36`

**Change:** Add a reload button to the error fallback:
```jsx
<button
  onClick={() => window.location.reload()}
  style={{ marginTop: '20px', padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
>
  Reload Page
</button>
```

### Issue 20 — arrangeChordNotes forces root position

**File:** `src/utils/musicTheory.js:246`

**Change:** Remove `const pcs = [...noteIndices].sort((a, b) => a - b);` and use `noteIndices` directly. The chord generation already produces notes in the correct stacking order (root, third, fifth, etc. via intervals). Sorting destroys inversions.

### Issue 21 — No tanpura cleanup on unmount

**File:** `src/pages/ChordTool.jsx:479-481`

**Change:** Update the cleanup effect:
```js
useEffect(() => {
  return () => {
    stopPlayback();
    stopTanpura();
  };
}, []);
```

### Issue 22 — Missing displayName on memo'd components

**Files:** `src/components/Piano.jsx`, `src/components/BeatCell.jsx`

**Change:** Add after each memo declaration:
```js
WhiteKey.displayName = 'WhiteKey';
BlackKey.displayName = 'BlackKey';
BeatCell.displayName = 'BeatCell';
```

### Issue 23 — Inconsistent activeNotes format

**File:** `src/pages/ChordTool.jsx`

**Change:** Standardize on the object format `{ pc, oct }` everywhere:
- `handleChordClick` (line 326): change to:
  ```js
  const arranged = arrangeChordNotes(chord.notes, 3, rootNote);
  setActiveNotes(arranged.map(n => ({ pc: (n.noteIndex + rootNote) % 12, oct: n.octave })));
  ```
- Piano's `checkActive` (Piano.jsx:80-85): remove the `typeof note === 'number'` branch, only handle the object format.
- Verify no other callers set `activeNotes` as plain numbers.

---

## New File Summary

| File | Action |
| ---- | ------ |
| `src/styles/tokens.css` | Create (design tokens) |
| `src/components/SearchFilters.jsx` | Delete |
| `src/components/RagaCard.jsx` | Delete |

All other changes are modifications to existing files.

---

## Phase C (deferred)

After Phase B is stable:
- **Issue 8:** Extract custom hooks from ChordTool (`useRaga`, `useSequencer`, `useAudioPlayback`, `useCustomChord`)
- **Issue 9:** Introduce Context providers (`SequencerContext`, `MidiContext`, `RagaContext`) to eliminate prop drilling through CompositionPanel

---

## Execution Order

Within Phase B, the recommended execution order is:

1. **Issue 12** (dead code removal) — reduces noise for all subsequent changes
2. **Issues 11, 13** (console.logs, duplicate constant) — trivial cleanup
3. **Issue 10** (design tokens) — foundational CSS change, best done before other component edits
4. **Issues 1, 2, 5, 16, 17, 18** (straightforward fixes with no cross-dependencies)
5. **Issues 3, 4, 6, 7, 14, 15** (audio/playback/caching changes — related, best done together)
6. **Issues 19, 20, 21, 22, 23** (polish — independent of each other)
