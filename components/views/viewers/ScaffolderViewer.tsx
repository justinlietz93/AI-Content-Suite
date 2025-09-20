

import React, { useEffect, useRef, useState } from 'react';
import type { ScaffolderOutput, ScaffoldTreeItem } from '../../../types';
import { ChevronRightIcon } from '../../icons/ChevronRightIcon';
import { enhanceCodeBlocks } from '../../../utils/uiUtils';
import { ScaffoldGraphView } from './ScaffoldGraphView';

declare var marked: any;


interface FileTreeNodeProps {
  path: string;
  children: React.ReactNode;
  level: number;
}

const FileTreeNode: React.FC<FileTreeNodeProps> = ({ path, children, level }) => {
    const [isOpen, setIsOpen] = useState(level < 2);
    const isDirectory = !!children;

    return (
        <div>
            <div
                className={`flex items-center p-1 rounded cursor-pointer hover:bg-muted ${isDirectory ? '' : 'text-sky-300'}`}
                style={{ paddingLeft: `${level * 1.25}rem` }}
                onClick={() => isDirectory && setIsOpen(!isOpen)}
            >
                {isDirectory && (
                    <ChevronRightIcon className={`w-4 h-4 mr-1 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                )}
                <span className="truncate">{path.split('/').pop()}</span>
            </div>
            {isOpen && isDirectory && (
                <div>{children}</div>
            )}
        </div>
    );
};

const buildFileTree = (files: ScaffoldTreeItem[], onFileClick: (file: ScaffoldTreeItem) => void) => {
    const root: any = {};
    files.forEach(file => {
        file.path.split('/').reduce((acc, part, index, arr) => {
            if (!acc[part]) acc[part] = {};
            if (index === arr.length - 1) acc[part].__file = file;
            return acc[part];
        }, root);
    });

    const renderTree = (node: any, pathParts: string[] = [], level = 0): JSX.Element[] => {
        return Object.entries(node).map(([key, value]: [string, any]) => {
            if (key === '__file') return null;
            const currentPath = [...pathParts, key].join('/');
            
            if (value.__file) { // It's a file
                return (
                     <div key={currentPath} style={{ paddingLeft: `${level * 1.25}rem` }} 
                        className="flex items-center p-1 rounded cursor-pointer hover:bg-muted text-sky-300"
                        onClick={() => onFileClick(value.__file)}
                     >
                        <span className="truncate">{key}</span>
                    </div>
                );
            } else { // It's a directory
                 return (
                    <FileTreeNode key={currentPath} path={currentPath} level={level}>
                        {renderTree(value, [...pathParts, key], level + 1)}
                    </FileTreeNode>
                );
            }
        }).filter(Boolean) as JSX.Element[];
    };
    return renderTree(root);
};


export const ScaffolderViewer: React.FC<{ output: ScaffolderOutput }> = ({ output }) => {
    const [activeTab, setActiveTab] = useState<'tree' | 'graph' | 'plan' | 'script'>('tree');
    const [selectedFile, setSelectedFile] = useState<ScaffoldTreeItem | null>(null);
    const promptDisplayRef = useRef<HTMLDivElement>(null);
    const scriptDisplayRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (output?.scaffoldPlanJson?.tree?.length > 0 && !selectedFile) {
            setSelectedFile(output.scaffoldPlanJson.tree[0]);
        }
    }, [output, selectedFile]);

    useEffect(() => {
        if (selectedFile && promptDisplayRef.current && typeof marked !== 'undefined') {
            const formattedPrompt = selectedFile.prompt.replace(/\\n/g, '\n');
            const markdownContent = `\`\`\`javascript\n${formattedPrompt}\n\`\`\``;
            promptDisplayRef.current.innerHTML = marked.parse(markdownContent);
            enhanceCodeBlocks(promptDisplayRef.current);
        }
    }, [selectedFile]);

    useEffect(() => {
        if (activeTab === 'script' && scriptDisplayRef.current && typeof marked !== 'undefined') {
            const lang = output.scaffoldPlanJson.project.language === 'python' ? 'python' : 'bash';
            const markdownContent = `\`\`\`${lang}\n${output.scaffoldScript}\n\`\`\``;
            scriptDisplayRef.current.innerHTML = marked.parse(markdownContent);
            enhanceCodeBlocks(scriptDisplayRef.current);
        }
    }, [activeTab, output.scaffoldScript, output.scaffoldPlanJson.project.language]);

    const TABS = [ { id: 'tree', label: 'File Tree & Prompts' }, { id: 'graph', label: 'Scaffold Graph' }, { id: 'plan', label: 'Plan (JSON)' }, { id: 'script', label: 'Script' } ];

    return (
        <div className="space-y-6">
            {output.processingTimeSeconds !== undefined && (<div className="text-center text-sm text-text-secondary">Processing completed in {output.processingTimeSeconds} seconds.</div>)}
            <div>
                 <div className="flex border-b border-border-color mb-4" role="tablist">
                    {TABS.map((tab) => (
                        <button key={tab.id} role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id as any)}
                            className={`px-4 py-2 font-medium text-sm focus:outline-none transition-colors duration-150 ${ activeTab === tab.id ? 'border-b-2 border-primary text-primary' : 'text-text-secondary hover:text-text-primary' }`}
                        >{tab.label}</button>
                    ))}
                </div>
                
                <div className="p-1">
                    {activeTab === 'tree' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[60vh]">
                            <div className="md:col-span-1 bg-background rounded-lg p-2 max-h-[60vh] overflow-y-auto">
                                {buildFileTree(output.scaffoldPlanJson.tree, setSelectedFile)}
                            </div>
                            <div className="md:col-span-2 bg-secondary rounded-lg p-4 max-h-[60vh] overflow-y-auto shadow-inner">
                                {selectedFile ? (
                                    <>
                                        <h3 className="font-mono text-sm text-sky-300 break-all">{selectedFile.path}</h3>
                                        <p className="text-xs text-slate-400 mt-1 mb-3">Layer: {selectedFile.layer}</p>
                                        <div ref={promptDisplayRef} className="prose prose-sm prose-invert max-w-none"></div>
                                    </>
                                ) : (
                                    <p className="text-slate-400">Select a file from the tree to view its prompt.</p>
                                )}
                            </div>
                        </div>
                    )}
                    {activeTab === 'graph' && (
                        <div className="p-4 bg-background rounded-lg min-h-[60vh] overflow-hidden shadow-inner">
                            <ScaffoldGraphView plan={output.scaffoldPlanJson} />
                        </div>
                    )}
                    {activeTab === 'plan' && (<div className="p-4 bg-background rounded-lg max-h-[60vh] overflow-y-auto shadow-inner"><pre className="text-xs whitespace-pre-wrap text-slate-300"><code>{JSON.stringify(output.scaffoldPlanJson, null, 2)}</code></pre></div>)}
                    {activeTab === 'script' && (<div ref={scriptDisplayRef} className="p-4 bg-background rounded-lg max-h-[60vh] overflow-y-auto shadow-inner prose prose-sm prose-invert max-w-none"></div>)}
                </div>

            </div>
        </div>
    );
};