/**
 * NoteBadge Component
 * Small badge showing a note with active/inactive styling
 */

import React from 'react';
import { getDisplayLabels } from '../../utils/noteHelpers.js';

/**
 * Note badge component for displaying raga notes
 * @param {Object} props
 * @param {number} props.noteIndex - Pitch class (0-11)
 * @param {boolean} props.isActive - Whether note is present in pattern
 * @param {boolean} props.isCarnatic - Use Carnatic labels
 * @param {string} props.activeColor - Background color when active (tailwind class or hex)
 * @param {Function} props.onClick - Click handler
 * @param {string} props.size - Size variant: 'sm', 'md', 'lg'
 */
export function NoteBadge({
    noteIndex,
    isActive = true,
    isCarnatic = false,
    activeColor = 'bg-blue-500',
    onClick,
    size = 'md',
    className = ''
}) {
    const labels = getDisplayLabels(isCarnatic);
    const label = labels[noteIndex] || '';

    const sizeClasses = {
        sm: 'px-1.5 py-0.5 text-[9px]',
        md: 'px-2 py-1 text-xs',
        lg: 'px-3 py-1.5 text-sm'
    };

    const baseClasses = `
    inline-block rounded font-medium transition-all
    ${sizeClasses[size] || sizeClasses.md}
    ${onClick ? 'cursor-pointer hover:scale-105' : ''}
  `;

    const activeClasses = `
    ${activeColor.startsWith('bg-') ? activeColor : ''} 
    text-white shadow-sm
  `;

    const inactiveClasses = `
    bg-gray-200 dark:bg-gray-700 
    text-gray-400 dark:text-gray-500
  `;

    const style = activeColor.startsWith('#') && isActive
        ? { backgroundColor: activeColor }
        : {};

    return (
        <span
            className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses} ${className}`}
            style={style}
            onClick={onClick}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
        >
            {label}
        </span>
    );
}

/**
 * Render all 12 note badges from a pattern
 * @param {Object} props
 * @param {number[]} props.pattern - 12-element array of 0/1
 * @param {boolean} props.isCarnatic - Use Carnatic labels
 * @param {Function} props.onNoteClick - Called with noteIndex when clicked
 */
export function NotePatternBadges({
    pattern,
    isCarnatic = false,
    onNoteClick,
    showInactive = true,
    size = 'sm',
    className = ''
}) {
    if (!pattern) return null;

    return (
        <div className={`flex flex-wrap gap-1 ${className}`}>
            {pattern.map((isPresent, index) => {
                if (!showInactive && !isPresent) return null;

                return (
                    <NoteBadge
                        key={index}
                        noteIndex={index}
                        isActive={!!isPresent}
                        isCarnatic={isCarnatic}
                        onClick={onNoteClick ? () => onNoteClick(index) : undefined}
                        size={size}
                    />
                );
            })}
        </div>
    );
}

export default NoteBadge;
