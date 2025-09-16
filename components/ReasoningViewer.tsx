

import React, { useState, useEffect, useRef } from 'react';
import type { ReasoningOutput, ReasoningTree, ReasoningNode, ReasoningNodeType } from '../types';

declare var marked: any;
declare var mermaid: any;
declare var svgPanZoom: any;

const convertJsonToMermaid = (tree: ReasoningTree): string => {
    let mermaidStr = 'graph LR;\n\n';
    
    // Define styles for each node type
    const styles: Record<ReasoningNodeType | string, string> = {
      goal: 'fill:#6366f1,stroke:#fff,stroke-width:2px,color:#fff,font-weight:bold',
      phase: 'fill:#0ea5e9,stroke:#fff,stroke-width:1px,color:#fff',
      task: 'fill:#1e293b,stroke:#0ea5e9,stroke-width:2px,color:#fff',
      step: 'fill:#475569,stroke:#94a3b8,stroke-width:1px,color:#fff',
      correction: 'fill:#f59e0b,stroke:#fff,stroke-width:1px,color:#fff',
      'validate-pass': 'fill:#22c55e,stroke:#fff,stroke-width:2px,color:#000,font-weight:bold',
      'validate-fail': 'fill:#ef4444,stroke:#fff,stroke-width:2px,color:#fff,font-weight:bold',
    };
    for (const className in styles) {
      mermaidStr += `classDef ${className} ${styles[className]};\n`;
    }
    mermaidStr += '\n';

    const escapeTitle = (title: string) => title.replace(/"/g, '#quot;').replace(/\n/g, '<br/>');

    // Define nodes with shapes and relationships
    for (const node of tree.nodes) {
        const title = escapeTitle(node.title);
        let shapeStart = '[';
        let shapeEnd = ']';

        switch (node.type) {
            case 'goal': shapeStart = '{{'; shapeEnd = '}}'; break; // Hexagon
            case 'phase': shapeStart = '['; shapeEnd = ']'; break; // Rectangle
            case 'task': shapeStart = '(['; shapeEnd = '])'; break; // Stadium
            case 'step': shapeStart = '('; shapeEnd = ')'; break; // Circle
            case 'validate': shapeStart = '{'; shapeEnd = '}'; break; // Diamond
            case 'correction': shapeStart = '>'; shapeEnd = ']'; break; // Asymmetric
        }
        
        mermaidStr += `    ${node.id}${shapeStart}"${title}"${shapeEnd};\n`;

        if (node.type === 'validate') {
            const statusClass = node.result?.status === 'pass' ? 'validate-pass' : 'validate-fail';
            mermaidStr += `    class ${node.id} ${statusClass};\n`;
        } else {
            mermaidStr += `    class ${node.id} ${node.type};\n`;
        }

        if (node.children) {
            for (const childId of node.children) {
                // Special styling for gated edges from tasks to validation
                if (node.type === 'task' && tree.nodes.find(n => n.id === childId)?.type === 'validate') {
                    mermaidStr += `    ${node.id} -.-> ${childId};\n`;
                } else {
                    mermaidStr += `    ${node.id} --> ${childId};\n`;
                }
            }
        }
    }

    return mermaidStr;
};


export const ReasoningViewer: React.FC<{ output: ReasoningOutput }> = ({ output }) => {
    const [activeTab, setActiveTab] = useState<'response' | 'graph' | 'trace'>('response');
    const responseRef = useRef<HTMLDivElement>(null);
    const mermaidContainerRef = useRef<HTMLDivElement>(null);
    const panZoomInstanceRef = useRef<any>(null);

    useEffect(() => {
        if (activeTab === 'response' && responseRef.current && typeof marked !== 'undefined') {
            responseRef.current.innerHTML = marked.parse(output.finalResponseMd);
        }
    }, [activeTab, output.finalResponseMd]);

    useEffect(() => {
        if (panZoomInstanceRef.current) {
            panZoomInstanceRef.current.destroy();
            panZoomInstanceRef.current = null;
        }

        if (activeTab === 'graph' && mermaidContainerRef.current && typeof mermaid !== 'undefined') {
            try {
                const mermaidCode = convertJsonToMermaid(output.reasoningTreeJson);
                const uniqueId = `mermaid-graph-${Date.now()}`;
                
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
    }, [activeTab, output.reasoningTreeJson]);

    const TABS = [
        { id: 'response', label: 'Final Response' },
        { id: 'graph', label: 'Reasoning Graph' },
        { id: 'trace', label: 'Trace Viewer' },
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
                    {activeTab === 'response' && (
                        <div ref={responseRef} className="p-4 bg-secondary rounded-lg max-h-[32rem] overflow-y-auto shadow-inner prose prose-sm prose-invert max-w-none">
                            {/* Content rendered by useEffect */}
                        </div>
                    )}
                    {activeTab === 'graph' && (
                        <div className="p-4 bg-background rounded-lg min-h-[24rem] h-[60vh] overflow-hidden shadow-inner flex justify-center items-center">
                            <div ref={mermaidContainerRef} className="w-full h-full cursor-move">
                                {/* Mermaid SVG rendered here */}
                            </div>
                        </div>
                    )}
                    {activeTab === 'trace' && (
                         <div className="p-4 bg-background rounded-lg max-h-[32rem] overflow-y-auto shadow-inner">
                            <pre className="text-xs whitespace-pre-wrap text-slate-300">
                                <code>{JSON.stringify(output.reasoningTreeJson, null, 2)}</code>
                            </pre>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};