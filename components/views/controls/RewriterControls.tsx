

import React from 'react';
import type { RewriteLength } from '../../../types';

interface RewriterControlsProps {
    rewriteStyle: string;
    onRewriteStyleChange: (style: string) => void;
    rewriteInstructions: string;
    onRewriteInstructionsChange: (instructions: string) => void;
    rewriteLength: RewriteLength;
    onRewriteLengthChange: (length: RewriteLength) => void;
}

export const RewriterControls: React.FC<RewriterControlsProps> = ({
    rewriteStyle, onRewriteStyleChange,
    rewriteInstructions, onRewriteInstructionsChange,
    rewriteLength, onRewriteLengthChange
}) => {
    return (
        <div className="my-4 px-4 sm:px-0 space-y-4">
            <div>
                <label htmlFor="rewriteStyleInput" className="block text-sm font-medium text-text-secondary mb-1">
                    Desired Writing Style:
                </label>
                <textarea id="rewriteStyleInput" rows={2} value={rewriteStyle} onChange={(e) => onRewriteStyleChange(e.target.value)} placeholder="e.g., A witty, informal blog post; a formal, academic paper; a thrilling short story..." className="w-full px-3 py-2 bg-input border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring text-text-primary placeholder-text-secondary text-sm" />
            </div>
            <div>
                <label htmlFor="rewriteInstructionsInput" className="block text-sm font-medium text-text-secondary mb-1">
                    Other Instructions (optional):
                </label>
                <textarea id="rewriteInstructionsInput" rows={2} value={rewriteInstructions} onChange={(e) => onRewriteInstructionsChange(e.target.value)} placeholder="e.g., The target audience is children. Focus on the emotional journey. End with a surprising twist." className="w-full px-3 py-2 bg-input border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring text-text-primary placeholder-text-secondary text-sm" />
            </div>
            <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Desired Length:</label>
                <div className="flex items-center space-x-2 bg-secondary rounded-lg p-1" role="radiogroup">
                    {(['short', 'medium', 'long'] as RewriteLength[]).map(len => (
                        <button key={len} onClick={() => onRewriteLengthChange(len)} role="radio" aria-checked={rewriteLength === len} className={`flex-1 py-1.5 text-sm rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-secondary ${rewriteLength === len ? 'bg-primary text-primary-foreground font-semibold shadow' : 'text-text-secondary hover:bg-muted'}`}>
                            {len.charAt(0).toUpperCase() + len.slice(1)}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};