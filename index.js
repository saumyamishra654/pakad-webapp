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
