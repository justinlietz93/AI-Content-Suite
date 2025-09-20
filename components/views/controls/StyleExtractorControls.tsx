

import React from 'react';

interface StyleExtractorControlsProps {
    styleTarget: string;
    onStyleTargetChange: (target: string) => void;
}

export const StyleExtractorControls: React.FC<StyleExtractorControlsProps> = ({ styleTarget, onStyleTargetChange }) => {
    return (
        <div className="my-4 px-4 sm:px-0">
            <label htmlFor="styleTargetInput" className="block text-sm font-medium text-text-secondary mb-1">
                Specify Person/Character for Style Analysis (optional):
            </label>
            <input
                type="text"
                id="styleTargetInput"
                value={styleTarget}
                onChange={(e) => onStyleTargetChange(e.target.value)}
                placeholder='e.g., Narrator, "John Doe", or leave blank for overall style'
                className="w-full px-3 py-2 bg-input border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring text-text-primary placeholder-text-secondary text-sm"
                aria-describedby="styleTargetDescription"
            />
            <p id="styleTargetDescription" className="mt-1 text-xs text-text-secondary">
                If left blank or "all", the overall style of the text will be analyzed.
            </p>
        </div>
    );
};