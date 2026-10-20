/**
 * useTheme Hook
 * Light/dark theme: follows the OS setting until the user picks one, which is remembered.
 * The theme is applied as data-theme on <html>; index.html sets it before first paint.
 */

import { useState, useEffect, useCallback } from 'react';

export const THEME_STORAGE_KEY = 'samvad_theme';

const systemTheme = () =>
    (window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark');

function readStoredTheme() {
    try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        return stored === 'light' || stored === 'dark' ? stored : null;
    } catch {
        return null;
    }
}

export function useTheme() {
    const [chosen, setChosen] = useState(readStoredTheme); // null = follow the OS
    const [system, setSystem] = useState(systemTheme);
    const theme = chosen ?? system;

    // Track OS changes while no explicit choice has been made
    useEffect(() => {
        const media = window.matchMedia?.('(prefers-color-scheme: light)');
        if (!media) return;
        const onChange = () => setSystem(media.matches ? 'light' : 'dark');
        media.addEventListener('change', onChange);
        return () => media.removeEventListener('change', onChange);
    }, []);

    useEffect(() => {
        document.documentElement.dataset.theme = theme;
    }, [theme]);

    const toggleTheme = useCallback(() => {
        const next = theme === 'dark' ? 'light' : 'dark';
        setChosen(next);
        try { localStorage.setItem(THEME_STORAGE_KEY, next); } catch { /* storage unavailable */ }
    }, [theme]);

    return { theme, toggleTheme };
}

export default useTheme;
