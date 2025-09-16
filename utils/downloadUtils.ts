import type { ProcessedOutput, ReasoningOutput, ScaffolderOutput, RequestSplitterOutput, PromptEnhancerOutput, AgentDesignerOutput, ScaffolderSettings } from '../types';

/**
 * Sanitizes a string to be a valid filename.
 * @param name The string to sanitize.
 * @param fallback A fallback name if the sanitized string is empty.
 * @returns A sanitized string suitable for a filename.
 */
export const sanitizeForFilename = (name: string | undefined, fallback: string = 'download'): string => {
    if (!name || name.trim() === '') {
        return fallback;
    }
    // Replace invalid characters with underscore, collapse multiple underscores, and limit length
    return name.trim().replace(/[\s/\\?%*:|"<>]/g, '_').replace(/__+/g, '_').substring(0, 60);
};

const downloadBlob = (content: string, mimeType: string, filename: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

export const downloadReasoningArtifact = (processedData: ProcessedOutput | null, type: 'md' | 'json') => {
    if (!processedData || !('reasoningTreeJson' in processedData)) return;
    const reasoningOutput = processedData as ReasoningOutput;
    
    const content = type === 'md'
        ? reasoningOutput.finalResponseMd
        : JSON.stringify(reasoningOutput.reasoningTreeJson, null, 2);
    
    const mimeType = type === 'md' ? 'text/markdown' : 'application/json';
    const fileExtension = type;
    const baseName = sanitizeForFilename(reasoningOutput.reasoningTreeJson.project?.name, 'reasoning_output');
    const filename = `${baseName}_${type === 'md' ? 'response' : 'trace'}.${fileExtension}`;

    downloadBlob(content, mimeType, filename);
};

export const downloadScaffoldArtifact = (processedData: ProcessedOutput | null, scaffolderSettings: ScaffolderSettings, type: 'script' | 'plan') => {
    if (!processedData || !('scaffoldPlanJson' in processedData)) return;
    const scaffolderOutput = processedData as ScaffolderOutput;
    
    let content: string;
    let mimeType: string;
    let fileExtension: string;

    if (type === 'script') {
        content = scaffolderOutput.scaffoldScript;
        fileExtension = scaffolderSettings.language === 'python' ? 'py' : 'sh';
        mimeType = scaffolderSettings.language === 'python' ? 'text/x-python' : 'application/x-sh';
    } else { // plan
        content = JSON.stringify(scaffolderOutput.scaffoldPlanJson, null, 2);
        mimeType = 'application/json';
        fileExtension = 'json';
    }

    const baseName = sanitizeForFilename(scaffolderOutput.scaffoldPlanJson.project?.name, 'scaffold');
    const filename = `${baseName}_${type}.${fileExtension}`;
    
    downloadBlob(content, mimeType, filename);
};
  
export const downloadRequestSplitterArtifact = (processedData: ProcessedOutput | null, type: 'md' | 'json') => {
    if (!processedData || !('splitPlanJson' in processedData)) return;
    const splitterOutput = processedData as RequestSplitterOutput;
    
    const content = type === 'md'
        ? splitterOutput.orderedPromptsMd
        : JSON.stringify(splitterOutput.splitPlanJson, null, 2);

    const mimeType = type === 'md' ? 'text/markdown' : 'application/json';
    const fileExtension = type;
    const baseName = sanitizeForFilename(splitterOutput.splitPlanJson.project?.name, 'request_split');
    const filename = `${baseName}_${type === 'md' ? 'prompts' : 'plan'}.${fileExtension}`;
    
    downloadBlob(content, mimeType, filename);
};

export const downloadPromptEnhancerArtifact = (processedData: ProcessedOutput | null, type: 'md' | 'json') => {
    if (!processedData || !('enhancedPromptJson' in processedData)) return;
    const enhancerOutput = processedData as PromptEnhancerOutput;
    
    const content = type === 'md'
        ? enhancerOutput.enhancedPromptMd
        : JSON.stringify(enhancerOutput.enhancedPromptJson, null, 2);
    
    const mimeType = type === 'md' ? 'text/markdown' : 'application/json';
    const fileExtension = type;
    const baseName = sanitizeForFilename(enhancerOutput.enhancedPromptJson.title, 'enhanced_prompt');
    const filename = `${baseName}_${type === 'md' ? 'prompt' : 'data'}.${fileExtension}`;

    downloadBlob(content, mimeType, filename);
};
  
export const downloadAgentDesignerArtifact = (processedData: ProcessedOutput | null, type: 'md' | 'json') => {
    if (!processedData || !('designPlanJson' in processedData)) return;
    const designerOutput = processedData as AgentDesignerOutput;
    
    const content = type === 'md'
        ? designerOutput.designMarkdown
        : JSON.stringify(designerOutput.designPlanJson, null, 2);

    const mimeType = type === 'md' ? 'text/markdown' : 'application/json';
    const fileExtension = type;
    const baseName = sanitizeForFilename(designerOutput.designPlanJson.systemName, 'agent_system');
    const filename = `${baseName}_${type === 'md' ? 'design' : 'plan'}.${fileExtension}`;
    
    downloadBlob(content, mimeType, filename);
};
