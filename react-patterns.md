# Samvad (Pakad-Webapp) - React Patterns Documentation

This document provides a comprehensive explanation of the React patterns, hooks, state management, effects, and component architecture used throughout the application.

---

## Table of Contents

1. [Custom Hooks](#custom-hooks)
2. [State Management](#state-management)
3. [Effects (useEffect)](#effects-useeffect)
4. [Memoization (useMemo, useCallback)](#memoization)
5. [Components](#components)
6. [File-by-File Breakdown](#file-by-file-breakdown)

---

## Custom Hooks

The application uses three custom hooks to encapsulate audio functionality:

### 1. `useAudio` (`src/hooks/useAudio.js`)

**Purpose**: Manages the Web Audio API `AudioContext` lifecycle with browser autoplay policy handling.

**State Variables**:
| State | Type | Purpose |
|-------|------|---------|
| `audioContext` | `AudioContext \| null` | The Web Audio context instance |
| `isReady` | `boolean` | Whether the context is running |

**Key Functions**:
- `resume()`: Resumes suspended audio context (needed for autoplay policy)
- `suspend()`: Suspends audio context (e.g., when tab is hidden)

**Effects**:
```javascript
// Initialize AudioContext on mount
useEffect(() => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    setAudioContext(ctx);
    // Cleanup on unmount (no actual close to avoid HMR issues)
}, []);

// Handle visibility change
useEffect(() => {
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
}, [audioContext]);
```

**Usage Pattern**:
```javascript
const { audioContext, isReady, resume } = useAudio();
```

---

### 2. `usePianoSamples` (`src/hooks/usePianoSamples.js`)

**Purpose**: Loads piano audio samples and provides playback functions.

**Parameters**:
| Param | Type | Default | Purpose |
|-------|------|---------|---------|
| `audioContext` | `AudioContext` | - | Audio context from `useAudio` |
| `basePath` | `string` | `'/Piano'` | Path to sample files |

**State Variables**:
| State | Type | Purpose |
|-------|------|---------|
| `isReady` | `boolean` | Whether samples are loaded |
| `isLoading` | `boolean` | Loading indicator |
| `error` | `string \| null` | Error message if loading failed |

**Ref Variables**:
| Ref | Type | Purpose |
|-----|------|---------|
| `buffersRef` | `Object` | Stores decoded audio buffers |

**Returned Functions**:
| Function | Signature | Purpose |
|----------|-----------|---------|
| `loadSamples` | `() => Promise<void>` | Trigger lazy loading |
| `playNote` | `(noteIndex, octave, duration, delay, volume) => void` | Play single note |
| `playChord` | `(notes, octave, duration, delay, volume) => void` | Play notes simultaneously |
| `playChordArpeggiated` | `(notes, octave, arpDelay, duration, startDelay, volume) => void` | Play notes sequentially |
| `playSequence` | `(sequence, noteDelay) => number` | Play a sequence of notes |

**Key Pattern - Lazy Loading**:
```javascript
const loadSamples = useCallback(async () => {
    if (!audioContext || isReady || isLoading || buffersRef.current['C']) return;
    setIsLoading(true);
    try {
        const buffers = await loadPianoSamples(audioContext, basePath);
        buffersRef.current = buffers;
        setIsReady(true);
    } catch (err) {
        setError(err.message);
    }
    setIsLoading(false);
}, [audioContext, basePath, isReady, isLoading]);
```

---

### 3. `useTanpura` (`src/hooks/useTanpura.js`)

**Purpose**: Manages tanpura drone playback using HTMLAudioElement for proper pause/resume support.

**Parameters**:
| Param | Type | Default | Purpose |
|-------|------|---------|---------|
| `basePath` | `string` | `'/tanpura'` | Path to drone files |

**State Variables**:
| State | Type | Purpose |
|-------|------|---------|
| `isPlaying` | `boolean` | Current playback state |
| `isLoading` | `boolean` | Loading indicator |
| `currentTonic` | `number` | Current tonic (0-11) |

**Ref Variables**:
| Ref | Type | Purpose |
|-----|------|---------|
| `tanpuraRef` | `HTMLAudioElement \| null` | Audio element for playback |

**Returned Functions**:
| Function | Signature | Purpose |
|----------|-----------|---------|
| `toggle` | `(tonic?) => Promise<void>` | Toggle play/pause |
| `changeTonic` | `(newTonic, autoPlay) => Promise<void>` | Change tonic note |

**Key Pattern - Audio Element Toggle**:
```javascript
const toggle = useCallback(async (tonic = currentTonic) => {
    const currentlyPlaying = tanpuraRef.current && !tanpuraRef.current.paused;
    
    if (currentlyPlaying) {
        tanpuraRef.current.pause();
        setIsPlaying(false);
    } else {
        // Load new audio if needed, then play
        const audio = await loadTanpuraFile(fileName, basePath);
        tanpuraRef.current = audio;
        await audio.play();
        setIsPlaying(true);
    }
}, [currentTonic, basePath]);
```

---

## State Management

The application uses local component state exclusively (no Redux/Context). State is organized by feature:

### ChordTool.jsx State Categories

#### Core Musical State
```javascript
const [isCarnatic, setIsCarnatic] = useState(false);           // Music system toggle
const [selectedRagaName, setSelectedRagaName] = useState('');  // Selected raga
const [selectedTonic, setSelectedTonic] = useState(0);         // Tonic (0=C, 1=C#, etc.)
```

#### Chord Filtering State
```javascript
const [selectedChordType, setSelectedChordType] = useState('all');   // Chord type filter
const [showExtended, setShowExtended] = useState(false);             // Show 7th, 9th chords
const [separateAarohAvroh, setSeparateAarohAvroh] = useState(false); // Split ascending/descending
const [showOutsideChords, setShowOutsideChords] = useState(false);   // Chords outside raga
const [outsideMinAllowed, setOutsideMinAllowed] = useState(1);       // Min outside notes
const [outsideMaxAllowed, setOutsideMaxAllowed] = useState(1);       // Max outside notes
```

#### UI State
```javascript
const [showPiano, setShowPiano] = useState(false);                // Piano visibility
const [activeTab, setActiveTab] = useState('chords');             // 'chords' | 'custom'
const [showRagaNotesOnKeyboard, setShowRagaNotesOnKeyboard] = useState(false);
const [selectedNote, setSelectedNote] = useState(null);           // Note filter selection
const [noteFilterMode, setNoteFilterMode] = useState('root');     // 'root' | 'any'
```

#### Custom Scale State
```javascript
const [customScaleMode, setCustomScaleMode] = useState(false);
const [customNotePattern, setCustomNotePattern] = useState(Array(12).fill(false));
const [customAarohPattern, setCustomAarohPattern] = useState(Array(12).fill(false));
const [customAvrohPattern, setCustomAvrohPattern] = useState(Array(12).fill(false));
```

#### Custom Chord Builder State
```javascript
const [customRoot, setCustomRoot] = useState(0);
const [customIntervalsAbs, setCustomIntervalsAbs] = useState([0]);
```

#### Rhythm Progression State
```javascript
const [rhythmProgressions, setRhythmProgressions] = useState([
    { id: 1, name: '1', chords: [], isPlaying: false, currentBeat: 0 },
    { id: 2, name: '2', chords: [], isPlaying: false, currentBeat: 0 },
    { id: 3, name: '3', chords: [], isPlaying: false, currentBeat: 0 },
    { id: 4, name: '4', chords: [], isPlaying: false, currentBeat: 0 }
]);
const [activeProgressionId, setActiveProgressionId] = useState(1);
const [beats, setBeats] = useState(8);
const [bpm, setBpm] = useState(120);
const [loop, setLoop] = useState(true);
```

#### MIDI Export State
```javascript
const [showMidiSettings, setShowMidiSettings] = useState(false);
const [midiTempo, setMidiTempo] = useState(120);
const [midiProgram] = useState(0);
const [midiVelocity, setMidiVelocity] = useState(96);
const [midiNoteLengthBeats, setMidiNoteLengthBeats] = useState(3.2);
const [midiGapBeats, setMidiGapBeats] = useState(0.4);
```

---

### RagaQuery.jsx State

```javascript
const [activeTab, setActiveTab] = useState('hindustani');  // System filter
const [searchQuery, setSearchQuery] = useState('');        // Name search
const [selectedNotes, setSelectedNotes] = useState([]);    // Include filter
const [excludedNotes, setExcludedNotes] = useState([]);    // Exclude filter
const [scaleTypeFilter, setScaleTypeFilter] = useState('all'); // Audav/Shadav/Sampoorna
const [layoutMode, setLayoutMode] = useState('default');   // 'default' | 'laptop'
const [expandedRaga, setExpandedRaga] = useState(null);    // Expanded raga details
```

---

### RagaInsights.jsx State

```javascript
const [activeTab, setActiveTab] = useState('same-notes');     // Analysis type
const [searchQuery, setSearchQuery] = useState('');           // Name search
const [systemFilter, setSystemFilter] = useState('all');      // Hindustani/Carnatic
const [scaleTypeFilter, setScaleTypeFilter] = useState('all'); // Note count filter
const [expanded, setExpanded] = useState({});                 // Expanded groups
```

---

## Effects (useEffect)

### URL Parameter Handling
```javascript
// Handle URL param for raga selection
useEffect(() => {
    const ragaParam = searchParams.get('raga');
    if (ragaParam) {
        const decodedName = decodeURIComponent(ragaParam);
        // Search both Hindustani and Carnatic lists
        const match = HINDUSTANI_RAGAS.find(r => r.name === decodedName)
                   || MELAKARTA_72.find(r => r.name === decodedName);
        if (match) {
            setSelectedRagaName(decodedName);
            setIsCarnatic(match.system === 'carnatic');
        }
    }
}, [searchParams]);
```

### Auto-Selection
```javascript
// Auto-select first raga if none selected
useEffect(() => {
    if (searchParams.get('raga')) return; // Don't override URL param
    if (!selectedRagaName && ragaList.length > 0) {
        setSelectedRagaName(ragaList[0].name);
    }
}, [ragaList, selectedRagaName, searchParams]);
```

### Aaroh/Avroh Auto-Toggle
```javascript
// Auto-enable separateAarohAvroh when raga has different patterns
useEffect(() => {
    if (selectedRaga && !customScaleMode) {
        const aarohStr = JSON.stringify([...selectedRaga.aarohPattern].sort());
        const avrohStr = JSON.stringify([...selectedRaga.avrohPattern].sort());
        setSeparateAarohAvroh(aarohStr !== avrohStr);
    }
}, [selectedRaga, customScaleMode]);
```

### localStorage Persistence
```javascript
// Load progressions from storage on mount
useEffect(() => {
    try {
        const raw = localStorage.getItem('pakad_progressions');
        if (raw) {
            const parsed = JSON.parse(raw);
            setRhythmProgressions(parsed.map(p => ({ ...p, isPlaying: false })));
        }
    } catch { /* ignore */ }
}, []);

// Save progressions to storage on change
useEffect(() => {
    try {
        localStorage.setItem('pakad_progressions', JSON.stringify(rhythmProgressions));
    } catch { /* ignore */ }
}, [rhythmProgressions]);
```

### Playback Loop
```javascript
// Playback interval for active progression
useEffect(() => {
    if (!activeProgression.isPlaying) return;
    
    const msPerBeat = 60000 / bpm;
    const interval = setInterval(() => {
        setRhythmProgressions(prev => prev.map(p => {
            if (p.id !== activeProgressionId || !p.isPlaying) return p;
            
            const next = p.currentBeat + 1;
            if (next >= beats) {
                if (loop) return { ...p, currentBeat: 0 };
                return { ...p, isPlaying: false, currentBeat: -1 };
            }
            
            // Play chord at this beat
            const chordAtBeat = p.chords.find(c => Math.floor(c.beat) === next);
            if (chordAtBeat) handlePlayChord(chordAtBeat.chord);
            
            return { ...p, currentBeat: next };
        }));
    }, msPerBeat);
    
    return () => clearInterval(interval);
}, [activeProgression.isPlaying, bpm, beats, loop, handlePlayChord]);
```

### Tanpura Tonic Sync
```javascript
// Update tanpura when tonic changes (only if playing)
const prevTonicRef = useRef(selectedTonic);
useEffect(() => {
    if (prevTonicRef.current !== selectedTonic && isTanpuraPlaying) {
        changeTonic(selectedTonic, true);
    }
    prevTonicRef.current = selectedTonic;
}, [selectedTonic, isTanpuraPlaying, changeTonic]);
```

---

## Memoization

### useMemo Examples

#### Raga List Computation
```javascript
const ragaList = useMemo(() => {
    return isCarnatic ? MELAKARTA_72 : HINDUSTANI_RAGAS;
}, [isCarnatic]);
```

#### Selected Raga Lookup
```javascript
const selectedRaga = useMemo(() => {
    return ragaList.find(r => r.name === selectedRagaName) || null;
}, [ragaList, selectedRagaName]);
```

#### Chord Computation (Expensive)
```javascript
const chordData = useMemo(() => {
    const patterns = getCurrentPatterns();
    if (patterns.all.length === 0) {
        return { all: [], aaroh: [], avroh: [], outside: [], counts: {} };
    }
    
    const all = getAvailableChords(patterns.all, selectedChordType, showExtended);
    const aaroh = separateAarohAvroh
        ? getAvailableChords(patterns.aaroh, selectedChordType, showExtended)
        : [];
    // ... more computation
    
    return { all, aaroh, avroh, outside, counts };
}, [getCurrentPatterns, selectedChordType, showExtended, separateAarohAvroh, ...]);
```

#### Active Progression
```javascript
const activeProgression = useMemo(() => {
    return rhythmProgressions.find(p => p.id === activeProgressionId) 
        || rhythmProgressions[0];
}, [rhythmProgressions, activeProgressionId]);
```

#### Display Labels
```javascript
const labels = useMemo(() => getDisplayLabels(isCarnatic), [isCarnatic]);
```

---

### useCallback Examples

#### Current Patterns Getter
```javascript
const getCurrentPatterns = useCallback(() => {
    if (customScaleMode) {
        if (separateAarohAvroh) {
            const aar = customAarohPattern.map(v => v ? 1 : 0);
            const avr = customAvrohPattern.map(v => v ? 1 : 0);
            return { all: aar.map((x, i) => x || avr[i] ? 1 : 0), aaroh: aar, avroh: avr };
        }
        return { all: customNotePattern.map(v => v ? 1 : 0), aaroh: [], avroh: [] };
    }
    if (!selectedRaga) return { all: [], aaroh: [], avroh: [] };
    return { 
        all: selectedRaga.notePattern, 
        aaroh: selectedRaga.aarohPattern, 
        avroh: selectedRaga.avrohPattern 
    };
}, [customScaleMode, separateAarohAvroh, customNotePattern, ...]);
```

#### Note Click Handler
```javascript
const handleNoteClick = useCallback((noteIndex) => {
    if (selectedNote === noteIndex) {
        if (noteFilterMode === 'any') {
            setNoteFilterMode('root');
        } else {
            setSelectedNote(null);
            setNoteFilterMode('any');
        }
    } else {
        setSelectedNote(noteIndex);
        setNoteFilterMode('any');
    }
}, [selectedNote, noteFilterMode]);
```

#### Chord Playback
```javascript
const handlePlayChord = useCallback(async (chord, isUnison = true) => {
    if (!pianoReady) {
        await resume();
        await loadSamples();
    }
    
    const arranged = arrangeChordNotes(chord.notes, 4);
    
    if (isUnison) {
        for (const { noteIndex, octave } of arranged) {
            playNote(noteIndex + selectedTonic, octave);
        }
    } else {
        arranged.forEach(({ noteIndex, octave }, i) => {
            setTimeout(() => playNote(noteIndex + selectedTonic, octave), i * 80);
        });
    }
}, [pianoReady, resume, loadSamples, playNote, selectedTonic]);
```

#### Progression Updates
```javascript
const updateProgression = useCallback((id, updates) => {
    setRhythmProgressions(prev => prev.map(p =>
        p.id === id ? { ...p, ...updates } : p
    ));
}, []);
```

---

## Components

### Component Hierarchy

```
App.jsx
├── Header
│   └── Link (React Router)
└── Routes
    ├── ChordTool
    │   ├── RagaSelector
    │   ├── ChordCircle
    │   ├── ChordTypeList
    │   ├── ChordCard / ChordGrid
    │   ├── PianoKeyboard
    │   ├── TimelineGrid
    │   └── PlaybackControls
    ├── RagaQuery
    │   ├── NoteBadge / NotePatternBadges
    │   └── (inline components)
    └── RagaInsights
        ├── NotePatternBadges
        └── (inline components)
```

---

### Component Patterns

#### Functional Components with Props Destructuring
```javascript
export function ChordCard({
    chord,
    onPlayUnison,
    onPlayMelody,
    tonic = 0,
    isCarnatic = false,
    isExtended = false,
    isOutside = false,
    ragaPattern = null,
    className = ''
}) {
    // ... component logic
}
```

#### Compound Components
```javascript
// NoteBadge.jsx exports multiple related components
export function NoteBadge({ noteIndex, isActive, isCarnatic, ... }) { ... }
export function NotePatternBadges({ pattern, isCarnatic, ... }) { ... }
export default NoteBadge;
```

#### Controlled vs Uncontrolled Patterns

**Controlled** (state managed by parent):
```javascript
<ChordTypeList
    selected={selectedChordType}
    onSelect={setSelectedChordType}
    counts={chordData.counts}
    showExtended={showExtended}
    onToggleExtended={setShowExtended}
/>
```

**Self-Contained** (internal state):
```javascript
// ChordCircle manages highlight set internally
const highlightSet = useMemo(() => new Set(highlightedNotes), [highlightedNotes]);
```

---

## File-by-File Breakdown

### Entry Point

#### `src/main.jsx`
- **Purpose**: Application bootstrap
- **Imports**: React, ReactDOM, App, index.css
- **Pattern**: StrictMode wrapping

### Root Component

#### `src/App.jsx`
- **Purpose**: Routing configuration and layout shell
- **State**: None (stateless router configuration)
- **Hooks Used**: None directly
- **Key Features**:
  - Uses `HashRouter` for GitHub Pages compatibility
  - Implements `React.lazy()` for code splitting
  - Provides `Suspense` fallback during page load

### Pages

#### `src/pages/ChordTool.jsx` (~1700 LOC)
- **Purpose**: Main chord generation interface
- **State Variables**: 30+ (see State Management section)
- **Hooks Used**: 
  - `useState` (30+ instances)
  - `useEffect` (8 instances)
  - `useMemo` (10+ instances)
  - `useCallback` (15+ instances)
  - `useRef` (2 instances)
  - `useSearchParams` (React Router)
  - Custom: `useAudio`, `usePianoSamples`, `useTanpura`

#### `src/pages/RagaQuery.jsx` (~560 LOC)
- **Purpose**: Raga database search
- **State Variables**: 8
- **Hooks Used**:
  - `useState` (8 instances)
  - `useMemo` (5 instances)
  - `useCallback` (3 instances)

#### `src/pages/RagaInsights.jsx` (~390 LOC)
- **Purpose**: Relationship analysis
- **State Variables**: 5
- **Hooks Used**:
  - `useState` (5 instances)
  - `useEffect` (1 instance)
  - `useMemo` (4 instances)

### Components

#### `src/components/common/Header.jsx`
- **Purpose**: Navigation header
- **Hooks Used**: `useLocation` (React Router)
- **Pattern**: Active link highlighting based on current route

#### `src/components/common/NoteBadge.jsx`
- **Purpose**: Display note labels with styling
- **Props**: `noteIndex`, `isActive`, `isCarnatic`, `activeColor`, `onClick`, `size`
- **Pattern**: Compound component export (NoteBadge + NotePatternBadges)

#### `src/components/common/PianoKeyboard.jsx`
- **Purpose**: Interactive 3-octave piano visualization
- **Hooks Used**: `useMemo` (2), `useCallback` (3)
- **Pattern**: Memoized position calculations, click delegation

#### `src/components/chords/ChordCard.jsx`
- **Purpose**: Individual chord display card
- **Pattern**: Drag-and-drop support via `draggable` and `onDragStart`
- **Exports**: `ChordCard`, `ChordGrid`

#### `src/components/chords/ChordCircle.jsx`
- **Purpose**: Circle-of-fifths SVG visualization
- **Hooks Used**: `useMemo` (3)
- **Pattern**: SVG generation with computed positions

#### `src/components/chords/ChordTypeList.jsx`
- **Purpose**: Chord type filter sidebar
- **Pattern**: Fully controlled component with callback props

### Custom Hooks

#### `src/hooks/useAudio.js`
- **Purpose**: AudioContext lifecycle
- **State**: 2 variables
- **Effects**: 2 (initialization, visibility change)
- **Returns**: `{ audioContext, isReady, resume, suspend }`

#### `src/hooks/usePianoSamples.js`
- **Purpose**: Piano sample loading and playback
- **State**: 3 variables + 1 ref
- **Returns**: `{ isReady, isLoading, error, playNote, playChord, playChordArpeggiated, playSequence, loadSamples }`

#### `src/hooks/useTanpura.js`
- **Purpose**: Tanpura drone management
- **State**: 3 variables + 1 ref
- **Effects**: 1 (cleanup)
- **Returns**: `{ isPlaying, isLoading, currentTonic, toggle, changeTonic }`

### Utilities

#### `src/utils/noteHelpers.js`
- **Purpose**: Note name constants and conversion functions
- **Exports**: Constants (SWAR_NAMES, CARNATIC_LABELS, WESTERN_NOTES, etc.)
- **Functions**: `getDisplayLabels`, `pitchClassToFrequency`, `rotateBinary`, `patternToString`, etc.

#### `src/utils/chordHelpers.js`
- **Purpose**: Chord computation logic
- **Key Functions**:
  - `isChordInPattern(root, intervals, pattern)`
  - `getAvailableChords(pattern, typeFilter, extended)`
  - `getChordsOutsidePattern(pattern, min, max, ...)`
  - `filterChordsByNote(chords, note, mode)`
  - `arrangeChordNotes(notes, baseOctave)`

#### `src/utils/analysisHelpers.js`
- **Purpose**: Raga relationship analysis
- **Key Functions**:
  - `analyzeSameNotes(hindustani, carnatic)`
  - `analyzeMurchanna(hindustani, carnatic)`
  - `analyzeSubsets(hindustani, carnatic)`
  - `filterAnalysisResults(results, filters)`

#### `src/utils/audioHelpers.js`
- **Purpose**: Audio file loading and playback utilities
- **Key Functions**:
  - `loadPianoSamples(ctx, basePath)`
  - `playNote(options)`
  - `arrangeNotesAscending(pitchClasses, baseOctave)`
  - `arrangeNotesDescending(pitchClasses, startOctave, ...)`

#### `src/utils/midiExport.js`
- **Purpose**: MIDI file generation
- **Key Functions**:
  - `writeVLQ(value)` - Variable-length quantity encoding
  - `buildMidiFromProgression(options)` - Generate MIDI bytes
  - `downloadMidi(data, filename)` - Trigger download

### Data Files

#### `src/data/ragaData.js`
- **Purpose**: Hindustani raga definitions
- **Exports**: 
  - `HINDUSTANI_RAGAS_CSV` (raw string)
  - `HINDUSTANI_RAGAS` (parsed array of 201+ ragas)
- **Schema**: `{ name, notePattern, aarohPattern, avrohPattern }`

#### `src/data/melakartaData.js`
- **Purpose**: Carnatic melakarta definitions
- **Exports**:
  - `MELAKARTA_CSV_DATA` (raw string)
  - `MELAKARTA_72` (parsed array of 72 melakartas)
- **Schema**: `{ number, name, notePattern, carnaticSwaras }`

#### `src/data/chordTypes.js`
- **Purpose**: Chord type definitions
- **Exports**:
  - `CHORD_TYPES` (basic: major, minor, dim, aug, sus)
  - `EXTENDED_CHORD_TYPES` (7th, 9th, etc.)
  - `ALL_CHORD_TYPES` (combined)
  - `ALL_CHORDS_OPTION` (filter option)
- **Schema**: `{ id, name, intervals, color, isExtended }`

---

## Performance Patterns Summary

| Pattern | Usage | Benefit |
|---------|-------|---------|
| `useMemo` | Expensive computations (chord lists, raga lookups) | Avoid recalculation |
| `useCallback` | Event handlers passed to children | Stable references |
| `React.lazy` | Page components | Code splitting |
| `useRef` | Audio elements, ID counters | Avoid re-renders |
| localStorage | Progression persistence | Session survival |

---

## Anti-Patterns Avoided

1. **No prop drilling**: Hooks encapsulate audio state locally
2. **No premature optimization**: Only memoize truly expensive operations
3. **No derived state**: Compute from source of truth via useMemo
4. **No stale closures**: useCallback dependencies properly specified
5. **No memory leaks**: Cleanup functions in useEffect for intervals/listeners
