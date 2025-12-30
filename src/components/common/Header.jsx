/**
 * Header Component - Minimal header matching original design
 * Original has no header - just dark mode toggle in corner
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export function Header() {
    const location = useLocation();

    return (
        <div className="flex items-center justify-between px-6 py-3">
            {/* Logo/Brand */}
            <Link to="/" className="text-2xl font-bold text-gray-800 dark:text-white">
                Samvad
            </Link>

            {/* Navigation */}
            <div className="flex items-center gap-2">
                <Link
                    to="/"
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${location.pathname === '/'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                >
                    Chord Tool
                </Link>
                <Link
                    to="/query"
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${location.pathname === '/query'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                >
                    Raga Query
                </Link>
                <Link
                    to="/insights"
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${location.pathname === '/insights'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                >
                    Insights
                </Link>
            </div>
        </div>
    );
}

export default Header;
