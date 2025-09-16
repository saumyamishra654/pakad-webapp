import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Static files (serve the existing UI)
const staticDir = path.resolve(__dirname, '..', 'chord app');
if (fs.existsSync(staticDir)) {
  app.use('/', express.static(staticDir));
}

// Data path (CSV now lives in this folder)
const aarohAvrohCSV = path.join(__dirname, 'aarohavroh.csv');

// Helpers
const swarNames = ['Sa', 'Re♭', 'Re', 'Ga♭', 'Ga', 'Ma', 'Ma♯', 'Pa', 'Dha♭', 'Dha', 'Ni♭', 'Ni'];
const westernNotesFlat = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];

const chordTypes = [
  { id: 'major', name: 'Major', intervals: [0, 4, 7], color: '#3b82f6' },
  { id: 'minor', name: 'Minor', intervals: [0, 3, 7], color: '#8b5cf6' },
  { id: 'diminished', name: 'Diminished', intervals: [0, 3, 6], color: '#ef4444' },
  { id: 'sus4', name: 'Sus4', intervals: [0, 5, 7], color: '#10b981' },
  { id: 'augmented', name: 'Augmented', intervals: [0, 4, 8], color: '#f97316' },
  { id: 'major7', name: 'Major 7', intervals: [0, 4, 7, 11], color: '#22c55e' },
  { id: 'minor7', name: 'Minor 7', intervals: [0, 3, 7, 10], color: '#06b6d4' },
  { id: 'dom7', name: 'Dominant 7', intervals: [0, 4, 7, 10], color: '#eab308' },
  { id: 'sus2', name: 'Sus2', intervals: [0, 2, 7], color: '#14b8a6' },
  { id: 'dim7', name: 'Diminished 7', intervals: [0, 3, 6, 9], color: '#db2777' },
  { id: 'maj6', name: 'Major 6', intervals: [0, 4, 7, 9], color: '#a3e635' },
  { id: 'min6', name: 'Minor 6', intervals: [0, 3, 7, 9], color: '#f43f5e' },
  { id: 'm7b5', name: 'Half-diminished (m7♭5)', intervals: [0, 3, 6, 10], color: '#0ea5e9' }
];

// Helpers for raga search/jati
function countSwaras(pattern) {
  const swaraGroups = [
    [0],        // Sa
    [1, 2],     // Re
    [3, 4],     // Ga
    [5, 6],     // Ma
    [7],        // Pa
    [8, 9],     // Dha
    [10, 11]    // Ni
  ];
  return swaraGroups.reduce((count, group) => count + (group.some(idx => pattern[idx] === 1) ? 1 : 0), 0);
}

function getJati(count) {
  if (count === 5) return 'Audav (Pentatonic)';
  if (count === 6) return 'Shadav (Hexatonic)';
  if (count === 7) return 'Sampoorna (Heptatonic)';
  return `${count} notes`;
}

// Parse aaroh/avroh CSV into patterns
function parseAarohAvrohCSV(csvText) {
  const lines = csvText.split(/\r?\n/).filter(Boolean);
  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const [name, aroha, avroh] = lines[i].split(',');
    if (!name || !aroha || !avroh) continue;
    const toPattern = (s) => {
      const tokens = s.split('-');
      const present = new Array(12).fill(0);
      const map = {
        'S': 0, 'R': 2, 'r': 1, 'G': 4, 'g': 3, 'M': 6, 'm': 5, 'P': 7,
        'D': 9, 'd': 8, 'N': 11, 'n': 10
      };
      tokens.forEach(tok => {
        // Mark any pitch-class letters appearing in token (covers Mm, mM, Nn, nN, etc.)
        for (const ch of tok.trim()) {
          if (map.hasOwnProperty(ch)) {
            present[map[ch]] = 1;
          }
        }
      });
      return present;
    };

    const aarohPattern = toPattern(aroha);
    const avrohPattern = toPattern(avroh);
    const combined = aarohPattern.map((v, idx) => (v || avrohPattern[idx]) ? 1 : 0);
    out.push({
      name: name.trim(),
      notePattern: combined,
      aarohPattern,
      avrohPattern
    });
  }
  return out;
}

let ragaCache = null;
function getRagas() {
  if (ragaCache) return ragaCache;
  try {
    const text = fs.readFileSync(aarohAvrohCSV, 'utf8');
    ragaCache = parseAarohAvrohCSV(text);
  } catch (e) {
    console.error('Failed to read CSV, falling back to sample', e);
    ragaCache = [];
  }
  return ragaCache;
}

function getExtendedIntervals(baseIntervals, extend) {
  if (!extend || baseIntervals.length < 3) return baseIntervals;
  const highest = Math.max(...baseIntervals);
  // simple rule: add a third above the top (approx)
  const add = (highest + 3) % 12;
  return [...baseIntervals, add];
}

