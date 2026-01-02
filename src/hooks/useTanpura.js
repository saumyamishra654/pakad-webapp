/**
 * useTanpura Hook
 * Manages tanpura drone playback using HTMLAudioElement for proper pause/resume support
 * Matches the original index.html implementation
 */

import { useState, useRef, useCallback, useEffect } from 'react';

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
 * Load a tanpura audio file, trying multiple naming conventions
 * @param {string} fileName - Primary filename to try
 * @param {string} basePath - Base path for tanpura files
 * @returns {Promise<HTMLAudioElement>} - Loaded audio element
 */
async function loadTanpuraFile(fileName, basePath) {
    const namingVariants = [
        fileName, // original (e.g., "Db.mp3")
        fileName.replace('b', '#'), // sharp notation (e.g., "D#.mp3")
        fileName.replace('#', 's'), // s for sharp (e.g., "Ds.mp3")
        'C.mp3' // fallback to C
    ];

    for (const variant of namingVariants) {
        try {
            const audio = new Audio(`${basePath}/${variant}`);
            audio.loop = true;
            audio.preload = 'metadata';

            // Test if file exists by trying to load metadata
            await new Promise((resolve, reject) => {
                audio.addEventListener('canplaythrough', resolve, { once: true });
                audio.addEventListener('error', reject, { once: true });
                audio.load();
            });

            return audio;
        } catch {
            console.log(`Tanpura file ${variant} not found, trying next variant...`);
            continue;
        }
    }

    throw new Error('No tanpura file found for any naming variant');
}

/**
 * Hook for tanpura drone playback
 * @param {string} basePath - Path to tanpura samples (default "/tanpura")
 * @returns {Object} - { isPlaying, isLoading, toggle, changeTonic }
 */
export function useTanpura(basePath = '/tanpura') {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [currentTonic, setCurrentTonic] = useState(0); // 0 = C

    // Use ref for audio element - this is the key pattern from original index.html
    const tanpuraRef = useRef(null);

    // Toggle tanpura playback - matches original index.html implementation
    const toggle = useCallback(async (tonic = currentTonic) => {
        console.log('[Tanpura] toggle called, tonic:', tonic);
        try {
            // Check if currently playing by examining the audio element directly
            const currentlyPlaying = tanpuraRef.current && !tanpuraRef.current.paused;
            console.log('[Tanpura] currentlyPlaying:', currentlyPlaying, 'audioRef exists:', !!tanpuraRef.current);

            if (currentlyPlaying) {
                // Pause tanpura
                console.log('[Tanpura] Pausing...');
                tanpuraRef.current.pause();
                setIsPlaying(false);
            } else {
                // Play tanpura
                const fileName = getTanpuraFileName(tonic);
                console.log('[Tanpura] Playing, fileName:', fileName);
                setCurrentTonic(tonic);

                // Create new audio element if needed or if tonic changed
                if (!tanpuraRef.current || !tanpuraRef.current.src.includes(fileName.replace('.mp3', ''))) {
                    // Stop current audio if it exists
                    if (tanpuraRef.current) {
                        console.log('[Tanpura] Stopping old audio');
                        tanpuraRef.current.pause();
                        tanpuraRef.current.currentTime = 0;
                    }

                    setIsLoading(true);
                    console.log('[Tanpura] Loading new audio...');

                    try {
                        const audio = await loadTanpuraFile(fileName, basePath);
                        console.log('[Tanpura] Audio loaded successfully');

                        // Handle ended event (even though looped, just in case)
                        audio.addEventListener('ended', () => {
                            console.log('[Tanpura] Audio ended event fired');
                            setIsPlaying(false);
                        });

                        // Debug: track when audio gets paused
                        audio.addEventListener('pause', () => {
                            console.log('[Tanpura] Audio PAUSED event fired!');
                            console.trace('[Tanpura] Stack trace for pause:');
                        });

                        tanpuraRef.current = audio;

                        // Play the loaded audio
                        console.log('[Tanpura] Calling audio.play()...');
                        await audio.play();
                        console.log('[Tanpura] audio.play() succeeded, paused:', audio.paused);
                        setIsPlaying(true);
                    } catch (error) {
                        console.error('[Tanpura] Could not load/play audio:', error);
                        setIsPlaying(false);
                    } finally {
                        setIsLoading(false);
                    }
                } else {
                    // Resume existing audio
                    console.log('[Tanpura] Resuming existing audio');
                    await tanpuraRef.current.play();
                    setIsPlaying(true);
                }
            }
        } catch (error) {
            console.error('[Tanpura] Toggle error:', error);
            setIsPlaying(false);
            setIsLoading(false);
        }
    }, [currentTonic, basePath]); // Remove isPlaying from deps - check audio element directly

    // Change tonic (stops current playback and optionally restarts with new tonic)
    const changeTonic = useCallback(async (newTonic, autoPlay = false) => {
        // Stop current playback
        if (tanpuraRef.current) {
            tanpuraRef.current.pause();
            tanpuraRef.current.currentTime = 0;
        }
        setIsPlaying(false);
        setCurrentTonic(newTonic);

        if (autoPlay) {
            await toggle(newTonic);
        }
    }, [toggle]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
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
