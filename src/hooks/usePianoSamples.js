/**
 * usePianoSamples Hook
 * Loads piano samples and provides playback function
 */

import { useState, useRef, useCallback } from 'react';
import { loadPianoSamples, playNote as playNoteAudio, PIANO_BASE_PATH } from '../utils/audioHelpers.js';
import { AVAILABLE_OCTAVES } from '../utils/noteHelpers.js';

// Decoded buffers shared by every page, keyed by base path; holds the in-flight promise
// so concurrent callers share one load
const sampleCache = new Map();
const SAMPLE_RETRY_MS = 30000;

/**
 * Hook to load and play piano samples
 * @param {AudioContext} audioContext - Web Audio context from useAudio
 * @param {string} basePath - Path to piano samples (default respects Vite base URL)
 * @returns {Object} - { isReady, isLoading, error, playNote, playChord, playSequence, loadSamples, ensureReady, hasSamples }
 */
export function usePianoSamples(audioContext, basePath = PIANO_BASE_PATH) {
    const [isReady, setIsReady] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const buffersRef = useRef({});

    const completeRef = useRef(false);   // every note/octave loaded
    const lastAttemptRef = useRef(0);

    const runLoad = useCallback(async () => {
        lastAttemptRef.current = Date.now();
        let pending = sampleCache.get(basePath);
        if (!pending) {
            pending = loadPianoSamples(audioContext, basePath);
            sampleCache.set(basePath, pending);
        }

        setIsLoading(true);
        setError(null);

        try {
            const fresh = await pending;
            // Merge so a retry only fills in what was missing
            const buffers = { ...buffersRef.current };
            for (const [index, noteMap] of Object.entries(fresh)) {
                buffers[index] = { ...buffers[index], ...noteMap };
            }

            const loaded = Object.keys(buffers).length > 0;
            const complete = Object.keys(buffers).length === 12 &&
                Object.values(buffers).every(noteMap =>
                    AVAILABLE_OCTAVES.every(oct => !!noteMap[oct])
                );
            if (!complete) sampleCache.delete(basePath); // let a later call retry the missing files
            if (loaded && !complete) console.warn('Some piano samples failed to load');
            if (!loaded) setError('Failed to load samples');

            buffersRef.current = buffers;
            completeRef.current = complete;
            setIsReady(loaded);
            return loaded;
        } catch (err) {
            console.error('Failed to load piano samples:', err);
            sampleCache.delete(basePath);
            setError(err.message || 'Failed to load samples');
            return Object.keys(buffersRef.current).length > 0;
        } finally {
            setIsLoading(false);
        }
    }, [audioContext, basePath]);

    // Lazy load (idempotent); resolves true when at least some samples are playable
    const loadSamples = useCallback(async () => {
        if (!audioContext) return false;
        if (completeRef.current) return true;
        if (Object.keys(buffersRef.current).length > 0) {
            // Partially loaded: play what we have, retry the missing files in the background
            if (Date.now() - lastAttemptRef.current > SAMPLE_RETRY_MS) runLoad();
            return true;
        }
        return runLoad();
    }, [audioContext, runLoad]);

    // Synchronous check, for callers that must not wait on a load (e.g. sequencer ticks)
    const hasSamples = useCallback(() => Object.keys(buffersRef.current).length > 0, []);

    // Resume the context (autoplay policy) and make sure samples are loaded before playing
    const ensureReady = useCallback(async () => {
        if (audioContext?.state === 'suspended') {
            try { await audioContext.resume(); } catch { /* ignore */ }
        }
        return loadSamples();
    }, [audioContext, loadSamples]);

    // Play a single note
    const playNote = useCallback((noteIndex, octave = 4, duration = 0.5, delay = 0, volume = 1) => {
        if (!audioContext || !buffersRef.current) return null;

        // Resume context if suspended (autoplay policy)
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        return playNoteAudio({
            ctx: audioContext,
            buffers: buffersRef.current,
            noteIndex,
            octave,
            duration,
            delay,
            volume
        });
    }, [audioContext]);

    // Play a chord (all notes simultaneously)
    const playChord = useCallback((notes, octave = 4, duration = 0.8, delay = 0, volume = 1) => {
        if (!notes || notes.length === 0) return;

        // Arrange notes ascending from root
        let currentOctave = octave;
        let prevNote = -1;

        for (let i = 0; i < notes.length; i++) {
            const noteIndex = notes[i];
            if (i > 0 && noteIndex <= prevNote) {
                currentOctave++;
            }
            playNote(noteIndex, currentOctave, duration, delay, volume);
            prevNote = noteIndex;
        }
    }, [playNote]);

    // Play a chord arpeggiated
    const playChordArpeggiated = useCallback((notes, octave = 4, arpDelay = 0.08, duration = 0.5, startDelay = 0, volume = 1) => {
        if (!notes || notes.length === 0) return;

        let currentOctave = octave;
        let prevNote = -1;

        for (let i = 0; i < notes.length; i++) {
            const noteIndex = notes[i];
            if (i > 0 && noteIndex <= prevNote) {
                currentOctave++;
            }
            playNote(noteIndex, currentOctave, duration, startDelay + i * arpDelay, volume);
            prevNote = noteIndex;
        }
    }, [playNote]);

    // Play a sequence of notes with timing
    const playSequence = useCallback((sequence, noteDelay = 0.4) => {
        if (!sequence || sequence.length === 0) return;

        let startTime = 0;
        for (const { noteIndex, octave = 4, duration = 0.6 } of sequence) {
            playNote(noteIndex, octave, duration, startTime);
            startTime += noteDelay;
        }

        return startTime; // Return total duration
    }, [playNote]);

    return {
        isReady,
        isLoading,
        error,
        playNote,
        playChord,
        playChordArpeggiated,
        playSequence,
        loadSamples,
        ensureReady,
        hasSamples
    };
}

export default usePianoSamples;
