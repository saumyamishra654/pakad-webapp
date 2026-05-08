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

**Done when:**
- With `separateAarohAvroh` enabled, the "Aaroh Chords" section displays chords whose `source` is `'Aaroha'` (not just `'Both'`).
- Select a raga with different aaroh/avroh patterns (e.g., one that has aaroha-exclusive notes). Verify the Aaroh section shows chords that only appear in the ascending scale.
- `npm run build` succeeds.

### Issue 2 — Note filter on RagaCircle cannot be set

**Files:** `src/pages/ChordTool.jsx`, `src/components/RagaCircle.jsx`

The circle's note dots call `onNoteClick(index)` which plays the note but never sets `selectedNoteFilter`. No code path ever calls `setSelectedNoteFilter(value)`. The filter UI is non-functional.

**Change:**
- Add a new prop `onNoteFilterClick` to `RagaCircle` and `CircleRenderer`.
- In `CircleRenderer`, the note dot's `onClick` calls `onNoteFilterClick(index)` instead of `onNoteClick(index)`.
- In ChordTool, pass `onNoteFilterClick={setSelectedNoteFilter}` to `RagaCircle`.
- Keep `onNoteClick` available for cases where audio playback from the circle is desired (currently not wired — can be added later).

**Done when:**
- Clicking a note on the RagaCircle filters the chord list below to only show chords matching that note (respecting the "Root Note" / "Contains Note" filter mode dropdown).
- The clicked note is visually highlighted (purple) on the circle.
- Clicking "Clear Filter" removes the filter and restores the full chord list.
- Clicking a different note switches the filter to the new note.

### Issue 3 — playChalan audio and visuals out of sync

**File:** `src/pages/ChordTool.jsx:337-354`

The visual follow-along loop runs to completion before `playSequence` is called. Audio and visual are completely decoupled.

**Change:** Replace the two-phase approach with a single unified loop:
- Pre-schedule all notes with `audioEngine` at precise `AudioContext` times (like `playSequence` does internally).
- For each note, also schedule a `setTimeout` aligned to the same timing to update `activeNotes` for visual feedback.
- Remove the separate `playSequence` call after the visual loop.
- Store all scheduled timeout IDs in a ref (`chalanTimeoutsRef`).

**Cancellation behavior:**
- If `playChalan` is called again while a previous chalan is playing, cancel all pending timeouts from `chalanTimeoutsRef` and clear `activeNotes` before starting the new one.
- On unmount, cancel all pending chalan timeouts in the cleanup effect (alongside `stopPlayback` and `stopTanpura`).
- No drift handling needed: `setTimeout` drift at 450ms intervals is imperceptible for visual highlighting, and audio scheduling via `AudioContext.currentTime` is drift-free by design.

**Done when:**
- Playing Aaroh/Avroh Chalan shows each note highlighted on the piano at the same moment its audio plays.
- Clicking a chalan button while another is playing cancels the first and starts the new one cleanly.
- Unmounting ChordTool during chalan playback produces no errors or orphaned timeouts.

### Issue 4 — Stale closure in sequencer playback

**File:** `src/pages/ChordTool.jsx:460-476`

`startPlayback` captures `activeTrack.chords` at call time. The `setInterval` callback references this stale snapshot.

**Change:**
- Add refs for values that should update live during playback: `chordsRef`, `rootNoteRef`, `playbackModeRef`, `arpeggiationDelayRef`, `chordNoteDurationRef`, `cycleLoopRef`.
- Keep each ref in sync via `useEffect`s that update `ref.current` when the corresponding state changes.
- Inside the `setInterval` callback, read from refs instead of closed-over state.
- `cycleBpm` change during playback: the current interval keeps its pace until the user stops and restarts. Changing BPM mid-playback does not restart the interval (this matches DAW behavior where BPM changes take effect on next play). Document this as intentional.
- `rootNote` and `playbackMode` changes during playback take effect immediately on the next beat (read from refs).

