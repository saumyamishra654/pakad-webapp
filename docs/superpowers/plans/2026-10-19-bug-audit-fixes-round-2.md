# Bug Audit Fix Plan — Round 2 (2026-10-19)

Fixes for 9 issues from the second-pass bug hunt. Branch `performance-optimisations`.
Same ground rules as `2026-10-19-bug-audit-fixes.md`: match surrounding style, no unrelated refactors, one commit per task (`Fix: <summary>`), **no Co-Authored-By or other trailers**, don't push, don't commit `CLAUDE.md` or `tech-case-study/`.
Lint baseline is now **0 problems** — keep it at 0. Build must pass.

---

## Task 1 — Tanpura race on rapid tonic changes (MEDIUM)

`src/utils/audioEngine.js`:
- Add `let tanpuraRequestId = 0;` next to `tanpuraAudioElement` / `tanpuraFileName`.
- `playTanpura`: at the top `const reqId = ++tanpuraRequestId;`. In the "new file" branch, after `const audio = await loadTanpuraFile(fileName);`:
  ```js
  if (reqId !== tanpuraRequestId) { audio.pause(); return; } // superseded by a newer request or a stop
  ```
  Then pause the previous element (if any and not the same object), assign `tanpuraAudioElement`/`tanpuraFileName`, `await audio.play()`, and after that await check again: if stale, `audio.pause()`.
  In the "resume" branch, after `await tanpuraAudioElement.play()`, if stale, pause it.
- `stopTanpura`: `++tanpuraRequestId;` before pausing, so an in-flight load never starts playing after Stop.

Verify with a scratch node script mocking `Audio` (load resolves after a delay you control): calls for D then E in flight → only E plays; stop while E is loading → nothing plays.

## Task 2 — Clamp BPM and Beats (MEDIUM)

