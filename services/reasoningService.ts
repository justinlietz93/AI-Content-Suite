

import type { ProgressUpdate, ReasoningOutput, ReasoningSettings, ReasoningNode, ReasoningNodeType, ReasoningTree } from '../types';
import { generateText, getActiveModelName } from './geminiService';
// FIX: Corrected import path for reasoning prompts
import * as Prompts from '../prompts/reasoning/index';
import { processTranscript } from './summarizationService';
import { MAX_CONTENT_CHAR_SIZE } from '../constants';

/**
 * Implements an iterative, multi-step reasoning process to solve a complex goal.
 * This function orchestrates calls to the AI based on user-defined settings for
 * depth, breadth, and criticism, building a detailed reasoning trace.
 */
export const processReasoningRequest = async (
    prompt: string,
    settings: ReasoningSettings,
    fileParts: any[],
    onProgress: (update: ProgressUpdate) => void,
    signal?: AbortSignal,
): Promise<ReasoningOutput> => {
    
    const checkForCancellation = () => {
        if (signal?.aborted) {
            throw new DOMException('Aborted by user', 'AbortError');
        }
    };

    // 1. Initialization
    const fileContent = (fileParts || []).map(p => p.text || '').join('\n\n');
    let initialGoal = [prompt, fileContent].join('\n\n').trim();
    if (!initialGoal) {
        throw new Error("Reasoning prompt is empty.");
    }
    
    checkForCancellation();

    if (initialGoal.length > MAX_CONTENT_CHAR_SIZE) {
        onProgress({
            stage: 'Preprocessing Input',
            percentage: 2,
            message: 'Input content is very large. Summarizing to fit within model context window...',
            thinkingHint: 'This may take some time...'
        });
        
        const summaryOutput = await processTranscript(
            initialGoal,
            (summaryProgress) => {
                const remappedPercentage = 2 + (summaryProgress.percentage * 0.08); // Remap to 2-10% range
                onProgress({ ...summaryProgress, stage: 'Preprocessing Input', percentage: remappedPercentage });
            },
            true, 
            'default',
            signal
        );
        
        initialGoal = `
        The user provided a very large context, which has been summarized below.
        Base your reasoning primarily on this summary to achieve the user's original goal.

        --- SUMMARY OF USER CONTEXT ---
        ${summaryOutput.finalSummary}
        --- END SUMMARY ---
        `;
    }

    checkForCancellation();
    onProgress({ stage: 'Initializing', percentage: 10, message: 'Starting reasoning engine...' });

    let nodeCounter = 0;
    const nodes: ReasoningNode[] = [];

    // Helper to create and add nodes to our tree
    const createNode = (type: ReasoningNodeType, title: string, content: string, parentId?: string): ReasoningNode => {
        const id = `${type.charAt(0)}${++nodeCounter}`;
        const node: ReasoningNode = { id, type, title, content, children: [] };
        nodes.push(node);
        
        if (parentId) {
            const parent = nodes.find(n => n.id === parentId);
            parent?.children?.push(id);
        }
        return node;
    };

    const rootNode = createNode('goal', 'Initial Goal', initialGoal);
    const mainPhaseNode = createNode('phase', 'Phase 1: Iterative Reasoning', 'Expanding, critiquing, and synthesizing steps to reach the goal.', rootNode.id);
    let previousStepNode = rootNode; // The last *synthesized* step becomes the input for the next depth level

    // 2. Main Loop (Depth)
    for (let d = 0; d < settings.depth; d++) {
        checkForCancellation();
        const progress = 10 + (d / settings.depth) * 70;
        onProgress({ stage: 'Reasoning', percentage: progress, message: `Processing Depth ${d + 1}/${settings.depth}`, current: d + 1, total: settings.depth });
        
        const taskNode = createNode('task', `Task ${d + 1}: Explore Alternatives`, `Generating and refining ${settings.breadth} approaches for this step.`, mainPhaseNode.id);

        const refinedContents: string[] = [];
        // 3. Breadth Loop (now sequential to avoid rate limiting)
        for (let b = 0; b < settings.breadth; b++) {
            checkForCancellation();
            const breadthProgress = progress + ((b / settings.breadth) * (50 / settings.depth));
            onProgress({
                stage: 'Reasoning',
                percentage: breadthProgress,
                message: `Depth ${d + 1}/${settings.depth}, Alternative ${b + 1}/${settings.breadth}`,
                thinkingHint: 'Generating alternative approach...'
            });

            const expandPrompt = Prompts.generateExpandStepPrompt(initialGoal, previousStepNode.content, settings);
            let currentContent = await generateText(expandPrompt, undefined, signal);
            
            const altNode = createNode('step', `Alternative ${b + 1}`, currentContent, taskNode.id);
            let parentForCritique = altNode.id;

            // 4. Critic & Refine Loop (sequential within the breadth loop)
            for (let c = 0; c < settings.criticRounds; c++) {
                checkForCancellation();
                onProgress({
                    stage: 'Reasoning',
                    percentage: breadthProgress,
                    message: `Depth ${d + 1}, Alt ${b + 1}: Critique Round ${c + 1}/${settings.criticRounds}`,
                    thinkingHint: 'Critiquing proposed step...'
                });

                const critiquePrompt = Prompts.generateCritiquePrompt(initialGoal, currentContent, settings);
                const critiqueContent = await generateText(critiquePrompt, undefined, signal);
                const critiqueNode = createNode('validate', `Critique ${c + 1}`, critiqueContent, parentForCritique);
                critiqueNode.result = { status: 'fail', confidence: 0.5 }; // Mark as a critique for visualization
                
                checkForCancellation();
                onProgress({
                    stage: 'Reasoning',
                    percentage: breadthProgress,
                    message: `Depth ${d + 1}, Alt ${b + 1}: Refinement Round ${c + 1}/${settings.criticRounds}`,
                    thinkingHint: 'Refining step based on critique...'
                });

                const refinePrompt = Prompts.generateRefinePrompt(initialGoal, currentContent, critiqueContent, settings);
                const refinedContent = await generateText(refinePrompt, undefined, signal);
                const correctionNode = createNode('correction', `Refinement ${c + 1}`, refinedContent, critiqueNode.id);
                
                currentContent = refinedContent;
                parentForCritique = correctionNode.id;
            }
            refinedContents.push(currentContent);
        }

        // 5. Synthesis
        checkForCancellation();
        onProgress({ stage: 'Reasoning', percentage: progress + (50 / settings.depth), message: `Depth ${d + 1}: Synthesizing ${refinedContents.length} alternatives...` });
        
        const synthesizeNode = createNode('task', `Task ${d + 1}: Synthesize`, `Combining ${refinedContents.length} refined alternatives into a single path forward.`, mainPhaseNode.id);

        const synthesizePrompt = Prompts.generateSynthesizePrompt(initialGoal, refinedContents, settings);
        const synthesizedContent = await generateText(synthesizePrompt, undefined, signal);

        const synthesizedStepNode = createNode('step', `Synthesized Step ${d + 1}`, synthesizedContent, synthesizeNode.id);
        previousStepNode = synthesizedStepNode; // Update for the next depth iteration
    }

    // 6. Final Report Generation
    checkForCancellation();
    onProgress({ stage: 'Generating Report', percentage: 90, message: 'Generating final markdown report...' });
    const fullTraceForReport = nodes.map(n => `[Node: ${n.id} | Type: ${n.type} | Title: ${n.title}]\n${n.content}`).join('\n\n---\n\n');
    const finalReportPrompt = Prompts.generateFinalReportPrompt(initialGoal, fullTraceForReport, settings);
    const finalResponseMd = await generateText(finalReportPrompt, { maxOutputTokens: 16384 }, signal);

    // 7. Assemble Final Tree
    const reasoningTreeJson: ReasoningTree = {
        version: "2.3-iterative",
        project: { name: initialGoal.substring(0, 50).replace(/\s+/g, '_') },
        goal: initialGoal,
        constraints: [],
        success_criteria: [],
        settings: {
            ...settings,
            persona: {
                name: settings.persona,
                directive: Prompts.getPersonaDirective(settings)
            }
        },
        nodes,
        artifacts: {
            final_md: finalResponseMd,
            exported_at: new Date().toISOString(),
        },
        audit: {
            model: getActiveModelName(),
            tokens_in: 0,
            tokens_out: 0,
            cost_usd: 0.0,
        },
    };

    onProgress({ stage: 'Completed', percentage: 100, message: 'Reasoning process complete.' });
    
    return {
        finalResponseMd,
        reasoningTreeJson,
    };
};