function availableChordsForPattern(pattern, chordId, extend = false) {
  const result = [];
  const types = chordId === 'all' || !chordId
    ? chordTypes
    : chordTypes.filter(c => c.id === chordId);
  types.forEach(ct => {
    for (let root = 0; root < 12; root++) {
      if (!pattern[root]) continue;
      const intervals = getExtendedIntervals(ct.intervals, extend);
      const notes = intervals.map(x => (root + x) % 12);
      const ok = notes.every(n => pattern[n]);
      if (ok) {
        result.push({ root, rootName: swarNames[root], notes, type: ct, isExtended: extend && intervals.length > ct.intervals.length });
      }
    }
  });
  return result;
}

function filterChordsByNote(chords, selectedNote, mode) {
  if (selectedNote === undefined || selectedNote === null) return chords;
  if (mode === 'any') return chords.filter(c => c.notes.includes(selectedNote));
  // default 'root'
  return chords.filter(c => c.root === selectedNote);
}

function attachWesternNames(chords, tonicIndex) {
  if (tonicIndex === undefined || tonicIndex === null) return chords;
  return chords.map(chord => {
    const rootWesternIndex = (chord.root + tonicIndex) % 12;
    const rootNote = westernNotesFlat[rootWesternIndex];
    let quality = '';
    const id = chord.type.id;
    if (id === 'major') quality = '';
    else if (id === 'minor') quality = 'm';
    else if (id === 'diminished') quality = 'dim';
    else if (id === 'augmented') quality = 'aug';
    else if (id === 'sus4') quality = 'sus4';
    else if (id === 'sus2') quality = 'sus2';
    else if (id === 'major7') quality = 'maj7';
    else if (id === 'minor7') quality = 'm7';
    else if (id === 'dom7') quality = '7';
    else if (id === 'dim7') quality = 'dim7';
    else if (id === 'm7b5') quality = 'm7♭5';
    else if (id === 'maj6') quality = '6';
    else if (id === 'min6') quality = 'm6';
    else quality = chord.type.name;
    const westernChordNotes = chord.notes.map(n => westernNotesFlat[(n + tonicIndex) % 12]);
    return { ...chord, westernName: `${rootNote}${quality}: ${westernChordNotes.join(' - ')}` };
  });
}

// Routes
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/chord-types', (req, res) => {
  res.json(chordTypes);
});

app.get('/api/ragas', (req, res) => {
  const ragas = getRagas();
  res.json(ragas.map(r => ({ name: r.name })));
});

app.get('/api/ragas/:name', (req, res) => {
  const ragas = getRagas();
  const r = ragas.find(x => x.name.toLowerCase() === req.params.name.toLowerCase());
  if (!r) return res.status(404).json({ error: 'Not found' });
  res.json(r);
});

// Server-side raga search and filtering
// Query params:
//  search (string), scaleType ('any' | '5' | '6' | '7'), searchMode ('contains' | 'exact'), separate ('true'|'false')
//  selectedNotes, excludedNotes, selectedAarohNotes, excludedAarohNotes, selectedAvrohNotes, excludedAvrohNotes (comma-separated ints, excluded of Sa)
app.get('/api/raga-search', (req, res) => {
  const {
    search = '',
    scaleType = 'any',
    searchMode = 'contains',
    separate = 'false',
    selectedNotes = '',
    excludedNotes = '',
    selectedAarohNotes = '',
    excludedAarohNotes = '',
    selectedAvrohNotes = '',
    excludedAvrohNotes = ''
  } = req.query;

  const toSet = (str) => new Set(
    (String(str || '')
      .split(',')
      .map(s => s.trim())
      .filter(s => s !== '')
      .map(n => parseInt(n, 10))
      .filter(n => Number.isInteger(n) && n >= 0 && n <= 11))
  );

  const selectedSet = toSet(selectedNotes);
  const excludedSet = toSet(excludedNotes);
  const selASet = toSet(selectedAarohNotes);
  const excASet = toSet(excludedAarohNotes);
  const selVSet = toSet(selectedAvrohNotes);
  const excVSet = toSet(excludedAvrohNotes);

  const ragas = getRagas();

  // Enrich with counts/jati
  const enriched = ragas.map(r => {
    const noteCount = countSwaras(r.notePattern);
    const aarohCount = countSwaras(r.aarohPattern);
    const avrohCount = countSwaras(r.avrohPattern);
    return {
      ...r,
      noteCount,
      aarohJati: getJati(aarohCount),
      avrohJati: getJati(avrohCount)
    };
  });

  let filtered = enriched;

  // Name filter
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(r => r.name.toLowerCase().includes(q));
  }

  // Scale type filter (by swara groups)
  if (scaleType !== 'any') {
    const target = parseInt(scaleType, 10);
    if (!Number.isNaN(target)) {
      filtered = filtered.filter(r => r.noteCount === target);
    }
  }

  const separateBool = String(separate).toLowerCase() === 'true';

  // Helper exact match
  const exactMatch = (pattern, includeSet) => {
    const withSa = new Set(includeSet);
    withSa.add(0);
    return pattern.every((val, idx) => val === (withSa.has(idx) ? 1 : 0));
  };

  if (separateBool) {
    // Aaroh includes
    if (selASet.size > 0) {
      const withSa = new Set(selASet); withSa.add(0);
      const arr = Array.from(withSa);
      if (searchMode === 'exact') {
        filtered = filtered.filter(r => exactMatch(r.aarohPattern, selASet));
      } else {
        filtered = filtered.filter(r => arr.every(i => r.aarohPattern[i] === 1));
      }
    }
    // Aaroh excludes
    if (excASet.size > 0) {
      const arr = Array.from(excASet);
      filtered = filtered.filter(r => arr.every(i => r.aarohPattern[i] === 0));
    }
    // Avroh includes
    if (selVSet.size > 0) {
      const withSa = new Set(selVSet); withSa.add(0);
      const arr = Array.from(withSa);
      if (searchMode === 'exact') {
        filtered = filtered.filter(r => exactMatch(r.avrohPattern, selVSet));
      } else {
        filtered = filtered.filter(r => arr.every(i => r.avrohPattern[i] === 1));
      }
    }
    // Avroh excludes
    if (excVSet.size > 0) {
      const arr = Array.from(excVSet);
      filtered = filtered.filter(r => arr.every(i => r.avrohPattern[i] === 0));
    }
  } else {
    // Combined selection
    if (selectedSet.size > 0) {
      const withSa = new Set(selectedSet); withSa.add(0);
      const arr = Array.from(withSa);
      if (searchMode === 'exact') {
        filtered = filtered.filter(r => exactMatch(r.notePattern, selectedSet));
      } else {
        filtered = filtered.filter(r => arr.every(i => r.notePattern[i] === 1));
      }
    }
    if (excludedSet.size > 0) {
      const arr = Array.from(excludedSet);
      filtered = filtered.filter(r => arr.every(i => r.notePattern[i] === 0));
    }
  }

  res.json(filtered);
});

