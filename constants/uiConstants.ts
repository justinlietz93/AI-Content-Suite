
import type { Mode } from '../types';

export const TABS = [
    { id: 'technical', label: 'Technical Summarizer' },
    { id: 'styleExtractor', label: 'Style Extractor' },
    { id: 'rewriter', label: 'Rewriter' },
    { id: 'mathFormatter', label: 'Math Formatter' },
    { id: 'reasoningStudio', label: 'Reasoning Studio' },
    { id: 'scaffolder', label: 'Project Scaffolder' },
    { id: 'requestSplitter', label: 'Request Splitter' },
    { id: 'promptEnhancer', label: 'Prompt Enhancer' },
    { id: 'agentDesigner', label: 'Agent Designer' },
    { id: 'chat', label: 'LLM Chat' },
];

export const DESCRIPTION_TEXT: Record<Mode, string> = {
    technical: "Upload files, or paste text below, to get a concise summary and key highlights.",
    styleExtractor: "Upload one or more text or PDF files to analyze and extract a unique writing style model.",
    rewriter: "Upload documents, PDFs, and images, provide a style and instructions, and rewrite them into a new narrative.",
    mathFormatter: "Upload one or more LaTeX/Markdown or PDF documents to reformat mathematical notations for proper MathJax rendering.",
    reasoningStudio: "Input a complex goal, configure the reasoning pipeline, and receive a polished answer with a full, interactive reasoning trace.",
    scaffolder: "Describe a project to generate a complete, standards-compliant code scaffold with prompts for an AI coding agent.",
    requestSplitter: "Input a large specification to decompose it into a sequence of actionable, buildable implementation prompts.",
    promptEnhancer: "Take a raw request and transform it into a structured, agent-ready prompt using reusable templates.",
    agentDesigner: "Design a multi-agent system by defining a high-level goal and configuring its operational parameters.",
    chat: "Engage in an interactive, streaming conversation with the AI. Add context files via drag-and-drop.",
};

export const getButtonText = (mode: Mode, fileCount: number, summaryTextInput: string, reasoningPrompt: string, scaffolderPrompt: string, requestSplitterSpec: string, promptEnhancerRawPrompt: string, agentDesignerGoal: string): string => {
    switch (mode) {
        case 'technical':
            return summaryTextInput.trim() ? 'Summarize Text' : (fileCount > 0 ? `Summarize ${fileCount} file(s)` : 'Summarize');
        case 'styleExtractor':
            return fileCount > 0 ? `Extract Style from ${fileCount} file(s)` : 'Extract Style';
        case 'rewriter':
            return fileCount > 0 ? `Rewrite ${fileCount} item(s)` : 'Rewrite';
        case 'mathFormatter':
            return fileCount > 0 ? `Format ${fileCount} file(s)` : 'Format Math';
        case 'reasoningStudio':
            return 'Run Reasoning Engine';
        case 'scaffolder':
            return 'Generate Project Scaffold';
        case 'requestSplitter':
            return 'Split Request';
        case 'promptEnhancer':
            return 'Enhance Prompt';
        case 'agentDesigner':
            return 'Design Agent System';
        case 'chat':
             return 'Send'; // Note: Chat mode uses a separate button, but this is a fallback.
        default:
            return 'Submit';
    }
}

export const RESET_BUTTON_TEXT: Record<Mode, string> = {
    technical: 'Summarize Another',
    styleExtractor: 'Extract Another',
    rewriter: 'Rewrite Another',
    mathFormatter: 'Format Another',
    reasoningStudio: 'New Reasoning Task',
    scaffolder: 'New Project Scaffold',
    requestSplitter: 'New Split Request',
    promptEnhancer: 'Enhance Another Prompt',
    agentDesigner: 'Design Another Agent',
    chat: 'New Chat',
}
