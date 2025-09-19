import type { ProgressUpdate, PromptEnhancerOutput, PromptEnhancerSettings } from '../types';
import { generateMultiModalContent, cleanAndParseJson } from './geminiService';
import { PROMPT_ENHANCER_PROMPT_TEMPLATE } from '../constants';

export const processPromptEnhancement = async (
    settings: PromptEnhancerSettings,
    fileParts: any[], // Context from files
    onProgress: (update: ProgressUpdate) => void
): Promise<PromptEnhancerOutput> => {
    
    const combinedInput = [settings.rawPrompt, ...fileParts.map(p => `--- DOCUMENT CONTEXT: ---\n${p.text}`)].join('\n\n').trim();

    if (!combinedInput) {
        throw new Error("Prompt is empty.");
    }

    onProgress({
        stage: 'Initializing Prompt Enhancer',
        percentage: 10,
        message: `Applying template: ${settings.template}...`,
    });

    const masterPrompt = PROMPT_ENHANCER_PROMPT_TEMPLATE(combinedInput, settings.template);

    onProgress({
        stage: 'Enhancing Prompt',
        percentage: 30,
        message: 'AI is structuring and enhancing the prompt...',
        thinkingHint: 'This may take a moment...'
    });

    // The prompt enhancer is text-only for now, but using multimodal allows context files.
    const rawJsonResult = await generateMultiModalContent([{ text: masterPrompt }]);
    
    onProgress({
        stage: 'Parsing Response',
        percentage: 90,
        message: 'Parsing the structured response from the AI...',
    });

    try {
        const parsedResponse = cleanAndParseJson<{
            enhancedPromptMd: string;
            enhancedPromptJson: any;
        }>(rawJsonResult);

        if (!parsedResponse.enhancedPromptMd || !parsedResponse.enhancedPromptJson) {
            console.error("Invalid response structure from prompt enhancer:", parsedResponse);
            const error = new Error("The AI returned an invalid or incomplete data structure. Expected 'enhancedPromptMd' and 'enhancedPromptJson' keys.");
            (error as any).details = rawJsonResult;
            throw error;
        }
        
        onProgress({ stage: 'Completed', percentage: 100, message: 'Prompt enhancement complete.' });
        
        return {
            enhancedPromptMd: parsedResponse.enhancedPromptMd,
            enhancedPromptJson: parsedResponse.enhancedPromptJson,
        };

    } catch (e) {
        console.error("Failed to parse JSON response from prompt enhancer:", e);
        const error = new Error(`Failed to parse the response from the AI. The data might be malformed.`);
        (error as any).details = (e as any).details || rawJsonResult;
        throw error;
    }
};