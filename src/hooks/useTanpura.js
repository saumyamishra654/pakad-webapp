/**
 * useTanpura Hook
 * Manages tanpura drone playback
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { WESTERN_NOTES_SHARP } from '../utils/noteHelpers.js';

/**
 * Hook for tanpura drone playback
 * @param {AudioContext} audioContext - Web Audio context from useAudio
 * @param {string} basePath - Path to tanpura samples (default "/tanpura")
 * @returns {Object} - { isPlaying, isLoading, start, stop, setTonic }
 */
export function useTanpura(audioContext, basePath = '/tanpura') {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [currentTonic, setCurrentTonic] = useState(0); // 0 = C

    const sourceRef = useRef(null);
    const gainNodeRef = useRef(null);
    const bufferCacheRef = useRef({}); // Cache loaded buffers

    // Load tanpura sample for a given tonic
    const loadTanpuraBuffer = useCallback(async (tonic) => {
        if (!audioContext) return null;

        // Check cache first
        if (bufferCacheRef.current[tonic]) {
            return bufferCacheRef.current[tonic];
        }

        const noteName = WESTERN_NOTES_SHARP[tonic];
        const extensions = ['.mp3', '.wav', '.ogg'];
        const variants = [noteName, noteName.replace('#', 'sharp'), noteName.replace('#', 's')];

        for (const variant of variants) {
            for (const ext of extensions) {
                const url = `${basePath}/${variant}${ext}`;
                try {
                    const response = await fetch(url);
                    if (!response.ok) continue;

                    const arrayBuffer = await response.arrayBuffer();
                    if (arrayBuffer.byteLength === 0) continue;

                    const buffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
                    bufferCacheRef.current[tonic] = buffer;
                    return buffer;
                } catch (err) {
                    // Try next variant/extension
                }
            }
        }

        console.warn(`Failed to load tanpura for tonic ${noteName}`);
        return null;
    }, [audioContext, basePath]);

    // Start tanpura drone
    const start = useCallback(async (tonic = currentTonic) => {
        if (!audioContext) return false;

        // Resume context if suspended
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }

        // Stop any existing playback
        if (sourceRef.current) {
            try {
                sourceRef.current.stop();
            } catch (e) {
                // Already stopped
            }
        }

        setIsLoading(true);
        setCurrentTonic(tonic);

        const buffer = await loadTanpuraBuffer(tonic);

        if (!buffer) {
            setIsLoading(false);
            return false;
        }

        // Create source and gain nodes
        const source = audioContext.createBufferSource();
        const gainNode = audioContext.createGain();

        source.buffer = buffer;
        source.loop = true;
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Fade in
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.7, audioContext.currentTime + 0.5);

        source.start();

        sourceRef.current = source;
        gainNodeRef.current = gainNode;
        setIsPlaying(true);
        setIsLoading(false);

        return true;
    }, [audioContext, currentTonic, loadTanpuraBuffer]);

    // Stop tanpura drone
    const stop = useCallback(() => {
        if (sourceRef.current && gainNodeRef.current && audioContext) {
            // Fade out
            gainNodeRef.current.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);

            // Stop after fade
            setTimeout(() => {
                try {
                    sourceRef.current?.stop();
                } catch (e) {
                    // Already stopped
                }
                sourceRef.current = null;
                gainNodeRef.current = null;
            }, 350);
        }

        setIsPlaying(false);
    }, [audioContext]);

    // Toggle tanpura
    const toggle = useCallback((tonic) => {
        if (isPlaying) {
            stop();
        } else {
            start(tonic);
        }
    }, [isPlaying, start, stop]);

    // Change tonic while playing
    const changeTonic = useCallback(async (newTonic) => {
        if (isPlaying) {
            await start(newTonic);
        } else {
            setCurrentTonic(newTonic);
        }
    }, [isPlaying, start]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (sourceRef.current) {
                try {
                    sourceRef.current.stop();
                } catch (e) {
                    // Already stopped
                }
            }
        };
    }, []);

    return {
        isPlaying,
        isLoading,
        currentTonic,
        start,
        stop,
        toggle,
        changeTonic
    };
}

export default useTanpura;
