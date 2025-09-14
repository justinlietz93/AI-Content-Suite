
import React, { useState, useEffect, useRef } from 'react';
import type { RequestSplitterOutput, SplitPlanJson } from '../types';

declare var marked: any;
declare var mermaid: any;
declare var svgPanZoom: any;

const convertSplitPlanToMermaid = (plan: SplitPlanJson): string => {
    let mermaidStr = 'graph TD;\n\n';
    const { prompts } = plan;

    if (!prompts || prompts.length === 0) {
        mermaidStr += '    A["No prompts generated in the plan."];\n';
        return mermaidStr;
    }

    // Define nodes
    prompts.forEach(prompt => {
        const nodeId = `P${prompt.id}`;
        // Escape quotes and special characters for mermaid label
        const title = prompt.title.replace(/"/g, '#quot;').replace(/\n/g, '<br/>');
        mermaidStr += `    ${nodeId}["[#${prompt.id}]<br/>${title}"];\n`;
    });

    // Define links sequentially
    for (let i = 0; i < prompts.length - 1; i++) {
        const fromNodeId = `P${prompts[i].id}`;
        const toNodeId = `P${prompts[i+1].id}`;
        mermaidStr += `    ${fromNodeId} --> ${toNodeId};\n`;
    }

    return mermaidStr;
};


export const RequestSplitterViewer: React.FC<{ output: RequestSplitterOutput }> = ({ output }) => {
    const [activeTab, setActiveTab] = useState<'prompts' | 'visual' | 'raw'>('prompts');
    const promptsRef = useRef<HTMLDivElement>(null);
    const mermaidContainerRef = useRef<HTMLDivElement>(null);
    const panZoomInstanceRef = useRef<any>(null);

    useEffect(() => {
        if (activeTab === 'prompts' && promptsRef.current && typeof marked !== 'undefined') {
            promptsRef.current.innerHTML = marked.parse(output.orderedPromptsMd);
        }
    }, [activeTab, output.orderedPromptsMd]);

    useEffect(() => {
        if (panZoomInstanceRef.current) {
            panZoomInstanceRef.current.destroy();
            panZoomInstanceRef.current = null;
        }

        if (activeTab === 'visual' && mermaidContainerRef.current && typeof mermaid !== 'undefined') {
            try {
                const mermaidCode = convertSplitPlanToMermaid(output.splitPlanJson);
                const uniqueId = `mermaid-splitter-graph-${Date.now()}`;
                
                mermaid.render(uniqueId, mermaidCode, (svgCode) => {
                    if (mermaidContainerRef.current) {
                        mermaidContainerRef.current.innerHTML = svgCode;
                        const svgElement = mermaidContainerRef.current.querySelector('svg');
                        if (svgElement && typeof svgPanZoom !== 'undefined') {
                            svgElement.style.width = '100%';
                            svgElement.style.height = '100%';
                            panZoomInstanceRef.current = svgPanZoom(svgElement, {
                                panEnabled: true, controlIconsEnabled: true, zoomEnabled: true,
                                dblClickZoomEnabled: true, mouseWheelZoomEnabled: true,
                                preventMouseEventsDefault: true, zoomScaleSensitivity: 0.2,
                                minZoom: 0.1, maxZoom: 10, fit: true, center: true, contain: true,
                            });
                            // Force resize after a short delay to ensure proper rendering
                            setTimeout(() => {
                                if (panZoomInstanceRef.current) {
                                    panZoomInstanceRef.current.resize();
                                    panZoomInstanceRef.current.center();
                                }
                            }, 100);
                        }
                    }
                });
            } catch (e) {
                console.error("Mermaid.js rendering failed for Split Plan:", e);
                if (mermaidContainerRef.current) {
                  mermaidContainerRef.current.innerHTML = `<p class="text-red-400">Error rendering diagram. See console for details.</p>`;
                }
            }
        } else if (mermaidContainerRef.current) {
            mermaidContainerRef.current.innerHTML = '';
        }
    }, [activeTab, output.splitPlanJson]);


    const TABS = [
        { id: 'prompts', label: 'Ordered Prompts (.md)' },
        { id: 'visual', label: 'Visual Plan' },
        { id: 'raw', label: 'Raw Plan (.json)' },
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
                    {activeTab === 'visual' && (
                        <div className="p-4 bg-slate-900 rounded-lg min-h-[24rem] h-[60vh] overflow-hidden shadow-inner flex justify-center items-center">
                            <div ref={mermaidContainerRef} className="w-full h-full cursor-move">
                                {/* Mermaid SVG rendered here */}
                            </div>
                        </div>
                    )}
                    {activeTab === 'raw' && (
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
