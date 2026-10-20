/**
 * Header Component - app bar with brand and page navigation
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme.js';

const NAV_ITEMS = [
    { to: '/', label: 'Chord Tool' },
    { to: '/query', label: 'Raga Query' },
    { to: '/insights', label: 'Insights' }
];

export function Header() {
    const location = useLocation();
    const { theme, toggleTheme } = useTheme();

    return (
        <header className="sticky top-0 z-40 border-b border-gray-800 bg-gray-950/90 backdrop-blur">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 px-3 sm:px-6 h-14">
                {/* Brand */}
                <Link to="/" className="flex items-center gap-2 shrink-0">
                    <img src="icon-192.svg" alt="" className="w-7 h-7 rounded-md" />
                    <span className="font-serif text-xl font-semibold text-gray-100 max-[420px]:sr-only">Samvad</span>
                </Link>

                {/* Navigation */}
                <nav className="flex items-center gap-0.5 sm:gap-1 min-w-0">
                    {NAV_ITEMS.map(({ to, label }) => {
                        const active = location.pathname === to;
                        return (
                            <Link
                                key={to}
                                to={to}
                                aria-current={active ? 'page' : undefined}
                                className={`px-2 sm:px-3 py-1.5 rounded-md text-[13px] sm:text-sm font-medium whitespace-nowrap transition-colors ${active
                                    ? 'bg-gray-800 text-gray-100'
                                    : 'text-gray-400 hover:text-gray-100 hover:bg-gray-900'
                                    }`}
                            >
                                {label}
                            </Link>
                        );
                    })}

                    <button
                        onClick={toggleTheme}
                        className="ml-1 p-1.5 rounded-md text-gray-400 hover:text-gray-100 hover:bg-gray-900 transition-colors"
                        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                        title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
                    >
                        {theme === 'dark' ? (
                            // Sun
                            <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                                <circle cx="12" cy="12" r="4" />
                                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                            </svg>
                        ) : (
                            // Moon
                            <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                            </svg>
                        )}
                    </button>
                </nav>
            </div>
        </header>
    );
}

export default Header;
