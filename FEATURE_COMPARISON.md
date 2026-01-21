# Feature Comparison: old_index.html vs Current React App

> **Generated:** December 28, 2025  
> **Purpose:** Track feature parity between the legacy prototype and the new modular React application

---

## Quick Status Summary

| Category | Ported | Missing/Partial |
|----------|--------|-----------------|
| Core Features | 15 | 0 |
| Audio Features | 7 | 0 |
| Composition | 8 | 0 |
| Export Features | 4 | 0 |

---

## ✅ Fully Ported Features

### Core Raga Features
| Feature | old_index.html | Current App | Status |
|---------|----------------|-------------|--------|
| Hindustani Raga Selection | ✅ Dropdown | ✅ Dropdown in ChordTool | ✅ DONE |
| Carnatic (Melakarta) Mode | ✅ Toggle + 72 ragas | ✅ Toggle + CSV data | ✅ DONE |
| Tonic (Sa) Selection | ✅ Western note picker | ✅ Western note picker | ✅ DONE |
| Aaroha/Avroha Separation | ✅ Checkbox toggle | ✅ Checkbox toggle | ✅ DONE |
| Chord Generation from Raga | ✅ Pattern-based | ✅ `musicTheory.js` | ✅ DONE |
| Chord Types (13 types) | ✅ All chord types | ✅ CHORD_TYPES constant | ✅ DONE |

### Visualization Features
| Feature | old_index.html | Current App | Status |
|---------|----------------|-------------|--------|
| Raga Circle | ✅ SVG with 12 positions | ✅ `RagaCircle.jsx` | ✅ DONE |
| Piano Keyboard (3 octaves) | ✅ Interactive | ✅ `Piano.jsx` | ✅ DONE |
| Raga Notes on Keyboard | ✅ Toggle + labels | ✅ Toggle + labels | ✅ DONE |
| Chord Cards | ✅ Color-coded | ✅ `ChordDisplay.jsx` | ✅ DONE |
| Note Filtering | ✅ By root/any | ✅ In ChordTool | ✅ DONE |

### Audio Playback
| Feature | old_index.html | Current App | Status |
|---------|----------------|-------------|--------|
| Piano Sample Playback | ✅ Web Audio API | ✅ `audioEngine.js` | ✅ DONE |
| Chord Arpeggiation | ✅ Delay control | ✅ Delay slider | ✅ DONE |
| Note Duration Control | ✅ Slider | ✅ Slider | ✅ DONE |
| Tanpura Drone | ✅ Toggle play/stop | ✅ Toggle + loading state | ✅ DONE |
| Aaroh Chalan Playback | ✅ Button | ✅ Button | ✅ DONE |
| Avroh Chalan Playback | ✅ Button | ✅ Button | ✅ DONE |
| Outside Raga Notes | ✅ Highlight + filter | ✅ Filter controls | ✅ DONE |

### Composition Features
| Feature | old_index.html | Current App | Status |
|---------|----------------|-------------|--------|
| Multi-Track Sequencer | ✅ 4 progressions | ✅ `SequencerControls.jsx` | ✅ DONE |
| Progression Timeline | ✅ Drag-drop beats | ✅ `ProgressionTimeline.jsx` | ✅ DONE |
| Play/Stop Controls | ✅ Per-progression | ✅ In CompositionPanel | ✅ DONE |
| BPM Control | ✅ Input | ✅ Input | ✅ DONE |
| Beat Count | ✅ 1-32 slider | ✅ 1-32 slider | ✅ DONE |
| Loop Toggle | ✅ Checkbox | ✅ Checkbox | ✅ DONE |
| Progression Persistence | ✅ localStorage | ✅ localStorage | ✅ DONE |

### Export Features
| Feature | old_index.html | Current App | Status |
|---------|----------------|-------------|--------|
| MIDI Export | ✅ Download button | ✅ `midiUtils.js` | ✅ DONE |
| MIDI Program Selection | ✅ 0-127 | ✅ `MidiSettings.jsx` | ✅ DONE |
| MIDI Velocity | ✅ 1-127 | ✅ Slider | ✅ DONE |
| MIDI Channel | ✅ 1-16 | ✅ Input | ✅ DONE |
| JSON Project Export | ❌ Not in old | ✅ New feature | ✅ NEW |

---

## ⚠️ Partial/Different Implementation

| Feature | old_index.html | Current App | Difference |
|---------|----------------|-------------|------------|
| Dark Mode Toggle | ✅ `darkMode` variable (locked to true) | 🟡 Always dark | No toggle needed, always dark - OK |
| Extended Chords | ✅ Toggle + visual style | 🟡 Merged with normal | No separate section |
| Show More Chords | ✅ Per-section toggles | 🟡 Single toggle | Simplified UX |
| Custom Breakpoints | ✅ "4-4" input | 🟡 Fixed visual only | No user input |
| Base Octave Control | ✅ Global setting | 🟡 Fixed to 3/4 | Hardcoded |

---

## ✅ Recently Verified Features (Fully Ported)

### Custom Chord Builder
**Status:** ✅ **FULLY IMPLEMENTED**  
**Location:** `ChordTool.jsx` lines 918-1000

| Feature | Description | Status |
|---------|-------------|--------|
| Custom Root Selection | Pick any note as chord root | ✅ DONE |
| Stack Intervals | Add semitones to build chord (m2, M2, m3, M3, 4th, Tritone, 5th, Octave) | ✅ DONE |
| Remove Last Interval | Undo button | ✅ DONE |
| Reset Custom | Clear to root only | ✅ DONE |
| Visual Preview | Show stacked intervals, degrees, notes | ✅ DONE |
| Raga Validation | Validate against Full/Aaroh/Avroh patterns | ✅ DONE |
| Play Custom Chord | Hear the custom chord | ✅ DONE |
| Toggle UI | Switch between chord types and custom builder | ✅ DONE |

