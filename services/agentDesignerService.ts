

import type { ProgressUpdate, AgentDesignerOutput, AgentDesignerSettings, AgentSystemPlan } from '../types';
import { generateText } from './geminiService';
import { AGENT_DESIGNER_PROMPT_TEMPLATE, MAX_CONTENT_CHAR_SIZE } from '../constants';
import { processTranscript } from './summarizationService';
import { cleanAndParseJson } from '../utils';

const parseAgentDesignResponse = (text: string): { designMarkdown: string; designPlanJson: AgentSystemPlan; designFlowDiagram: string; } => {
    // Directly search for the tags in the raw response string. This is robust against conversational filler or markdown fences.
    const mdMatch = text.match(/<DESIGN_MD>([\s\S]*?)<\/DESIGN_MD>/i);
    const diagramMatch = text.match(/<DESIGN_FLOW_DIAGRAM>([\s\S]*?)<\/DESIGN_FLOW_DIAGRAM>/i);
    const jsonMatch = text.match(/<DESIGN_PLAN_JSON>([\s\S]*?)<\/DESIGN_PLAN_JSON>/i);

    if (!mdMatch || !mdMatch[1] || !diagramMatch || !diagramMatch[1] || !jsonMatch || !jsonMatch[1]) {
        const error = new Error("Invalid response format from agent designer. Missing required <DESIGN_MD>, <DESIGN_FLOW_DIAGRAM>, or <DESIGN_PLAN_JSON> tags.");
        (error as any).details = text;
        throw error;
    }
    
    const designMarkdown = mdMatch[1].trim();
    const designFlowDiagram = diagramMatch[1].trim();
    const jsonRaw = jsonMatch[1].trim();
    
    try {
        const designPlanJson = cleanAndParseJson<AgentSystemPlan>(jsonRaw);
        return { designMarkdown, designPlanJson, designFlowDiagram };
    } catch (e) {
        const parseError = new Error(`Failed to parse the response from the AI. The data might be malformed.`);
        (parseError as any).details = (e as any).details || text;
        throw parseError;
    }
};


export const processAgentDesign = async (
    settings: AgentDesignerSettings,
    fileParts: any[], // Context from files
    onProgress: (update: ProgressUpdate) => void,
    signal?: AbortSignal
): Promise<AgentDesignerOutput> => {
    
    const fileContent = (fileParts || []).map(p => p.text || '').join('\n\n');
    let finalGoal = [settings.goal, fileContent].join('\n\n').trim();

    if (!finalGoal) {
        throw new Error("Agent design goal is empty.");
    }
    
    if (signal?.aborted) throw new DOMException('Aborted by user', 'AbortError');
    
    if (finalGoal.length > MAX_CONTENT_CHAR_SIZE) {
        onProgress({
            stage: 'Preprocessing Input',
            percentage: 5,
            message: 'Input content is very large. Summarizing to fit within model context window...',
            thinkingHint: 'This may take some time...'
        });
        
        const summaryOutput = await processTranscript(
            finalGoal,
            (summaryProgress) => {
                const remappedPercentage = 5 + (summaryProgress.percentage * 0.15);
                onProgress({ ...summaryProgress, stage: 'Preprocessing Input', percentage: remappedPercentage });
            },
            true, 
            'default',
            signal
        );
        
        finalGoal = `
        The user provided a very large goal/context, which has been summarized below.
        Base your agent design primarily on this summary.

        --- SUMMARY OF USER GOAL/CONTEXT ---
        ${summaryOutput.finalSummary}
        --- END SUMMARY ---
        `;
    }
    
    if (signal?.aborted) throw new DOMException('Aborted by user', 'AbortError');

    onProgress({
        stage: 'Initializing System Architect',
        percentage: 20,
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
    
    const rawResult = await generateText(masterPrompt, { maxOutputTokens: 16384 }, signal);
    
    onProgress({
        stage: 'Parsing Design',
        percentage: 90,
        message: 'Parsing the structured system design from the AI...',
    });

    const { designMarkdown, designPlanJson, designFlowDiagram } = parseAgentDesignResponse(rawResult);

    if (!designMarkdown || !designPlanJson || !designFlowDiagram) {
        console.error("Invalid response structure from agent designer:", rawResult);
        const error = new Error("The AI returned an invalid or incomplete data structure.");
        (error as any).details = rawResult;
        throw error;
    }
    
    onProgress({ stage: 'Completed', percentage: 100, message: 'Agent system design complete.' });
    
    return {
        designMarkdown,
        designPlanJson,
        designFlowDiagram,
    };
};