import React, { useState } from 'react';
import { swarNames } from '../utils/musicTheory';

const ChordCard = ({ chord, onPlay }) => (
    <div 
        draggable
        onDragStart={(e) => {
            e.dataTransfer.setData('application/json', JSON.stringify(chord));
        }}
        className={`p-3 rounded-lg border ${
            chord.isExtended 
                ? 'bg-gradient-to-br from-yellow-500 to-amber-600 text-white border-yellow-400' 
                : 'bg-gray-800/50 border-gray-600 text-gray-200'
        }`}
    >
        <div className="flex items-center gap-2 mb-2">
            <div 
                className="w-3 h-3 rounded-full shadow-sm" 
                style={{ backgroundColor: chord.type.color }}
            ></div>
            <span className="font-semibold text-sm">
                {chord.rootName} {chord.type.name}
            </span>
            {chord.outsideCount > 0 && (
                <span className="ml-auto text-[9px] bg-red-900/50 text-red-200 px-1.5 py-0.5 rounded-full border border-red-700">
                    Out: {chord.outsideCount}
                </span>
            )}
        </div>
        <p className={`text-xs ${chord.isExtended ? 'text-gray-100' : 'text-gray-400'} mb-3`}>
            Notes: {chord.notes.map((noteIndex, i) => (
                <span key={i} className={chord.outsideNotes?.includes(noteIndex) ? "text-red-400 font-bold" : ""}>
                    {swarNames[noteIndex]}
                    {i < chord.notes.length - 1 ? ' - ' : ''}
                </span>
            ))}
            {chord.westernName && (
                <span className="block mt-1 font-medium opacity-75">{chord.westernName}</span>
            )}
        </p>
        {/* Chord playback buttons */}
        <div className="flex gap-2">
            <button
                onClick={() => onPlay(chord, 'unison')}
                className="flex-1 px-2 py-1.5 text-[10px] font-medium bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors shadow-sm"
            >
                ♪ Unison
            </button>
            <button
                onClick={() => onPlay(chord, 'melody')}
                className="flex-1 px-2 py-1.5 text-[10px] font-medium bg-green-600 hover:bg-green-500 text-white rounded transition-colors shadow-sm"
            >
                ♫ Melody
            </button>
        </div>
    </div>
);

const ChordSection = ({ title, chords, onPlay }) => {
    const [showMore, setShowMore] = useState(false);
    const displayChords = showMore ? chords : chords.slice(0, 6);

    if (chords.length === 0) return null;

    return (
        <div className="mb-8">
            {title && <h3 className="text-lg font-medium text-gray-300 mb-3">{title}</h3>}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {displayChords.map((chord, index) => (
                    <ChordCard 
                        key={`${chord.root}-${chord.type.id}-${index}`} 
                        chord={chord} 
                        onPlay={onPlay} 
                    />
                ))}
            </div>
            {chords.length > 6 && (
                <div className="mt-4 text-center">
                    <button
                        onClick={() => setShowMore(!showMore)}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors duration-200 text-xs font-medium border border-gray-600"
                    >
                        {showMore ? 'Show Less' : `Show More (${chords.length - 6} more)`}
                    </button>
                </div>
            )}
        </div>
    );
};

const ChordDisplay = ({ chords, separateAarohAvroh, onChordClick }) => {
    if (!chords || chords.length === 0) {
        return (
            <div className="text-center p-8 text-gray-400 bg-gray-800/30 rounded-lg border border-dashed border-gray-600">
                No chords found matching the criteria.
            </div>
        );
    }

    // Separate in-raga and outside-raga chords
    const inRagaChords = chords.filter(c => !c.outsideCount);
    const outsideChords = chords.filter(c => c.outsideCount > 0);

    return (
        <div>
            {!separateAarohAvroh ? (
                <ChordSection 
                    chords={inRagaChords} 
                    onPlay={onChordClick} 
                />
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                        <ChordSection 
                            title="Aaroh Chords" 
                            chords={inRagaChords.filter(c => c.source === 'Aaroh' || c.source === 'Both')} 
                            onPlay={onChordClick} 
                        />
                    </div>
                    <div>
                        <ChordSection 
                            title="Avroh Chords" 
                            chords={inRagaChords.filter(c => c.source === 'Avroha' || c.source === 'Both')} 
                            onPlay={onChordClick} 
                        />
                    </div>
                </div>
            )}

            {outsideChords.length > 0 && (
                <div className="mt-8 pt-8 border-t border-gray-700">
                    <ChordSection 
                        title="Chords Outside Raga" 
                        chords={outsideChords} 
                        onPlay={onChordClick} 
                    />
                </div>
            )}
        </div>
    );
};

export default ChordDisplay;
