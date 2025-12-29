# React App Migration Plan: Samvad (Raga Chord Tool)

Converting three HTML monoliths (`index.html` 4710 lines, `raga-query.html` 1392 lines, `raga-insights.html` 1276 lines = ~7500 lines total) into a modular React application.

---

## Current Architecture Analysis

### What Exists Now
- **Single-file React apps** using CDN-loaded React 18, Babel, and Tailwind
- **Inline JavaScript** with components defined inside `<script type="text/babel">` tags
- **Duplicated code** across files:
  - Raga parsing functions (Hindustani CSV, Melakarta CSV)
  - Note/swar name constants
  - Dark mode styling
  - Audio playback hooks

### Identified Shared Patterns

| Pattern | Files | Lines of Code |
|---------|-------|---------------|
| Hindustani raga CSV data + parser | All 3 | ~200 lines each |
| Melakarta CSV data + parser | All 3 | ~100 lines each |
| Audio context + piano sample loading | index, raga-query | ~150 lines each |
| Note constants (swarNames, westernNotes) | All 3 | ~20 lines each |
| Dark mode CSS + toggle | All 3 | ~40 lines each |
| Piano keyboard component | index, raga-query | ~100 lines each |

### Complete Feature Inventory (ChordTool - index.html)

**Core Features:**
- Hindustani/Carnatic mode toggle
- Raga selection dropdown (200+ Hindustani, 72 Carnatic)
- Tonic selection (Sa → C, D, E, etc.)
- Separate Aaroh/Avroh toggle
- Custom scale editor with note picker
- Show chords outside raga (with min/max outside controls)
- Show raga notes on keyboard overlay

**Audio System:**
- Web Audio API with AudioContext
- Pre-rendered piano samples (36 notes × 3 octaves)
- Tanpura drone playback per tonic
- Aaroh/Avroh/Full raga playback with chalan sequences
- Chord playback (unison & arpeggio modes)
- Keyboard shortcuts (A-Z rows map to 3 octaves)

**Chord Visualization:**
- Circle of fifths SVG with chord polygons
- Note filtering by click (any position / root only)
- Chord type sidebar with counts
- Extended chords toggle (+add9, etc.)
- Western chord name display (e.g., "Cmaj7")

**Rhythm/Progression System:**
- Multiple progression tabs (A, B, C)
- Drag-and-drop chord placement onto beat grid
- Breakpoint patterns (e.g., 3-3-2 for 8 beats)
- BPM control (40-240)
- Loop toggle
- Playback mode (unison vs melody/arpeggiated)
- Arpeggiation delay control
- Note duration control

**MIDI Export:**
- Tempo (BPM)
- MIDI program (0-127 instrument)
- Velocity (1-127)
- Note length (beats)
- Gap between chords (beats)
- Channel (1-16)
- Piano chord visualization per beat

**State Variables (~55 useState hooks):**
```javascript
// Raga state
ragaList, melakartaList, selectedRagaName, selectedRaga, isCarnaticMode

// Display state
selectedChordType, extendChords, separateAarohAvroh, showChordsOutsideRaga
outsideMinAllowed, outsideMaxAllowed, selectedNote, noteFilterMode
selectedTonic, showKeyboard, showRagaNotesOnKeyboard, darkMode

// Custom scale
customScaleMode, customNotePattern, customAarohPattern, customAvrohPattern
customMode, customRoot, customIntervalsAbs

// Audio
audioContext, pianoSamplesReady, isPlaying, isTanpuraPlaying, baseOctave

// Chords
chordsAll, chordsAaroh, chordsAvroh, chordsOutsideAll, chordsOutsideAaroh, chordsOutsideAvroh
countsByType, aggregatedBasic, aggregatedExtended, customMatches

// UI toggles
activeTab, showMoreAvailable, showMoreAaroh, showMoreAvroh
showMoreOutsideAll, showMoreOutsideAaroh, showMoreOutsideAvroh

// Rhythm
cycleBeats, cycleBpm, cycleLoop, cycleIsPlaying, cycleCurrentBeat, cycleChords
rhythmProgressions, activeProgressionId, customBreakpoints, breakpointError
rhythmPlaybackMode, arpeggiationDelay, chordNoteDuration

// MIDI
midiTempo, midiProgram, midiVelocity, midiNoteLengthBeats, midiGapBeats, midiChannel
showMidiSettings, showRhythmPianoChords

// Derived
serverChordTypes, chordTypes, loadError
```