**Done when:**
- Adding a chord to the timeline during playback: the new chord plays on its assigned beat in the next cycle.
- Removing a chord during playback: it stops playing on the next cycle.
- Changing `rootNote` during playback: chords transpose on the next beat.
- Changing playback mode (unison/melody) during playback: takes effect on the next beat.
- Changing BPM during playback: no effect until stop/restart (intentional).

### Issue 5 — countsByType ignores custom scale mode

**File:** `src/pages/ChordTool.jsx:177-200`

The sidebar chord counts always use `selectedRaga.pattern` even in custom scale mode.

**Change:** Apply the same pattern-selection logic used in the `chords` useMemo:
- If `customScaleMode` is active and has notes, use `customNotePattern`.
- Otherwise use `selectedRaga.pattern`.
- Add `customScaleMode` and `customNotePattern` to the dependency array.

**Done when:**
- Enable custom scale mode, toggle some notes. The sidebar chord type counts reflect the custom pattern, not the selected raga's pattern.
- Switch back to raga mode: counts revert to raga-based values.

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

**Done when:**
- Add chords to a progression, refresh the page. Chords persist correctly.
- Open DevTools > Application > localStorage, verify `samvad_progressions` is never overwritten with empty data on page load.
- Corrupted localStorage (manually set to `"not json"`) falls back to default empty tracks without crashing.

### Issue 7 — playChord doesn't check AudioContext state

**File:** `src/utils/audioEngine.js:143`

`playChord` doesn't call `ctx.resume()` unlike `playNote` and `playSequence`.

**Change:** Add at the top of `playChord`:
```js
if (ctx.state === 'suspended') await ctx.resume();
```

**Done when:**
- Open the app in a fresh tab (no prior interaction). Click a chord card. Audio plays (no silent failure).
- Verify `playNote` and `playSequence` still work as before.

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

**Rollout strategy:**
1. First: create `tokens.css` and update `tailwind.config.js`. No visual change yet.
2. Second: migrate one component at a time, starting with `ChordTool.jsx` (has the most overridden classes), then `RagaSelector.jsx`, then `ChordDisplay.jsx`.
3. After each component: `npm run build` + visual spot-check that the component looks identical.
4. Last: delete the `!important` overrides from `index.css` only after all components are migrated. Do a full page visual walkthrough.
5. If any component still uses an overridden class post-migration, the override deletion will reveal it as a visible color break — fix before committing.

**Done when:**
- `index.css` has zero `!important` overrides for Tailwind utility classes.
- All components use semantic token classes (`bg-surface`, `text-primary`, etc.).
- Full visual walkthrough: controls panel, piano, circle, chord cards, composition panel, MIDI settings all render with correct dark theme colors.
- `npm run build` succeeds.

### Issue 11 — Remove debug console.logs

**Files:** `src/App.jsx:41`, `src/pages/ChordTool.jsx:20`

**Change:** Delete both `console.log` statements.

**Done when:**
- No `"App component rendering"` or `"ChordTool component rendering"` in browser console during normal usage.

### Issue 12 — Remove dead code

**Pre-delete audit:** Before removing each item, run `rg` (ripgrep) across the entire `src/` directory to confirm zero references beyond the declaration/import site. Run `npm run build` after all removals to confirm no build errors.

