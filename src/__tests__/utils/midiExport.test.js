/**
 * Tests for midiExport.js
 * Covers MIDI file generation from chord progressions
 */

import { describe, it, expect, vi } from 'vitest';
import { buildMidiFromProgression } from '../../utils/midiExport.js';

describe('midiExport', () => {
    describe('buildMidiFromProgression', () => {
        const testProgression = [
            { chord: { notes: [0, 4, 7] } },  // C major
            { chord: { notes: [2, 5, 9] } },  // D minor
        ];

        it('returns Uint8Array for valid progression', () => {
            const result = buildMidiFromProgression({
                progression: testProgression
            });
            expect(result).toBeInstanceOf(Uint8Array);
        });

        it('returns null for empty progression', () => {
            const result = buildMidiFromProgression({ progression: [] });
            expect(result).toBeNull();
        });

        it('returns null when progression is undefined', () => {
            const result = buildMidiFromProgression({});
            expect(result).toBeNull();
        });

        it('generates valid MIDI header (MThd)', () => {
            const result = buildMidiFromProgression({
                progression: testProgression
            });
            // First 4 bytes should be "MThd"
            expect(result[0]).toBe(0x4D); // M
            expect(result[1]).toBe(0x54); // T
            expect(result[2]).toBe(0x68); // h
            expect(result[3]).toBe(0x64); // d
        });

        it('includes track header (MTrk)', () => {
            const result = buildMidiFromProgression({
                progression: testProgression
            });
            // After 14-byte header, next 4 bytes should be "MTrk"
            expect(result[14]).toBe(0x4D); // M
            expect(result[15]).toBe(0x54); // T
            expect(result[16]).toBe(0x72); // r
            expect(result[17]).toBe(0x6B); // k
        });

        it('respects tempo parameter', () => {
            const slow = buildMidiFromProgression({
                progression: testProgression,
                tempo: 60
            });
            const fast = buildMidiFromProgression({
                progression: testProgression,
                tempo: 180
            });
            // Both should be valid but different
            expect(slow).not.toEqual(fast);
        });

        it('works with different velocities', () => {
            const soft = buildMidiFromProgression({
                progression: testProgression,
                velocity: 32
            });
            const loud = buildMidiFromProgression({
                progression: testProgression,
                velocity: 127
            });
            expect(soft).toBeInstanceOf(Uint8Array);
            expect(loud).toBeInstanceOf(Uint8Array);
            expect(soft).not.toEqual(loud);
        });

        it('works with different channels', () => {
            const ch1 = buildMidiFromProgression({
                progression: testProgression,
                channel: 1
            });
            const ch10 = buildMidiFromProgression({
                progression: testProgression,
                channel: 10
            });
            expect(ch1).toBeInstanceOf(Uint8Array);
            expect(ch10).toBeInstanceOf(Uint8Array);
        });

        it('longer progressions produce larger files', () => {
            const short = buildMidiFromProgression({
                progression: [{ chord: { notes: [0, 4, 7] } }]
            });
            const long = buildMidiFromProgression({
                progression: [
                    { chord: { notes: [0, 4, 7] } },
                    { chord: { notes: [2, 5, 9] } },
                    { chord: { notes: [4, 7, 11] } },
                    { chord: { notes: [5, 9, 0] } }
                ]
            });
            expect(long.length).toBeGreaterThan(short.length);
        });

        it('handles chord with missing notes gracefully', () => {
            const result = buildMidiFromProgression({
                progression: [
                    { chord: { notes: [] } },  // Empty notes
                    { chord: { notes: [0, 4, 7] } }
                ]
            });
            expect(result).toBeInstanceOf(Uint8Array);
        });

        it('works with direct chord objects (without wrapper)', () => {
            const result = buildMidiFromProgression({
                progression: [
                    { notes: [0, 4, 7] },  // Direct chord object
                    { notes: [2, 5, 9] }
                ]
            });
            expect(result).toBeInstanceOf(Uint8Array);
        });
    });
});