### Complete Feature Inventory (RagaQuery - raga-query.html)

**Core Features:**
- Hindustani/Carnatic mode toggle (clears filters on switch)
- Search by raga name (text input)
- Scale type filter (5/6/7 note scales)
- Note search mode (contains vs exact match)
- Separate Aaroh/Avroh note selection toggle

**Note Selection System:**
- Tri-state note buttons (neutral → selected → excluded → neutral cycle)
- Carnatic 16-swara grid OR Hindustani 12-note grid
- Unified mode (single note set) OR Separate aaroh/avroh sets
- Automatic Sa inclusion in searches

**Audio System:**
- Piano keyboard component (3 octaves, collapsible)
- Pre-rendered samples (same as ChordTool)
- Aaroh + Avroh playback for each result

**Results Display:**
- Note badges showing all 12 (or 16 Carnatic) swaras
- Aaroh/Avroh sequence display (e.g., "S - R - G - P - D")
- Play button per raga result
- Hamming distance ranking (closest matches first)

**URL Integration:**
- Link to ChordTool with `?raga=<name>` query param
- Dynamic link update on raga selection

**State Variables (~25 useState hooks):**
```javascript
darkMode, isLoading, loadError
isCarnaticMode, melakartaList, hindustaniRagas
audioContext, isPlaying, baseOctave, pianoSamplesReady
searchQuery, scaleType, searchMode
separateNoteSelection
selectedNotes, excludedNotes
selectedAarohNotes, excludedAarohNotes
selectedAvrohNotes, excludedAvrohNotes
results, showPiano
```

---

### Complete Feature Inventory (RagaInsights - raga-insights.html)

**3 Analysis Tabs:**
1. **Same Notes** - Ragas with identical 12-TET note sets
2. **Murchanna** - Ragas that are rotations (modes) of each other
3. **Subsets** - Ragas contained within larger ragas (e.g., Bhupali ⊂ Khamaj)

**Filtering:**
- Search by raga name (across all tabs)
- System filter: All / Hindustani / Carnatic / Cross-System
- Scale type filter: 5/6/7/8+ notes
- "Show cross-system only" toggle (Same Notes tab)

**Analysis Functions:**
- `analyzeSameNotes()` - Groups by pattern string, filters multi-raga groups
- `analyzeMurchanna()` - 12 rotations per raga, finds matching patterns
- `analyzeSubsets()` - O(n²) subset check with note count validation
- `rotateBinary(pattern, steps)` - Pattern rotation utility

**UI Components:**
- Expandable relationship cards (subset supersets)
- Note badges with active/inactive styling
- Murchanna rotation diagrams
- Stats header (counts per system + analysis results)
- Loading spinner

**State Variables (~18 useState hooks):**
```javascript
darkMode, isLoading, loadError, activeTab
hindustaniRagas, carnaticRagas
sameNotesGroups, murchannaGroups, subsetRelations
searchQuery, systemFilter, scaleTypeFilter, showOnlyMatches
filteredSameNotes, filteredMurchanna, filteredSubsets
expandedSubsets
```

---

## Proposed File Structure