// Get chords for a raga
app.get('/api/ragas/:name/chords', (req, res) => {
  const { part = 'all', chordType = 'all', extend = 'false', selectedNote, filterMode = 'root', tonic } = req.query;
  const extendBool = String(extend).toLowerCase() === 'true';
  const ragas = getRagas();
  const r = ragas.find(x => x.name.toLowerCase() === req.params.name.toLowerCase());
  if (!r) return res.status(404).json({ error: 'Not found' });
  const pattern = part === 'aaroh' ? r.aarohPattern : part === 'avroh' ? r.avrohPattern : r.notePattern;
  let chords = availableChordsForPattern(pattern, chordType, extendBool);
  const sel = selectedNote !== undefined ? parseInt(selectedNote, 10) : null;
  const tnx = tonic !== undefined ? parseInt(tonic, 10) : null;
  if (!Number.isNaN(sel) && sel !== null) {
    chords = filterChordsByNote(chords, sel, filterMode);
  }
  if (!Number.isNaN(tnx) && tnx !== null) {
    chords = attachWesternNames(chords, tnx);
  }
  res.json(chords);
});

// Custom chord matches for a raga
app.post('/api/ragas/:name/custom-matches', (req, res) => {
  const { intervalsAbs } = req.body; // e.g., [0,3,7,12]
  if (!Array.isArray(intervalsAbs) || intervalsAbs.length === 0) {
    return res.status(400).json({ error: 'intervalsAbs required' });
  }
  const pcs = intervalsAbs.map(v => ((v % 12) + 12) % 12);
  const ragas = getRagas();
  const r = ragas.find(x => x.name.toLowerCase() === req.params.name.toLowerCase());
  if (!r) return res.status(404).json({ error: 'Not found' });
  const findMatches = (pattern) => {
    const matches = [];
    for (let root = 0; root < 12; root++) {
      const notes = pcs.map(iv => (root + iv) % 12);
      if (notes.every(i => pattern[i])) {
        matches.push({ root, rootName: swarNames[root], notes });
      }
    }
    return matches;
  };
  res.json({
    aaroh: findMatches(r.aarohPattern),
    avroh: findMatches(r.avrohPattern),
    all: findMatches(r.notePattern)
  });
});

// Aggregated counts
app.get('/api/ragas/:name/aggregates', (req, res) => {
  const { separate = 'false', extend = 'false' } = req.query;
  const separateBool = String(separate).toLowerCase() === 'true';
  const extendBool = String(extend).toLowerCase() === 'true';
  const ragas = getRagas();
  const r = ragas.find(x => x.name.toLowerCase() === req.params.name.toLowerCase());
  if (!r) return res.status(404).json({ error: 'Not found' });
  let basic = 0, extended = 0;
  const parts = separateBool ? ['aarohPattern', 'avrohPattern'] : ['notePattern'];
  parts.forEach(p => {
    chordTypes.forEach(ct => {
      const arr = availableChordsForPattern(r[p], ct.id, extendBool);
      basic += arr.filter(c => !c.isExtended).length;
      extended += arr.filter(c => c.isExtended).length;
    });
  });
  res.json({ basic, extended });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
