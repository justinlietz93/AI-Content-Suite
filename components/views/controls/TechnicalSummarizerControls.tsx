

import React, { useMemo } from 'react';
import type { SummaryFormat } from '../../../types';
import { SUMMARY_FORMAT_OPTIONS } from '../../../data/summaryFormats';
import { HierarchicalToggle } from '../../ui/HierarchicalToggle';

interface TechnicalSummarizerControlsProps {
    summaryFormat: SummaryFormat;
    onSummaryFormatChange: (format: SummaryFormat) => void;
    summarySearchTerm: string;
    onSummarySearchTermChange: (term: string) => void;
    summaryTextInput: string;
    onSummaryTextChange: (text: string) => void;
    useHierarchical: boolean;
    onUseHierarchicalChange: (enabled: boolean) => void;
}

export const TechnicalSummarizerControls: React.FC<TechnicalSummarizerControlsProps> = ({
    summaryFormat, onSummaryFormatChange,
    summarySearchTerm, onSummarySearchTermChange,
    summaryTextInput, onSummaryTextChange,
    useHierarchical, onUseHierarchicalChange
}) => {
    const filteredSummaryFormats = useMemo(() => {
        if (!summarySearchTerm.trim()) {
            return SUMMARY_FORMAT_OPTIONS;
        }
        const lowercasedTerm = summarySearchTerm.toLowerCase();
        return SUMMARY_FORMAT_OPTIONS.filter(format =>
            format.label.toLowerCase().includes(lowercasedTerm) ||
            format.tags.some(tag => tag.toLowerCase().includes(lowercasedTerm))
        );
    }, [summarySearchTerm]);

    const selectedFormatDescription = useMemo(() => {
        return SUMMARY_FORMAT_OPTIONS.find(f => f.value === summaryFormat)?.description || '';
    }, [summaryFormat]);
    
    return (
        <>
            <div className="my-4 px-4 sm:px-0">
                <label htmlFor="summaryFormatSelect" className="block text-sm font-medium text-text-secondary mb-1">
                    Summary Format:
                </label>
                <input
                    type="search"
                    placeholder="Search formats by name or tag (e.g., table, project)..."
                    value={summarySearchTerm}
                    onChange={(e) => onSummarySearchTermChange(e.target.value)}
                    className="w-full px-3 py-2 bg-input border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring text-text-primary placeholder-text-secondary text-sm mb-2"
                    aria-controls="summaryFormatSelect"
                />
                <select
                    id="summaryFormatSelect"
                    value={summaryFormat}
                    onChange={(e) => onSummaryFormatChange(e.target.value as SummaryFormat)}
                    className="w-full px-3 py-2 bg-input border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring text-text-primary placeholder-text-secondary text-sm"
                >
                    {filteredSummaryFormats.length > 0 ? (
                        filteredSummaryFormats.map(format => (
                            <option key={format.value} value={format.value}>{format.label}</option>
                        ))
                    ) : (
                        <option disabled>No formats found for "{summarySearchTerm}"</option>
                    )}
                </select>
                <p className="mt-1 text-xs text-text-secondary">
                    {selectedFormatDescription}
                </p>
            </div>
            <div className="my-4 px-4 sm:px-0">
                <label htmlFor="summaryTextInput" className="block text-sm font-medium text-text-secondary mb-1">
                    Or Paste Text to Summarize:
                </label>
                <textarea
                    id="summaryTextInput"
                    rows={8}
                    value={summaryTextInput}
                    onChange={(e) => onSummaryTextChange(e.target.value)}
                    placeholder="Paste your transcript or document content here..."
                    className="w-full px-3 py-2 bg-input border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring text-text-primary placeholder-text-secondary text-sm"
                />
            </div>
            <HierarchicalToggle enabled={useHierarchical} onChange={onUseHierarchicalChange} />
        </>
    );
};