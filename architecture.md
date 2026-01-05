# Samvad (Pakad-Webapp) - Architecture Documentation

## Overview

**Samvad** is a modern React-based web application for exploring Indian Classical Music (ragas) and their intersection with Western harmony. The application enables musicians, composers, and enthusiasts to analyze ragas, generate compatible chords, and create rhythmic progressions.

---

## Tech Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **UI Framework** | React | 19.2.0 | Component-based UI |
| **Build Tool** | Vite | 7.2.4 | Fast development and bundling |
| **Styling** | Tailwind CSS | 4.1.18 | Utility-first CSS framework |
| **Routing** | React Router DOM | 7.11.0 | Client-side navigation (HashRouter) |
| **Audio** | Web Audio API | Native | Low-latency audio playback |
| **PWA** | vite-plugin-pwa | 1.2.0 | Offline support and installability |
| **Mobile** | Capacitor | 8.0.0 | iOS and Android native wrappers |
| **Desktop** | Electron | via @capacitor-community/electron | Mac desktop application |
| **Testing** | Vitest + Testing Library | Latest | Unit and integration tests |
| **Linting** | ESLint | 9.39.1 | Code quality enforcement |

---

## Project Directory Structure

```
pakad-webapp/
├── src/                          # React application source
│   ├── main.jsx                  # Application entry point
│   ├── App.jsx                   # Root component with routing
│   ├── App.css                   # Global component styles
│   ├── index.css                 # Base styles and Tailwind directives
│   │
│   ├── pages/                    # Page-level components (routes)
│   │   ├── ChordTool.jsx         # Main chord generation interface (~1700 LOC)
│   │   ├── RagaQuery.jsx         # Raga database search (~560 LOC)
│   │   └── RagaInsights.jsx      # Relationship analysis (~390 LOC)
│   │
│   ├── components/               # Reusable UI components
│   │   ├── common/               # Shared components
│   │   │   ├── Header.jsx        # Navigation header
│   │   │   ├── NoteBadge.jsx     # Note display badges
│   │   │   └── PianoKeyboard.jsx # Interactive piano visualization
│   │   ├── chords/               # Chord-related components
│   │   │   ├── ChordCard.jsx     # Individual chord display
│   │   │   ├── ChordCircle.jsx   # Circle of fifths visualization
│   │   │   └── ChordTypeList.jsx # Chord type filter sidebar
│   │   ├── raga/                 # Raga selection components
│   │   │   └── RagaSelector.jsx  # Raga dropdown/search
│   │   └── rhythm/               # Rhythm builder components
│   │       └── TimelineGrid.jsx  # Beat grid for progressions
│   │
│   ├── hooks/                    # Custom React hooks
│   │   ├── useAudio.js           # AudioContext lifecycle management
│   │   ├── usePianoSamples.js    # Piano sample loading and playback
│   │   └── useTanpura.js         # Tanpura drone management
│   │
│   ├── data/                     # Static data files
│   │   ├── ragaData.js           # 201+ Hindustani ragas
│   │   ├── melakartaData.js      # 72 Carnatic melakartas
│   │   └── chordTypes.js         # Chord type definitions
│   │
│   ├── utils/                    # Helper functions
│   │   ├── noteHelpers.js        # Note/scale conversion utilities
│   │   ├── chordHelpers.js       # Chord computation logic
│   │   ├── analysisHelpers.js    # Murchanna, subsets, same-notes
│   │   ├── audioHelpers.js       # Audio playback utilities
│   │   └── midiExport.js         # MIDI file generation
│   │
│   ├── assets/                   # Bundled assets (SVGs, etc.)
│   └── __tests__/                # Test files
│
├── public/                       # Static assets (not bundled)
│   ├── Piano/                    # 36 piano sample files (.mp3)
│   │   ├── C.mp3, Db.mp3, ...    # Notes for octave 4
│   │   ├── C_m12.mp3, ...        # Notes for octave 3 (-12 semitones)
│   │   └── C_p12.mp3, ...        # Notes for octave 5 (+12 semitones)
│   ├── tanpura/                  # 12 tanpura drone files (.mp3)
│   │   └── C.mp3, Db.mp3, ...    # One per tonic
│   └── icon-192.svg              # PWA icon
│
├── electron/                     # Electron desktop wrapper
│   ├── src/                      # Electron source files
│   ├── electron-builder.config.json
│   └── package.json              # Electron-specific dependencies
│
├── android/                      # Capacitor Android project
├── ios/                          # Capacitor iOS project
│
├── legacy/                       # Original monolithic HTML prototypes
│   ├── index.html                # Original Chord Tool (~303KB)
│   ├── raga-query.html           # Original Raga Query
│   └── raga-insights.html        # Original Raga Insights
│
├── docs/                         # Production build output (GitHub Pages)
│
├── vite.config.js                # Vite configuration
├── vitest.config.js              # Vitest test configuration
├── capacitor.config.json         # Capacitor configuration
├── package.json                  # Dependencies and scripts
└── README.md                     # Project documentation
```

