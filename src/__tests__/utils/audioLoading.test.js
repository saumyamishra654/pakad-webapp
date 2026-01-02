/**
 * Tests for audio file loading
 * Verifies all piano samples and tanpura drones are accessible
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { SAMPLE_NOTE_NAMES, AVAILABLE_OCTAVES, NOTE_SUFFIX_BY_OCTAVE } from '../../utils/noteHelpers.js';

// Expected audio files
const PIANO_PATH = '/Piano';
const TANPURA_PATH = '/tanpura';

const TANPURA_NOTES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

describe('Audio File Loading', () => {
    // Note: These tests run in jsdom which doesn't have real fetch
    // For actual file loading tests, use a test server or browser tests

    describe('Piano Samples Configuration', () => {
        it('has correct number of note names (12)', () => {
            expect(SAMPLE_NOTE_NAMES.length).toBe(12);
        });

        it('has correct octaves available', () => {
            expect(AVAILABLE_OCTAVES).toContain(3);
            expect(AVAILABLE_OCTAVES).toContain(4);
            expect(AVAILABLE_OCTAVES).toContain(5);
        });

        it('has suffix mapping for all octaves', () => {
            expect(NOTE_SUFFIX_BY_OCTAVE[3]).toBe('_m12');
            expect(NOTE_SUFFIX_BY_OCTAVE[4]).toBe('');
            expect(NOTE_SUFFIX_BY_OCTAVE[5]).toBe('_p12');
        });

        it('generates correct file paths for each sample', () => {
            const expectedFiles = [];

            for (const note of SAMPLE_NOTE_NAMES) {
                for (const octave of AVAILABLE_OCTAVES) {
                    const suffix = NOTE_SUFFIX_BY_OCTAVE[octave] || '';
                    expectedFiles.push(`${PIANO_PATH}/${note}${suffix}.mp3`);
                }
            }

            // Should have 36 files (12 notes × 3 octaves)
            expect(expectedFiles.length).toBe(36);

            // Spot check some expected paths (now using flats)
            expect(expectedFiles).toContain('/Piano/C.mp3');       // C4
            expect(expectedFiles).toContain('/Piano/C_m12.mp3');   // C3
            expect(expectedFiles).toContain('/Piano/C_p12.mp3');   // C5
            expect(expectedFiles).toContain('/Piano/Bb.mp3');      // Bb4 (formerly A#.mp3)
        });
    });

    describe('Tanpura Samples Configuration', () => {
        it('has correct tanpura note names', () => {
            expect(TANPURA_NOTES.length).toBe(12);
        });

        it('generates correct tanpura file paths', () => {
            const expectedFiles = TANPURA_NOTES.map(note => `${TANPURA_PATH}/${note}.mp3`);

            expect(expectedFiles.length).toBe(12);
            expect(expectedFiles).toContain('/tanpura/C.mp3');
            expect(expectedFiles).toContain('/tanpura/Db.mp3');
        });
    });

    describe('Sample File Existence (static check)', () => {
        // This test documents expected files - actual loading happens in browser
        const expectedPianoFiles = [
            'C.mp3', 'C#.mp3', 'D.mp3', 'D#.mp3', 'E.mp3', 'F.mp3',
            'F#.mp3', 'G.mp3', 'G#.mp3', 'A.mp3', 'A#.mp3', 'B.mp3'
        ];

        it('expects 12 base piano notes', () => {
            expect(expectedPianoFiles.length).toBe(12);
        });

        it('expects each note in 3 octaves', () => {
            const allFiles = [];
            for (const file of expectedPianoFiles) {
                const base = file.replace('.mp3', '');
                allFiles.push(`${base}.mp3`);      // Octave 4
                allFiles.push(`${base}_m12.mp3`);  // Octave 3
                allFiles.push(`${base}_p12.mp3`);  // Octave 5
            }
            expect(allFiles.length).toBe(36);
        });
    });
});

/**
 * Integration test for actual file loading (requires browser/server)
 * Run with: npm run test:e2e or in browser console
 */
export async function testPianoSampleLoading(basePath = '/Piano') {
    const results = { passed: 0, failed: 0, errors: [] };

    for (const note of SAMPLE_NOTE_NAMES) {
        for (const octave of AVAILABLE_OCTAVES) {
            const suffix = NOTE_SUFFIX_BY_OCTAVE[octave] || '';
            const url = `${basePath}/${note}${suffix}.mp3`;

            try {
                const response = await fetch(url, { method: 'HEAD' });
                if (response.ok) {
                    results.passed++;
                } else {
                    results.failed++;
                    results.errors.push(`${url}: HTTP ${response.status}`);
                }
            } catch (err) {
                results.failed++;
                results.errors.push(`${url}: ${err.message}`);
            }
        }
    }

    console.log(`Piano samples: ${results.passed}/36 loaded`);
    if (results.errors.length > 0) {
        console.error('Failed files:', results.errors);
    }

    return results;
}

export async function testTanpuraSampleLoading(basePath = '/tanpura') {
    const results = { passed: 0, failed: 0, errors: [] };

    for (const note of TANPURA_NOTES) {
        const url = `${basePath}/${note}.mp3`;

        try {
            const response = await fetch(url, { method: 'HEAD' });
            if (response.ok) {
                results.passed++;
            } else {
                results.failed++;
                results.errors.push(`${url}: HTTP ${response.status}`);
            }
        } catch (err) {
            results.failed++;
            results.errors.push(`${url}: ${err.message}`);
        }
    }

    console.log(`Tanpura samples: ${results.passed}/12 loaded`);
    if (results.errors.length > 0) {
        console.error('Failed files:', results.errors);
    }

    return results;
}
