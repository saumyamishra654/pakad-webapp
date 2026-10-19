/**
 * Tests for useSequencer: beats are scheduled on the audio clock, edits apply live,
 * and stopping cancels notes that haven't started
 */

import React, { StrictMode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSequencer } from '../../hooks/useSequencer.js';

// AudioContext whose clock follows the (fake) system time
const fakeContext = { get currentTime() { return Date.now() / 1000; } };

function setup(props, { strict = false } = {}) {
    const scheduled = []; // { beat, time, source }
    const scheduleBeat = vi.fn((beat, delay) => {
        const startAt = fakeContext.currentTime + delay;
        const source = { stop: vi.fn() };
        scheduled.push({ beat, time: startAt, source });
        return [{ source, startAt }];
    });
    const onBeat = vi.fn();
    const onFinished = vi.fn();
    const initialProps = {
        audioContext: fakeContext,
        isPlaying: true,
        startToken: 1,
        beats: 4,
        bpm: 120,
        loop: true,
        scheduleBeat,
        onBeat,
        onFinished,
        ...props
    };
    const hook = renderHook((p) => useSequencer(p), {
        initialProps,
        wrapper: strict ? StrictMode : React.Fragment
    });
    return { ...hook, initialProps, scheduled, onBeat, onFinished };
}

const advance = (ms) => act(() => { vi.advanceTimersByTime(ms); });

beforeEach(() => { vi.useFakeTimers({ now: 0 }); });
afterEach(() => { vi.useRealTimers(); });

describe('useSequencer', () => {
    it('schedules beats at exact audio-clock times', () => {
        const { scheduled } = setup();
        advance(2000);
        const times = scheduled.slice(0, 4).map(s => s.time);
        expect(scheduled.slice(0, 4).map(s => s.beat)).toEqual([0, 1, 2, 3]);
        times.forEach((t, i) => expect(t).toBeCloseTo(0.05 + i * 0.5, 6));
    });

    it('reports each beat to the UI when it sounds, and loops', () => {
        const { onBeat } = setup();
        advance(2100);
        expect(onBeat.mock.calls.map(c => c[0])).toEqual([0, 1, 2, 3, 0]);
    });

    it('stops after one cycle when loop is off', () => {
        const { scheduled, onFinished } = setup({ beats: 2, loop: false });
        advance(3000);
        expect(scheduled.map(s => s.beat)).toEqual([0, 1]);
        expect(onFinished).toHaveBeenCalledTimes(1);
    });

    it('applies a tempo change from the next beat without restarting', () => {
        const { rerender, initialProps, scheduled } = setup();
        advance(600); // beats 0 and 1 scheduled (0.05, 0.55)
        rerender({ ...initialProps, bpm: 60 });
        advance(3000);
        const beats = scheduled.map(s => s.beat);
        expect(beats.slice(0, 4)).toEqual([0, 1, 2, 3]);
        // The interval after the change is 1 s instead of 0.5 s
        expect(scheduled[3].time - scheduled[2].time).toBeCloseTo(1, 6);
    });

    it('cancels notes scheduled ahead when stopped', () => {
        const { rerender, initialProps, scheduled } = setup();
        advance(10); // beat 0 is scheduled for 0.05 but hasn't started
        rerender({ ...initialProps, isPlaying: false });
        expect(scheduled[0].source.stop).toHaveBeenCalled();
    });

    it('does not double-play beat 0 under StrictMode', () => {
        const { scheduled } = setup({}, { strict: true });
        advance(100);
        const beat0 = scheduled.filter(s => s.beat === 0);
        const sounding = beat0.filter(s => !s.source.stop.mock.calls.length);
        expect(sounding).toHaveLength(1);
    });

    it('restarts at beat 0 when the start token changes', () => {
        const { rerender, initialProps, onBeat } = setup();
        advance(1100); // beats 0, 1, 2 shown
        rerender({ ...initialProps, startToken: 2 });
        advance(100);
        expect(onBeat.mock.calls.at(-1)[0]).toBe(0);
    });
});
