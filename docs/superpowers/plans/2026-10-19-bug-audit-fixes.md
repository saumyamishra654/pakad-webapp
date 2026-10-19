# Bug Audit Fix Plan (2026-10-19)

Fixes for the 16 issues found in the 2026-10-19 audit. Work on branch `performance-optimisations`.
No test framework exists — verify with `npm run lint` (no NEW errors vs. baseline), `npm run build`, and the node MIDI check in Task 4.

Ground rules:
- Match surrounding style (4-space indent, arrow functions, no semicolon changes elsewhere).
- Do not refactor unrelated code. Do not touch `tech-case-study/`, `scripts/`, `CLAUDE.md` except where stated.
- Existing decision (from `2026-05-08-phase-b-refactor.md`): BPM and cycleBeats are captured when playback starts; changing them mid-playback takes effect on next Play. Keep that.
- One commit per task, message `Fix: <summary>`. **No Co-Authored-By line** (user preference).

---

## Task 1 — Transpose all audio playback by the tonic (Issue 1)

Chord/scale notes are Sa-relative pitch classes; `audioEngine` treats `noteIndex` as C-based. MIDI export already applies `tonicOffset`; audio does not.

**`src/utils/musicTheory.js`** — add after `arrangeChordNotes`:
```js
// Shift an arranged voicing ({noteIndex, octave}[]) up by `offset` semitones, preserving voicing shape
export const transposeVoicing = (voiced, offset) => {
    if (!offset) return voiced;
    return voiced.map(({ noteIndex, octave }) => {
        const abs = octave * 12 + noteIndex + offset;
        return { noteIndex: abs % 12, octave: Math.floor(abs / 12) };
    });
};
```
(Transpose AFTER arranging, so the voicing shape is the same in every key.)

**`src/pages/ChordTool.jsx`** — import `transposeVoicing` and apply `rootNote` at every place that plays audio:
- `playCustomChord`: `transposeVoicing(arrangeChordNotes(customChordNotes, 3), rootNote)`
- `handleChordClick`: `transposeVoicing(arrangeChordNotes(chord.notes, 3), rootNote)`
- `playChalan`: transpose the `arranged` array before `playSequence`.
- Sequencer tick (Task 5): transpose with the latest rootNote read from the ref.
- `handleNoteClick` is called by the Piano with absolute (C-based) pitch classes — leave it unchanged.

## Task 2 — Aaroh column label mismatch (Issue 2)

`src/components/ChordDisplay.jsx:116`: change `c.source === 'Aaroh'` → `c.source === 'Aaroha'`.

## Task 3 — Raga Circle click should filter chords (Issue 3)

The circle shows "Click notes to filter chords" but is wired to `handleNoteClick`.

In `ChordTool.jsx` add:
```js
const handleCircleNoteClick = (swarIndex) => {
    setSelectedNoteFilter(prev => (prev === swarIndex ? null : swarIndex));
    playNote((swarIndex + rootNote) % 12, 4);
};
```
Pass `onNoteClick={handleCircleNoteClick}` to `<RagaCircle>` (currently `handleNoteClick`, ~line 1011). Clicking the same note again clears the filter.

## Task 4 — MIDI export timing (Issue 4) + chords past cycle end (Issue 15)

Rewrite the event-generation loop in `src/utils/midiUtils.js` `buildMidiFromChords` to use **absolute ticks**, then convert to deltas. Keep the function signature and the header/track-chunk code.

Algorithm:
1. Filter to valid items (`chord.notes` non-empty), sort by `beat`.
2. For item `i`: `startTick = Math.round(beat * TPQ)`.
   `endTick = startTick + noteLenTicks`; if a next chord exists, clamp `endTick = Math.min(endTick, nextStartTick - gapTicks)`; finally `endTick = Math.max(endTick, startTick + 1)`.
   So `gapBeats` means "minimum silence before the next chord", and chords never overlap.
3. Push `{tick, kind: 'off'|'on', note}` for each note (clamp note 0–127).
4. Sort events by tick; at equal ticks, `off` comes before `on`.
5. Emit tempo + program change at delta 0, then each event with `delta = tick - prevTick`, then end-of-track.
6. Remove the old `currentTick` logic entirely.

