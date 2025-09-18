

import React, { useState, useEffect, useRef } from 'react';
import type { AgentDesignerOutput } from '../types';
import { enhanceCodeBlocks } from '../utils/uiUtils';

declare var marked: any;
declare var mermaid: any;
declare var svgPanZoom: any;

export const AgentDesignerViewer: React.FC<{ output: AgentDesignerOutput }> = ({ output }) => {
    const [activeTab, setActiveTab] = useState<'markdown' | 'diagram' | 'plan'>('markdown');
    const markdownRef = useRef<HTMLDivElement>(null);
    const mermaidContainerRef = useRef<HTMLDivElement>(null);
    const panZoomInstanceRef = useRef<any>(null);

    useEffect(() => {
        if (activeTab === 'markdown' && markdownRef.current && typeof marked !== 'undefined') {
            try {
                markdownRef.current.innerHTML = marked.parse(output.designMarkdown);
                enhanceCodeBlocks(markdownRef.current);
            } catch(e) {
                console.error("Markdown parsing failed:", e);
                markdownRef.current.innerText = output.designMarkdown;
            }
        }
    }, [activeTab, output.designMarkdown]);

    useEffect(() => {
        if (panZoomInstanceRef.current) {
            panZoomInstanceRef.current.destroy();
            panZoomInstanceRef.current = null;
        }

        if (activeTab === 'diagram' && mermaidContainerRef.current && typeof mermaid !== 'undefined') {
            try {
                const mermaidCode = output.designFlowDiagram;
                const uniqueId = `mermaid-agent-design-${Date.now()}`;
                
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
                            setTimeout(() => {
                                panZoomInstanceRef.current.resize();
                                panZoomInstanceRef.current.center();
                            }, 100);
                        }
                    }
                });
            } catch (e) {
                console.error("Mermaid.js rendering failed:", e);
                if (mermaidContainerRef.current) {
                  mermaidContainerRef.current.innerHTML = `<p class="text-red-400">Error rendering diagram. See console for details.</p>`;
                }
            }
        } else if (mermaidContainerRef.current) {
            mermaidContainerRef.current.innerHTML = '';
        }
    }, [activeTab, output.designFlowDiagram]);

    const TABS = [
        { id: 'markdown', label: 'Design Overview (.md)' },
        { id: 'diagram', label: 'Flow Diagram' },
        { id: 'plan', label: 'System Plan (.json)' },
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
                    {activeTab === 'diagram' && (
                        <div className="p-4 bg-background rounded-lg min-h-[60vh] overflow-hidden shadow-inner flex justify-center items-center">
                            <div ref={mermaidContainerRef} className="w-full h-full cursor-move">
                                {/* Mermaid SVG rendered here */}
                            </div>
                        </div>
                    )}
                    {activeTab === 'plan' && (
                         <div className="p-4 bg-background rounded-lg max-h-[60vh] overflow-y-auto shadow-inner">
                            <pre className="text-xs whitespace-pre-wrap text-slate-300">
                                <code>{JSON.stringify(output.designPlanJson, null, 2)}</code>
                            </pre>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};