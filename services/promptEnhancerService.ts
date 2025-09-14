import type { ProgressUpdate, PromptEnhancerOutput, PromptEnhancerSettings } from '../types';
import { generateMultiModalContent } from './geminiService';
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
        let jsonStr = rawJsonResult.trim();
        const fenceRegex = /^```(\w*)?\s*\n?([\s\S]*?)\n?\s*```$/;
        const match = jsonStr.match(fenceRegex);
        if (match && match[2]) {
            jsonStr = match[2].trim();
        }
        const parsedResponse = JSON.parse(jsonStr);

        if (!parsedResponse.enhancedPromptMd || !parsedResponse.enhancedPromptJson) {
            console.error("Invalid response structure from prompt enhancer:", parsedResponse);
            throw new Error("The AI returned an invalid or incomplete data structure. Expected 'enhancedPromptMd' and 'enhancedPromptJson' keys.");
        }
        
        onProgress({ stage: 'Completed', percentage: 100, message: 'Prompt enhancement complete.' });
        
        return {
            enhancedPromptMd: parsedResponse.enhancedPromptMd,
            enhancedPromptJson: parsedResponse.enhancedPromptJson,
        };

    } catch (e) {
        console.error("Failed to parse JSON response from prompt enhancer:", e);
        console.log("Raw response from AI:", rawJsonResult);
        throw new Error(`Failed to parse the response from the AI. The data might be malformed. See console for raw output.`);
    }
};