**Changes:**
- Delete `src/components/SearchFilters.jsx` — audit: `rg "SearchFilters" src/`
- Delete `src/components/RagaCard.jsx` — audit: `rg "RagaCard" src/`
- Remove `import RagaSelector` from `ChordTool.jsx:2` — audit: `rg "RagaSelector" src/pages/ChordTool.jsx` (confirm no JSX usage)
- Remove `const [scaleMode, setScaleMode] = useState('full')` from `ChordTool.jsx:37` — audit: `rg "scaleMode" src/`
- Remove `loadBuffer` function from `audioEngine.js:14-39` — audit: `rg "loadBuffer" src/` (confirm only declaration, no callers)
- Remove `getPianoKeyPositions` function from `musicTheory.js:137-166` — audit: `rg "getPianoKeyPositions" src/`
- Remove `frequency` property computation from `arrangeNotesAscending`, `arrangeNotesDescending`, `arrangeChordNotes` in `musicTheory.js` (return only `{ noteIndex, octave }`) — audit: `rg "\.frequency" src/` to confirm no consumer
- Remove unused `getFrequencyFromNote` from `musicTheory.js:128-135` — audit: `rg "getFrequencyFromNote" src/` (confirm only called by arrange functions being modified)
- Remove `import { Link }` from `App.jsx:2` (keep the other imports from react-router-dom) — audit: `rg "Link" src/App.jsx` (confirm no JSX usage)

**Done when:**
- `rg` confirms zero remaining references to each removed item.
- `npm run build` succeeds with no errors.
- `npm run lint` produces no new warnings related to missing imports.

### Issue 13 — Duplicate SWAR_NAMES

**File:** `src/pages/ChordTool.jsx:268`

**Change:** Delete the inline `SWAR_NAMES` array. Import `swarNames` from `../utils/musicTheory` (already imported on line 9). Replace all `SWAR_NAMES` references with `swarNames`.

**Done when:**
- `rg "SWAR_NAMES" src/` returns zero results.
- Custom chord builder still displays correct swara names.

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

4. In `ChordTool.jsx`, add a post-render preload effect with `requestIdleCallback` and fallback:
   ```js
   useEffect(() => {
     if (!loading) {
       const schedule = window.requestIdleCallback || ((cb) => setTimeout(cb, 200));
       const cancel = window.cancelIdleCallback || clearTimeout;
       const id = schedule(() => preloadAllPianoSamples());
       return () => cancel(id);
     }
   }, [loading]);
   ```

**Done when:**
- Open Network tab in DevTools. On page load, after initial render, 36 piano sample requests fire in the background.
- Playing a note for the first time has no perceptible delay (buffer is pre-cached).
- Playing the same note twice does NOT trigger a second network request (check Network tab).
- `npm run build` succeeds.

### Issue 15 — Tanpura fallback naming fix

**File:** `src/utils/audioEngine.js:228-235`

**Change:** Replace the broken `fileName.replace('b', '#')` with a proper mapping:
```js
const FLAT_TO_SHARP = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };
const baseName = fileName.replace('.mp3', '');

const namingVariants = [
  fileName,
  FLAT_TO_SHARP[baseName] ? `${FLAT_TO_SHARP[baseName]}.mp3` : null,
  'C.mp3'
].filter(Boolean);
```

**Done when:**
- Set tonic to Eb, play tanpura. It loads `Eb.mp3` or falls back to `D#.mp3`, not `E#.mp3`.
- Set tonic to Bb, play tanpura. Falls back correctly to `A#.mp3`, not `B#.mp3`.
- Set tonic to C (natural), play tanpura. Loads `C.mp3` directly without trying fallbacks.

### Issue 16 — Redundant ragas state

**File:** `src/pages/ChordTool.jsx`

**Change:**
- Replace `const [ragas, setRagas] = useState([])` with a derived value: `const ragas = isCarnaticMode ? melakartaRagas : hindustaniRagas;`
- Delete the mode-switching `useEffect` (lines 110-122).
- Add a simpler `useEffect` for initial raga selection:
  ```js
  useEffect(() => {
    if (ragas.length > 0 && (!selectedRaga || (isCarnaticMode !== !!selectedRaga.isMelakarta))) {
      setSelectedRaga(ragas[0]);
    }
  }, [ragas, isCarnaticMode]);
  ```

**Done when:**
- Toggle Carnatic mode on: raga dropdown shows Melakarta ragas, first one is selected.
- Toggle back to Hindustani: dropdown shows Hindustani ragas, first one is selected.
- `rg "setRagas" src/` returns zero results.