```
pakad-webapp/
├── public/
│   ├── Piano/                    # (move existing)
│   └── tanpura/                  # (move existing)
├── src/
│   ├── main.jsx                  # Entry point
│   ├── App.jsx                   # Router wrapper
│   ├── index.css                 # Global styles (Tailwind + custom)
│   │
│   ├── components/
│   │   ├── common/
│   │   │   ├── Header.jsx        # Navigation between pages
│   │   │   ├── ThemeToggle.jsx   # Dark mode toggle
│   │   │   └── PianoKeyboard.jsx # Interactive 3-octave keyboard
│   │   │
│   │   ├── chords/
│   │   │   ├── ChordCircle.jsx   # Circle of fifths SVG visualization
│   │   │   ├── ChordCard.jsx     # Individual chord display with play buttons
│   │   │   ├── ChordTypeList.jsx # Sidebar chord type selector with counts
│   │   │   ├── ChordGrid.jsx     # Grid of available chords (6+ columns)
│   │   │   └── CustomChordBuilder.jsx  # Stack intervals to build custom chord
│   │   │
│   │   ├── raga/
│   │   │   ├── RagaSelector.jsx  # Dropdown with Hindustani/Carnatic toggle
│   │   │   ├── ScaleEditor.jsx   # Custom scale note picker
│   │   │   └── NoteWheel.jsx     # 12-note wheel visualization
│   │   │
│   │   └── rhythm/
│   │       ├── ProgressionTabBar.jsx   # Multiple progression tabs (A, B, C)
│   │       ├── TimelineGrid.jsx        # Beat grid with drag-drop chord placement
│   │       ├── PlaybackControls.jsx    # BPM, beats, loop, mode toggles
│   │       ├── MidiSettingsPanel.jsx   # Tempo, program, velocity, channel
│   │       └── PianoChordPreview.jsx   # Mini keyboards showing chord fingerings
│   │
│   ├── hooks/
│   │   ├── useAudio.js           # Web Audio API context management
│   │   ├── usePianoSamples.js    # Sample loading + playback
│   │   ├── useTanpura.js         # Tanpura drone playback
│   │   ├── useLocalStorage.js    # Persist progressions
│   │   └── useDarkMode.js        # Theme state
│   │
│   ├── utils/
│   │   ├── noteHelpers.js        # swarNames, westernNotes, pitch conversions
│   │   ├── chordHelpers.js       # Chord computation, filtering, extensions
│   │   ├── midiExport.js         # MIDI file generation (buildMidiFromProgression)
│   │   ├── audioHelpers.js       # Frequency calculations, arrangeChordNotes
│   │   └── breakpointHelpers.js  # Breakpoint pattern validation (e.g., 3-3-2)
│   │
│   ├── data/
│   │   ├── ragaData.js           # Hindustani raga definitions
│   │   ├── melakartaData.js      # 72 Carnatic melakartas
│   │   └── chordTypes.js         # Chord type definitions
│   │
│   └── pages/
│       ├── ChordTool.jsx         # Main chord formation page (from index.html)
│       ├── RagaQuery.jsx         # Raga database search (from raga-query.html)
│       └── RagaInsights.jsx      # Relationship analysis (from raga-insights.html)
│
├── index.html                    # Vite entry point
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

---

## Proposed Changes

### Phase 1: Project Scaffolding
> **Goal**: Create Vite + React + Tailwind project structure

#### [NEW] `package.json`
- Vite, React 18, React Router DOM, Tailwind CSS

#### [NEW] `vite.config.js`
- Configure public directory for audio assets

#### [NEW] `tailwind.config.js` + `postcss.config.js`
- Port existing dark mode classes

---

### Phase 2: Extract Shared Data
> **Goal**: Move hardcoded CSV data into importable modules

#### [NEW] `src/data/ragaData.js`
- Export `HINDUSTANI_RAGAS` array (parsed from CSV)
- Export `parseHindustaniRaga()` function

#### [NEW] `src/data/melakartaData.js`
- Export `MELAKARTA_72` array
- Export `parseMelakartaSwaras()` function

#### [NEW] `src/data/chordTypes.js`
- Export `CHORD_TYPES` array with intervals and colors

---

### Phase 3: Extract Utilities
> **Goal**: Create reusable helper functions

#### [NEW] `src/utils/noteHelpers.js`
```javascript
export const SWAR_NAMES = ['Sa', 'Re♭', 'Re', ...];
export const CARNATIC_LABELS = ['S', 'R1', 'R2/G1', ...];
export const WESTERN_NOTES = ['C', 'C#', 'D', ...];
export const pitchClassToSwar = (pc, isCarnatic) => ...;
export const rotateBinary = (pattern, steps) => ...;
```

#### [NEW] `src/utils/chordHelpers.js`
- `availableChordsForPattern(pattern, chordType, extend)`
- `filterChordsByNote(chords, note, mode)`
- `attachWesternNames(chords, tonic)`

#### [NEW] `src/utils/midiExport.js`
- `buildMidiFromProgression(progression, options)`
- `downloadAsMidi(bytes, filename)`

---

### Phase 4: Extract Hooks
> **Goal**: Encapsulate stateful audio logic

#### [NEW] `src/hooks/useAudio.js`
- Manages `AudioContext` lifecycle
- Handles browser autoplay policies

#### [NEW] `src/hooks/usePianoSamples.js`
- Loads piano samples from `/Piano/`
- Provides `playNote(noteIndex, octave, duration, delay)`

#### [NEW] `src/hooks/useTanpura.js`
- Loads tanpura drone for selected tonic
- Provides `toggleTanpura()`, `isTanpuraPlaying`

---

### Phase 5: Build Components
> **Goal**: Create reusable UI components

#### [NEW] `src/components/common/PianoKeyboard.jsx`
- 3-octave interactive keyboard
- Highlights raga notes when enabled
- Keyboard shortcut support

#### [NEW] `src/components/chords/ChordCircle.jsx`
- SVG-based circle of fifths
- Shows chord arcs on available chords
- Click note to filter

#### [NEW] `src/components/raga/RagaSelector.jsx`
- Hindustani/Carnatic toggle
- Searchable dropdown
- Displays aaroh/avroh patterns

---

### Phase 6: Build Pages
> **Goal**: Compose components into full pages

#### [NEW] `src/pages/ChordTool.jsx`
Main chord formation interface:
- RagaSelector
- ChordCircle + ChordTypeList
- ProgressionBuilder
- RhythmGrid
- PianoKeyboard

#### [NEW] `src/pages/RagaQuery.jsx`
Database search interface:
- Note filter (include/exclude)
- Scale type filter
- Results table with playback

#### [NEW] `src/pages/RagaInsights.jsx`
Relationship analysis:
- Same-notes groups
- Murchanna rotations
- Subset relationships

---

### Phase 7: Routing & Polish
> **Goal**: Connect pages with navigation

#### [NEW] `src/App.jsx`
```jsx
<BrowserRouter>
  <Header />
  <Routes>
    <Route path="/" element={<ChordTool />} />
    <Route path="/query" element={<RagaQuery />} />
    <Route path="/insights" element={<RagaInsights />} />
  </Routes>
