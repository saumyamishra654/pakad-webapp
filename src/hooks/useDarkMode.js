/**
 * useDarkMode Hook
 * Manages dark mode state with persistence and system preference detection
 */

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'samvad-dark-mode';

/**
 * Hook to manage dark mode with localStorage persistence
 * @param {boolean} defaultValue - Default value if no preference saved
 * @returns {Object} - { isDark, toggle, enable, disable }
 */
export function useDarkMode(defaultValue = true) {
    const [isDark, setIsDark] = useState(() => {
        // Check localStorage first
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved !== null) {
                return JSON.parse(saved);
            }
        } catch (e) {
            // localStorage not available
        }

        // Fall back to system preference
        if (typeof window !== 'undefined' && window.matchMedia) {
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        }

        return defaultValue;
    });

    // Apply dark mode class to document
    useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add('dark');
            document.body.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
            document.body.classList.remove('dark');
        }

        // Save to localStorage
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(isDark));
        } catch (e) {
            // localStorage not available
        }
    }, [isDark]);

    // Listen for system preference changes
    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleChange = (e) => {
            // Only update if user hasn't explicitly set preference
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved === null) {
                setIsDark(e.matches);
            }
        };

        // Modern browsers
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }

        // Legacy support
        mediaQuery.addListener(handleChange);
        return () => mediaQuery.removeListener(handleChange);
    }, []);

    const toggle = useCallback(() => {
        setIsDark(prev => !prev);
    }, []);

    const enable = useCallback(() => {
        setIsDark(true);
    }, []);

    const disable = useCallback(() => {
        setIsDark(false);
    }, []);

    return {
        isDark,
        toggle,
        enable,
        disable
    };
}

export default useDarkMode;
