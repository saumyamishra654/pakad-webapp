# Codebase Refactor Plan

This document tracks all 23 issues identified in the code review, organized by priority.

---

## Broken Functionality

### 1. Chord filtering by Aaroh/Avroh is broken
**File:** `src/components/ChordDisplay.jsx:116`
**Issue:** When `separateAarohAvroh` is enabled, the Aaroh chord section filters for `c.source === 'Aaroh'`, but `ChordTool.jsx:219-220` tags chords with `source: 'Aaroha'` (trailing 'a'). The strings don't match, so the Aaroh section only shows chords tagged 'Both', never Aaroha-exclusive chords.
**Fix:** Change `'Aaroh'` to `'Aaroha'` in ChordDisplay.jsx:116.
**Status:** [ ]

### 2. Note filter on RagaCircle cannot be set
**Files:** `src/pages/ChordTool.jsx:1016`, `src/components/RagaCircle.jsx:119`
**Issue:** The circle's note dots call `onNoteClick(index)` which is bound to `handleNoteClick` — this plays the note but never sets `selectedNoteFilter`. There is no code path that ever calls `setSelectedNoteFilter(someValue)`. The "Filter Mode" dropdown and "Click notes to filter chords" hint are non-functional.
**Fix:** Pass a separate `onNoteFilterClick` handler to RagaCircle that calls `setSelectedNoteFilter`, or modify the circle's `onNoteClick` to set the filter.
**Status:** [ ]

### 3. `playChalan` audio and visuals are completely out of sync
**File:** `src/pages/ChordTool.jsx:337-354`
**Issue:** The visual follow-along (`for...of` loop with `await setTimeout(450ms)`) runs to completion first, then `playSequence` is called after all visual updates are done. Audio and visual are decoupled entirely.
**Fix:** Integrate visual updates into the `playSequence` timing, or schedule both together using AudioContext timing.
**Status:** [ ]

### 4. Stale closure in sequencer playback
**File:** `src/pages/ChordTool.jsx:460-476`
**Issue:** `startPlayback` captures `activeTrack.chords` at call time and uses it inside `setInterval`. If chords change during playback, the interval still references the old array.
**Fix:** Use a ref to hold the current chords, or read from state inside the interval using a functional update pattern.
**Status:** [ ]

### 5. `countsByType` ignores custom scale mode
**File:** `src/pages/ChordTool.jsx:177-200`
**Issue:** Sidebar chord counts always use `selectedRaga.pattern` even when `customScaleMode` is active. Counts don't reflect the custom scale.
**Fix:** Use the same pattern-selection logic as the `chords` useMemo (check `customScaleMode` first).
**Status:** [ ]

### 6. localStorage restore race condition
**File:** `src/pages/ChordTool.jsx:153-168`
**Issue:** Two separate `useEffect`s: one loads from localStorage, one saves on change. On mount, the save effect fires with the initial empty state and overwrites localStorage before the loaded data triggers a re-render.
**Fix:** Use lazy initialization: `useState(() => { const saved = localStorage.getItem(...); return saved ? JSON.parse(saved) : defaultValue; })`.
**Status:** [ ]

### 7. `playChord` in audioEngine doesn't check AudioContext state
**File:** `src/utils/audioEngine.js:143`
**Issue:** Unlike `playNote` and `playSequence`, `playChord` never calls `ctx.resume()`. If the browser has suspended the context, chords fail silently.
**Fix:** Add `if (ctx.state === 'suspended') await ctx.resume();` at the start of `playChord`.
**Status:** [ ]

---

## Engineering Issues

### 8. God component: ChordTool.jsx (1095 lines, 30+ useState hooks)
**File:** `src/pages/ChordTool.jsx`
**Issue:** Single component manages raga selection, chord computation, custom scale editing, custom chord building, audio playback, sequencer logic, MIDI export, tanpura state, and the entire layout.
**Fix:** Extract custom hooks: `useSequencer()`, `useRaga()`, `useAudioPlayback()`, `useCustomChord()`. Consider React Context for shared state.
**Status:** [ ]

### 9. Extreme prop drilling (25+ props on CompositionPanel)
**Files:** `src/pages/ChordTool.jsx`, `src/components/CompositionPanel.jsx`
**Issue:** CompositionPanel takes 25 props, most forwarded to children. ChordTool passes 30+ props downstream.
**Fix:** Introduce Context providers (e.g., `SequencerContext`, `MidiContext`) to eliminate pass-through props.
**Status:** [ ]

### 10. Global CSS overrides hijack Tailwind semantics
**File:** `src/index.css:35-75`
**Issue:** `.bg-white { background-color: #1f1b38 !important; }` makes `bg-white` render as dark purple. Breaks Tailwind's semantic meaning and confuses future developers.
**Fix:** Replace Tailwind light-mode classes in components with correct dark classes directly. Remove the global overrides.
**Status:** [ ]

### 11. Debug console.log left in production code
**Files:** `src/App.jsx:41`, `src/pages/ChordTool.jsx:20`
**Issue:** `console.log("App component rendering")` and `console.log("ChordTool component rendering")` fire on every render.
**Fix:** Remove both console.log statements.
**Status:** [ ]

### 12. Dead code
**Issue:** Multiple unused components, functions, imports, and state variables.