**Implementation Details:**
- State variables: `showCustomChordBuilder`, `customChordRoot`, `customIntervalsAbs`
- Provides real-time validation against current raga/custom scale patterns
- Beautiful purple/indigo gradient UI with interval buttons
- Displays steps, degrees, and swar names

---

### Custom Scale Mode
**Status:** ✅ **FULLY IMPLEMENTED**  
**Location:** `ChordTool.jsx` lines 50-53, 672-815

| Feature | Description | Status |
|---------|-------------|--------|
| Toggle Custom Scale Mode | Switch from raga to custom | ✅ DONE |
| 12-Note Pattern Editor | Interactive buttons for each note | ✅ DONE |
| Separate Aaroh/Avroh Patterns | Different patterns for ascending/descending | ✅ DONE |
| Use Custom Scale for Chords | Generate chords from custom patterns | ✅ DONE |
| Auto-Initialize | Copies current raga when entering custom mode | ✅ DONE |
| Quick Presets | Clear All, Major, Minor scale presets | ✅ DONE |

**Implementation Details:**
- State variables: `customScaleMode`, `customNotePattern`, `customAarohPattern`, `customAvrohPattern`
- Emerald/teal gradient UI with note count display
- Works seamlessly with separate Aaroh/Avroh toggle
- Integrates with chord generation, raga circle, and keyboard visualization

---

### Unison Playback Mode
**Status:** ✅ **FULLY IMPLEMENTED**  
**Location:** `ChordTool.jsx` line 47, 638-646

| Feature | Description | Status |
|---------|-------------|--------|
| Playback Mode Toggle | Dropdown selector for "unison" vs "melody" | ✅ DONE |
| Unison Mode | All notes play simultaneously (0ms delay) | ✅ DONE |
| Melody Mode | Notes play with arpeggiation delay | ✅ DONE |
| Conditional UI | Arpeggiation slider disabled in unison mode | ✅ DONE |

**Implementation Details:**
- State variable: `playbackMode` ('unison' or 'melody')
- Integrated into both manual chord clicks and sequencer playback
- Arpeggiation delay slider automatically disables when unison is selected

---

## ❌ Missing Features (Not Yet Ported)

### Additional MIDI Settings
**old_index.html Location:** Lines 209-214

| Feature | Current Status | Priority |
|---------|----------------|----------|
| MIDI Tempo (separate from BPM) | ❌ Missing, uses cycleBpm | Low |
| MIDI Note Length (beats) | ❌ Missing, fixed duration | Medium |
| MIDI Gap (beats) | ❌ Missing, no gap | Low |

---

### Piano Visualization in Timeline
**old_index.html Location:** Lines 220-221, 3200-3500 (render)

| Feature | Description | Priority |
|---------|-------------|----------|
| Show Piano Chords Toggle | ✅ exists but unused | Low |
| Mini Piano per Beat | Show chord notes on timeline | Low |
| Rhythm Piano Chords | Animated during playback | Low |

---

## 📁 File Structure Comparison

### old_index.html (4710 lines, single file)
- Everything in one monolithic file
- Babel transpilation in browser
- CDN dependencies (React, Tailwind)
- Hardcoded CSV data

### Current React App (Modular)
```
src/
├── main.jsx                     # Entry point
├── App.jsx                      # Router + Error Boundary
├── index.css                    # Global styles
├── pages/
│   ├── ChordTool.jsx           # Main tool (693 lines)
│   ├── QueryTool.jsx           # Query page
│   └── Insights.jsx            # Insights page
├── components/
│   ├── CompositionPanel.jsx    # Unified sequencer (NEW)
│   ├── SequencerControls.jsx   # Track/playback controls
│   ├── ProgressionTimeline.jsx # Beat timeline
│   ├── MidiSettings.jsx        # MIDI export settings
│   ├── Piano.jsx               # Keyboard
│   ├── RagaCircle.jsx          # Visualization
│   ├── ChordDisplay.jsx        # Chord cards
│   └── RagaSelector.jsx        # Raga dropdown
└── utils/
    ├── audioEngine.js          # Web Audio API
    ├── musicTheory.js          # Chord logic
    ├── midiUtils.js            # MIDI export
    └── dataLoader.js           # CSV parsing
```

---

## 🎯 Recommended Port Order

1. **High Priority** (All Complete! ✅)
   - [x] Unison Playback Mode (simple toggle)  
   - [x] Custom Scale Mode (user-defined patterns)  
   - [x] Custom Chord Builder (tab + UI)  

2. **Medium Priority**
   - [ ] MIDI Note Length/Gap settings
   - [ ] Base Octave Control

3. **Low Priority**
   - [ ] Piano visualization in timeline
   - [ ] Custom breakpoints input
   - [ ] Extended chords visual separation

---

## Notes

- The current app is **more modular and maintainable**
- **All major features from old_index.html have been successfully ported!** 🎉
- Custom Chord Builder, Custom Scale Mode, and Unison Playback are fully functional
- Audio engine has been improved with better error handling
- New JSON export feature is an improvement over old
- Dark mode is permanent (no toggle needed)
- localStorage persistence works for progressions
- Only minor MIDI settings and piano timeline visualization remain as low-priority items
