# Samvad - Raga Chord Tool & Database

**Samvad** is a modern React web application designed for exploring Indian Classical Music ragas and their intersection with Western harmony. It serves as a tool for composers, students, and music enthusiasts to analyze ragas, generate chords, and discover relationships between different scales.

## Features

### Chord Tool
*   **Raga-Based Chords**: Generate harmonically compatible chords for over 72 Melakarta (Carnatic) and major Hindustani ragas.
*   **Visualizations**: View chords on an interactive **Chord Circle** and **Piano Keyboard**.
*   **Rhythm Builder**: Create 4-track rhythm progressions with drag-and-drop support.
*   **Audio & Export**: High-quality piano samples, Tanpura drone, and **MIDI Export** for DAW integration.

### Raga Query
*   **Deep Search**: Database of around 300 Carnatic and Hindustani ragas.
*   **Advanced Filtering**: Filter by specific notes (Swaras), scale type (Audav/Shadav/Sampoorna), or name.
*   **Smart Layout**: Optimized "Laptop View" for efficient filtering and browsing.
*   **Cross-System**: Fully supports both Hindustani and Carnatic notation systems.

### Raga Insights
*   **Relationship Analysis**: Discover ragas that share the **same notes** but differ in distinct scales.
*   **Murchanna (Rotations)**: Analyze modal shifts (Graha Bhedam) to see which ragas can be derived from others.
*   **Subset/Superset**: Find ragas that are subsets of larger scales (e.g., Bhupali inside Kalyan).

## Tech Stack
*   **Framework**: React 18 + Vite
*   **Styling**: Tailwind CSS (Dark Mode optimized)
*   **Audio**: Web Audio API (Custom hooks for low-latency playback)

## Getting Started

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Run Development Server**
    ```bash
    npm run dev
    ```

3.  **Build for Production**
    ```bash
    npm run build
    ```
    The output will be in the `dist/` directory.

## Legacy Code
The original prototype of this application was built as a set of monolithic HTML files. For historical reference, these have been archived in the [`legacy/`](legacy/) directory:
*   `legacy/index.html` (Original Chord Tool)
*   `legacy/raga-query.html`
*   `legacy/raga-insights.html`
