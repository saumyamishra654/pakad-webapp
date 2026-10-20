/**
 * Tests for the Raga Insights page: renders without a loading delay, and the Subsets tab
 * searches subsets and supersets separately
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
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

    it('filters the Subsets tab by subset name', () => {
        render(<RagaInsights />);
        fireEvent.click(screen.getByText('Subsets', { selector: 'button' }));
        fireEvent.change(screen.getByLabelText('Search subsets'), { target: { value: 'durga' } });
        const names = subsetNames();
        expect(names.length).toBeGreaterThan(0);
        names.forEach(n => expect(n.toLowerCase()).toContain('durga'));
    });

    it('filters the Subsets tab by superset name and lists only matching supersets', () => {
        render(<RagaInsights />);
        fireEvent.click(screen.getByText('Subsets', { selector: 'button' }));
        fireEvent.change(screen.getByLabelText('Search supersets'), { target: { value: 'yaman' } });

        const first = screen.getAllByRole('button').find(b => b.textContent.includes('found in'));
        expect(first).toBeTruthy();
        fireEvent.click(first);
        const panel = first.parentElement;
        const supersets = within(panel).getAllByText(/yaman/i, { selector: 'div.font-medium' });
        expect(supersets.length).toBeGreaterThan(0);
        expect(within(panel).getByText('Found in these larger ragas:')).toBeTruthy();
        expect(panel.querySelectorAll('div.font-medium').length).toBe(supersets.length);
    });
});
