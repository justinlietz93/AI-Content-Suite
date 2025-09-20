

import React, { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import type { RequestSplitterOutput, SplitPlanPrompt } from '../../../types';
import { enhanceCodeBlocks } from '../../../utils/uiUtils';

declare var marked: any;

interface NodePosition {
  x: number;
  y: number;
  width: number;
  height: number;
  cx: number;
  cy: number;
}

const CustomGraphViewer: React.FC<{ prompts: SplitPlanPrompt[] }> = ({ prompts }) => {
    const [nodePositions, setNodePositions] = useState<Map<number, NodePosition>>(new Map());
    const nodeRefs = useRef<Map<number, HTMLDivElement>>(new Map());
    const containerRef = useRef<HTMLDivElement>(null);

    const graphLayout = useMemo(() => {
        const levels: number[][] = [];
        const nodeLevels = new Map<number, number>();
        let nodes = [...prompts];
        let level = 0;

        while(nodes.length > 0) {
            const currentLevelNodes = nodes.filter(node => 
                (node.dependencies || []).every(depId => nodeLevels.has(depId))
            );
            
            if(currentLevelNodes.length === 0 && nodes.length > 0) {
                console.error("Circular dependency or missing node detected in graph layout.", nodes);
                // As a fallback, place remaining nodes in the next level
                levels.push(nodes.map(n => n.id));
                nodes.forEach(n => nodeLevels.set(n.id, level));
                break;
            }

            levels[level] = currentLevelNodes.map(n => n.id);
            currentLevelNodes.forEach(n => nodeLevels.set(n.id, level));
            nodes = nodes.filter(n => !nodeLevels.has(n.id));
            level++;
        }
        return { levels, nodeLevels };
    }, [prompts]);
    
    useLayoutEffect(() => {
        const newPositions = new Map<number, NodePosition>();
        let allNodesMeasured = true;
        
        for (const prompt of prompts) {
            const el = nodeRefs.current.get(prompt.id);
            if (el && containerRef.current) {
                const rect = el.getBoundingClientRect();
                const containerRect = containerRef.current.getBoundingClientRect();
                
                const position = {
                    x: rect.left - containerRect.left + containerRef.current.scrollLeft,
                    y: rect.top - containerRect.top + containerRef.current.scrollTop,
                    width: rect.width,
                    height: rect.height,
                    cx: rect.left - containerRect.left + containerRef.current.scrollLeft + rect.width / 2,
                    cy: rect.top - containerRect.top + containerRef.current.scrollTop + rect.height / 2,
                };
                newPositions.set(prompt.id, position);
            } else {
                allNodesMeasured = false;
            }
        }

        if (allNodesMeasured && newPositions.size > 0 && newPositions.size !== nodePositions.size) {
            setNodePositions(newPositions);
        }
    }, [prompts, graphLayout]);

    const ConnectorLine: React.FC<{ d: string }> = ({ d }) => (
        <path d={d} stroke="#475569" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" />
    );

    const connectors = useMemo(() => {
        if (nodePositions.size === 0) return [];
        const lines: JSX.Element[] = [];
        
        prompts.forEach(prompt => {
            const endPos = nodePositions.get(prompt.id);
            if (!endPos) return;

            (prompt.dependencies || []).forEach(depId => {
                const startPos = nodePositions.get(depId);
                if (!startPos) return;

                const startX = startPos.x + startPos.width;
                const startY = startPos.cy;
                const endX = endPos.x;
                const endY = endPos.cy;
                
                // Simple Bezier curve for connectors
                const d = `M ${startX} ${startY} C ${startX + 60} ${startY}, ${endX - 60} ${endY}, ${endX} ${endY}`;
                lines.push(<ConnectorLine key={`${depId}-${prompt.id}`} d={d} />);
            });
        });
        return lines;
    }, [nodePositions, prompts]);

    return (
        <div ref={containerRef} className="relative p-8 min-h-[60vh]">
            <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                <defs>
                    <marker id="arrowhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="#475569" />
                    </marker>
                </defs>
                {connectors}
            </svg>
            <div className="flex items-start justify-start gap-24 relative" style={{ zIndex: 1 }}>
                {graphLayout.levels.map((levelIds, levelIndex) => (
                    <div key={levelIndex} className="flex flex-col items-center gap-8 min-w-48">
                        {levelIds.map(id => {
                            const prompt = prompts.find(p => p.id === id);
                            if (!prompt) return null;
                            return (
                                <div
                                    key={id}
                                    ref={el => {
                                        if (el) {
                                            nodeRefs.current.set(id, el);
                                        } else {
                                            nodeRefs.current.delete(id);
                                        }
                                    }}
                                    className="bg-secondary border-2 border-primary rounded-lg p-3 w-full max-w-xs text-center shadow-lg transition-transform hover:scale-105"
                                >
                                    <span className="block text-xs font-mono text-sky-400 mb-1 tracking-wider">[#{prompt.id.toString().padStart(2, '0')}]</span>
                                    <h3 className="text-sm font-semibold text-text-primary">{prompt.title}</h3>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
};


export const RequestSplitterViewer: React.FC<{ output: RequestSplitterOutput }> = ({ output }) => {
    const [activeTab, setActiveTab] = useState<'visual' | 'prompts' | 'raw'>('visual');
    const promptsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (activeTab === 'prompts' && promptsRef.current && typeof marked !== 'undefined') {
            try {
                promptsRef.current.innerHTML = marked.parse(output.orderedPromptsMd);
                enhanceCodeBlocks(promptsRef.current);
            } catch(e) {
                console.error("Markdown parsing failed:", e);
                promptsRef.current.innerText = output.orderedPromptsMd;
            }
        }
    }, [activeTab, output.orderedPromptsMd]);

    const TABS = [
        { id: 'visual', label: 'Visual Plan' },
        { id: 'prompts', label: 'Ordered Prompts (.md)' },
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
                        <div ref={promptsRef} className="p-4 bg-secondary rounded-lg max-h-[60vh] overflow-y-auto shadow-inner prose prose-sm prose-invert max-w-none">
                            {/* Content rendered by useEffect */}
                        </div>
                    )}
                    {activeTab === 'visual' && (
                        <div className="bg-background rounded-lg max-h-[60vh] overflow-auto shadow-inner">
                           {output.splitPlanJson.prompts && output.splitPlanJson.prompts.length > 0 ? (
                                <CustomGraphViewer prompts={output.splitPlanJson.prompts} />
                           ) : (
                                <div className="flex items-center justify-center h-full min-h-[20rem]">
                                    <p className="text-text-secondary">No visual plan could be generated.</p>
                                </div>
                           )}
                        </div>
                    )}
                    {activeTab === 'raw' && (
                         <div className="p-4 bg-background rounded-lg max-h-[60vh] overflow-y-auto shadow-inner">
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