- `src/components/SequencerControls.jsx`: keep the onChange as-is (so typing isn't fought), but add `onBlur` to both inputs that clamps: Beats → `Math.min(32, Math.max(2, v || 8))`, BPM → `Math.min(240, Math.max(40, v || 120))`, calling the same setters.
- `src/pages/ChordTool.jsx` `startPlayback`: compute `const bpm = Math.min(240, Math.max(40, cycleBpm || 120));` and `const totalBeats = Math.min(32, Math.max(2, cycleBeats || 8));` and use them (defence in case Play is pressed before blur).
- `src/components/ProgressionTimeline.jsx`: render with `Math.max(0, cycleBeats)` wherever `cycleBeats` sizes arrays (avoid negative lengths).
- `src/utils/midiUtils.js`: `const bpm = Math.min(300, Math.max(20, Number(tempoBPM) || 120));` used for `tempoUS`.
- `handleDownloadMIDI`: pass the same clamped bpm.

## Task 3 — Chalan highlight waits for audio (LOW-MED)

- `audioEngine.js` `playSequence`: it already loads buffers before scheduling. Make it `return startTime` (the `ctx.currentTime` value it schedules from). Keep any null-buffer skipping.
- `ChordTool.jsx` `playChalan`: `await playSequence(voiced, 0.5, 0.1);` BEFORE the highlight loop; then `if (chalanRunRef.current !== runId) return;` and run the 600 ms highlight loop as now.

## Task 4 — Extended chords: no duplicate root, correct naming (LOW)

`src/utils/musicTheory.js`:
- `getExtendedIntervals`: compute `add`; if `baseIntervals.some(x => x % 12 === add)` return `baseIntervals` unchanged (no extension). Callers already set `isExtended` from `intervals.length > ct.intervals.length`, so these become non-extended duplicates that the existing dedupe key merges. Check `countsByType` in `ChordTool.jsx` doesn't now double-count them (it dedupes by root + ext flag — confirm and fix if not).
- `attachWesternNames`: when `chord.isExtended`, find the added pitch `const added = (chord.notes[chord.notes.length - 1] - chord.root + 12) % 12` and append `(add ${EXT_LABELS[added]})` after the quality, with module-level
  `const EXT_LABELS = ['1', '♭9', '9', '♯9', '3', '11', '♯11', '5', '♭13', '13', '♭7', '7'];`
  e.g. extended major → `C(add ♭7): C - E - G - B♭`.

Verify with a scratch script: major-scale pattern `[1,0,1,0,1,1,0,1,0,1,0,1]`, `availableChordsForPattern(p, 'all', true)` → no chord has a repeated pitch class in `notes`; names of extended chords contain `(add `.

## Task 5 — Custom chord compound intervals + out-of-range octaves (LOW)

- `ChordTool.jsx` `playCustomChord`: voice directly from absolute intervals instead of `arrangeChordNotes`:
  ```js
  const voiced = customIntervalsAbs.map(i => {
      const abs = customChordRoot + i;
      return { noteIndex: abs % 12, octave: 3 + Math.floor(abs / 12) };
  });
  playChord(transposeVoicing(voiced, rootNote), chordNoteDuration, delay);
  ```
- `audioEngine.js`: stacking octaves can exceed the sampled range (3–5). In `playChord` and `playSequence`, mirror `playNote`: `sampleOctave = Math.min(5, Math.max(3, oct))`, `detune = (oct - sampleOctave) * 1200`, load with `sampleOctave`, set `source.detune.value = detune`. Factor into a small helper if it reads cleaner.

## Task 6 — MIDI gap ≥ spacing makes chords inaudible (LOW)

`midiUtils.js`: when clamping against the next chord, use `const effectiveGap = Math.min(gapTicks, Math.floor((nextStartTick - startTick) / 2));` then `endTick = Math.min(endTick, nextStartTick - effectiveGap)`. Keep the `startTick + 1` floor.
Verify: chords at beats 0 and 1, gap 1.5, len 3.2 → first chord off at 0.5 beats.

## Task 7 — Melakarta chalans (LOW)

`src/utils/dataLoader.js` `loadMelakartaRagas`: `sequence` already starts with 0 (Sa).
- `aarohaChalan: [...sequence, 0]`
- `avrohaChalan: [0, ...[...sequence].reverse()]`
Verify with a scratch script that for Kanakangi `arrangeNotesAscending(aaroh, 3)` ends on `{0, 4}` and `arrangeNotesDescending(avroh, 4, true)` starts `{0,4}` and ends `{0,3}`, with no extra trailing Sa.

## Task 8 — Custom scale union pattern with separate Aaroh/Avroh (LOW)

`ChordTool.jsx`: add
```js
const customFullPattern = useMemo(() => (
    separateAarohAvroh
        ? customAarohPattern.map((v, i) => (v || customAvrohPattern[i]) ? 1 : 0)
        : customNotePattern
), [separateAarohAvroh, customAarohPattern, customAvrohPattern, customNotePattern]);
```
Use it for: Piano `ragaNotes` (custom branch), `customChordValidation` `pattern` (custom branch), and the RagaCircle `notes` custom branch (replace the inline union).

## Task 9 — Silent empty MIDI export (LOW)

`handleDownloadMIDI`: after filtering `beat < cycleBeats`, if the list is empty, `alert('No chords within the current cycle to export.')` and return.

---

## Final verification
1. `npx eslint src` → 0 problems.
2. `npm run build` succeeds.
3. Re-run the round-1 MIDI check (beats 0,4,8,12 → onsets 0,4,8,12; beats 0..3 → offs 0.6 after each onset) plus the Task 1/4/6/7 checks. Scratch scripts go in `/private/tmp/claude-501/-Users-saumyamishra-Desktop-Projects-samvad/2af943a0-074f-47b1-b1fc-b2d6456f0780/scratchpad`, not the repo.
4. Report per-task status, deviations with reasons, commit list, and actual outputs of the checks.
