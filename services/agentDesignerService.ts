import type { ProgressUpdate, AgentDesignerOutput, AgentDesignerSettings } from '../types';
import { generateText, cleanAndParseJson } from './geminiService';
import { AGENT_DESIGNER_PROMPT_TEMPLATE } from '../constants';

export const processAgentDesign = async (
    settings: AgentDesignerSettings,
    fileParts: any[], // Context from files
    onProgress: (update: ProgressUpdate) => void
): Promise<AgentDesignerOutput> => {
    
    const fileContent = fileParts.map(p => p.text || '').join('\n\n');
    const finalGoal = [settings.goal, fileContent].join('\n\n').trim();

    if (!finalGoal) {
        throw new Error("Agent design goal is empty.");
    }

    onProgress({
        stage: 'Initializing System Architect',
        percentage: 10,
        message: `Designing for goal: "${finalGoal.substring(0, 50)}..."`,
    });

    const finalSettings = { ...settings, goal: finalGoal };
    const masterPrompt = AGENT_DESIGNER_PROMPT_TEMPLATE(finalSettings);

    onProgress({
        stage: 'Designing Agent System',
        percentage: 30,
        message: 'AI architect is designing the process flow and components...',
        thinkingHint: 'This is a complex design task and may take some time.'
    });
    
    const rawJsonResult = await generateText(masterPrompt);
    
    onProgress({
        stage: 'Parsing Design',
        percentage: 90,
        message: 'Parsing the structured system design from the AI...',
    });

    try {
        const parsedResponse = cleanAndParseJson<{
            designMarkdown: string;
            designPlanJson: any;
            designFlowDiagram: string;
        }>(rawJsonResult);

        if (!parsedResponse.designMarkdown || !parsedResponse.designPlanJson || !parsedResponse.designFlowDiagram) {
            console.error("Invalid response structure from agent designer:", parsedResponse);
            const error = new Error("The AI returned an invalid or incomplete data structure. Expected 'designMarkdown', 'designPlanJson', and 'designFlowDiagram' keys.");
            (error as any).details = rawJsonResult;
            throw error;
        }
        
        onProgress({ stage: 'Completed', percentage: 100, message: 'Agent system design complete.' });
        
        return {
            designMarkdown: parsedResponse.designMarkdown,
            designPlanJson: parsedResponse.designPlanJson,
            designFlowDiagram: parsedResponse.designFlowDiagram,
        };

    } catch (e) {
        console.error("Failed to parse JSON response from agent designer:", e);
        const error = new Error(`Failed to parse the response from the AI. The data might be malformed.`);
        (error as any).details = (e as any).details || rawJsonResult;
        throw error;
    }
};