| What | Where |
|------|-------|
| `RagaSelector` component | Imported `ChordTool.jsx:2`, never rendered |
| `SearchFilters` component | Never imported anywhere |
| `RagaCard` component | Never imported anywhere |
| `scaleMode` state | `ChordTool.jsx:37` — declared, never read or set |
| `loadBuffer` function | `audioEngine.js:14-39` — never called |
| `getPianoKeyPositions` function | `musicTheory.js:137-166` — never called |
| `frequency` property | Computed in arrange* functions but never used by audioEngine |
| `Link` import | `App.jsx:2` — imported, never used |

**Fix:** Remove all dead code.
**Status:** [ ]

### 13. SWAR_NAMES duplicated inside component
**File:** `src/pages/ChordTool.jsx:268`
**Issue:** `SWAR_NAMES` array re-created every render, duplicates `swarNames` from `musicTheory.js`.
**Fix:** Import `swarNames` from musicTheory.js instead.
**Status:** [ ]

### 14. `getNoteFilename` fetches every time, `loadBuffer` is unused
**File:** `src/utils/audioEngine.js:41-88`
**Issue:** `getNoteFilename` does `fetch` + `decodeAudioData` on every call. `playChord` calls it for every note without checking `bufferCache`. The well-written `loadBuffer` function with proper caching exists but is never used.
**Fix:** Refactor to use `loadBuffer` (or integrate its caching logic into `getNoteFilename`). Cache the URL-to-buffer mapping so repeated notes don't re-fetch.
**Status:** [ ]

### 15. Tanpura fallback naming logic is broken
**File:** `src/utils/audioEngine.js:232`
**Issue:** `fileName.replace('b', '#')` produces incorrect enharmonic mappings: Eb→E#, Gb→G#, Ab→A#, Bb→B#. Only Db→D# works.
**Fix:** Use a proper flat-to-sharp mapping table: `{ Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' }`.
**Status:** [ ]

### 16. `ragas` state is redundant
**File:** `src/pages/ChordTool.jsx:23`
**Issue:** `ragas` is always derived from `isCarnaticMode ? melakartaRagas : hindustaniRagas`. Having it as separate state introduces sync risks.
**Fix:** Replace with `const ragas = isCarnaticMode ? melakartaRagas : hindustaniRagas;` and remove the `setRagas` calls and the mode-switching useEffect.
**Status:** [ ]

### 17. Naive CSV parsing
**File:** `src/utils/dataLoader.js:3-12`
**Issue:** `parseCSV` splits on commas without handling quoted fields. Also, `loadHindustaniRagas` and `loadMelakartaRagas` don't check `response.ok` — a 404 will parse HTML as CSV silently.
**Fix:** Add `if (!response.ok) throw new Error(...)` checks. Consider handling quoted CSV fields or using a lightweight CSV library.
**Status:** [ ]

### 18. `handleChordClick` ignores mode when arpDelay > 0
**File:** `src/pages/ChordTool.jsx:328-331`
**Issue:** Even when user clicks "Unison" (mode='unison'), if `arpeggiationDelay > 0` (default 0.04), the chord arpeggiates. The "Unison" button doesn't actually play unison.
**Fix:** Respect the `mode` parameter: only use `arpeggiationDelay` when `mode === 'melody'`.
**Status:** [ ]

### 19. ErrorBoundary has no recovery path
**File:** `src/App.jsx:8-38`
**Issue:** Error screen shows the stack trace but no "Retry" or "Reload" button. Users are stuck.
**Fix:** Add a button that calls `this.setState({ hasError: false })` or `window.location.reload()`.
**Status:** [ ]

### 20. `arrangeChordNotes` forces root position
**File:** `src/utils/musicTheory.js:246`
**Issue:** `const pcs = [...noteIndices].sort((a, b) => a - b);` destroys all chord voicings/inversions. Every chord plays in root position.
**Fix:** Remove the sort, or make it optional via a parameter, to allow inversions.
**Status:** [ ]

### 21. No tanpura cleanup on unmount
**File:** `src/pages/ChordTool.jsx:479-481`
**Issue:** Cleanup effect stops the sequencer interval but not the tanpura. If ChordTool unmounts while tanpura is playing, the drone continues indefinitely.
**Fix:** Add `stopTanpura()` to the cleanup effect.
**Status:** [ ]

### 22. Missing `displayName` on memo'd components
**Files:** `src/components/Piano.jsx`, `src/components/BeatCell.jsx`
**Issue:** `WhiteKey`, `BlackKey`, and `BeatCell` use `React.memo` without `displayName`. They appear as "Anonymous" in React DevTools.
**Fix:** Add `WhiteKey.displayName = 'WhiteKey';` etc. after each memo declaration.
**Status:** [ ]

### 23. Inconsistent `activeNotes` format
**File:** `src/pages/ChordTool.jsx:317 vs 326`
**Issue:** `handleNoteClick` sets `activeNotes` to `[{ pc, oct }]` (object). `handleChordClick` sets it to `[number, ...]` (pitch classes). Note clicks highlight one specific key; chord clicks highlight all octaves. The Piano's `checkActive` handles both but behavior is inconsistent.
**Fix:** Standardize on one format. If specific-key highlighting is desired, use objects everywhere.
**Status:** [ ]
