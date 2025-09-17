
import type { ProgressUpdate, ScaffolderOutput, ScaffolderSettings } from '../types';
import { generateText } from './geminiService';
import { SCAFFOLDER_PROMPT_TEMPLATE } from '../constants';

export const processScaffoldingRequest = async (
    prompt: string,
    settings: ScaffolderSettings,
    fileParts: any[], // For potential future context from files
    onProgress: (update: ProgressUpdate) => void
): Promise<ScaffolderOutput> => {
    const fileContent = fileParts.map(p => p.text || '').join('\n\n');
    const finalPrompt = [prompt, fileContent].join('\n\n').trim();

    if (!finalPrompt) {
        throw new Error("Scaffolder prompt is empty.");
    }

    onProgress({
        stage: 'Initializing Scaffolder',
        percentage: 10,
        message: `Configuring Hybrid-Clean architecture...`,
    });

    const masterPrompt = SCAFFOLDER_PROMPT_TEMPLATE(finalPrompt, settings);

    onProgress({
        stage: 'Generating Project Plan',
        percentage: 30,
        message: 'The AI architect is designing the project structure...',
        thinkingHint: 'This is a complex architectural task and may take some time.'
    });

    const rawJsonResult = await generateText(masterPrompt);
    
    onProgress({
        stage: 'Parsing Response',
        percentage: 90,
        message: 'Parsing the structured project plan and script from the AI...',
    });

    try {
        let jsonStr = rawJsonResult.trim();
        const fenceRegex = /^```(\w*)?\s*\n?([\s\S]*?)\n?\s*```$/;
        const match = jsonStr.match(fenceRegex);
        if (match && match[2]) {
            jsonStr = match[2].trim();
        }
        const parsedResponse = JSON.parse(jsonStr);

        if (!parsedResponse.scaffoldScript || !parsedResponse.scaffoldPlanJson) {
            console.error("Invalid response structure from scaffolder engine:", parsedResponse);
            throw new Error("The AI returned an invalid or incomplete data structure. Expected 'scaffoldScript' and 'scaffoldPlanJson' keys.");
        }
        
        onProgress({ stage: 'Completed', percentage: 100, message: 'Project scaffold generated successfully.' });
        
        return {
            scaffoldScript: parsedResponse.scaffoldScript,
            scaffoldPlanJson: parsedResponse.scaffoldPlanJson,
        };

    } catch (e) {
        console.error("Failed to parse JSON response from scaffolder engine:", e);
        console.log("Raw response from AI:", rawJsonResult);
        throw new Error(`Failed to parse the response from the AI. The data might be malformed. See console for raw output.`);
    }
};
