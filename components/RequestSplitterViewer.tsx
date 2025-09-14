
import React, { useState, useEffect, useRef } from 'react';
import type { RequestSplitterOutput } from '../types';

declare var marked: any;

export const RequestSplitterViewer: React.FC<{ output: RequestSplitterOutput }> = ({ output }) => {
    const [activeTab, setActiveTab] = useState<'prompts' | 'plan'>('prompts');
    const promptsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (activeTab === 'prompts' && promptsRef.current && typeof marked !== 'undefined') {
            promptsRef.current.innerHTML = marked.parse(output.orderedPromptsMd);
        }
    }, [activeTab, output.orderedPromptsMd]);

    const TABS = [
        { id: 'prompts', label: 'Ordered Prompts (.md)' },
        { id: 'plan', label: 'Split Plan (.json)' },
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
                    {activeTab === 'prompts' && (
                        <div ref={promptsRef} className="p-4 bg-slate-800 rounded-lg max-h-[60vh] overflow-y-auto shadow-inner prose prose-sm prose-invert max-w-none">
                            {/* Content rendered by useEffect */}
                        </div>
                    )}
                    {activeTab === 'plan' && (
                         <div className="p-4 bg-slate-900 rounded-lg max-h-[60vh] overflow-y-auto shadow-inner">
                            <pre className="text-xs whitespace-pre-wrap text-slate-300">
                                <code>{JSON.stringify(output.splitPlanJson, null, 2)}</code>
                            </pre>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
