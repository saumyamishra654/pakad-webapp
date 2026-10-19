/**
 * useAudio Hook
 * Manages Web Audio API AudioContext lifecycle
 */

import { useState, useEffect, useCallback } from 'react';

// One AudioContext for the whole app: each page mounting its own leaks contexts
// (browsers cap how many can exist) and splits the decoded sample cache
let sharedContext = null;

function getSharedContext() {
    if (!sharedContext) {
        try {
            sharedContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('WebAudio not available:', e);
        }
    }
    return sharedContext;
}

/**
 * Hook to manage AudioContext with browser autoplay policy handling
 * @returns {Object} - { audioContext, isReady, resume, suspend }
 */
export function useAudio() {
    const [audioContext] = useState(getSharedContext);
    const [isReady, setIsReady] = useState(() => audioContext?.state === 'running');

    // Resume audio context (needed for autoplay policy)
    const resume = useCallback(async () => {
        if (audioContext && audioContext.state === 'suspended') {
            try {
                await audioContext.resume();
                setIsReady(true);
                return true;
            } catch (e) {
                console.error('Failed to resume AudioContext:', e);
                return false;
            }
        }
        return audioContext?.state === 'running';
    }, [audioContext]);

    // Suspend audio context (e.g., when tab is hidden)
    const suspend = useCallback(async () => {
        if (audioContext && audioContext.state === 'running') {
            try {
                await audioContext.suspend();
                setIsReady(false);
                return true;
            } catch (e) {
                console.error('Failed to suspend AudioContext:', e);
                return false;
            }
        }
        return true;
    }, [audioContext]);

    // Handle visibility change to suspend/resume
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && audioContext?.state === 'running') {
                // Optionally suspend when tab is hidden
                // suspend();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [audioContext]);

    return {
        audioContext,
        isReady,
        resume,
        suspend
    };
}

export default useAudio;
