

import type { ProgressUpdate, PromptEnhancerOutput, PromptEnhancerSettings, EnhancedPromptJson } from '../types';
import { generateText } from './geminiService';
import { PROMPT_ENHANCER_PROMPT_TEMPLATE, MAX_CONTENT_CHAR_SIZE } from '../constants';
import { processTranscript } from './summarizationService';
import { cleanAndParseJson } from '../utils';

const parseEnhancerResponse = (text: string): { enhancedPromptMd: string; enhancedPromptJson: EnhancedPromptJson } => {
    // Directly search for the tags in the raw response string. This is robust against conversational filler or markdown fences.
    const mdMatch = text.match(/<ENHANCED_MD>([\s\S]*?)<\/ENHANCED_MD>/i);
    const jsonMatch = text.match(/<ENHANCED_JSON>([\s\S]*?)<\/ENHANCED_JSON>/i);

    if (!mdMatch || !mdMatch[1] || !jsonMatch || !jsonMatch[1]) {
        const error = new Error("Invalid response format from prompt enhancer. Missing required <ENHANCED_MD> or <ENHANCED_JSON> tags.");
        (error as any).details = text; // Attach original, unmodified text
        throw error;
    }
    
    const enhancedPromptMd = mdMatch[1].trim();
    const jsonRaw = jsonMatch[1].trim();
    
    try {
        const enhancedPromptJson = cleanAndParseJson<EnhancedPromptJson>(jsonRaw);
        return { enhancedPromptMd, enhancedPromptJson };
    } catch (e) {
        // Re-throw the parsing error but ensure the original raw text is attached for debugging.
        const parseError = new Error(`Failed to parse the response from the AI. The data might be malformed.`);
        (parseError as any).details = (e as any).details || text;
        throw parseError;
    }
};


export const processPromptEnhancement = async (
    settings: PromptEnhancerSettings,
    fileParts: any[], // Context from files
    onProgress: (update: ProgressUpdate) => void,
    signal?: AbortSignal
): Promise<PromptEnhancerOutput> => {
    
    const fileContent = (fileParts || []).map(p => p.text || '').join('\n\n');
    let finalRawPrompt = [settings.rawPrompt, fileContent].join('\n\n').trim();

    if (!finalRawPrompt) {
        throw new Error("Raw prompt for enhancement is empty.");
    }

    if (signal?.aborted) throw new DOMException('Aborted by user', 'AbortError');

    if (finalRawPrompt.length > MAX_CONTENT_CHAR_SIZE) {
        onProgress({
            stage: 'Preprocessing Input',
            percentage: 5,
            message: 'Input prompt/context is very large. Summarizing...',
            thinkingHint: 'Condensing content to fit model context.'
        });
        
        const summaryOutput = await processTranscript(
            finalRawPrompt,
            (summaryProgress) => {
                const remappedPercentage = 5 + (summaryProgress.percentage * 0.15); // 5% -> 20%
                onProgress({ ...summaryProgress, stage: 'Preprocessing Input', percentage: remappedPercentage });
            },
            true, 
            'default',
            signal
        );
        
        finalRawPrompt = `
        The user provided a very large context, which has been summarized below.
        Base your prompt enhancement primarily on this summary.

        --- SUMMARY OF USER CONTEXT ---
        ${summaryOutput.finalSummary}
        --- END SUMMARY ---
        `;
    }
    
    if (signal?.aborted) throw new DOMException('Aborted by user', 'AbortError');

    onProgress({
        stage: 'Initializing Enhancer',
        percentage: 25,
        message: `Using template: ${settings.template}...`,
    });

    const masterPrompt = PROMPT_ENHANCER_PROMPT_TEMPLATE(finalRawPrompt, settings.template);

    onProgress({
        stage: 'Enhancing Prompt',
        percentage: 40,
        message: 'The AI prompt engineer is refining your request...',
        thinkingHint: 'Adding structure and inferring details...'
    });
    
    const rawResult = await generateText(masterPrompt, { maxOutputTokens: 8192 }, signal);
    
    onProgress({
        stage: 'Parsing Response',
        percentage: 90,
        message: 'Parsing the structured prompt from the AI...',
    });

    const { enhancedPromptMd, enhancedPromptJson } = parseEnhancerResponse(rawResult);

    if (!enhancedPromptMd || !enhancedPromptJson) {
        console.error("Invalid response structure from prompt enhancer:", rawResult);
        const error = new Error("The AI returned an invalid or incomplete data structure.");
        (error as any).details = rawResult;
        throw error;
    }
    
    onProgress({ stage: 'Completed', percentage: 100, message: 'Prompt enhancement complete.' });
    
    return {
        enhancedPromptMd,
        enhancedPromptJson,
    };
};