</BrowserRouter>
```

---

## Migration Strategy

### Recommended Approach: **Incremental Page-by-Page**

1. **Scaffold project** with Vite + React + Tailwind
2. **Port data files** first (no UI changes)
3. **Port one page at a time** starting with `RagaQuery` (simplest)
4. **Extract shared components** as they emerge
5. **Port ChordTool** last (most complex)
6. **Delete old HTML files** when all pages work

### Why This Order?
- `RagaQuery` (~1400 lines) has fewest dependencies, good for validating setup
- `RagaInsights` (~1300 lines) shares data with Query, validates data modules
- `ChordTool` (~4700 lines) is most complex, benefits from established patterns

---

## Verification Plan

### Automated
- No existing tests in the repository
- **Proposed**: Add Vitest for unit testing utility functions
  - `noteHelpers.test.js` - note conversion functions
  - `chordHelpers.test.js` - chord computation

### Manual Testing (by User)
After each phase, please verify:

1. **Phase 1**: Run `npm run dev`, see Vite welcome page
2. **Phase 2**: Import data in console, verify raga count matches (201 Hindustani, 72 Carnatic)
3. **Phase 5**: Keyboard plays notes, circle displays correctly
4. **Phase 6**: 
   - ChordTool: Select Yaman → shows Ma♯ chords, play aaroh/avroh
   - RagaQuery: Search "Bhairav" → multiple results appear
   - RagaInsights: Same-notes tab shows cross-system matches
5. **Phase 7**: Navigate between pages using header links

---

## Confirmed Decisions

| Decision | Choice | Notes |
|----------|--------|-------|
| **Styling** | Tailwind CSS | Migration-friendly: custom CSS in `index.css`, component styles organized for easy replacement |
| **State Management** | React Context | No external library |
| **Routing** | Browser history | Standard routing, not hash-based (platform-agnostic) |
| **Testing** | Vitest | Unit tests for utility functions |
| **PWA** | Service worker | Offline support with vite-plugin-pwa |

---

## Estimated Effort

| Phase | Description | Est. Time |
|-------|-------------|-----------|
| 1 | Project scaffolding | 15 min |
| 2 | Data extraction | 30 min |
| 3 | Utilities | 45 min |
| 4 | Hooks | 1 hour |
| 5 | Components | 2 hours |
| 6 | Pages | 3 hours |
| 7 | Routing + polish | 30 min |
| **Total** | | **~8 hours** |

---

> **Ready to proceed?** Please review and let me know if you'd like any changes to the structure or approach before I begin Phase 1.
