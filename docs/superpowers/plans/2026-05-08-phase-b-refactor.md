# Phase B Codebase Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 21 issues (7 broken features, 9 engineering problems, 5 polish items) identified in code review, without restructuring the component hierarchy (deferred to Phase C).

**Architecture:** All changes are modifications to existing files except one new file (`src/styles/tokens.css`). Two placeholder components are deleted. The audio engine gets a proper caching layer. CSS moves from global `!important` overrides to design tokens wired through Tailwind config.

**Tech Stack:** React 19, Vite 7, Tailwind CSS 3, Web Audio API

**Spec:** `docs/superpowers/specs/2026-05-08-codebase-refactor-design.md`

---

## File Map

| File | Action | Issues |
| ---- | ------ | ------ |
| `src/styles/tokens.css` | Create | #10 |
| `src/components/SearchFilters.jsx` | Delete | #12 |
| `src/components/RagaCard.jsx` | Delete | #12 |
| `src/index.css` | Modify | #10 |
| `tailwind.config.js` | Modify | #10 |
| `src/App.jsx` | Modify | #11, #12, #19 |
| `src/pages/ChordTool.jsx` | Modify | #1-6, #11-14, #16, #18, #21, #23 |
| `src/components/ChordDisplay.jsx` | Modify | #1 |
| `src/components/RagaCircle.jsx` | Modify | #2 |
| `src/components/Piano.jsx` | Modify | #23 |
| `src/components/BeatCell.jsx` | Modify | #22 |
| `src/utils/audioEngine.js` | Modify | #7, #14, #15 |
| `src/utils/musicTheory.js` | Modify | #12, #20 |
| `src/utils/dataLoader.js` | Modify | #17 |

---

## Task 1: Dead Code Removal (Issue #12)

**Files:**

- Delete: `src/components/SearchFilters.jsx`
- Delete: `src/components/RagaCard.jsx`
- Modify: `src/App.jsx:2`
- Modify: `src/pages/ChordTool.jsx:2,37`
- Modify: `src/utils/audioEngine.js:14-39`
- Modify: `src/utils/musicTheory.js:128-271`

- [ ] **Step 1: Audit all targets with ripgrep**

Run each of these and confirm zero usage beyond declaration/import:

```bash
rg "SearchFilters" src/
rg "RagaCard" src/
rg "RagaSelector" src/pages/ChordTool.jsx
rg "scaleMode" src/
rg "loadBuffer" src/
rg "getPianoKeyPositions" src/
rg "getFrequencyFromNote" src/
rg "\.frequency" src/
rg "Link" src/App.jsx
```

Also run a global search (outside `src/`) to catch any dynamic consumers:

```bash
rg "\.frequency" --glob '!node_modules' --glob '!dist'
rg "getFrequencyFromNote" --glob '!node_modules' --glob '!dist'
```

Expected: Each returns only the declaration site or the single unused import. If any returns unexpected usage outside `src/` (e.g., in scripts, tests, or config), do NOT remove that item — flag it and skip.

- [ ] **Step 2: Delete placeholder components**

Delete these two files entirely:

- `src/components/SearchFilters.jsx`
- `src/components/RagaCard.jsx`

- [ ] **Step 3: Clean up App.jsx imports**

In `src/App.jsx`, change line 2 from:

```js
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
```

to:

```js
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
```

- [ ] **Step 4: Clean up ChordTool.jsx imports and dead state**

In `src/pages/ChordTool.jsx`, remove the unused RagaSelector import (line 2):

```js
import RagaSelector from '../components/RagaSelector';
```

Remove the unused `scaleMode` state (line 37):

```js
const [scaleMode, setScaleMode] = useState('full'); // 'aaroha', 'avroha', 'full'
```

- [ ] **Step 5: Remove dead functions from audioEngine.js**

In `src/utils/audioEngine.js`, remove the `loadBuffer` function (lines 14-39). Keep the `bufferCache` declaration (line 5) — it's used elsewhere.

- [ ] **Step 6: Remove dead functions from musicTheory.js and strip frequency computation**

In `src/utils/musicTheory.js`:

Remove `getFrequencyFromNote` (lines 128-135) entirely.

Remove `getPianoKeyPositions` (lines 137-166) entirely.

In `arrangeNotesAscending` (starts around line 168), remove the `frequency` property from returned objects. Change each push from:

```js
arrangedNotes.push({
    noteIndex: noteIndices[0],
    octave: baseOctave,
    frequency: getFrequencyFromNote(noteIndices[0], baseOctave, selectedTonic)
});
```

to:

```js
arrangedNotes.push({
    noteIndex: noteIndices[0],
    octave: baseOctave
});
```

Do the same for ALL `push` calls in `arrangeNotesAscending`, `arrangeNotesDescending`, and `arrangeChordNotes`. Each function has multiple push sites — strip `frequency` from every one. Also remove the `selectedTonic` parameter from all three function signatures since it was only used for frequency calculation.

Updated signatures:

```js
export const arrangeNotesAscending = (noteIndices, baseOctave = 3) => {
```

```js
export const arrangeNotesDescending = (noteIndices, startingOctave = 4, includeLowerSa = true, baseLowerOctave = 3) => {
```

```js
export const arrangeChordNotes = (noteIndices, baseOctave = 3) => {
```

- [ ] **Step 7: Update callers of arrange functions to remove selectedTonic argument**

In `src/pages/ChordTool.jsx`, find all calls to `arrangeChordNotes`, `arrangeNotesAscending`, and `arrangeNotesDescending`. Remove the `rootNote` argument that was passed as `selectedTonic`:

