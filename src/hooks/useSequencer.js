/**
 * useSequencer Hook
 * Plays a beat loop scheduled on the AudioContext clock (lookahead scheduling), so timing
 * doesn't drift with JS timer jitter or background-tab throttling
 */

import { useEffect, useRef } from 'react';

const LOOKAHEAD_SECONDS = 0.12; // schedule beats this far ahead of the audio clock
const SCHEDULER_INTERVAL_MS = 25;
const START_DELAY_SECONDS = 0.05;

/**
 * @param {Object} options
 * @param {AudioContext} options.audioContext - Shared audio context
 * @param {boolean} options.isPlaying - Whether the loop should run
 * @param {number} options.startToken - Changes on every Play press; restarts the loop at beat 0
 * @param {number} options.beats - Beats per cycle (read live)
 * @param {number} options.bpm - Tempo (read live, applies from the next beat)
 * @param {boolean} options.loop - Loop the cycle (read live)
 * @param {Function} options.scheduleBeat - (beat, delaySeconds) => array of { source, startAt } it scheduled
 * @param {Function} options.onBeat - (beat) => void, called when a beat starts sounding (for the UI)
 * @param {Function} options.onFinished - Called when a non-looping cycle ends
 */
export function useSequencer({ audioContext, isPlaying, startToken, beats, bpm, loop, scheduleBeat, onBeat, onFinished }) {
    // Latest values for the scheduler loop, so edits apply without restarting it
    const liveRef = useRef({});
    useEffect(() => {
        liveRef.current = { beats, bpm, loop, scheduleBeat, onBeat, onFinished };
    });

    useEffect(() => {
        if (!isPlaying || !audioContext) return;

        let beat = 0;
        let nextBeatTime = audioContext.currentTime + START_DELAY_SECONDS;
        let stopped = false;
        const scheduled = []; // { source, startAt } so pending notes can be cancelled
        const timers = new Set();

        const at = (time, fn) => {
            const id = setTimeout(() => { timers.delete(id); fn(); }, Math.max(0, (time - audioContext.currentTime) * 1000));
            timers.add(id);
        };

        const schedule = () => {
            const live = liveRef.current;
            while (!stopped && nextBeatTime < audioContext.currentTime + LOOKAHEAD_SECONDS) {
                if (beat >= live.beats) {
                    if (!live.loop) {
                        stopped = true;
                        at(nextBeatTime, () => liveRef.current.onFinished());
                        return;
                    }
                    beat = 0;
                }

                const delay = Math.max(0, nextBeatTime - audioContext.currentTime);
                scheduled.push(...(live.scheduleBeat(beat, delay) || []));
                const shown = beat;
                at(nextBeatTime, () => liveRef.current.onBeat(shown));

                beat += 1;
                nextBeatTime += 60 / live.bpm;
            }
            // Forget notes that have already started
            while (scheduled.length && scheduled[0].startAt < audioContext.currentTime) scheduled.shift();
        };

        schedule();
        const interval = setInterval(schedule, SCHEDULER_INTERVAL_MS);

        return () => {
            stopped = true;
            clearInterval(interval);
            timers.forEach(clearTimeout);
            // Cancel notes scheduled ahead that haven't started (also keeps StrictMode's
            // mount/unmount/mount from playing beat 0 twice)
            for (const { source, startAt } of scheduled) {
                if (startAt > audioContext.currentTime) {
                    try { source.stop(); } catch { /* already stopped */ }
                }
            }
        };
    }, [isPlaying, startToken, audioContext]);
}

export default useSequencer;
