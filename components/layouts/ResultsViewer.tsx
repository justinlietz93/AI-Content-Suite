

import React from 'react';
import type { ProcessedOutput, Mode, ScaffolderSettings } from '../../types';
import { SummaryViewer } from '../views/viewers/SummaryViewer';
import { ReasoningViewer } from '../views/viewers/ReasoningViewer';
import { ScaffolderViewer } from '../views/viewers/ScaffolderViewer';
import { RequestSplitterViewer } from '../views/viewers/RequestSplitterViewer';
import { PromptEnhancerViewer } from '../views/viewers/PromptEnhancerViewer';
import { AgentDesignerViewer } from '../views/viewers/AgentDesignerViewer';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { DownloadIcon } from '../icons/DownloadIcon';
import { RESET_BUTTON_TEXT } from '../../constants/uiConstants';

export interface ResultsViewerProps {
    processedData: ProcessedOutput;
    activeMode: Mode;
    scaffolderSettings: ScaffolderSettings;
    onReset: () => void;
    onOpenReportModal: () => void;
    onDownloadReasoning: (type: 'md' | 'json') => void;
    onDownloadScaffold: (type: 'script' | 'plan') => void;
    onDownloadRequestSplitter: (type: 'md' | 'json') => void;
    onDownloadPromptEnhancer: (type: 'md' | 'json') => void;
    onDownloadAgentDesigner: (type: 'md' | 'json') => void;
}

export const ResultsViewer: React.FC<ResultsViewerProps> = ({
    processedData, activeMode, scaffolderSettings,
    onReset, onOpenReportModal, onDownloadReasoning,
    onDownloadScaffold, onDownloadRequestSplitter,
    onDownloadPromptEnhancer, onDownloadAgentDesigner
}) => {
    const downloadButtonClass = "w-full px-4 py-2 bg-secondary text-text-primary font-semibold rounded-lg hover:bg-muted transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-surface flex items-center justify-center gap-2 text-sm";
    const primaryActionButtonClass = "w-full px-6 py-3 bg-secondary text-text-primary font-semibold rounded-lg hover:bg-muted transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-surface flex items-center justify-center gap-2";

    const renderViewer = () => {
        switch (activeMode) {
            case 'reasoningStudio': return <ReasoningViewer output={processedData as any} />;
            case 'scaffolder': return <ScaffolderViewer output={processedData as any} />;
            case 'requestSplitter': return <RequestSplitterViewer output={processedData as any} />;
            case 'promptEnhancer': return <PromptEnhancerViewer output={processedData as any} />;
            case 'agentDesigner': return <AgentDesignerViewer output={processedData as any} />;
            default: return <SummaryViewer output={processedData} mode={activeMode} />;
        }
    };

    const renderDownloadButtons = () => {
        switch (activeMode) {
            case 'reasoningStudio': return (
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => onDownloadReasoning('md')} className={downloadButtonClass}><DownloadIcon className="w-5 h-5" />Final (.md)</button>
                    <button onClick={() => onDownloadReasoning('json')} className={downloadButtonClass}><DownloadIcon className="w-5 h-5" />Trace (.json)</button>
                </div>
            );
            case 'scaffolder': return (
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => onDownloadScaffold('script')} className={downloadButtonClass}><DownloadIcon className="w-5 h-5" />Script</button>
                    <button onClick={() => onDownloadScaffold('plan')} className={downloadButtonClass}><DownloadIcon className="w-5 h-5" />Plan (.json)</button>
                </div>
            );
            case 'requestSplitter': return (
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => onDownloadRequestSplitter('md')} className={downloadButtonClass}><DownloadIcon className="w-5 h-5" />Prompts (.md)</button>
                    <button onClick={() => onDownloadRequestSplitter('json')} className={downloadButtonClass}><DownloadIcon className="w-5 h-5" />Plan (.json)</button>
                </div>
            );
            case 'promptEnhancer': return (
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => onDownloadPromptEnhancer('md')} className={downloadButtonClass}><DownloadIcon className="w-5 h-5" />Prompt (.md)</button>
                    <button onClick={() => onDownloadPromptEnhancer('json')} className={downloadButtonClass}><DownloadIcon className="w-5 h-5" />Data (.json)</button>
                </div>
            );
            case 'agentDesigner': return (
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => onDownloadAgentDesigner('md')} className={downloadButtonClass}><DownloadIcon className="w-5 h-5" />Design (.md)</button>
                    <button onClick={() => onDownloadAgentDesigner('json')} className={downloadButtonClass}><DownloadIcon className="w-5 h-5" />Plan (.json)</button>
                </div>
            );
            case 'chat': return null;
            default: return (
                <button onClick={onOpenReportModal} className={primaryActionButtonClass}><DownloadIcon className="w-5 h-5" />Download Report</button>
            );
        }
    };

    return (
        <div className="mt-8 animate-fade-in-scale">
            <div className="flex items-center justify-center text-green-400 mb-4">
                <CheckCircleIcon className="w-8 h-8 mr-2" aria-hidden="true" />
                <p className="text-xl font-semibold">Processing Complete!</p>
            </div>
            
            {renderViewer()}
            
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button onClick={onReset} className={primaryActionButtonClass}>
                    {RESET_BUTTON_TEXT[activeMode]}
                </button>
                {renderDownloadButtons()}
            </div>
        </div>
    );
};