---

## Application Architecture

### Routing Structure

The application uses **HashRouter** for compatibility with GitHub Pages and static hosting:

```
/                 → ChordTool (default)
/app.html         → ChordTool (alias)
/query            → RagaQuery
/insights         → RagaInsights
```

### Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         App.jsx                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                     HashRouter                               ││
│  │  ┌──────────────┐  ┌────────────┐  ┌───────────────────┐   ││
│  │  │  ChordTool   │  │ RagaQuery  │  │   RagaInsights    │   ││
│  │  │   (Page)     │  │   (Page)   │  │      (Page)       │   ││
│  │  └──────┬───────┘  └─────┬──────┘  └────────┬──────────┘   ││
│  └─────────┼────────────────┼──────────────────┼───────────────┘│
└────────────┼────────────────┼──────────────────┼────────────────┘
             │                │                  │
    ┌────────▼────────┐       │                  │
    │  Custom Hooks   │       │                  │
    │  - useAudio     │       │                  │
    │  - usePiano     │◄──────┴──────────────────┤
    │  - useTanpura   │                          │
    └────────┬────────┘                          │
             │                                   │
    ┌────────▼─────────────────────────────────▼─┐
    │            Utils / Helpers                  │
    │  - chordHelpers    - analysisHelpers        │
    │  - noteHelpers     - midiExport             │
    │  - audioHelpers                             │
    └────────┬────────────────────────────────────┘
             │
    ┌────────▼────────────────────────────────────┐
    │              Data Layer                      │
    │  - ragaData.js (201+ Hindustani ragas)      │
    │  - melakartaData.js (72 Carnatic melakartas)│
    │  - chordTypes.js (chord definitions)        │
    └─────────────────────────────────────────────┘
```

---

## Build Configuration

### Vite Configuration (`vite.config.js`)

Key settings:
- **Base path**: `./` (relative paths for portable deployment)
- **Output directory**: `docs/` (for GitHub Pages deployment)
- **PWA Plugin**: Service worker with caching strategies
- **Tailwind Plugin**: JIT compilation

### PWA Configuration

```javascript
{
  registerType: 'autoUpdate',
  includeAssets: ['Piano/**/*', 'tanpura/**/*'],
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
    runtimeCaching: [
      { urlPattern: /\/Piano\/.*/, handler: 'CacheFirst', cacheName: 'piano-samples' },
      { urlPattern: /\/tanpura\/.*/, handler: 'CacheFirst', cacheName: 'tanpura-samples' }
    ]
  }
}
```

---

## Audio System Architecture

### Web Audio Pipeline

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐
│   useAudio   │────▶│  AudioContext   │◀────│  usePianoSamples │
│   (Context)  │     │    (Browser)    │     │     (Samples)    │
└──────────────┘     └────────┬────────┘     └──────────────────┘
                              │
                              ▼
                     ┌────────────────┐
                     │  GainNode      │
                     │  (Volume)      │
                     └────────┬───────┘
                              │
                              ▼
                     ┌────────────────┐
                     │  Destination   │
                     │  (Speakers)    │
                     └────────────────┘
```

### Sample Organization

| Octave | Suffix | Frequency Range | Files |
|--------|--------|-----------------|-------|
| 3 | `_m12` | ~130-250 Hz | C_m12.mp3 ... B_m12.mp3 |
| 4 | (none) | ~260-500 Hz | C.mp3 ... B.mp3 |
| 5 | `_p12` | ~520-1000 Hz | C_p12.mp3 ... B_p12.mp3 |

---

## Music Theory Implementation

### Note Representation

The app uses a **12-element binary pattern** to represent scales:

```javascript
// 12-TET pitch classes: [S, r, R, g, G, m, M, P, d, D, n, N]
// Index:                 [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]

// Example: Bhairav = [1, 1, 0, 0, 1, 1, 0, 1, 1, 0, 0, 1]
//                     S  r        G  m     P  d        N
```

