
import type { ProgressUpdate, RequestSplitterOutput, RequestSplitterSettings } from '../types';
import { generateText } from './geminiService';
import { REQUEST_SPLITTER_PROMPT_TEMPLATE } from '../constants';

export const processRequestSplitting = async (
    spec: string,
    settings: RequestSplitterSettings,
    onProgress: (update: ProgressUpdate) => void
): Promise<RequestSplitterOutput> => {
    if (!spec) {
        throw new Error("Input specification is empty.");
    }

    onProgress({
        stage: 'Initializing Splitter',
        percentage: 10,
        message: `Configuring splitter with persona: ${settings.persona}...`,
    });

    const masterPrompt = REQUEST_SPLITTER_PROMPT_TEMPLATE(spec, settings);

    onProgress({
        stage: 'Decomposing Request',
        percentage: 30,
        message: 'The AI is analyzing the spec and extracting invariants...',
        thinkingHint: 'This is a complex decomposition task and may take some time.'
    });

    const rawJsonResult = await generateText(masterPrompt);
    
    onProgress({
        stage: 'Parsing Response',
        percentage: 90,
        message: 'Parsing the structured prompts and plan from the AI...',
    });

    try {
        const parsedResponse = JSON.parse(rawJsonResult);

        if (!parsedResponse.orderedPromptsMd || !parsedResponse.splitPlanJson) {
            console.error("Invalid response structure from splitter engine:", parsedResponse);
            throw new Error("The AI returned an invalid or incomplete data structure. Expected 'orderedPromptsMd' and 'splitPlanJson' keys.");
        }
        
        onProgress({ stage: 'Completed', percentage: 100, message: 'Request splitting complete.' });
        
        return {
            orderedPromptsMd: parsedResponse.orderedPromptsMd,
            splitPlanJson: parsedResponse.splitPlanJson,
        };

    } catch (e) {
        console.error("Failed to parse JSON response from splitter engine:", e);
        console.log("Raw response from AI:", rawJsonResult);
        throw new Error(`Failed to parse the response from the AI. The data might be malformed. See console for raw output.`);
    }
};
