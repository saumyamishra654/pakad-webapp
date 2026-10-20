/**
 * Header Component - app bar with brand and page navigation
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
    { to: '/', label: 'Chord Tool' },
    { to: '/query', label: 'Raga Query' },
    { to: '/insights', label: 'Insights' }
];

export function Header() {
    const location = useLocation();

    return (
        <header className="sticky top-0 z-40 border-b border-gray-800 bg-gray-950/90 backdrop-blur">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 px-3 sm:px-6 h-14">
                {/* Brand */}
                <Link to="/" className="flex items-center gap-2 shrink-0">
                    <img src="icon-192.svg" alt="" className="w-7 h-7 rounded-md" />
                    <span className="font-serif text-xl font-semibold text-gray-100">Samvad</span>
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
                </nav>
            </div>
        </header>
    );
}

export default Header;