### Issue 17 — CSV parsing hardening

**File:** `src/utils/dataLoader.js`

**Approach:** Strict minimal parser. No library. The current CSVs are simple (no quoted fields, no commas in values). The parser stays as-is (naive comma split) but gains HTTP error guards and malformed-row handling.

**Change:**
- Add HTTP status checks:
  ```js
  const response = await fetch('/aarohavroha.csv');
  if (!response.ok) throw new Error(`Failed to load ragas: HTTP ${response.status}`);
  ```
- Same for `loadMelakartaRagas`.
- Malformed-file behavior: if the CSV has zero parseable rows after headers, return an empty array (already the case). If `response.ok` but content is not valid CSV (e.g., HTML error page from a misconfigured server), the parser will produce empty/garbage rows which the existing `parseSequenceAndPattern` handles gracefully (returns empty patterns). No additional guard needed.
- Edge cases NOT handled (and not needed): quoted fields, embedded commas, BOM characters. If the CSV format changes to include these, switch to a library like `papaparse` at that time.

**Done when:**
- Rename `aarohavroha.csv` temporarily in `public/`. Verify the app shows the error UI with "Failed to load ragas: HTTP 404" instead of silently rendering garbage.
- Restore the file, verify normal loading works.

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

**Done when:**
- Click "Unison" on a chord card: all notes sound simultaneously (no arpeggiation), regardless of the Arp Delay slider value.
- Click "Melody" on a chord card: notes arpeggiate according to the Arp Delay slider.
- Change Arp Delay slider to 0, click "Melody": plays unison (delay is 0). This is correct.

---

## Group 3: Polish

### Issue 19 — ErrorBoundary recovery

**File:** `src/App.jsx:24-36`

**Primary behavior:** Full page reload via `window.location.reload()`. A state reset (`setState({ hasError: false })`) risks re-triggering the same error from corrupted state and is not used.

**Change:** Add a reload button to the error fallback:
```jsx
<button
  onClick={() => window.location.reload()}
  style={{ marginTop: '20px', padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' }}
>
  Reload Page
</button>
```

**Done when:**
- Trigger an error (e.g., temporarily throw in a component render). The error screen shows a "Reload Page" button.
- Clicking it reloads the page and returns to normal operation.

### Issue 20 — arrangeChordNotes forces root position

**File:** `src/utils/musicTheory.js:246`

**Change:** Add an optional `sort` parameter (default `true` to preserve existing behavior). Set it to `false` in callers where input order should be preserved for future inversion support. Note: `selectedTonic` was already removed from this signature by Issue #12.

```js
export const arrangeChordNotes = (noteIndices, baseOctave = 3, sort = true) => {
    if (!noteIndices || noteIndices.length === 0) return [];
    const pcs = sort ? [...noteIndices].sort((a, b) => a - b) : [...noteIndices];
    // ... rest unchanged
};
```

Root position is still the default (existing callers are unaffected). Callers that want to preserve voicing pass `sort = false`.

**Done when:**
- Existing chord playback sounds identical (default `sort = true`).
- Custom chord builder with explicit intervals plays notes in the order they were added when `sort = false`.
- No existing tests or behavior regresses.

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

**Done when:**
- Start tanpura, navigate to `/query` or `/insights`. Tanpura audio stops.
- No console errors on unmount.

### Issue 22 — Missing displayName on memo'd components

**Files:** `src/components/Piano.jsx`, `src/components/BeatCell.jsx`

**Change:** Add after each memo declaration:
```js
WhiteKey.displayName = 'WhiteKey';
BlackKey.displayName = 'BlackKey';
BeatCell.displayName = 'BeatCell';
```

**Done when:**
- Open React DevTools. Components tree shows "WhiteKey", "BlackKey", "BeatCell" instead of "Anonymous".

### Issue 23 — Inconsistent activeNotes format

**File:** `src/pages/ChordTool.jsx`

