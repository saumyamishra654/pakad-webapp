/**
 * usePianoSamples Hook
 * Loads piano samples and provides playback function
 */

import { useState, useRef, useCallback } from 'react';
import { loadPianoSamples, playNote as playNoteAudio } from '../utils/audioHelpers.js';
import { AVAILABLE_OCTAVES } from '../utils/noteHelpers.js';

/**
 * Hook to load and play piano samples
 * @param {AudioContext} audioContext - Web Audio context from useAudio
 * @param {string} basePath - Path to piano samples (default "/Piano")
 * @returns {Object} - { isReady, isLoading, error, playNote, playChord, playSequence }
 */
export function usePianoSamples(audioContext, basePath = '/Piano') {
    const [isReady, setIsReady] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const buffersRef = useRef({});

    // Lazy load function
    const loadSamples = useCallback(async () => {
        if (!audioContext || isReady || isLoading || buffersRef.current['C']) return;

        setIsLoading(true);
        setError(null);

        try {
            const buffers = await loadPianoSamples(audioContext, basePath);
            buffersRef.current = buffers;

            // Check if all octaves loaded for all notes
            const allReady = Object.keys(buffers).length === 12 &&
                Object.values(buffers).every(noteMap =>
                    AVAILABLE_OCTAVES.every(oct => !!noteMap[oct])
                );

            setIsReady(allReady);
            if (!allReady) {
                console.warn('Some piano samples failed to load');
            }
        } catch (err) {
            console.error('Failed to load piano samples:', err);
            setError(err.message || 'Failed to load samples');
            buffersRef.current = {};
            setIsReady(false);
        } finally {
            setIsLoading(false);
        }
    }, [audioContext, basePath, isReady, isLoading]);

    // No auto-loading useEffect anymore!

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
        loadSamples
    };
}

export default usePianoSamples;
