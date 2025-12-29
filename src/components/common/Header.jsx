/**
 * Header Component
 * Navigation header with links to all pages
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import ThemeToggle from './ThemeToggle.jsx';

/**
 * App header with navigation
 * @param {Object} props
 * @param {boolean} props.isDark - Dark mode state
 * @param {Function} props.onThemeToggle - Theme toggle handler
 */
export function Header({ isDark, onThemeToggle, className = '' }) {
    const location = useLocation();

    const navItems = [
        { path: '/', label: 'Chord Tool', icon: '🎹' },
        { path: '/query', label: 'Raga Query', icon: '🔍' },
        { path: '/insights', label: 'Raga Insights', icon: '📊' },
    ];

    const isActive = (path) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
    };

    return (
        <header className={`bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 ${className}`}>
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex items-center justify-between h-14">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2">
                        <span className="text-2xl">🎵</span>
                        <span className="font-bold text-lg text-gray-800 dark:text-white">
                            Samvad
                        </span>
                    </Link>

                    {/* Navigation */}
                    <nav className="flex items-center gap-1">
                        {navItems.map(item => (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`
                  px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${isActive(item.path)
                                        ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                    }
                `}
                            >
                                <span className="mr-1">{item.icon}</span>
                                <span className="hidden sm:inline">{item.label}</span>
                            </Link>
                        ))}

                        {/* Theme Toggle */}
                        <div className="ml-2 pl-2 border-l border-gray-200 dark:border-gray-700">
                            <ThemeToggle isDark={isDark} onToggle={onThemeToggle} />
                        </div>
                    </nav>
                </div>
            </div>
        </header>
    );
}

export default Header;