### Carnatic 16-Swara to 12-TET Mapping

The Carnatic system has 16 swaras mapped to 12 pitch classes:

```javascript
const CARNATIC_TO_12TET = {
    0: 0,   // S
    1: 1,   // R1
    2: 2,   // R2
    3: 2,   // G1 (enharmonic with R2)
    4: 3,   // R3
    5: 3,   // G2 (enharmonic with R3)
    6: 4,   // G3
    7: 5,   // M1
    8: 6,   // M2
    9: 7,   // P
    10: 8,  // D1
    11: 9,  // D2
    12: 9,  // N1 (enharmonic with D2)
    13: 10, // D3
    14: 10, // N2 (enharmonic with D3)
    15: 11  // N3
};
```

### Chord Computation Algorithm

```javascript
function isChordInPattern(root, intervals, pattern) {
    return intervals.every(interval => 
        pattern[(root + interval) % 12] === 1
    );
}

// Example: Check if C Major (intervals [0,4,7]) fits in Bilawal
// Root=0, intervals=[0,4,7] → Check pattern[0], pattern[4], pattern[7]
```

---

## Deployment Architecture

### Multi-Platform Support

```
┌─────────────────────────────────────────────────────────────┐
│                    Source Code (React)                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
        ┌─────────┐  ┌──────────┐  ┌──────────┐
        │   Web   │  │  Mobile  │  │ Desktop  │
        │  (PWA)  │  │(Capacitor│  │(Electron)│
        └────┬────┘  └────┬─────┘  └────┬─────┘
             │            │             │
             ▼            ▼             ▼
       GitHub Pages   iOS / Android   Mac App
```

### Build Commands

```bash
# Development
npm run dev          # Start Vite dev server

# Production
npm run build        # Build to docs/ directory

# Testing
npm test             # Run Vitest tests
npm run test:coverage # Run tests with coverage

# Mobile (Capacitor)
npx cap sync         # Sync web assets to native projects
npx cap open ios     # Open Xcode
npx cap open android # Open Android Studio

# Desktop (Electron)
cd electron && npm run build
```

---

## Performance Considerations

### Lazy Loading

Pages are code-split using React.lazy():

```javascript
const ChordTool = React.lazy(() => import('./pages/ChordTool.jsx'));
const RagaQuery = React.lazy(() => import('./pages/RagaQuery.jsx'));
const RagaInsights = React.lazy(() => import('./pages/RagaInsights.jsx'));
```

### Audio Sample Lazy Loading

Piano samples are loaded on-demand (first user interaction):

```javascript
const loadSamples = useCallback(async () => {
    if (!audioContext || isReady || isLoading) return;
    // Load samples only when needed
}, [audioContext]);
```

### Service Worker Caching

Audio files are cached with a CacheFirst strategy for 30 days:

```javascript
runtimeCaching: [{
    urlPattern: /\/Piano\/.*/,
    handler: 'CacheFirst',
    options: {
        cacheName: 'piano-samples',
        expiration: { maxAgeSeconds: 60 * 60 * 24 * 30 }
    }
}]
```

---

## Data Sources

| File | Data | Records | Size |
|------|------|---------|------|
| `ragaData.js` | Hindustani ragas with aaroh/avroh | 201+ | ~10 KB |
| `melakartaData.js` | Carnatic melakartas | 72 | ~9 KB |
| `chordTypes.js` | Chord type definitions | ~20 | ~5 KB |
| `aarohavroha.csv` | Raw Hindustani data (source) | 201+ | ~8 KB |
| `melakarta_72.csv` | Raw Carnatic data (source) | 72 | ~3 KB |

---

## Key Design Decisions

1. **HashRouter over BrowserRouter**: Enables deployment on static hosts like GitHub Pages without server-side routing configuration.

2. **Relative Base Path (`./`)**: Allows the app to work at any URL path, supporting both GitHub Pages and Electron file:// protocol.

3. **localStorage Persistence**: Chord progressions are auto-saved to localStorage for session persistence.

4. **HTMLAudioElement for Tanpura**: Uses HTMLAudioElement instead of Web Audio API decodeAudioData for proper pause/resume support on looping audio.

5. **Lazy Sample Loading**: Samples load on first user interaction to avoid blocking initial page load and handle browser autoplay policies.
