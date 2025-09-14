
import type { ProgressUpdate, RequestSplitterOutput, RequestSplitterSettings, SplitPlanJson, SplitPlanPrompt } from '../types';
import { generateText } from './geminiService';
import { REQUEST_SPLITTER_PLANNING_PROMPT_TEMPLATE, REQUEST_SPLITTER_GENERATION_PROMPT_TEMPLATE } from '../constants';

// Helper to safely parse JSON from AI response
const parseJsonResponse = <T>(rawJson: string, context: string): T => {
    try {
        let jsonStr = rawJson.trim();
        // Handle markdown code fences
        const fenceRegex = /^```(\w*)?\s*\n?([\s\S]*?)\n?\s*```$/;
        const match = jsonStr.match(fenceRegex);
        if (match && match[2]) {
            jsonStr = match[2].trim();
        }
        return JSON.parse(jsonStr) as T;
    } catch (e) {
        console.error(`Failed to parse JSON response from ${context}:`, e);
        console.log(`Raw response from AI for ${context}:`, rawJson);
        throw new Error(`Failed to parse the response from the AI. The data might be malformed. See console for raw output.`);
    }
};

interface PlanningResponse {
    project: {
        name: string;
        architecture: string;
        invariants: string[];
    };
    plan: {
        id: number;
        title: string;
        dependencies?: number[];
    }[];
}

export const processRequestSplitting = async (
    spec: string,
    settings: RequestSplitterSettings,
    fileParts: any[],
    onProgress: (update: ProgressUpdate) => void
): Promise<RequestSplitterOutput> => {
    
    const combinedSpec = [spec, ...fileParts.map(p => p.text)].join('\n\n---\n\n').trim();

    if (!combinedSpec) {
        throw new Error("Request specification is empty.");
    }

    onProgress({
        stage: 'Initializing Splitter',
        percentage: 5,
        message: `Configuring architect with persona: ${settings.persona}...`,
    });

    // --- STAGE 1: PLANNING ---
    onProgress({
        stage: 'Planning Decomposition',
        percentage: 10,
        message: 'AI architect is analyzing the specification to create a dependency graph...',
        thinkingHint: 'Identifying tasks and their prerequisites.'
    });

    const planningPrompt = REQUEST_SPLITTER_PLANNING_PROMPT_TEMPLATE(combinedSpec, settings);
    const planningResultJson = await generateText(planningPrompt);
    const { project, plan } = parseJsonResponse<PlanningResponse>(planningResultJson, 'planning engine');
    
    if (!plan || plan.length === 0) {
        throw new Error("The AI failed to generate a valid decomposition plan.");
    }

    onProgress({
        stage: 'Plan Generated',
        percentage: 20,
        message: `Dependency graph created with ${plan.length} tasks.`,
        thinkingHint: `Now generating content for each prompt...`
    });

    // --- STAGE 2: GENERATION ---
    const finalPrompts: SplitPlanPrompt[] = [];
    const planMap = new Map(plan.map(p => [p.id, p]));
    const totalPrompts = plan.length;
    const generationPhaseStart = 20;
    const generationPhaseRange = 75; // 20% to 95%

    for (let i = 0; i < totalPrompts; i++) {
        const currentPlanItem = plan[i];
        const progressPercentage = generationPhaseStart + ((i + 1) / totalPrompts) * generationPhaseRange;

        onProgress({
            stage: 'Generating Prompts',
            percentage: progressPercentage,
            message: `[${i + 1}/${totalPrompts}] Generating: "${currentPlanItem.title}"`,
            current: i + 1,
            total: totalPrompts,
            thinkingHint: 'Crafting self-contained instructions...'
        });
        
        const prerequisites = (currentPlanItem.dependencies || [])
            .map(depId => {
                const depPrompt = planMap.get(depId);
                return depPrompt ? { id: depPrompt.id, title: depPrompt.title } : null;
            })
            .filter(p => p !== null) as { id: number; title: string }[];


        const generationPrompt = REQUEST_SPLITTER_GENERATION_PROMPT_TEMPLATE(
            project,
            currentPlanItem.title,
            currentPlanItem.id,
            prerequisites
        );

        const promptContent = await generateText(generationPrompt);

        finalPrompts.push({
            id: currentPlanItem.id,
            title: currentPlanItem.title,
            prompt: promptContent.trim(),
            dependencies: currentPlanItem.dependencies || [],
        });
    }

    // --- STAGE 3: ASSEMBLY ---
    onProgress({
        stage: 'Assembling Final Output',
        percentage: 98,
        message: 'Compiling final Markdown and JSON plan...',
    });

    // Ensure prompts are sorted by ID in the final JSON for consistency
    finalPrompts.sort((a, b) => a.id - b.id);

    const splitPlanJson: SplitPlanJson = {
        project,
        prompts: finalPrompts
    };
    
    const orderedPromptsMd = finalPrompts
        .map(p => p.prompt)
        .join('\n\n---\n\n');

    onProgress({ stage: 'Completed', percentage: 100, message: 'Request splitting complete.' });

    return {
        orderedPromptsMd,
        splitPlanJson
    };
};