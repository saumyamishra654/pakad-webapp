/**
 * RagaSelector Component
 * Dropdown selector with Hindustani/Carnatic mode toggle
 */

import React, { useMemo, useState } from 'react';
import { HINDUSTANI_RAGAS } from '../../data/ragaData.js';
import { MELAKARTA_72 } from '../../data/melakartaData.js';

/**
 * Raga selector with search and mode toggle
 * @param {Object} props
 * @param {string} props.selectedRaga - Currently selected raga name
 * @param {Function} props.onSelect - Called with raga object when selected
 * @param {boolean} props.isCarnatic - Current mode
 * @param {Function} props.onModeChange - Called with new mode boolean
 * @param {boolean} props.showModeToggle - Show Hindustani/Carnatic toggle
 */
export function RagaSelector({
    selectedRaga,
    onSelect,
    isCarnatic = false,
    onModeChange,
    showModeToggle = true,
    className = ''
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    const ragaList = useMemo(() => {
        return isCarnatic ? MELAKARTA_72 : HINDUSTANI_RAGAS;
    }, [isCarnatic]);

    const filteredRagas = useMemo(() => {
        if (!searchQuery) return ragaList;
        const query = searchQuery.toLowerCase();
        return ragaList.filter(r => r.name.toLowerCase().includes(query));
    }, [ragaList, searchQuery]);

    const selectedRagaObj = useMemo(() => {
        return ragaList.find(r => r.name === selectedRaga);
    }, [ragaList, selectedRaga]);

    const handleSelect = (raga) => {
        onSelect(raga);
        setIsOpen(false);
        setSearchQuery('');
    };

    return (
        <div className={`relative ${className}`}>
            {/* Mode Toggle */}
            {showModeToggle && onModeChange && (
                <div className="flex gap-2 mb-2">
                    <button
                        onClick={() => onModeChange(false)}
                        className={`px-3 py-1 text-sm rounded-lg transition-colors ${!isCarnatic
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                    >
                        Hindustani
                    </button>
                    <button
                        onClick={() => onModeChange(true)}
                        className={`px-3 py-1 text-sm rounded-lg transition-colors ${isCarnatic
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                    >
                        Carnatic
                    </button>
                </div>
            )}

            {/* Selector Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-left flex justify-between items-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
            >
                <span className="font-medium text-gray-800 dark:text-gray-200">
                    {selectedRagaObj?.name || 'Select a raga...'}
                </span>
                <svg
                    className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-80 overflow-hidden">
                    {/* Search */}
                    <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                        <input
                            type="text"
                            placeholder="Search ragas..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            autoFocus
                        />
                    </div>

                    {/* List */}
                    <div className="max-h-60 overflow-y-auto">
                        {filteredRagas.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                No ragas found
                            </div>
                        ) : (
                            filteredRagas.map(raga => (
                                <button
                                    key={raga.name}
                                    onClick={() => handleSelect(raga)}
                                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${raga.name === selectedRaga
                                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                            : 'text-gray-700 dark:text-gray-300'
                                        }`}
                                >
                                    <span className="font-medium">{raga.name}</span>
                                    {isCarnatic && raga.number && (
                                        <span className="ml-2 text-xs text-gray-500">#{raga.number}</span>
                                    )}
                                </button>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                        {ragaList.length} ragas available
                    </div>
                </div>
            )}

            {/* Click outside to close */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    );
}

export default RagaSelector;
