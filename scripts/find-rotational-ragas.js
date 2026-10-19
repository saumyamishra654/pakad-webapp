import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const NOTE_TO_PC = {
  S: 0,
  r: 1,
  R: 2,
  g: 3,
  G: 4,
  m: 5,
  M: 6,
  P: 7,
  d: 8,
  D: 9,
  n: 10,
  N: 11,
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '..');

function resolveCsvPath() {
  const candidates = [
    path.join(workspaceRoot, 'public', 'aarohavroh.csv'),
    path.join(workspaceRoot, 'public', 'aarohavroha.csv'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `Could not find CSV. Tried: ${candidates.join(', ')}`,
  );
}

function parseCsvRows(csvText) {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  return lines.slice(1).map((line) => {
    const parts = line.split(',');
    const raga = (parts[0] || '').trim();
    const aroha = (parts[1] || '').trim();
    const avroh = (parts[2] || '').trim();
    return { raga, aroha, avroh };
  });
}

function extractNoteSymbols(sequence) {
  const symbols = [];
  for (const ch of sequence) {
    if (Object.hasOwn(NOTE_TO_PC, ch)) {
      symbols.push(ch);
    }
  }
  return symbols;
}

function buildPitchClassCycle(symbols) {
  if (!symbols.length) {
    return [];
  }

  const pitchClasses = symbols.map((symbol) => NOTE_TO_PC[symbol]);

  if (pitchClasses.length > 1 && pitchClasses[0] === pitchClasses[pitchClasses.length - 1]) {
    pitchClasses.pop();
    symbols.pop();
  }

  return pitchClasses;
}

function buildIntervals(pitchClasses) {
  if (pitchClasses.length < 2) {
    return [];
  }

  const intervals = [];
  for (let idx = 0; idx < pitchClasses.length; idx += 1) {
    const curr = pitchClasses[idx];
    const next = pitchClasses[(idx + 1) % pitchClasses.length];
    intervals.push((next - curr + 12) % 12);
  }
  return intervals;
}

function findSymmetryShifts(intervals) {
  const n = intervals.length;
  const shifts = [];

  for (let shift = 1; shift < n; shift += 1) {
    let same = true;
    for (let i = 0; i < n; i += 1) {
      if (intervals[i] !== intervals[(i + shift) % n]) {
        same = false;
        break;
      }
    }

    if (same) {
      shifts.push(shift);
    }
  }

  return shifts;
}

function analyzeSequence(ragaName, type, sequence) {
  const symbols = extractNoteSymbols(sequence);
  const pitchClasses = buildPitchClassCycle(symbols);

  if (pitchClasses.length < 3) {
    return null;
  }

  const intervals = buildIntervals(pitchClasses);
  const shifts = findSymmetryShifts(intervals);

  if (!shifts.length) {
    return null;
  }

  const tonicIndices = [0, ...shifts];
  const tonics = tonicIndices.map((idx) => symbols[idx % symbols.length]);

  return {
    ragaName,
    type,
    noteCount: pitchClasses.length,
    symbols: symbols.join(' '),
    intervals: intervals.join('-'),
    symmetryOrder: tonicIndices.length,
    tonics: tonics.join(', '),
  };
}

function main() {
  const csvPath = resolveCsvPath();
  const csvText = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCsvRows(csvText);

  const findings = [];

  for (const row of rows) {
    const arohaFinding = analyzeSequence(row.raga, 'Aroha', row.aroha);
    if (arohaFinding) {
      findings.push(arohaFinding);
    }

    const avrohFinding = analyzeSequence(row.raga, 'Avroh', row.avroh);
    if (avrohFinding) {
      findings.push(avrohFinding);
    }
  }

  findings.sort((a, b) => {
    if (b.symmetryOrder !== a.symmetryOrder) {
      return b.symmetryOrder - a.symmetryOrder;
    }
    return a.ragaName.localeCompare(b.ragaName);
  });

  console.log(`CSV: ${path.relative(workspaceRoot, csvPath)}`);
  console.log(`Total sequences checked: ${rows.length * 2}`);
  console.log(`Rotationally symmetric sequences: ${findings.length}`);

  if (!findings.length) {
    return;
  }

  console.log('\nRaga | Direction | Notes | Intervals | #Tonics | Tonics');
  console.log('---|---|---|---|---|---');

  for (const entry of findings) {
    console.log(
      `${entry.ragaName} | ${entry.type} | ${entry.symbols} | ${entry.intervals} | ${entry.symmetryOrder} | ${entry.tonics}`,
    );
  }
}

main();
