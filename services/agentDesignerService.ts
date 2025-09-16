
import type { ProgressUpdate, AgentDesignerOutput, AgentDesignerSettings } from '../types';
import { generateMultiModalContent } from './geminiService';
import { AGENT_DESIGNER_PROMPT_TEMPLATE } from '../constants';

export const processAgentDesign = async (
    settings: AgentDesignerSettings,
    fileParts: any[], // Context from files
    onProgress: (update: ProgressUpdate) => void
): Promise<AgentDesignerOutput> => {
    
    if (!settings.goal.trim()) {
        throw new Error("Agent design goal is empty.");
    }

    onProgress({
        stage: 'Initializing System Architect',
        percentage: 10,
        message: `Designing for goal: "${settings.goal.substring(0, 50)}..."`,
    });

    const masterPrompt = AGENT_DESIGNER_PROMPT_TEMPLATE(settings);

    onProgress({
        stage: 'Designing Agent System',
        percentage: 30,
        message: 'AI architect is designing the process flow and components...',
        thinkingHint: 'This is a complex design task and may take some time.'
    });
    
    // Combine prompt with any context from uploaded files
    const allParts = [
      { text: masterPrompt }, 
      ...fileParts.map(p => ({ text: `\n\n--- PROVIDED CONTEXT DOCUMENT ---\n${p.text}` }))
    ];

    const rawJsonResult = await generateMultiModalContent(allParts);
    
    onProgress({
        stage: 'Parsing Design',
        percentage: 90,
        message: 'Parsing the structured system design from the AI...',
    });

    try {
        let jsonStr = rawJsonResult.trim();
        const fenceRegex = /^```(\w*)?\s*\n?([\s\S]*?)\n?\s*```$/;
        const match = jsonStr.match(fenceRegex);
        if (match && match[2]) {
            jsonStr = match[2].trim();
        }
        const parsedResponse = JSON.parse(jsonStr);

        if (!parsedResponse.designMarkdown || !parsedResponse.designPlanJson || !parsedResponse.designFlowDiagram) {
            console.error("Invalid response structure from agent designer:", parsedResponse);
            throw new Error("The AI returned an invalid or incomplete data structure. Expected 'designMarkdown', 'designPlanJson', and 'designFlowDiagram' keys.");
        }
        
        onProgress({ stage: 'Completed', percentage: 100, message: 'Agent system design complete.' });
        
        return {
            designMarkdown: parsedResponse.designMarkdown,
            designPlanJson: parsedResponse.designPlanJson,
            designFlowDiagram: parsedResponse.designFlowDiagram,
        };

    } catch (e) {
        console.error("Failed to parse JSON response from agent designer:", e);
        console.log("Raw response from AI:", rawJsonResult);
        throw new Error(`Failed to parse the response from the AI. The data might be malformed. See console for raw output.`);
    }
};
