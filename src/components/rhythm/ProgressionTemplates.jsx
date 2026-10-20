/**
 * ProgressionTemplates Component
 * Library of common chord progressions, rated against the current raga and
 * ordered so those matching the raga's thaat come first
 */

import React, { useMemo } from 'react';
import { PROGRESSION_TEMPLATES } from '../../data/progressionTemplates.js';
import { matchThaats, templateFit, templateToChords } from '../../utils/progressionHelpers.js';
import { getRomanNumeral } from '../../utils/romanNumerals.js';

const STATUS_ORDER = { fits: 0, close: 1, none: 2 };
const STATUS_LABEL = { fits: 'Fits', close: 'One chord outside', none: "Doesn't fit" };
const STATUS_CLASS = {
    fits: 'text-green-400 border-green-700',
    close: 'text-yellow-400 border-yellow-700',
    none: 'text-gray-400 border-gray-700'
};

function thaatHeader({ exact, containing }) {
    if (exact) return exact.mode ? `${exact.name} thaat · ${exact.mode}` : `${exact.name} thaat`;
    if (containing.length >= 10) return 'Fits every thaat';
    if (containing.length > 3) {
        const names = containing.slice(0, 3).map(t => t.name).join(', ');
        return `Within ${names} and ${containing.length - 3} more`;
    }
    if (containing.length > 0) return `Within ${containing.map(t => t.name).join(', ')}`;
    return 'No matching thaat';
}

/**
 * @param {Object} props
 * @param {{all: number[], aaroh: number[], avroh: number[]}} props.patterns - Current raga patterns
 * @param {string[]} props.labels - Swara labels by pitch class
 * @param {Function} props.onUse - Called with the template's chords
 * @param {Function} props.onPreview - Called with a chord to audition
 */
export function ProgressionTemplates({ patterns, labels, onUse, onPreview }) {
    const { header, rows } = useMemo(() => {
        const match = matchThaats(patterns.all);
        const mode = match.exact?.mode;
        const rated = PROGRESSION_TEMPLATES.map(template => ({
            template,
            fit: templateFit(template, patterns),
            suggested: !!mode && template.modes.includes(mode)
        }));
        rated.sort((a, b) =>
            (Number(b.suggested) - Number(a.suggested)) ||
            (STATUS_ORDER[a.fit.status] - STATUS_ORDER[b.fit.status])
        );
        return { header: thaatHeader(match), rows: rated };
    }, [patterns]);

    return (
        <div className="mb-4 p-4 rounded-lg border border-gray-800 bg-gray-950/50">
            <h4 className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-1">Progression templates</h4>
            <p className="text-sm text-gray-400 mb-3">{header}</p>
            <div className="flex flex-col gap-2">
                {rows.map(({ template, fit }) => (
                    <div
                        key={template.id}
                        data-testid="template-row"
                        className="flex flex-wrap items-center gap-3 p-2 rounded border border-gray-800"
                    >
                        <div className="flex-1 min-w-[12rem]">
                            <div className="flex flex-wrap items-center gap-x-2 text-sm">
                                <span className="font-medium">{template.name}</span>
                                {fit.steps.map((step, i) => {
                                    const outside = step.chord.notes.filter(pc => !patterns.all[pc]).map(pc => labels[pc]);
                                    return (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => onPreview(step.chord)}
                                            title={step.inRaga ? 'Preview chord' : `Outside the raga: ${outside.join(', ')}`}
                                            className={step.inRaga ? 'text-gray-200 hover:underline' : 'text-red-400 hover:underline'}
                                        >
                                            {getRomanNumeral(step.chord)}
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="text-xs text-gray-400">{template.description}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_CLASS[fit.status]}`}>
                            {STATUS_LABEL[fit.status]}
                        </span>
                        <button
                            type="button"
                            onClick={() => onUse(templateToChords(template))}
                            className="btn btn-sm btn-secondary"
                        >
                            Use
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