`handleChordClick` (around line 323):

```js
const arranged = arrangeChordNotes(chord.notes, 3);
```

`playCustomChord` (around line 306):

```js
const voiced = arrangeChordNotes(customChordNotes, 3);
```

`playChalan` (around line 341-343):

```js
const arranged = mode === 'avroha'
    ? arrangeNotesDescending(sequence, 4, true, 3)
    : arrangeNotesAscending(sequence, 3);
```

- [ ] **Step 8: Verify build**

```bash
npm run build
npm run lint
```

**Lint policy (applies to all tasks):** `npm run build` must produce zero errors. `npm run lint` must produce no new warnings compared to the previous commit — existing baseline warnings are acceptable.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "Remove dead code: unused components, imports, functions, and frequency computation"
```

---

## Task 2: Remove Debug Logs and Duplicate Constant (Issues #11, #13)

**Files:**

- Modify: `src/App.jsx:41`
- Modify: `src/pages/ChordTool.jsx:20,268`

- [ ] **Step 1: Remove console.logs**

In `src/App.jsx`, remove line 41:

```js
console.log("App component rendering");
```

In `src/pages/ChordTool.jsx`, remove line 20:

```js
console.log("ChordTool component rendering");
```

- [ ] **Step 2: Replace duplicate SWAR_NAMES with imported swarNames**

In `src/pages/ChordTool.jsx`, remove the inline constant (around line 268 after previous edits — search for `const SWAR_NAMES`):

```js
const SWAR_NAMES = ['Sa', 'Re♭', 'Re', 'Ga♭', 'Ga', 'Ma', 'Ma♯', 'Pa', 'Dha♭', 'Dha', 'Ni♭', 'Ni'];
```

`swarNames` is already imported from `../utils/musicTheory` (line 9 area). Replace all occurrences of `SWAR_NAMES` with `swarNames` in ChordTool.jsx:

```bash
rg "SWAR_NAMES" src/pages/ChordTool.jsx
```

Replace each occurrence. There should be ~3-4 references in the custom chord builder section.

- [ ] **Step 3: Verify**

```bash
npm run build
```

Expected: Success.

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx src/pages/ChordTool.jsx
git commit -m "Remove debug console.logs and deduplicate SWAR_NAMES constant"
```

---

## Task 3: Design Tokens and CSS Migration (Issue #10)

**Files:**

- Create: `src/styles/tokens.css`
- Modify: `src/index.css`
- Modify: `tailwind.config.js`
- Modify: `src/pages/ChordTool.jsx`
- Modify: `src/components/RagaSelector.jsx`
- Modify: `src/components/ChordDisplay.jsx`

- [ ] **Step 1: Create tokens.css**

Create `src/styles/tokens.css`:

```css
:root {
  /* Backgrounds */
  --bg-base: #000000;
  --bg-surface: #1f1b38;
  --bg-elevated: #334155;
  --bg-input: #334155;

  /* Text */
  --text-primary: #e2e8f0;
  --text-secondary: #cbd5e1;
  --text-muted: #94a3b8;

  /* Borders */
  --border-default: #475569;
  --border-subtle: #64748b;

  /* Accents */
  --accent-blue: #3b82f6;
  --accent-purple: #8b5cf6;
  --accent-emerald: #10b981;

  /* Semantic */
  --bg-blue-tint: #1e3a8a;
  --text-blue-tint: #bfdbfe;
}
```

- [ ] **Step 2: Import tokens in index.css and update Tailwind config**

In `src/index.css`, add the import before the Tailwind directives. The top of the file should become:

```css
@import './styles/tokens.css';
@tailwind base;
@tailwind components;
@tailwind utilities;
```

