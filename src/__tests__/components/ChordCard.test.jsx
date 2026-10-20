/**
 * Tests for ChordCard component
 * Covers rendering, props, and drag functionality
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChordCard } from '../../components/chords/ChordCard.jsx';



describe('ChordCard', () => {
    const mockChord = {
        root: 0,
        notes: [0, 4, 7],
        name: 'Major',
        type: { name: 'major' },
        color: '#3b82f6'
    };

    const defaultProps = {
        chord: mockChord,
        onPlayUnison: vi.fn(),
        onPlayMelody: vi.fn(),
        tonic: 0,
        isCarnatic: false,
        isExtended: false
    };

    it('renders without crashing', () => {
        render(<ChordCard {...defaultProps} />);
        expect(screen.getByText(/Major/)).toBeDefined();
    });

    it('returns null when chord is null', () => {
        const { container } = render(<ChordCard {...defaultProps} chord={null} />);
        expect(container.firstChild).toBeNull();
    });

    it('displays chord root label', () => {
        render(<ChordCard {...defaultProps} />);
        // Sa appears in both header and notes, use getAllByText
        const saElements = screen.getAllByText(/Sa/);
        expect(saElements.length).toBeGreaterThanOrEqual(1);
    });

    it('displays chord notes', () => {
        render(<ChordCard {...defaultProps} />);
        // Notes: Sa - Ga - Pa (for 0, 4, 7)
        expect(screen.getByText(/Notes:/)).toBeDefined();
    });

    it('calls onPlayUnison when Unison button clicked', () => {
        const onPlayUnison = vi.fn();
        render(<ChordCard {...defaultProps} onPlayUnison={onPlayUnison} />);

        const unisonButton = screen.getByText(/Unison/);
        fireEvent.click(unisonButton);

        expect(onPlayUnison).toHaveBeenCalled();
    });

    it('calls onPlayMelody when Melody button clicked', () => {
        const onPlayMelody = vi.fn();
        render(<ChordCard {...defaultProps} onPlayMelody={onPlayMelody} />);

        const melodyButton = screen.getByText(/Melody/);
        fireEvent.click(melodyButton);

        expect(onPlayMelody).toHaveBeenCalled();
    });

    it('uses Carnatic labels when isCarnatic is true', () => {
        render(<ChordCard {...defaultProps} isCarnatic={true} />);
        // S is the root label for pitch class 0 in Carnatic mode
        expect(screen.getByText(/S Major/)).toBeDefined();
    });

    it('applies extended chord styling when isExtended is true', () => {
        const { container } = render(<ChordCard {...defaultProps} isExtended={true} />);
        const card = container.firstChild;
        expect(card.getAttribute('data-variant')).toBe('extended');
    });

    it('applies outside chord styling when isOutside is true', () => {
        const { container } = render(<ChordCard {...defaultProps} isOutside={true} />);
        const card = container.firstChild;
        expect(card.getAttribute('data-variant')).toBe('outside');
    });

    it('is draggable', () => {
        const { container } = render(<ChordCard {...defaultProps} />);
        const card = container.firstChild;
        expect(card.getAttribute('draggable')).toBe('true');
    });

    it('highlights notes outside raga when ragaPattern provided', () => {
        // Pattern that doesn't include Ga (4)
        const ragaPattern = [1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1]; // Missing Ga
        const { container } = render(
            <ChordCard
                {...defaultProps}
                isOutside={true}
                ragaPattern={ragaPattern}
            />
        );
        // Ga should be highlighted
        const highlightedSpans = container.querySelectorAll('[data-outside]');
        expect(highlightedSpans.length).toBe(1);
    });
});
