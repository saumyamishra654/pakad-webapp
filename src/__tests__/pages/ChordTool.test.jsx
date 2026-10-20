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

describe('ChordTool progression templates', () => {
    async function openKafiTemplates() {
        await renderChordTool();
        const ragaSelect = screen.getAllByRole('combobox').find(s => [...s.options].some(o => o.text === 'Kafi'));
        await act(async () => { fireEvent.change(ragaSelect, { target: { value: 'Kafi' } }); });
        await click(screen.getByText('Templates'));
    }
    const beatsInput = () => screen.getByText('Beats:').closest('label').querySelector('input');

    it('lists templates with a fit badge and suggests ones matching the thaat first', async () => {
        await openKafiTemplates();
        expect(screen.getByText(/Kafi thaat · Dorian/)).toBeTruthy();
        const first = screen.getAllByTestId('template-row')[0];
        expect(first.textContent).toMatch(/i – IV/);
        expect(first.textContent).toMatch(/Fits/);
    });

    it('Use places the template on the active track and asks before overwriting', async () => {
        await openKafiTemplates();
        const row = () => screen.getAllByTestId('template-row').find(r => r.textContent.includes('I – IV – V – I'));
        const use = () => row().querySelector('button.btn');
        const confirmSpy = vi.fn(() => true);
        window.confirm = confirmSpy;

        await click(use());
        expect(confirmSpy).not.toHaveBeenCalled();
        let saved = JSON.parse(localStorage.getItem('pakad_progressions'));
        expect(saved[0].chords.map(c => c.beat)).toEqual([0, 2, 4, 6]);

        confirmSpy.mockReturnValue(false);
        await click(screen.getAllByTestId('template-row')[0].querySelector('button.btn'));
        expect(confirmSpy).toHaveBeenCalledTimes(1);
        saved = JSON.parse(localStorage.getItem('pakad_progressions'));
        expect(saved[0].chords.map(c => c.beat)).toEqual([0, 2, 4, 6]);
    });

    it('12-bar blues raises Beats to 12', async () => {
        await openKafiTemplates();
        const row = screen.getAllByTestId('template-row').find(r => r.textContent.includes('12-bar blues'));
        await click(row.querySelector('button.btn'));
        expect(beatsInput().value).toBe('12');
        const saved = JSON.parse(localStorage.getItem('pakad_progressions'));
        expect(saved[0].chords).toHaveLength(12);
    });
});

describe('ChordTool harmonise', () => {
    async function selectRaga(name) {
        await renderChordTool();
        const ragaSelect = screen.getAllByRole('combobox').find(s => [...s.options].some(o => o.text === name));
        await act(async () => { fireEvent.change(ragaSelect, { target: { value: name } }); });
    }

    it('Harmonise aaroh places no chord containing Ma when the aaroh skips it', async () => {
        await selectRaga('Alhaiya Bilawal');
        await click(screen.getByText('Harmonise aaroh'));
        const saved = JSON.parse(localStorage.getItem('pakad_progressions'));
        expect(saved[0].chords.length).toBeGreaterThan(0);
        saved[0].chords.forEach(c => expect(c.chord.notes).not.toContain(5));
    });

    it('Harmonise avroh can use Ma', async () => {
        await selectRaga('Alhaiya Bilawal');
        await click(screen.getByText('Harmonise avroh'));
        const saved = JSON.parse(localStorage.getItem('pakad_progressions'));
        expect(saved[0].chords.some(c => c.chord.notes.includes(5))).toBe(true);
    });

    it('leaves a beat empty when no chord covers a note', async () => {
        await selectRaga('Rajeshwari'); // its Ni (11) is in no available chord
        await click(screen.getByText('Harmonise full raga'));
        const saved = JSON.parse(localStorage.getItem('pakad_progressions'));
        const beats = saved[0].chords.map(c => c.beat);
        expect(beats.length).toBeGreaterThan(0);
        expect(Math.max(...beats) + 1).toBeGreaterThan(beats.length); // a gap in the beats
        saved[0].chords.forEach(c => expect(c.chord.notes).toBeDefined());
    });
});

describe('ChordTool next-chord suggestions', () => {
    it('hides the strip when no chords are placed', async () => {
        await renderChordTool();
        expect(screen.queryByText(/Next for beat/)).toBeNull();
    });

    it('suggests for the first empty beat and places the clicked suggestion there', async () => {
        await renderChordTool({ chords: [{ id: 1, chord: C_MAJOR, beat: 0, duration: 1 }] });
        expect(screen.getByText('Next for beat 2')).toBeTruthy();
        const strip = screen.getByText('Next for beat 2').parentElement;
        await click(strip.querySelector('button'));
        const saved = JSON.parse(localStorage.getItem('pakad_progressions'));
        expect(saved[0].chords.some(c => c.beat === 1)).toBe(true);
    });

    it('hovering a suggestion plays nothing; clicking places it and plays it once', async () => {
        await renderChordTool({ chords: [{ id: 1, chord: C_MAJOR, beat: 0, duration: 1 }] });
        const btn = screen.getByText('Next for beat 2').parentElement.querySelector('button');
        await act(async () => { fireEvent.mouseEnter(btn); fireEvent.focus(btn); });
        await advance(500);
        expect(noteStarts).toHaveLength(0);
        await click(btn);
        await advance(500);
        const saved = JSON.parse(localStorage.getItem('pakad_progressions'));
        expect(saved[0].chords.some(c => c.beat === 1)).toBe(true);
        expect(noteStarts.length).toBeGreaterThan(0);
    });
});