In `tailwind.config.js`, read the current file first, then extend the theme. The full file should be:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: 'var(--bg-surface)',
        elevated: 'var(--bg-elevated)',
        'input-bg': 'var(--bg-input)',
        'blue-tint': 'var(--bg-blue-tint)',
      },
      textColor: {
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        muted: 'var(--text-muted)',
        'blue-tint': 'var(--text-blue-tint)',
      },
      borderColor: {
        default: 'var(--border-default)',
        subtle: 'var(--border-subtle)',
      }
    },
  },
  plugins: [],
}
```

- [ ] **Step 3: Verify tokens load correctly**

```bash
npm run build
```

Expected: Success. No visual change yet — tokens are defined but not consumed.

- [ ] **Step 4: Audit all components for overridden classes**

Before migrating, find every file that uses the classes being overridden:

```bash
rg "bg-white|bg-gray-50|bg-gray-100|bg-blue-50|text-gray-800|text-gray-700|text-gray-600|border-gray-200|border-blue-200" src/ --files-with-matches
```

This produces the full list of files to migrate. Steps 5-7 must cover every file in this list. If any file is missed, the override removal in Step 8 will cause a visible color break in that component.

- [ ] **Step 5: Migrate ChordTool.jsx controls panel**

In `src/pages/ChordTool.jsx`, find the controls panel (around line 511):

```js
<div className="bg-white rounded-xl p-4 shadow-lg border border-gray-700 text-xs text-gray-800">
```

Replace with:

```js
<div className="bg-surface rounded-xl p-4 shadow-lg border border-gray-700 text-xs text-primary">
```

Find all other `bg-white` usages in ChordTool.jsx and replace with `bg-surface`. Find `text-gray-800` and replace with `text-primary`. Find `text-gray-700` and `text-gray-600` in label elements and replace with `text-secondary`.

Search with: `rg "bg-white|text-gray-800|text-gray-700|text-gray-600" src/pages/ChordTool.jsx`

- [ ] **Step 6: Migrate RagaSelector.jsx**

In `src/components/RagaSelector.jsx`:

- `bg-white` -> `bg-surface` (line 25)
- `text-gray-700` -> `text-secondary` (lines 29, 45)
- `bg-blue-50` -> `bg-blue-tint` (line 84)
- `text-blue-800` -> `text-blue-tint` (line 85, though this is text — use `text-blue-300` for better readability)
- `border-gray-200` -> `border-default`

Note: RagaSelector is not currently rendered (its import was removed in Task 1). Migrate it anyway — it will be used in Phase C when the raga selection UI is extracted from ChordTool. If Phase C is cancelled, this file can be deleted then. The migration takes ~2 minutes and avoids leaving a component with broken classes if it's ever re-enabled.

- [ ] **Step 7: Migrate ChordDisplay.jsx and any remaining files from audit**

In `src/components/ChordDisplay.jsx`, search for overridden classes:

```bash
rg "bg-white|bg-gray-50|bg-gray-100|text-gray-800|border-gray-200" src/components/ChordDisplay.jsx
```

Replace any matches. The chord type sidebar buttons in ChordTool (around line 886) use `bg-white` and `border-gray-200` — replace those too:

- `bg-white hover:bg-gray-50` -> `bg-surface hover:bg-elevated`
- `border-gray-200` -> `border-default`
- `bg-gray-100 text-gray-800` (count badge) -> `bg-elevated text-primary`

- [ ] **Step 8: Create rollback checkpoint, then remove !important overrides from index.css**

Before removing overrides, tag the current commit so the migration can be rolled back if visual issues are found:

```bash
git tag css-migration-checkpoint
```

If anything breaks after override removal that can't be quickly fixed, roll back with: `git checkout css-migration-checkpoint -- src/index.css`

In `src/index.css`, delete these override blocks (everything from `.bg-white` to the closing `}` of `.border-blue-200`, and the `input, select, textarea` block):

Remove:

```css
.bg-white {
  background-color: #1f1b38 !important;
}

.bg-gray-50 {
  background-color: #334155 !important;
}

.bg-gray-100 {
  background-color: #475569 !important;
  color: #e2e8f0 !important;
}

.bg-blue-50 {
  background-color: #1e3a8a !important;
  color: #bfdbfe !important;
}

.text-gray-800 {
  color: #e2e8f0 !important;
}

.text-gray-600,
.text-gray-700 {
  color: #cbd5e1 !important;
}

.border-gray-200 {
  border-color: #475569 !important;
}

input,
select,
textarea {
  background-color: #334155 !important;
  color: #e2e8f0 !important;
  border-color: #64748b !important;
}