**Change:** Standardize on the object format `{ pc, oct }` everywhere:
- `handleChordClick` (line 326): change to:
  ```js
  const arranged = arrangeChordNotes(chord.notes, 3, rootNote);
  setActiveNotes(arranged.map(n => ({ pc: (n.noteIndex + rootNote) % 12, oct: n.octave })));
  ```
- Piano's `checkActive` (Piano.jsx:80-85): remove the `typeof note === 'number'` branch, only handle the object format.
- Verify no other callers set `activeNotes` as plain numbers: `rg "setActiveNotes" src/` and inspect each call site.

**Done when:**
- Click a chord: only the specific keys (correct octave) light up on the piano, not all octaves.
- Click a single piano key: that specific key lights up.
- Play chalan: notes highlight one at a time on correct octave keys.
- `rg "typeof note === 'number'" src/` returns zero results (legacy branch removed).

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

---

## Verification Plan

### Automated Checks (run after each group)

- `npm run build` — zero errors
- `npm run lint` — no new warnings (baseline existing warnings are acceptable)

### Unit-Level Verification

| Module | What to verify |
| ------ | -------------- |
| `musicTheory.js` | `arrangeChordNotes` with `sort=true` produces same output as before; `sort=false` preserves input order. `getFrequencyFromNote` and `getPianoKeyPositions` are fully removed with no references. |
| `audioEngine.js` | `resolveNoteBuffer` caches correctly (second call returns cached buffer, no fetch). `playChord` resumes suspended context. `preloadAllPianoSamples` loads 36 buffers. Tanpura naming produces correct filenames for all 12 tonics. |
| `dataLoader.js` | 404 response throws with HTTP status. Valid CSV returns correct raga count (~400 Hindustani, 72 Melakarta). |

### Integration-Level Verification (manual in browser)

| Flow | Steps | Expected |
| ---- | ----- | -------- |
| Chord filtering | Enable Sep. Aaroh/Avroh, select raga with asymmetric scales | Aaroh section shows aaroha-exclusive chords; Avroh section shows avroha-exclusive chords |
| Note filter | Click note on circle, check chord list, change filter mode, clear filter | Chord list filters correctly; clearing restores full list |
| Sequencer playback | Add chords, play, add/remove chords during playback, change rootNote | Live changes reflected on next beat/cycle |
| localStorage | Add chords, refresh page | Chords persist. No data loss on load. |
| Custom scale counts | Enable custom scale, toggle notes | Sidebar counts update to match custom pattern |
| Unison vs Melody | Click Unison button with arpDelay > 0 | Notes play simultaneously |
| Tanpura fallback | Set tonic to Eb, Bb, Ab — play tanpura | Correct drone plays without error |

### Visual Regression Checklist (after Issue 10 CSS migration)

Walk through every visible section and confirm colors match pre-migration:

- [ ] Controls panel (raga selector, tonic, toggles, audio controls)
- [ ] Custom scale editor (note buttons, active states)
- [ ] Piano keyboard (white keys, black keys, active highlights, swara labels)
- [ ] Chord type sidebar (buttons, counts, active state, hover state)
- [ ] Custom chord builder (root selector, interval buttons, validation badges)
- [ ] RagaCircle (note dots, chord lines, legend)
- [ ] Composition panel (header, sequencer controls, track tabs)
- [ ] Beat cells (empty, with chord, playing highlight, breakpoint)
- [ ] MIDI settings panel (inputs, sliders, program buttons)
- [ ] Chord cards (normal, extended, outside-raga, play buttons)
- [ ] Error state (loading, error display)

### Audio/Timing Verification

- [ ] Chalan playback: visual highlighting syncs with audio within ~50ms
- [ ] Background preload: Network tab shows 36 sample fetches after page render, not during
- [ ] No duplicate fetches on repeated note plays (Network tab)
- [ ] Tanpura stops on unmount (navigate away while playing)
