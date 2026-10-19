/**
 * useTanpura Hook
 * Manages tanpura drone playback using HTMLAudioElement for proper pause/resume support
 * Matches the original index.html implementation
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { TANPURA_BASE_PATH } from '../utils/audioHelpers.js';

// Note names for file loading (using flats for URL compatibility)
const WESTERN_NOTES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

/**
 * Get tanpura filename for a given tonic
 * @param {number} tonicIndex - 0-11 tonic index
 * @returns {string} - Filename like "C.mp3"
 */
function getTanpuraFileName(tonicIndex) {
    if (tonicIndex === null || tonicIndex === undefined) return 'C.mp3';
    return `${WESTERN_NOTES_FLAT[tonicIndex]}.mp3`;
}

/**
 * Load a tanpura audio file. There is one file per tonic, so no fallbacks:
 * substituting another file would silently drone in the wrong key.
 * @param {string} fileName - Filename to load
 * @param {string} basePath - Base path for tanpura files
 * @returns {Promise<HTMLAudioElement>} - Loaded audio element
 */
async function loadTanpuraFile(fileName, basePath) {
    const audio = new Audio(`${basePath}/${fileName}`);
    audio.loop = true;
    audio.preload = 'auto';

    await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error(`Timed out loading ${fileName}`)), 10000);
        audio.addEventListener('canplaythrough', () => { clearTimeout(timeout); resolve(); }, { once: true });
        audio.addEventListener('error', () => { clearTimeout(timeout); reject(new Error(`Could not load ${fileName}`)); }, { once: true });
        audio.load();
    });

    return audio;
}

/**
 * Hook for tanpura drone playback
 * @param {string} basePath - Path to tanpura samples (default respects Vite base URL)
 * @returns {Object} - { isPlaying, isLoading, toggle, changeTonic }
 */
export function useTanpura(basePath = TANPURA_BASE_PATH) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [currentTonic, setCurrentTonic] = useState(0); // 0 = C

    const tanpuraRef = useRef(null);
    const fileNameRef = useRef(null); // file currently held in tanpuraRef
    const requestIdRef = useRef(0);   // bumps on every start/stop so stale loads can bail out

    const stop = useCallback(() => {
        requestIdRef.current++;
        if (tanpuraRef.current) {
            tanpuraRef.current.pause();
        }
        setIsPlaying(false);
        setIsLoading(false);
    }, []);

    const start = useCallback(async (tonic) => {
        const requestId = ++requestIdRef.current;
        const fileName = getTanpuraFileName(tonic);
        setCurrentTonic(tonic);

        try {
            if (tanpuraRef.current && fileNameRef.current === fileName) {
                await tanpuraRef.current.play();
            } else {
                if (tanpuraRef.current) {
                    tanpuraRef.current.pause();
                    tanpuraRef.current.currentTime = 0;
                }
                setIsLoading(true);
                const audio = await loadTanpuraFile(fileName, basePath);
                if (requestId !== requestIdRef.current) return; // superseded by a newer start/stop

                tanpuraRef.current = audio;
                fileNameRef.current = fileName;
                await audio.play();
            }

            if (requestId !== requestIdRef.current) {
                tanpuraRef.current?.pause();
                return;
            }
            setIsPlaying(true);
        } catch (error) {
            console.error('[Tanpura] Could not load/play audio:', error);
            if (requestId === requestIdRef.current) setIsPlaying(false);
        } finally {
            if (requestId === requestIdRef.current) setIsLoading(false);
        }
    }, [basePath]);

    // Toggle tanpura playback
    const toggle = useCallback(async (tonic = currentTonic) => {
        const currentlyPlaying = tanpuraRef.current && !tanpuraRef.current.paused;
        if (currentlyPlaying || isLoading) {
            stop();
        } else {
            await start(tonic);
        }
    }, [currentTonic, isLoading, start, stop]);

    // Change tonic (stops current playback and optionally restarts with new tonic)
    const changeTonic = useCallback(async (newTonic, autoPlay = false) => {
        if (autoPlay) {
            await start(newTonic);
        } else {
            stop();
            setCurrentTonic(newTonic);
        }
    }, [start, stop]);

    // Cleanup on unmount
    useEffect(() => {
        const requestIds = requestIdRef;
        return () => {
            requestIds.current++; // a load finishing after unmount must not start playing
            if (tanpuraRef.current) {
                tanpuraRef.current.pause();
                tanpuraRef.current.currentTime = 0;
            }
        };
    }, []);

    return {
        isPlaying,
        isLoading,
        currentTonic,
        toggle,
        changeTonic
    };
}

export default useTanpura;
