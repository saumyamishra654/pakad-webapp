// Netlify Function: Single entry handling /api/* routes
// This ports core logic from server/index.js into a serverless function.

import fs from 'fs';
import path from 'path';

// Resolve CSV colocated with this server folder when deployed with Base directory = server
const baseDir = path.resolve(process.cwd());
const aarohAvrohCSV = path.join(baseDir, 'aarohavroh.csv');

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

function countSwaras(pattern) {
  const swaraGroups = [[0], [1,2], [3,4], [5,6], [7], [8,9], [10,11]];
  return swaraGroups.reduce((acc, grp) => acc + (grp.some(i => pattern[i] === 1) ? 1 : 0), 0);
}

function getJati(count) {
  if (count === 5) return 'Audav (Pentatonic)';
  if (count === 6) return 'Shadav (Hexatonic)';
  if (count === 7) return 'Sampoorna (Heptatonic)';
  return `${count} notes`;
}

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
        for (const ch of tok.trim()) {
          if (Object.prototype.hasOwnProperty.call(map, ch)) {
            present[map[ch]] = 1;
          }
        }
      });
      return present;
    };

    const aarohPattern = toPattern(aroha);
    const avrohPattern = toPattern(avroh);
    const combined = aarohPattern.map((v, idx) => (v || avrohPattern[idx]) ? 1 : 0);
    out.push({ name: name.trim(), notePattern: combined, aarohPattern, avrohPattern });
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
    console.error('Failed to read CSV in function', e);
    ragaCache = [];
  }
  return ragaCache;
}

function getExtendedIntervals(baseIntervals, extend) {
  if (!extend || baseIntervals.length < 3) return baseIntervals;
  const highest = Math.max(...baseIntervals);
  const add = (highest + 3) % 12;
  return [...baseIntervals, add];
}