.border-blue-200 {
  border-color: #1d4ed8 !important;
}
```

Replace the `input, select, textarea` block with a token-based version:

```css
input,
select,
textarea {
  background-color: var(--bg-input);
  color: var(--text-primary);
  border-color: var(--border-subtle);
}
```

- [ ] **Step 9: Full visual walkthrough**

```bash
npm run dev
```

Open the app and check every section against the visual regression checklist in the spec:

- Controls panel, custom scale editor, piano, chord type sidebar, custom chord builder, RagaCircle, composition panel, beat cells, MIDI settings, chord cards, error/loading states.

All should render with the same dark theme colors as before.

- [ ] **Step 10: Build and commit**

```bash
npm run build
git add -A
git commit -m "Migrate CSS from !important overrides to design token system"
```

---

## Task 4: Straightforward Bug Fixes (Issues #1, #2, #5, #16, #17, #18)

**Files:**

- Modify: `src/components/ChordDisplay.jsx:116`
- Modify: `src/components/RagaCircle.jsx`
- Modify: `src/pages/ChordTool.jsx`
- Modify: `src/utils/dataLoader.js`

- [ ] **Step 1: Fix Aaroh/Avroh filter mismatch (Issue #1)**

In `src/components/ChordDisplay.jsx`, find line 116 (inside the `separateAarohAvroh` branch):

```js
chords={inRagaChords.filter(c => c.source === 'Aaroh' || c.source === 'Both')}
```

Replace `'Aaroh'` with `'Aaroha'`:

```js
chords={inRagaChords.filter(c => c.source === 'Aaroha' || c.source === 'Both')}
```

- [ ] **Step 2: Fix note filter on RagaCircle (Issue #2)**

In `src/components/RagaCircle.jsx`, add `onNoteFilterClick` prop to `CircleRenderer`:

```js
const CircleRenderer = ({
    notesPattern,
    circleTitle,
    chordsForCircle,
    displaySwarNames,
    onNoteClick,
    onNoteFilterClick,
    selectedNote
}) => {
```

Change the note dot `onClick` (around line 119) from:

```js
onClick={() => onNoteClick && onNoteClick(index)}
```

to:

```js
onClick={() => onNoteFilterClick && onNoteFilterClick(index)}
```

Add `onNoteFilterClick` to the `RagaCircle` component props:

```js
const RagaCircle = ({
    notes,
    title = "Raga Notes",
    availableChords = [],
    onNoteClick = null,
    onNoteFilterClick = null,
    selectedNote = null,
    isCarnaticMode = false,
    aarohaPattern = null,
    avrohaPattern = null,
    separateAarohAvroh = false
}) => {
```

Pass `onNoteFilterClick` through to both `CircleRenderer` usages (the `hasSeparatePatterns` branch and the single-circle branch):

```js
<CircleRenderer
    notesPattern={aarohaPattern}
    circleTitle="Aaroha (Ascending)"
    chordsForCircle={aarohaChords}
    displaySwarNames={displaySwarNames}
    onNoteClick={onNoteClick}
    onNoteFilterClick={onNoteFilterClick}
    selectedNote={selectedNote}
/>
```

Same for the Avroha and single-circle renderers.

In `src/pages/ChordTool.jsx`, where `RagaCircle` is rendered (around line 1003), add the new prop:

```js
<RagaCircle
    notes={customScaleMode
        ? (separateAarohAvroh
            ? customAarohPattern.map((v, i) => (v || customAvrohPattern[i]) ? 1 : 0)
            : customNotePattern)
        : selectedRaga.pattern}
    title={customScaleMode ? 'Custom Scale - Chord Circle' : `${selectedRaga.name} - Chord Circle`}
    availableChords={chords}
    isCarnaticMode={isCarnaticMode}
    separateAarohAvroh={separateAarohAvroh}
    aarohaPattern={customScaleMode ? customAarohPattern : selectedRaga.aarohaPattern}
    avrohaPattern={customScaleMode ? customAvrohPattern : selectedRaga.avrohaPattern}
    onNoteClick={handleNoteClick}
    onNoteFilterClick={setSelectedNoteFilter}
    selectedNote={selectedNoteFilter}
/>
```

- [ ] **Step 3: Fix countsByType for custom scale mode (Issue #5)**

In `src/pages/ChordTool.jsx`, find the `countsByType` useMemo (around line 177). Replace:

```js
const countsByType = useMemo(() => {
    if (!selectedRaga) return {};

    const counts = {};
    const pattern = selectedRaga.pattern;
```

with:

```js
const countsByType = useMemo(() => {
    const useCustomScale = customScaleMode && customNotePattern.some(n => n === 1);
    if (!useCustomScale && !selectedRaga) return {};

    const counts = {};
    const pattern = useCustomScale ? customNotePattern : selectedRaga.pattern;
```

Update the dependency array of this useMemo from:

```js
}, [selectedRaga, isCarnaticMode, chordTypes]);
```

to:

```js
}, [selectedRaga, isCarnaticMode, chordTypes, customScaleMode, customNotePattern]);
```

- [ ] **Step 4: Remove redundant ragas state (Issue #16)**

In `src/pages/ChordTool.jsx`:

Remove the `ragas` state declaration:

```js
const [ragas, setRagas] = useState([]);
```

Add a derived value after the `melakartaRagas` state:

```js
const ragas = isCarnaticMode ? melakartaRagas : hindustaniRagas;
```

Delete the mode-switching useEffect entirely (the one with dependency `[isCarnaticMode, hindustaniRagas, melakartaRagas]`):

```js
useEffect(() => {
    if (isCarnaticMode) {
        setRagas(melakartaRagas);
        // ...
    } else {
        setRagas(hindustaniRagas);
        // ...
    }
}, [isCarnaticMode, hindustaniRagas, melakartaRagas]);
```

In the data-loading useEffect, remove `setRagas(hindustani)`:

```js
setHindustaniRagas(hindustani);
setMelakartaRagas(melakarta);
// Remove: setRagas(hindustani);
if (hindustani.length > 0) {
    setSelectedRaga(hindustani[0]);
}
```

Add a new simple useEffect for raga selection when mode switches. This preserves the current selection if it exists in the new list, only falling back to the first raga when the current selection is invalid for the new mode:

```js
useEffect(() => {
    if (ragas.length === 0) return;
    if (selectedRaga && ragas.some(r => r.id === selectedRaga.id)) return; // current selection is valid
    setSelectedRaga(ragas[0]);
}, [ragas]);
```

- [ ] **Step 5: Harden CSV parsing (Issue #17)**

In `src/utils/dataLoader.js`, in `loadHindustaniRagas`, after the fetch call add a status check:

```js
const response = await fetch('/aarohavroha.csv');
if (!response.ok) throw new Error(`Failed to load Hindustani ragas: HTTP ${response.status}`);
```

Do the same in `loadMelakartaRagas`:

```js
const response = await fetch('/melakarta_72.csv');
if (!response.ok) throw new Error(`Failed to load Melakarta ragas: HTTP ${response.status}`);
```

- [ ] **Step 6: Fix Unison button (Issue #18)**

In `src/pages/ChordTool.jsx`, find `handleChordClick` (around line 321). Replace the entire body with:

```js
const handleChordClick = (chord, mode = 'unison') => {
    const arranged = arrangeChordNotes(chord.notes, 3);
    setActiveNotes(arranged.map(n => ({ pc: (n.noteIndex + rootNote) % 12, oct: n.octave })));

    const delay = mode === 'unison' ? 0 : arpeggiationDelay;
    playChord(arranged, chordNoteDuration, delay);

    setTimeout(() => setActiveNotes([]), 1000);
};
```

Note: This already uses the object `{ pc, oct }` format with the `rootNote` offset, consistent with Issue #23. Task 7 Step 4 will verify this is correct rather than rewriting it.

- [ ] **Step 7: Verify and commit**

```bash
npm run build
```

Test manually:

- Enable Sep. Aaroh/Avroh — verify Aaroh section shows aaroha-exclusive chords
- Click a note on RagaCircle — verify chord list filters
- Enable custom scale mode — verify sidebar counts update
- Toggle Carnatic mode — verify raga list switches
- Click "Unison" button — verify no arpeggiation

```bash
git add -A
git commit -m "Fix chord filtering, note filter, custom scale counts, raga state, CSV parsing, and unison playback"
```

---

## Task 5: Audio Engine Overhaul (Issues #7, #14, #15)

**Files:**

- Modify: `src/utils/audioEngine.js`
- Modify: `src/pages/ChordTool.jsx`

- [ ] **Step 1: Add AudioContext resume to playChord (Issue #7)**

In `src/utils/audioEngine.js`, find `playChord` (around line 143). Add context resume at the top:

```js
export const playChord = async (notes, duration = 3, delay = 0, volume = 0.6) => {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') await ctx.resume();
    const now = ctx.currentTime;
```

- [ ] **Step 2: Create resolveNoteBuffer with caching (Issue #14)**

In `src/utils/audioEngine.js`, add this exported function after `getAudioContext` (around line 12). This replaces `getNoteFilename` as the primary way to get audio buffers. It must be exported because `playChalan` in ChordTool.jsx uses it directly for pre-resolving buffers (Task 6 Step 3):

```js
export const resolveNoteBuffer = async (noteIndex, octave) => {
    const cacheKey = `${noteIndex}-${octave}`;
    if (bufferCache[cacheKey]) return bufferCache[cacheKey];

    const ctx = getAudioContext();
    const noteName = westernNotesSharp[noteIndex];

    let suffix = '';
    if (octave === 3) suffix = '_m12';
    else if (octave === 5) suffix = '_p12';
    else if (octave === 4) suffix = '';
    else if (octave < 4) suffix = '_m12';
    else suffix = '_p12';

    const nameVariants = [noteName];
    if (noteName.includes('#')) {
        nameVariants.push(noteName.replace('#', 'sharp'));
        nameVariants.push(noteName.replace('#', 's'));
    }

    const extensions = ['.mp3', '.wav', '.ogg'];

    for (const variant of nameVariants) {
        for (const ext of extensions) {
            const filename = `${variant}${suffix}`;
            const encoded = encodeURIComponent(filename);
            const url = `/Piano/${encoded}${ext}`;

            try {
                const response = await fetch(url);
                if (!response.ok) continue;

                const arrayBuffer = await response.arrayBuffer();
                if (arrayBuffer.byteLength === 0) continue;

                const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
                bufferCache[cacheKey] = audioBuffer;
                return audioBuffer;
            } catch (error) {
                continue;
            }
        }
    }

    bufferCache[cacheKey] = null;
    return null;
};
```

- [ ] **Step 3: Add preloadAllPianoSamples export**

In `src/utils/audioEngine.js`, add after `resolveNoteBuffer`:

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

- [ ] **Step 4: Refactor playNote to use resolveNoteBuffer**

Replace the body of `playNote` with:

```js
export const playNote = async (noteIndex, octave = 4, duration = 2, volume = 1.0) => {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') await ctx.resume();

    let sampleOctave = octave;
    let detune = 0;

    if (octave < 3) {
        sampleOctave = 3;
        detune = (octave - 3) * 1200;
    } else if (octave > 5) {
        sampleOctave = 5;
        detune = (octave - 5) * 1200;
    }

    const buffer = await resolveNoteBuffer(noteIndex, sampleOctave);
    if (!buffer) {
        console.warn(`No audio file found for note ${noteIndex} octave ${sampleOctave}`);
        return;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.detune.value = detune;

    const gainNode = ctx.createGain();
    gainNode.gain.value = volume;

    const now = ctx.currentTime;
    gainNode.gain.setValueAtTime(volume, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

    source.connect(gainNode);
    gainNode.connect(ctx.destination);

    source.start(now);
    source.stop(now + duration + 0.5);

    return { source, gainNode };
};
```

- [ ] **Step 5: Refactor playChord to use resolveNoteBuffer**

Replace the body of `playChord`:

```js
export const playChord = async (notes, duration = 3, delay = 0, volume = 0.6) => {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') await ctx.resume();
    const now = ctx.currentTime;

    const promises = notes.map((n, i) => {
        const idx = typeof n === 'object' ? n.noteIndex : n;
        const oct = typeof n === 'object' ? n.octave : 4;

        return (async () => {
            const buffer = await resolveNoteBuffer(idx, oct);
            if (!buffer) return;

            const source = ctx.createBufferSource();
            source.buffer = buffer;

            const gainNode = ctx.createGain();
            gainNode.gain.value = volume;

            const startAt = now + (i * delay);
            gainNode.gain.setValueAtTime(volume, startAt);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startAt + duration);

            source.connect(gainNode);
            gainNode.connect(ctx.destination);

            source.start(startAt);
            source.stop(startAt + duration + 0.5);
            return { source, gainNode };
        })();
    });

    return Promise.all(promises);
};
```

- [ ] **Step 6: Remove old getNoteFilename function**

Delete the entire `getNoteFilename` function from `audioEngine.js`. Also remove the reference to it in the `audioEngine` object at the bottom:

```js
export const audioEngine = {
    get context() { return getAudioContext(); },
    playNote,
    playChord,
    playSequence,
    playTanpura,
    stopTanpura
};
```

Update `playSequence` to use `resolveNoteBuffer` as well. Replace the inner note-playing block:

```js
export const playSequence = async (notes, noteDuration = 0.6, gap = 0.1, volume = 0.8) => {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') await ctx.resume();

    let currentTime = ctx.currentTime;

    for (const note of notes) {
        const idx = typeof note === 'object' ? note.noteIndex : note;
        const oct = typeof note === 'object' ? note.octave : 4;

        const buffer = await resolveNoteBuffer(idx, oct);
        if (buffer) {
            const source = ctx.createBufferSource();
            source.buffer = buffer;

            const gainNode = ctx.createGain();
            gainNode.gain.value = volume;

            gainNode.gain.setValueAtTime(volume, currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + noteDuration);

            source.connect(gainNode);
            gainNode.connect(ctx.destination);

            source.start(currentTime);
            source.stop(currentTime + noteDuration + 0.5);
        }

        currentTime += (noteDuration + gap);
    }
};
```

- [ ] **Step 7: Fix tanpura fallback naming (Issue #15)**

In `src/utils/audioEngine.js`, find `loadTanpuraFile` (around line 228). Replace the `namingVariants` construction:

```js
const loadTanpuraFile = async (fileName) => {
    const FLAT_TO_SHARP = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };
    const baseName = fileName.replace('.mp3', '');

    const namingVariants = [
        fileName,
        FLAT_TO_SHARP[baseName] ? `${FLAT_TO_SHARP[baseName]}.mp3` : null,
        'C.mp3'
    ].filter(Boolean);
```

Remove the old `namingVariants` array that used `fileName.replace('b', '#')` and `fileName.replace('#', 's')`.

- [ ] **Step 8: Add background preload in ChordTool**

In `src/pages/ChordTool.jsx`, add the import for `preloadAllPianoSamples`:

```js
import { playNote, playChord, playTanpura, stopTanpura, playSequence, audioEngine, preloadAllPianoSamples } from '../utils/audioEngine';
```

Add this effect after the data-loading useEffect:

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

- [ ] **Step 9: Verify and commit**

```bash
npm run build
```

Test manually:

- Open Network tab, hard-reload page (Cmd+Shift+R for cold cache). After render, up to 36 piano sample requests should fire. On warm cache, requests may be served from disk cache.
- Play a note — should sound immediately.
- Play same note again — no new network request.
- Open fresh tab, click chord — should play (context resume works).
- Set tonic to Eb, play tanpura — should load correctly.

```bash
git add -A
git commit -m "Overhaul audio caching with resolveNoteBuffer, background preload, and tanpura naming fix"
```

---

## Task 6: Playback and State Fixes (Issues #3, #4, #6)

**Files:**

- Modify: `src/pages/ChordTool.jsx`

- [ ] **Step 1: Fix localStorage race condition with lazy init (Issue #6)**

In `src/pages/ChordTool.jsx`, replace the `rhythmProgressions` state declaration:

```js
const [rhythmProgressions, setRhythmProgressions] = useState([
    { id: 1, name: 'T1', chords: [], isPlaying: false, currentBeat: 0 },
    { id: 2, name: 'T2', chords: [], isPlaying: false, currentBeat: 0 },
    { id: 3, name: 'T3', chords: [], isPlaying: false, currentBeat: 0 },
    { id: 4, name: 'T4', chords: [], isPlaying: false, currentBeat: 0 }
]);
```

with:

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

Delete the load-from-localStorage useEffect (the one that reads `localStorage.getItem('samvad_progressions')` and calls `setRhythmProgressions(parsed)`). Keep the save effect:

```js
useEffect(() => {
    localStorage.setItem('samvad_progressions', JSON.stringify(rhythmProgressions));
}, [rhythmProgressions]);
```

- [ ] **Step 2: Fix stale closure in sequencer playback (Issue #4)**

In `src/pages/ChordTool.jsx`, after the `playbackIntervalRef` declaration, add refs for all values read inside the interval:

```js
const playbackIntervalRef = React.useRef(null);
const chordsRef = React.useRef([]);
const rootNoteRef = React.useRef(rootNote);
const playbackModeRef = React.useRef(playbackMode);
const arpeggiationDelayRef = React.useRef(arpeggiationDelay);
const chordNoteDurationRef = React.useRef(chordNoteDuration);
const cycleBpmRef = React.useRef(cycleBpm);
const cycleLoopRef = React.useRef(cycleLoop);
```

Add sync effects after the state declarations (before any other useEffects):

```js
useEffect(() => { chordsRef.current = activeTrack.chords; }, [activeTrack.chords]);
useEffect(() => { rootNoteRef.current = rootNote; }, [rootNote]);
useEffect(() => { playbackModeRef.current = playbackMode; }, [playbackMode]);
useEffect(() => { arpeggiationDelayRef.current = arpeggiationDelay; }, [arpeggiationDelay]);
useEffect(() => { chordNoteDurationRef.current = chordNoteDuration; }, [chordNoteDuration]);
useEffect(() => { cycleBpmRef.current = cycleBpm; }, [cycleBpm]);
useEffect(() => { cycleLoopRef.current = cycleLoop; }, [cycleLoop]);
```

Update `startPlayback` to read from refs:

```js
const startPlayback = async () => {
    if (activeTrack.isPlaying) {
        stopPlayback();
        return;
    }

    if (audioEngine.context.state === 'suspended') {
        await audioEngine.context.resume();
    }

    updateActiveTrack({ isPlaying: true, currentBeat: 0 });

    const beatMs = (60 / cycleBpm) * 1000;
    let beatIdx = 0;

    playbackIntervalRef.current = setInterval(() => {
        const currentChords = chordsRef.current;
        const currentRootNote = rootNoteRef.current;
        const currentPlaybackMode = playbackModeRef.current;
        const currentArpDelay = arpeggiationDelayRef.current;
        const currentDuration = chordNoteDurationRef.current;

        const chordsToPlay = currentChords.filter(c => Math.floor(c.beat) === beatIdx);
        chordsToPlay.forEach(item => {
            const voiced = arrangeChordNotes(item.chord.notes, 3);
            const delay = currentPlaybackMode === 'unison' ? 0 : currentArpDelay;
            playChord(voiced, currentDuration, delay);
        });

        beatIdx = (beatIdx + 1) % cycleBeats;
        updateActiveTrack({ currentBeat: beatIdx });

        if (beatIdx === 0 && !cycleLoopRef.current) {
            stopPlayback();
        }
    }, beatMs);
};
```

- [ ] **Step 3: Fix playChalan sync (Issue #3)**

Add a ref for chalan timeouts at the top with the other refs:

```js
const chalanTimeoutsRef = React.useRef([]);
```

Replace the entire `playChalan` function. This implementation pre-resolves all buffers, then schedules audio via `source.start(audioTime)` for drift-free playback, with visual `setTimeout`s aligned to the same timeline:

```js
const playChalan = async (mode) => {
    if (!selectedRaga) return;

    // Cancel any in-progress chalan
    chalanTimeoutsRef.current.forEach(id => clearTimeout(id));
    chalanTimeoutsRef.current = [];
    setActiveNotes([]);

    const sequence = mode === 'avroha' ? selectedRaga.avrohaChalan : selectedRaga.aarohaChalan;
    const arranged = mode === 'avroha'
        ? arrangeNotesDescending(sequence, 4, true, 3)
        : arrangeNotesAscending(sequence, 3);

    const ctx = audioEngine.context;
    if (ctx.state === 'suspended') await ctx.resume();

    // Pre-resolve all buffers before scheduling anything
    const buffers = await Promise.all(
        arranged.map(note => resolveNoteBuffer(note.noteIndex, note.octave))
    );

    const noteDuration = 0.5;
    const gap = 0.1;
    const stepSeconds = noteDuration + gap;
    const startTime = ctx.currentTime + 0.05; // small offset to avoid scheduling in the past

    for (let i = 0; i < arranged.length; i++) {
        const buffer = buffers[i];
        const note = arranged[i];
        const audioTime = startTime + (i * stepSeconds);

        // Schedule audio at precise AudioContext time
        if (buffer) {
            const source = ctx.createBufferSource();
            source.buffer = buffer;

            const gainNode = ctx.createGain();
            gainNode.gain.value = 0.8;
            gainNode.gain.setValueAtTime(0.8, audioTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioTime + noteDuration);

            source.connect(gainNode);
            gainNode.connect(ctx.destination);

            source.start(audioTime);
            source.stop(audioTime + noteDuration + 0.5);
        }

        // Schedule visual highlight aligned to same timing
        const visualDelayMs = (audioTime - ctx.currentTime) * 1000;
        const timeoutId = setTimeout(() => {
            const absNote = (note.noteIndex + rootNote) % 12;
            setActiveNotes([{ pc: absNote, oct: note.octave }]);
        }, visualDelayMs);
        chalanTimeoutsRef.current.push(timeoutId);
    }

    // Schedule clearing active notes after last note
    const totalDurationMs = (arranged.length * stepSeconds + 0.5) * 1000;
    const clearId = setTimeout(() => {
        setActiveNotes([]);
    }, totalDurationMs);
    chalanTimeoutsRef.current.push(clearId);
};
```

This requires importing `resolveNoteBuffer` from audioEngine. Update the import line in ChordTool.jsx:

```js
import { playNote, playChord, playTanpura, stopTanpura, playSequence, audioEngine, preloadAllPianoSamples, resolveNoteBuffer } from '../utils/audioEngine';
```

In `src/utils/audioEngine.js`, export `resolveNoteBuffer` by changing it from `const` to an exported function:

```js
export const resolveNoteBuffer = async (noteIndex, octave) => {
```

- [ ] **Step 4: Add chalan cleanup to unmount effect**

Update the cleanup useEffect:

```js
useEffect(() => {
    return () => {
        stopPlayback();
        stopTanpura();
        chalanTimeoutsRef.current.forEach(id => clearTimeout(id));
    };
}, []);
```

This also addresses Issue #21 (tanpura cleanup on unmount).

- [ ] **Step 5: Verify and commit**

```bash
npm run build
```

Test manually:

- Add chords to timeline, play. Add a new chord during playback — it should play on next cycle.
- Play Aaroh Chalan — visual highlights should sync with audio.
- Click Aaroh Chalan, then immediately click Avroh Chalan — first one cancels cleanly.
- Save chords, refresh — they persist.

```bash
git add src/pages/ChordTool.jsx
git commit -m "Fix sequencer stale closures, playChalan sync, localStorage race, and tanpura cleanup"
```

---

## Task 7: Polish (Issues #19, #20, #22, #23)

**Files:**

- Modify: `src/App.jsx`
- Modify: `src/utils/musicTheory.js`
- Modify: `src/components/Piano.jsx`
- Modify: `src/components/BeatCell.jsx`
- Modify: `src/pages/ChordTool.jsx`

- [ ] **Step 1: Add ErrorBoundary reload button (Issue #19)**

In `src/App.jsx`, inside the ErrorBoundary `render` method, after the `<pre>` block (around line 33), add:

```jsx
<button
    onClick={() => window.location.reload()}
    style={{ marginTop: '20px', padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' }}
>
    Reload Page
</button>
```

- [ ] **Step 2: Add sort parameter to arrangeChordNotes (Issue #20)**

In `src/utils/musicTheory.js`, find `arrangeChordNotes` and update the signature and sort line:

```js
export const arrangeChordNotes = (noteIndices, baseOctave = 3, sort = true) => {
    if (!noteIndices || noteIndices.length === 0) return [];

    const pcs = sort ? [...noteIndices].sort((a, b) => a - b) : [...noteIndices];
```

- [ ] **Step 3: Add displayName to memo'd components (Issue #22)**

In `src/components/Piano.jsx`, after the `WhiteKey` memo declaration (around line 42), add:

```js
WhiteKey.displayName = 'WhiteKey';
```

After the `BlackKey` memo declaration (around line 61), add:

```js
BlackKey.displayName = 'BlackKey';
```

In `src/components/BeatCell.jsx`, after the closing of the `memo()` call (around line 62), add:

```js
BeatCell.displayName = 'BeatCell';
```

- [ ] **Step 4: Standardize activeNotes format (Issue #23)**

First, verify all `setActiveNotes` call sites:

```bash
rg "setActiveNotes" src/pages/ChordTool.jsx
```

In `src/pages/ChordTool.jsx`, verify `handleChordClick` already uses the correct object format with `rootNote` offset (written in Task 4 Step 6):

```js
const handleChordClick = (chord, mode = 'unison') => {
    const arranged = arrangeChordNotes(chord.notes, 3);
    setActiveNotes(arranged.map(n => ({ pc: (n.noteIndex + rootNote) % 12, oct: n.octave })));

    const delay = mode === 'unison' ? 0 : arpeggiationDelay;
    playChord(arranged, chordNoteDuration, delay);

    setTimeout(() => setActiveNotes([]), 1000);
};
```

If it matches, no change needed — this is a verification step. The `rootNote` offset is required so transposed roots highlight the correct piano keys.

`handleNoteClick` already uses `{ pc, oct }` format. `playChalan` was updated in Task 6 Step 3 to use `{ pc, oct }` format.

In `src/components/Piano.jsx`, update `checkActive` to only handle the object format:

```js
const checkActive = (pc, octaveValue) => {
    return activeNotes.some(note => note.pc === pc && note.oct === octaveValue);
};
```

- [ ] **Step 5: Verify and commit**

```bash
npm run build
```

Test manually:

- Trigger an error boundary — reload button appears and works.
- Click a chord — specific piano keys light up (not all octaves).
- Click a single piano key — that key lights up.
- Open React DevTools — WhiteKey, BlackKey, BeatCell show correct names.

```bash
git add -A
git commit -m "Add error recovery, sort parameter for chord voicing, displayNames, and consistent activeNotes format"
```

---

## Task 8: Final Verification

- [ ] **Step 1: Full build check**

```bash
npm run build
npm run lint
```

Both must succeed with no new errors.

- [ ] **Step 2: Run full verification matrix**

Open the app with `npm run dev` and work through every item in the Verification Plan section of the spec:

**Integration flows:**

- [ ] Chord filtering with Sep. Aaroh/Avroh — Aaroh section shows aaroha-exclusive chords, not just 'Both'
- [ ] Note filter via RagaCircle click — clicking a note filters chord list; clicking another switches filter; Clear removes it
- [ ] Sequencer playback with live chord changes — add/remove chord mid-playback, reflected on next cycle
- [ ] localStorage persistence across refresh — add chords, reload, chords preserved; no empty overwrite on load
- [ ] Custom scale mode counts — toggle custom scale, modify notes, sidebar counts match custom pattern
- [ ] Unison vs Melody buttons — Unison produces simultaneous onset regardless of Arp Delay slider value
- [ ] Tanpura with flat-key tonics (Eb, Bb, Ab) — correct drone plays, no console error, no fallback to wrong enharmonic
- [ ] Fresh tab AudioContext resume — open fresh tab, click chord card, audio plays (no silent failure)
- [ ] CSV error handling — temporarily rename `aarohavroha.csv`, verify error UI shows "HTTP 404", restore file
- [ ] Chalan cancellation on unmount — start chalan, navigate to `/query`, no console errors or orphaned timeouts

**Visual regression (CSS tokens):**

- [ ] Controls panel
- [ ] Custom scale editor
- [ ] Piano keyboard
- [ ] Chord type sidebar
- [ ] Custom chord builder
- [ ] RagaCircle
- [ ] Composition panel
- [ ] Beat cells
- [ ] MIDI settings
- [ ] Chord cards

**Audio/timing:**

- [ ] Chalan playback: visual highlights sync with audio (simultaneous to human perception)
- [ ] Background preload: up to 36 sample fetches after render on cold load (Network tab); cached on warm load
- [ ] No duplicate fetches on repeated note plays (verify in Network tab)
- [ ] Tanpura stops on navigation away (navigate while playing, audio stops)

**DevTools:**

- [ ] React DevTools shows "WhiteKey", "BlackKey", "BeatCell" (not "Anonymous")

- [ ] **Step 3: Commit verification complete message**

**Hard gate:** Only proceed if ALL of the following are true:
- `npm run build` exits 0
- `npm run lint` produces no new warnings
- Every checkbox above is checked

If any checkbox fails, fix the issue and re-verify before continuing. Do NOT mark issues as complete with unresolved failures.

If all checks pass, update `codebase-refactor.md` to mark all Phase B issues as complete — replace all `**Status:** [ ]` with `**Status:** [x]` for issues 1-7 and 10-23.

```bash
git add codebase-refactor.md
git commit -m "Mark all Phase B refactor issues as complete"
```

Clean up the CSS migration tag:

```bash
git tag -d css-migration-checkpoint
```
