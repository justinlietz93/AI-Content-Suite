

import React from 'react';
import type { Mode, ReasoningSettings, ScaffolderSettings, RequestSplitterSettings, PromptEnhancerSettings, AgentDesignerSettings, SummaryFormat, RewriteLength } from '../../types';
import { TechnicalSummarizerControls } from '../views/controls/TechnicalSummarizerControls';
import { StyleExtractorControls } from '../views/controls/StyleExtractorControls';
import { RewriterControls } from '../views/controls/RewriterControls';
import { ReasoningControls } from '../views/controls/ReasoningControls';
import { ScaffolderControls } from '../views/controls/ScaffolderControls';
import { RequestSplitterControls } from '../views/controls/RequestSplitterControls';
import { PromptEnhancerControls } from '../views/controls/PromptEnhancerControls';
import { AgentDesignerControls } from '../views/controls/AgentDesignerControls';
import { FileLoader } from '../ui/FileLoader';

// A large props object, but necessary to delegate state from App.tsx
export interface MainFormProps {
    activeMode: Mode;
    currentFiles: File[] | null;
    // Technical Summarizer Props
    summaryFormat: SummaryFormat;
    onSummaryFormatChange: (format: SummaryFormat) => void;
    summarySearchTerm: string;
    onSummarySearchTermChange: (term: string) => void;
    summaryTextInput: string;
    onSummaryTextChange: (text: string) => void;
    useHierarchical: boolean;
    onUseHierarchicalChange: (enabled: boolean) => void;
    // Style Extractor Props
    styleTarget: string;
    onStyleTargetChange: (target: string) => void;
    // Rewriter Props
    rewriteStyle: string;
    onRewriteStyleChange: (style: string) => void;
    rewriteInstructions: string;
    onRewriteInstructionsChange: (instructions: string) => void;
    rewriteLength: RewriteLength;
    onRewriteLengthChange: (length: RewriteLength) => void;
    // Reasoning Studio Props
    reasoningPrompt: string;
    onReasoningPromptChange: (prompt: string) => void;
    reasoningSettings: ReasoningSettings;
    onReasoningSettingsChange: (settings: ReasoningSettings) => void;
    // Scaffolder Props
    scaffolderPrompt: string;
    onScaffolderPromptChange: (prompt: string) => void;
    scaffolderSettings: ScaffolderSettings;
    onScaffolderSettingsChange: (settings: ScaffolderSettings) => void;
    // Request Splitter Props
    requestSplitterSpec: string;
    onRequestSplitterSpecChange: (spec: string) => void;
    requestSplitterSettings: RequestSplitterSettings;
    onRequestSplitterSettingsChange: (settings: RequestSplitterSettings) => void;
    // Prompt Enhancer Props
    promptEnhancerSettings: PromptEnhancerSettings;
    onPromptEnhancerSettingsChange: (settings: PromptEnhancerSettings) => void;
    // Agent Designer Props
    agentDesignerSettings: AgentDesignerSettings;
    onAgentDesignerSettingsChange: (settings: AgentDesignerSettings) => void;
    // File Loader Prop
    onFileSelect: (files: File[]) => void;
}

export const MainForm: React.FC<MainFormProps> = (props) => {
    
    const renderControls = () => {
        switch (props.activeMode) {
            case 'technical':
                return <TechnicalSummarizerControls
                    summaryFormat={props.summaryFormat} onSummaryFormatChange={props.onSummaryFormatChange}
                    summarySearchTerm={props.summarySearchTerm} onSummarySearchTermChange={props.onSummarySearchTermChange}
                    summaryTextInput={props.summaryTextInput} onSummaryTextChange={props.onSummaryTextChange}
                    useHierarchical={props.useHierarchical} onUseHierarchicalChange={props.onUseHierarchicalChange}
                />;
            case 'styleExtractor':
                return <StyleExtractorControls styleTarget={props.styleTarget} onStyleTargetChange={props.onStyleTargetChange} />;
            case 'rewriter':
                return <RewriterControls 
                    rewriteStyle={props.rewriteStyle} onRewriteStyleChange={props.onRewriteStyleChange}
                    rewriteInstructions={props.rewriteInstructions} onRewriteInstructionsChange={props.onRewriteInstructionsChange}
                    rewriteLength={props.rewriteLength} onRewriteLengthChange={props.onRewriteLengthChange}
                />;
            case 'mathFormatter':
                 // No specific controls for mathFormatter, just the file loader
                return null;
            case 'reasoningStudio':
                return <ReasoningControls prompt={props.reasoningPrompt} onPromptChange={props.onReasoningPromptChange} settings={props.reasoningSettings} onSettingsChange={props.onReasoningSettingsChange} />;
            case 'scaffolder':
                return <ScaffolderControls prompt={props.scaffolderPrompt} onPromptChange={props.onScaffolderPromptChange} settings={props.scaffolderSettings} onSettingsChange={props.onScaffolderSettingsChange} />;
            case 'requestSplitter':
                return <RequestSplitterControls spec={props.requestSplitterSpec} onSpecChange={props.onRequestSplitterSpecChange} settings={props.requestSplitterSettings} onSettingsChange={props.onRequestSplitterSettingsChange} />;
            case 'promptEnhancer':
                return <PromptEnhancerControls settings={props.promptEnhancerSettings} onSettingsChange={props.onPromptEnhancerSettingsChange} />;
            case 'agentDesigner':
                return <AgentDesignerControls settings={props.agentDesignerSettings} onSettingsChange={props.onAgentDesignerSettingsChange} />;
            default:
                return null;
        }
    }

    return (
        <div className="animate-fade-in-scale flex h-full flex-col flex-1 min-h-0 gap-6">
            <div className="flex-1 min-h-0 overflow-y-auto space-y-6 pr-1">
                {renderControls()}
            </div>
            <FileLoader onFileSelect={props.onFileSelect} selectedFiles={props.currentFiles} mode={props.activeMode} />
        </div>
    );
};
