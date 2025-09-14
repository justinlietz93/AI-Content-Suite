
import type { ProgressUpdate, ReasoningOutput, ReasoningSettings } from '../types';
import { generateText, generateMultiModalContent } from './geminiService';
import { REASONING_STUDIO_PROMPT_TEMPLATE } from '../constants';

export const processReasoningRequest = async (
    prompt: string,
    settings: ReasoningSettings,
    fileParts: any[], // Pre-formatted parts for multimodal input
    onProgress: (update: ProgressUpdate) => void
): Promise<ReasoningOutput> => {
    if (!prompt) {
        throw new Error("Reasoning prompt is empty.");
    }

    onProgress({
        stage: 'Initializing Reasoning Engine',
        percentage: 10,
        message: `Configuring pipeline with persona: ${settings.persona}...`,
    });

    const masterPrompt = REASONING_STUDIO_PROMPT_TEMPLATE(prompt, settings);

    onProgress({
        stage: 'Generating Reasoning',
        percentage: 30,
        message: 'The AI is performing the hierarchical reasoning process...',
        thinkingHint: 'This is a complex, multi-step task and may take some time.'
    });

    let rawJsonResult: string;

    // Use multimodal generation if files are attached
    if (fileParts && fileParts.length > 0) {
        const promptPart = { text: masterPrompt };
        // The instruction prompt should come first
        const allParts = [promptPart, ...fileParts.map(p => ({ text: `\n\n--- PROVIDED DOCUMENT ---\n${p.text}` }))];
        rawJsonResult = await generateMultiModalContent(allParts);
    } else {
        rawJsonResult = await generateText(masterPrompt);
    }
    
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
        // The model is instructed to return a JSON object containing both artifacts.
        const parsedResponse = JSON.parse(jsonStr);

        if (!parsedResponse.finalResponseMd || !parsedResponse.reasoningTreeJson) {
            console.error("Invalid response structure from reasoning engine:", parsedResponse);
            throw new Error("The AI returned an invalid or incomplete data structure. Expected 'finalResponseMd' and 'reasoningTreeJson' keys.");
        }
        
        // Populate the exported_at field and ensure final_md is in the artifact
        parsedResponse.reasoningTreeJson.artifacts = {
            ...parsedResponse.reasoningTreeJson.artifacts,
            final_md: parsedResponse.finalResponseMd,
            exported_at: new Date().toISOString(),
        };

        onProgress({ stage: 'Completed', percentage: 100, message: 'Reasoning process complete.' });
        
        return {
            finalResponseMd: parsedResponse.finalResponseMd,
            reasoningTreeJson: parsedResponse.reasoningTreeJson,
        };

    } catch (e) {
        console.error("Failed to parse JSON response from reasoning engine:", e);
        console.log("Raw response from AI:", rawJsonResult);
        throw new Error(`Failed to parse the response from the AI. The data might be malformed. See console for raw output.`);
    }
};