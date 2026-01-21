import React, { useState, useMemo } from 'react';
import { westernNotes } from '../utils/musicTheory';

const RagaSelector = ({ ragas, selectedRaga, onRagaChange, rootNote, onRootChange }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterThaat, setFilterThaat] = useState('All');

    // Extract unique thaats
    const thaats = useMemo(() => {
        if (!ragas) return [];
        const t = new Set(ragas.map(r => r.thaat).filter(Boolean));
        return ['All', ...Array.from(t).sort()];
    }, [ragas]);

    const filteredRagas = useMemo(() => {
        if (!ragas) return [];
        return ragas.filter(r => {
            const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesThaat = filterThaat === 'All' || r.thaat === filterThaat;
            return matchesSearch && matchesThaat;
        });
    }, [ragas, searchTerm, filterThaat]);

    return (
        <div className="bg-white p-4 rounded-lg shadow-md space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
                {/* Root Note Selector */}
                <div className="w-full md:w-1/4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Root Note (Sa)</label>
                    <select
                        value={rootNote}
                        onChange={(e) => onRootChange(parseInt(e.target.value))}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                        {westernNotes.map((note, index) => (
                            <option key={index} value={index}>
                                {note}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Search Raga */}
                <div className="w-full md:w-3/4 space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Select Raga</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Search raga..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                        <select
                            value={filterThaat}
                            onChange={(e) => setFilterThaat(e.target.value)}
                            className="w-1/3 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        >
                            {thaats.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>
                    
                    <select
                        value={selectedRaga ? selectedRaga.id : ''}
                        onChange={(e) => {
                            const raga = ragas.find(r => r.id.toString() === e.target.value);
                            onRagaChange(raga);
                        }}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        size={5} // Show list box
                    >
                        {filteredRagas.map(raga => (
                            <option key={raga.id} value={raga.id}>
                                {raga.name} {raga.thaat ? `(${raga.thaat})` : ''}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {selectedRaga && (
                <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-100">
                    <h3 className="font-bold text-lg text-blue-800">{selectedRaga.name}</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                        {selectedRaga.thaat && <p><span className="font-semibold">Thaat:</span> {selectedRaga.thaat}</p>}
                        {selectedRaga.time && <p><span className="font-semibold">Time:</span> {selectedRaga.time}</p>}
                        {selectedRaga.vadi && <p><span className="font-semibold">Vadi:</span> {selectedRaga.vadi}</p>}
                        {selectedRaga.samvadi && <p><span className="font-semibold">Samvadi:</span> {selectedRaga.samvadi}</p>}
                    </div>
                    {selectedRaga.info && <p className="text-sm mt-2 text-gray-600 italic">{selectedRaga.info}</p>}
                </div>
            )}
        </div>
    );
};

export default RagaSelector;
