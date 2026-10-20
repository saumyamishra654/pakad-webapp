/**
 * Integration tests for ChordTool playback and editing, with a fake AudioContext and fetch
 */

import React, { StrictMode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

let noteStarts = []; // start times (ms) of every note that actually sounds
let fetchDelay = 0;
let fetchOk = true;

class FakeAudioContext {
    constructor() { this.state = 'running'; this.destination = {}; }
    get currentTime() { return Date.now() / 1000; }
    resume() { this.state = 'running'; return Promise.resolve(); }
    decodeAudioData() { return Promise.resolve({ duration: 3 }); }
    createGain() {
        return { connect() {}, gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, setTargetAtTime() {} } };
    }
    createBufferSource() {
        let startAt = null;
        let cancelled = false;
        const source = {
            connect() {},
            playbackRate: { setValueAtTime() {} },
            start(t) {
                startAt = t;
                // Count the note when its start time arrives, unless stopped first
                setTimeout(() => { if (!cancelled) noteStarts.push(Math.round(startAt * 1000)); }, Math.max(0, t * 1000 - Date.now()));
            },
            stop(t) { if (t === undefined || (startAt !== null && t <= startAt)) cancelled = true; }
        };
        return source;
    }
}

const C_MAJOR = { root: 0, notes: [0, 4, 7], name: 'Major', type: 'major' };

function seedProgressions(chordsForTrack1) {
    const progressions = [1, 2, 3, 4].map(id => ({
        id,
        name: String(id),
        chords: id === 1 ? chordsForTrack1 : []
    }));
    localStorage.setItem('pakad_progressions', JSON.stringify(progressions));
}

async function renderChordTool({ strict = false, chords = [] } = {}) {
    vi.resetModules(); // fresh module-level AudioContext and sample cache per test
    seedProgressions(chords);
    const { ChordTool } = await import('../../pages/ChordTool.jsx');
    const tree = <MemoryRouter><ChordTool /></MemoryRouter>;
    render(strict ? <StrictMode>{tree}</StrictMode> : tree);
    await act(async () => { await vi.advanceTimersByTimeAsync(50); });
}

const advance = (ms) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const click = (el) => act(async () => { fireEvent.click(el); });

beforeEach(() => {
    vi.useFakeTimers({ now: 0 });
    noteStarts = [];
    fetchDelay = 0;
    fetchOk = true;
    globalThis.AudioContext = FakeAudioContext;
    window.AudioContext = FakeAudioContext;
    window.HTMLMediaElement.prototype.load = function () {};
    window.HTMLMediaElement.prototype.pause = function () {};
    globalThis.alert = vi.fn();
    globalThis.fetch = vi.fn(() => new Promise(resolve => setTimeout(() => resolve(fetchOk
        ? { ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) }
        : { ok: false }), fetchDelay)));
});

afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
    localStorage.clear();
});

const fourBeats = [0, 1, 2, 3].map(beat => ({ id: beat + 1, chord: C_MAJOR, beat, duration: 1 }));

describe('ChordTool sequencer', () => {
    it('skips beats while samples load instead of playing them all at once afterwards', async () => {
        fetchDelay = 1600;
        await renderChordTool({ strict: true, chords: fourBeats });
        await click(screen.getByText(/Play$/));
        await advance(6000);

        // Count notes per start time: no burst, and one 3-note chord per beat once loaded
        const perTime = {};
        noteStarts.forEach(t => { perTime[t] = (perTime[t] || 0) + 1; });
        expect(Math.max(...Object.values(perTime))).toBe(3);
        expect(Object.keys(perTime).length).toBeGreaterThanOrEqual(4);
    });

    it('stays silent when stopped while samples are loading', async () => {
        fetchDelay = 1600;
        await renderChordTool({ chords: fourBeats });
        await click(screen.getByText(/Play$/));
        await advance(700);
        await click(screen.getByText(/Stop$/));
        await advance(3000);
        expect(noteStarts).toHaveLength(0);
    });

    it('does not refetch every sample on every beat when samples fail to load', async () => {
        fetchOk = false;
        await renderChordTool({ chords: fourBeats });
        await click(screen.getByText(/Play$/));
        await advance(10000);
        // 36 samples per attempt, at most one attempt every 5 s
        expect(globalThis.fetch.mock.calls.length).toBeLessThanOrEqual(36 * 3);
    });
});

describe('ChordTool tonic and editing', () => {
    it('"No Tonic" names chords as in C instead of "undefined"', async () => {
        await renderChordTool();
        const tonicSelect = screen.getAllByRole('combobox').find(s => [...s.options].some(o => o.text === 'No Tonic'));
        await act(async () => { fireEvent.change(tonicSelect, { target: { value: '' } }); });
        expect(document.body.textContent).not.toContain('undefined');
        expect(tonicSelect.value).toBe('');
    });

    it('places a chord by tapping it and then a beat (touch screens)', async () => {
        window.matchMedia = (query) => ({ matches: query === '(hover: none)' });
        await renderChordTool();
        await click(screen.getAllByText(/Notes:/)[0].closest('[draggable]'));
        expect(screen.getByText(/Tap a beat to place/)).toBeTruthy();

        await click(document.querySelector('[data-beat="2"]'));

        const saved = JSON.parse(localStorage.getItem('pakad_progressions'));
        expect(saved[0].chords).toHaveLength(1);
        expect(saved[0].chords[0].beat).toBe(2);
        expect(screen.queryByText(/Tap a beat to place/)).toBeNull();
    });
});