function availableChordsForPattern(pattern, chordId, extend = false) {
  const result = [];
  const types = chordId === 'all' || !chordId ? chordTypes : chordTypes.filter(c => c.id === chordId);
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

function json(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

export async function handler(event) {
  const url = new URL(event.rawUrl || `https://x${event.path}`);
  const { pathname, searchParams } = url;

  // Base routes under /api
  if (!pathname.startsWith('/api/')) {
    return json(404, { error: 'Not found' });
  }

  // Routing
  if (pathname === '/api/health') {
    return json(200, { ok: true });
  }

  if (pathname === '/api/chord-types') {
    return json(200, chordTypes);
  }

  if (pathname === '/api/ragas') {
    return json(200, getRagas().map(r => ({ name: r.name })));
  }

  if (pathname === '/api/raga-search') {
    const search = (searchParams.get('search') || '').trim().toLowerCase();
    const scaleType = searchParams.get('scaleType') || 'any';
    const searchMode = searchParams.get('searchMode') || 'contains';
    const separate = (searchParams.get('separate') || 'false').toLowerCase() === 'true';

    const readSet = (key) => new Set(((searchParams.get(key) || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(n => parseInt(n, 10))
      .filter(n => Number.isInteger(n) && n >= 0 && n <= 11)));

    const selectedSet = readSet('selectedNotes');
    const excludedSet = readSet('excludedNotes');
    const selASet = readSet('selectedAarohNotes');
    const excASet = readSet('excludedAarohNotes');
    const selVSet = readSet('selectedAvrohNotes');
    const excVSet = readSet('excludedAvrohNotes');

    const ragas = getRagas();
    const enriched = ragas.map(r => {
      const noteCount = countSwaras(r.notePattern);
      const aarohCount = countSwaras(r.aarohPattern);
      const avrohCount = countSwaras(r.avrohPattern);
      return { ...r, noteCount, aarohJati: getJati(aarohCount), avrohJati: getJati(avrohCount) };
    });

    let filtered = enriched;
    if (search) {
      filtered = filtered.filter(r => r.name.toLowerCase().includes(search));
    }
    if (scaleType !== 'any') {
      const target = parseInt(scaleType, 10);
      if (!Number.isNaN(target)) filtered = filtered.filter(r => r.noteCount === target);
    }

    const exactMatch = (pattern, includeSet) => {
      const withSa = new Set(includeSet); withSa.add(0);
      return pattern.every((v, idx) => v === (withSa.has(idx) ? 1 : 0));
    };

    if (separate) {
      if (selASet.size > 0) {
        const withSa = new Set(selASet); withSa.add(0);
        const arr = Array.from(withSa);
        filtered = searchMode === 'exact'
          ? filtered.filter(r => exactMatch(r.aarohPattern, selASet))
          : filtered.filter(r => arr.every(i => r.aarohPattern[i] === 1));
      }
      if (excASet.size > 0) {
        const arr = Array.from(excASet);
        filtered = filtered.filter(r => arr.every(i => r.aarohPattern[i] === 0));
      }
      if (selVSet.size > 0) {
        const withSa = new Set(selVSet); withSa.add(0);
        const arr = Array.from(withSa);
        filtered = searchMode === 'exact'
          ? filtered.filter(r => exactMatch(r.avrohPattern, selVSet))
          : filtered.filter(r => arr.every(i => r.avrohPattern[i] === 1));
      }
      if (excVSet.size > 0) {
        const arr = Array.from(excVSet);
        filtered = filtered.filter(r => arr.every(i => r.avrohPattern[i] === 0));
      }
    } else {
      if (selectedSet.size > 0) {
        const withSa = new Set(selectedSet); withSa.add(0);
        const arr = Array.from(withSa);
        filtered = searchMode === 'exact'
          ? filtered.filter(r => exactMatch(r.notePattern, selectedSet))
          : filtered.filter(r => arr.every(i => r.notePattern[i] === 1));
      }
      if (excludedSet.size > 0) {
        const arr = Array.from(excludedSet);
        filtered = filtered.filter(r => arr.every(i => r.notePattern[i] === 0));
      }
    }

    return json(200, filtered);
  }

  const ragas = getRagas();
  const ragaNameMatch = pathname.match(/^\/api\/ragas\/([^\/]+)/);
  if (!ragaNameMatch) return json(404, { error: 'Not found' });
  const selectedName = decodeURIComponent(ragaNameMatch[1]);
  const raga = ragas.find(x => x.name.toLowerCase() === selectedName.toLowerCase());
  if (!raga) return json(404, { error: 'Not found' });

  if (pathname === `/api/ragas/${encodeURIComponent(selectedName)}`) {
    return json(200, raga);
  }

  if (pathname.endsWith('/chords')) {
    const part = searchParams.get('part') || 'all';
    const chordType = searchParams.get('chordType') || 'all';
    const extendBool = (searchParams.get('extend') || 'false').toLowerCase() === 'true';
    const selectedNote = searchParams.get('selectedNote');
    const filterMode = searchParams.get('filterMode') || 'root';
    const tonic = searchParams.get('tonic');

    const pattern = part === 'aaroh' ? raga.aarohPattern : part === 'avroh' ? raga.avrohPattern : raga.notePattern;
    let chords = availableChordsForPattern(pattern, chordType, extendBool);
    const sel = selectedNote !== null && selectedNote !== undefined ? parseInt(selectedNote, 10) : null;
    const tnx = tonic !== null && tonic !== undefined ? parseInt(tonic, 10) : null;
    if (!Number.isNaN(sel) && sel !== null) chords = filterChordsByNote(chords, sel, filterMode);
    if (!Number.isNaN(tnx) && tnx !== null) chords = attachWesternNames(chords, tnx);
    return json(200, chords);
  }

  if (pathname.endsWith('/custom-matches')) {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
    const body = JSON.parse(event.body || '{}');
    const { intervalsAbs } = body;
    if (!Array.isArray(intervalsAbs) || intervalsAbs.length === 0) {
      return json(400, { error: 'intervalsAbs required' });
    }
    const pcs = intervalsAbs.map(v => ((v % 12) + 12) % 12);
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
    return json(200, {
      aaroh: findMatches(raga.aarohPattern),
      avroh: findMatches(raga.avrohPattern),
      all: findMatches(raga.notePattern)
    });
  }

  if (pathname.endsWith('/aggregates')) {
    const separate = (searchParams.get('separate') || 'false').toLowerCase() === 'true';
    const extendBool = (searchParams.get('extend') || 'false').toLowerCase() === 'true';
    let basic = 0, extended = 0;
    const parts = separate ? ['aarohPattern', 'avrohPattern'] : ['notePattern'];
    parts.forEach(p => {
      chordTypes.forEach(ct => {
        const arr = availableChordsForPattern(raga[p], ct.id, extendBool);
        basic += arr.filter(c => !c.isExtended).length;
        extended += arr.filter(c => c.isExtended).length;
      });
    });
    return json(200, { basic, extended });
  }

  return json(404, { error: 'Not found' });
}
