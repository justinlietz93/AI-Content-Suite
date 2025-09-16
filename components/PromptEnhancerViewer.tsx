

import React, { useState, useEffect, useRef } from 'react';
import type { PromptEnhancerOutput } from '../types';

declare var marked: any;

export const PromptEnhancerViewer: React.FC<{ output: PromptEnhancerOutput }> = ({ output }) => {
    const [activeTab, setActiveTab] = useState<'markdown' | 'json'>('markdown');
    const markdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (activeTab === 'markdown' && markdownRef.current && typeof marked !== 'undefined') {
            try {
                markdownRef.current.innerHTML = marked.parse(output.enhancedPromptMd);
            } catch(e) {
                console.error("Markdown parsing failed:", e);
                markdownRef.current.innerText = output.enhancedPromptMd;
            }
        }
    }, [activeTab, output.enhancedPromptMd]);

    const TABS = [
        { id: 'markdown', label: 'Enhanced Prompt (.md)' },
        { id: 'json', label: 'Structured Prompt (.json)' },
    ];

    return (
        <div className="space-y-6">
            {output.processingTimeSeconds !== undefined && (
                <div className="text-center text-sm text-text-secondary">
                    Processing completed in {output.processingTimeSeconds} seconds.
                </div>
            )}
            <div>
                 <div className="flex border-b border-border-color mb-4" role="tablist">
                    {TABS.map((tab) => (
                        <button key={tab.id} role="tab" aria-selected={activeTab === tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-4 py-2 font-medium text-sm focus:outline-none transition-colors duration-150 ${
                                activeTab === tab.id
                                ? 'border-b-2 border-primary text-primary'
                                : 'text-text-secondary hover:text-text-primary'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                
                <div className="p-1">
                    {activeTab === 'markdown' && (
                        <div ref={markdownRef} className="p-4 bg-secondary rounded-lg max-h-[60vh] overflow-y-auto shadow-inner prose prose-sm prose-invert max-w-none">
                            {/* Content rendered by useEffect */}
                        </div>
                    )}
                    {activeTab === 'json' && (
                         <div className="p-4 bg-background rounded-lg max-h-[60vh] overflow-y-auto shadow-inner">
                            <pre className="text-xs whitespace-pre-wrap text-slate-300">
                                <code>{JSON.stringify(output.enhancedPromptJson, null, 2)}</code>
                            </pre>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};