In `ChordTool.jsx` `handleDownloadMIDI`, pass `chords: activeTrack.chords.filter(c => c.beat < cycleBeats)` (Issue 15: chords hidden beyond the cycle shouldn't be exported).

**Verify** with a scratch node script (do not commit it): chords at beats 0,4,8,12 with defaults (len 3.2, gap 0.4) must give onsets exactly `[0, 4, 8, 12]` beats; chords on beats 0,1,2,3 must give onsets `[0,1,2,3]` with each note-off at 0.6 beats after its onset (1 − 0.4).

## Task 5 — Sequencer rewrite: single loop, no stale closures, correct highlight (Issues 5, 6, 11-partial)

In `ChordTool.jsx`:

- Add a ref with the latest values, updated every render (just assign; no effect needed):
  ```js
  const latestRef = React.useRef({});
  latestRef.current = { rhythmProgressions, cycleLoop, playbackMode, arpeggiationDelay, chordNoteDuration, rootNote };
  ```
- Add `const playingTrackIdRef = React.useRef(null);`
- `stopPlayback`: clear the interval, set `playingTrackIdRef.current = null`, reset `isPlaying:false, currentBeat:0` on all tracks (as now).
- `startPlayback`:
  - If `playbackIntervalRef.current` is set → `stopPlayback(); return;` (only ever one loop).
  - Resume the AudioContext as now.
  - `const trackId = activeTrackId; playingTrackIdRef.current = trackId;` capture `beatMs` from `cycleBpm` and `totalBeats = cycleBeats` (intentional, see ground rules).
  - Define `tick`:
    ```js
    let beatIdx = 0;
    const tick = () => {
        const s = latestRef.current;
        if (beatIdx === 0 && hasPlayedOnce && !s.cycleLoop) { stopPlayback(); return; }
        const track = s.rhythmProgressions.find(p => p.id === trackId);
        const delay = s.playbackMode === 'unison' ? 0 : s.arpeggiationDelay;
        (track?.chords || []).filter(c => Math.floor(c.beat) === beatIdx).forEach(item => {
            playChord(transposeVoicing(arrangeChordNotes(item.chord.notes, 3), s.rootNote), s.chordNoteDuration, delay);
        });
        const shown = beatIdx;
        setRhythmProgressions(prev => prev.map(p => p.id === trackId ? { ...p, isPlaying: true, currentBeat: shown } : p));
        beatIdx = (beatIdx + 1) % totalBeats;
        hasPlayedOnce = true;
    };
    ```
    (declare `let hasPlayedOnce = false;`). Call `tick()` immediately, then `playbackIntervalRef.current = setInterval(tick, beatMs);`. The highlighted beat is now the one that is sounding, and beat 0 plays straight away.
  - Do NOT use `updateActiveTrack` inside the loop (it closes over a stale `activeTrackId`).
- Pass `isPlaying={rhythmProgressions.some(p => p.isPlaying)}` to `CompositionPanel` so the Stop button stays visible after switching tabs.
- Keep the unmount cleanup effect.

## Task 6 — Persistence (Issue 7)

In `ChordTool.jsx`:
- Replace the `rhythmProgressions` initial state with a lazy initializer that reads `localStorage['samvad_progressions']` inside try/catch, accepts only an array, and maps each track to `{ ...t, isPlaying: false, currentBeat: 0 }`; falls back to the 4 default tracks (keep the defaults in a module-level `DEFAULT_TRACKS` constant).
- Delete the load-from-localStorage `useEffect`.
- Save effect: write `rhythmProgressions.map(({ isPlaying, currentBeat, ...rest }) => rest)`, wrapped in try/catch. Note: with this change the save effect fires every beat during playback but the stripped payload is identical; that's acceptable. Optionally skip the write if the serialized string is unchanged (keep a ref of the last string) — do this, it's cheap.

## Task 7 — Tanpura key switching (Issue 8)

In `src/utils/audioEngine.js`:
- Add `let tanpuraFileName = null;` next to `tanpuraAudioElement`.
- In `playTanpura`, replace `!tanpuraAudioElement.src.includes(...)` with `tanpuraFileName !== fileName`; set `tanpuraFileName = fileName` after a successful load.
- `loadTanpuraFile`: remove the bogus variants (`'Db'.replace('b','#')` gives the wrong pitch and the `'#'→'s'` variant is a no-op) and the silent `C.mp3` fallback. Try only `fileName`; on failure throw (ChordTool already alerts). Keep the existing 5 s timeout/promise structure.

## Task 8 — Audio engine: buffer cache, arpeggio timing, resume (Issues 9, 10)

In `src/utils/audioEngine.js`:
- Make `getNoteFilename` cached: key `${noteIndex}${suffix}`; cache the **promise** (so concurrent requests share one fetch) in `bufferCache`. If the promise resolves to `null`, delete the cache entry so it can retry later. Return value stays `{ url, buffer }` or `null`.
- Remove the now-redundant cache write in `playNote` (lines ~91–94).
- `playChord`: `if (ctx.state === 'suspended') await ctx.resume();` then load all buffers first (`await Promise.all(notes.map(... getNoteFilename ...))`), THEN read `const now = ctx.currentTime;` and schedule every note at `now + i * delay`. Return the array of `{source, gainNode}` (skipping nulls) as before.
- `playSequence`: likewise load all buffers up front, then read `ctx.currentTime` and schedule.
- Update the `audioEngine.js` bullet in `CLAUDE.md` only if it becomes inaccurate (it says buffer caching — now true; no change needed).

## Task 9 — Unison/melody handling (Issue 11)

`handleChordClick(chord, mode = playbackMode)`; `const delay = mode === 'melody' ? arpeggiationDelay : 0;` and play once with that delay. Removes the `|| arpeggiationDelay > 0` branch. Card buttons pass explicit modes; timeline clicks (no mode) follow the global Playback setting. Note: if `arpeggiationDelay` is 0 the Melody button is effectively unison — acceptable.

## Task 10 — Chalan audio/visual sync + cancellation (Issue 12)

In `playChalan`:
- Add `const chalanRunRef = React.useRef(0);` at component level. At start: `const runId = ++chalanRunRef.current;`
- Compute `arranged`, then `const voiced = transposeVoicing(arranged, rootNote)`.
- Call `playSequence(voiced, 0.5, 0.1)` FIRST (do not await), then loop visual highlights with a 600 ms step (0.5 + 0.1), using `setActiveNotes([{ pc: n.noteIndex, oct: n.octave }])` so the exact key lights up. Break the loop if `chalanRunRef.current !== runId`. After the loop, clear active notes only if still the current run.
- Known limitation (don't fix): audio of a cancelled chalan keeps sounding since it's already scheduled.

## Task 11 — Chord dedupe mislabel (Issue 13)

In the `chords` useMemo, change the dedupe key to
`` `${chord.root}-${chord.type.id}-${chord.isExtended ? 'ext' : 'base'}-${chord.outsideCount ? 'out' : 'in'}` ``
so an in-raga chord and an outside chord with the same root and type no longer merge.

## Task 12 — Counts match displayed chords (Issue 14)

- Extract the pattern selection (currently `useCustomScale` + `patternsToProcess` inside the `chords` memo) into a `patternsToProcess` useMemo, used by both `chords` and `countsByType`.
- `countsByType`: for each real chord type, collect normal + extended chords across all `patternsToProcess` entries, dedupe by `${root}-${ext}`, count. `'all'` = sum over types. No outside chords, no note filter (same as today's semantics).
- Note the `chords` memo early-return (`!useCustomScale && !selectedRaga`) must still hold. `patternsToProcess` returns `[]` in that case.

## Task 13 — CSV load validation (Issue 16)

In `src/utils/dataLoader.js`:
- After each `fetch`: `if (!response.ok) throw new Error(...)`.
- After `parseCSV`, validate the header (Hindustani: has `RAGATABLE` or `Name`/`name` and `Aroha`; Melakarta: has `swaras`). Vite's SPA fallback returns `index.html` with 200 for missing files, so this is the real guard. Throw a descriptive error if invalid.
- Remove the `catch → return []` in both loaders so errors reach `ChordTool`'s existing error UI (it already has try/catch + `setError`).

---

## Final verification
1. `npm run lint` — compare against the baseline (10 errors, 3 warnings before changes); introduce no new errors.
2. `npm run build` succeeds.
3. Re-run the Task 4 node MIDI check.
4. Report: per-task status, anything skipped or deviated from and why, lint before/after counts.
