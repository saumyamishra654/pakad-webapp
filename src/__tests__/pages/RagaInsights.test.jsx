/**
 * Tests for the Raga Insights page: renders without a loading delay, and the Subsets tab
 * searches subsets and supersets separately
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RagaInsights } from '../../pages/RagaInsights.jsx';

const subsetNames = () => screen.getAllByRole('button')
    .filter(b => b.textContent.includes('found in'))
    .map(b => b.querySelector('span').textContent);

describe('RagaInsights', () => {
    it('renders results immediately, without a loading state', () => {
        render(<RagaInsights />);
        expect(screen.queryByText(/Analyzing raga relationships/)).toBeNull();
        expect(screen.getByText('Same Notes', { selector: 'button' })).toBeTruthy();
    });

    it('"Subsets of" lists the smaller ragas contained in the searched raga', () => {
        render(<RagaInsights />);
        fireEvent.click(screen.getByText('Subsets', { selector: 'button' }));
        fireEvent.change(screen.getByLabelText('Find subsets of a raga'), { target: { value: 'yaman' } });

        const rows = screen.getAllByRole('button').filter(b => b.textContent.includes('found in'));
        expect(rows.length).toBeGreaterThan(0);
        // Each row is a smaller raga; its superset list is narrowed to Yaman
        fireEvent.click(rows[0]);
        const supersets = rows[0].parentElement.querySelectorAll('div.font-medium');
        expect(supersets.length).toBeGreaterThan(0);
        supersets.forEach(el => expect(el.textContent.toLowerCase()).toContain('yaman'));
    });

    it('"Supersets of" shows the larger ragas containing the searched raga, expanded', () => {
        render(<RagaInsights />);
        fireEvent.click(screen.getByText('Subsets', { selector: 'button' }));
        fireEvent.change(screen.getByLabelText('Find supersets of a raga'), { target: { value: 'durga' } });

        const names = subsetNames();
        expect(names.length).toBeGreaterThan(0);
        names.forEach(n => expect(n.toLowerCase()).toContain('durga'));
        expect(screen.getAllByText('Found in these larger ragas:').length).toBe(names.length);
    });
});
