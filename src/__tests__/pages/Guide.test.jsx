/**
 * Smoke tests for the Guide page and its place in the navigation
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Guide } from '../../pages/Guide.jsx';
import { Header } from '../../components/common/Header.jsx';

describe('Guide', () => {
    it('renders every section listed in its table of contents', () => {
        render(<MemoryRouter><Guide /></MemoryRouter>);
        const toc = screen.getByRole('navigation', { name: 'On this page' });
        const links = toc.querySelectorAll('a');
        expect(links.length).toBeGreaterThan(0);
        for (const link of links) {
            const id = link.getAttribute('href').slice(1);
            expect(document.getElementById(id)).not.toBeNull();
        }
    });

    it('lists every thaat with its Western mode', () => {
        render(<MemoryRouter><Guide /></MemoryRouter>);
        expect(screen.getByText('Kafi')).toBeTruthy();
        expect(screen.getByText('Dorian')).toBeTruthy();
        expect(screen.getAllByText('No common Western name')).toHaveLength(4);
    });

    it('is linked from the header', () => {
        render(<MemoryRouter><Header /></MemoryRouter>);
        expect(screen.getByRole('link', { name: 'Guide' }).getAttribute('href')).toBe('/guide');
    });
});
