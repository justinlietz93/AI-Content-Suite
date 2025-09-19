
import type { ProgressUpdate, SummaryOutput, SummaryFormat } from '../types';
import { generateText, extractHighlightsFromJson } from './geminiService';
import { 
  TARGET_CHUNK_CHAR_SIZE, 
  CHUNK_OVERLAP_CHAR_SIZE,
  MAX_REDUCTION_INPUT_SUMMARIES,
  CONCURRENT_CHUNK_REQUEST_LIMIT,
  HIERARCHICAL_CONCURRENT_CHUNK_REQUEST_LIMIT,
  HIERARCHICAL_CHUNK_GROUP_SIZE,
  CHUNK_SUMMARY_PROMPTS,
  REDUCE_SUMMARIES_PROMPTS,
  GENERATE_MERMAID_FROM_DIGEST_PROMPT,
  GENERATE_SIMPLIFIED_MERMAID_PROMPT,
  GENERATE_REVERSE_ENGINEERING_MERMAID_PROMPT,
} from '../constants';
import { validateMermaidSyntax } from './validationService';
import * as MermaidDocs from '../mermaid-docs-ts';
import { CORRECT_MERMAID_SYNTAX_PROMPT } from '../prompts/mermaid';


/**
 * Chunks a large text into smaller pieces with overlap.
 * @param text The full text to chunk.
 * @param chunkSize Target size of each chunk in characters.
 * @param overlapSize Overlap size in characters.
 * @returns An array of text chunks.
 */
const chunkTranscript = (text: string, chunkSize: number, overlapSize: number): string[] => {
  const chunks: string[] = [];
  if (!text) return chunks;

  let startIndex = 0;
  while (startIndex < text.length) {
    const endIndex = Math.min(startIndex + chunkSize, text.length);
    chunks.push(text.substring(startIndex, endIndex));
    if (endIndex === text.length) break;
    startIndex += (chunkSize - overlapSize);
    if (startIndex >= text.length) break; 
  }
  return chunks;
};

// Helper function to estimate remaining time
const calculateEtr = (timingsMs: number[], totalItems: number, completedItems: number): number | undefined => {
    if (timingsMs.length === 0 || completedItems >= totalItems) return undefined;
    const totalTimeMs = timingsMs.reduce((sum, time) => sum + time, 0);
    const avgTimePerItemMs = totalTimeMs / timingsMs.length;
    const remainingItems = totalItems - completedItems;
    return Math.round((avgTimePerItemMs * remainingItems) / 1000);
};

// Helper to provide a hint about what's being processed next
const getNextChunkHint = (chunks: string[], nextIndex: number): string | undefined => {
    if (nextIndex >= chunks.length) return undefined;
    const nextChunkText = chunks[nextIndex];
    const hintWords = nextChunkText.substring(0, 75).split(' ').slice(0, 7).join(' ');
    return `Analyzing content starting with "${hintWords}..."`;
};

/**
 * Selects the most relevant documentation based on a Mermaid syntax error message.
 * @param errorMessage The error message from the validator.
 * @returns A string containing the most relevant documentation.
 */
const getRelevantMermaidDocs = (errorMessage: string): string => {
    const lowerError = errorMessage.toLowerCase();
    if (lowerError.includes('link') || lowerError.includes('arrow') || lowerError.includes('label')) {
        return MermaidDocs.MERMAID_RULES_2;
    }
    if (lowerError.includes('node') || lowerError.includes('shape')) {
        return MermaidDocs.MERMAID_RULES_3;
    }
    if (lowerError.includes('style') || lowerError.includes('class')) {
        return MermaidDocs.MERMAID_RULES_4;
    }
    if (lowerError.includes('subgraph')) {
        return MermaidDocs.MERMAID_RULES_5;
    }
    // Default fallback with general syntax and best practices
    return `${MermaidDocs.MERMAID_RULES_5}\n\n${MermaidDocs.MERMAID_RULES_6}`;
};


/**
 * Generates Mermaid code, validates it, and attempts to correct it if necessary.
 * @param generationPrompt The initial prompt to generate the diagram.
 * @param onProgress Progress update callback.
 * @param progressMessage The message to display during generation.
 * @returns A promise that resolves to the validated Mermaid code string.
 */
const generateAndValidateMermaid = async (
    generationPrompt: string,
    onProgress: (update: ProgressUpdate) => void,
    progressMessage: string,
): Promise<string> => {
    const rawDiagramResult = await generateText(generationPrompt);

    // Extract code from markdown fence
    const mermaidBlockRegex = /```mermaid\s*([\s\S]+?)\s*```/;
    const match = rawDiagramResult.match(mermaidBlockRegex);
    let initialCode = match && match[1] ? match[1].trim() : rawDiagramResult.trim();

    // First validation attempt
    const validationResult = await validateMermaidSyntax(initialCode);

    if (validationResult.isValid) {
        return initialCode; // Success on the first try
    }
    
    // Validation failed, begin correction loop
    console.warn("Initial Mermaid generation failed validation. Attempting self-correction.", validationResult.error);
    onProgress({ 
        stage: 'Correcting Diagram', 
        percentage: 85, 
        message: 'AI is correcting a syntax error in the diagram...',
        thinkingHint: 'Analyzing validation failure...'
    });

    const relevantDocs = getRelevantMermaidDocs(validationResult.error?.message || '');
    const correctionPrompt = CORRECT_MERMAID_SYNTAX_PROMPT(initialCode, validationResult.error?.message || 'Unknown error', relevantDocs);
    
    const correctedResultText = await generateText(correctionPrompt);
    const correctedMatch = correctedResultText.match(mermaidBlockRegex);
    let correctedCode = correctedMatch && correctedMatch[1] ? correctedMatch[1].trim() : correctedResultText.trim();

    // Second validation attempt
    const finalValidation = await validateMermaidSyntax(correctedCode);

    if (finalValidation.isValid) {
        console.log("Mermaid self-correction successful.");
        return correctedCode;
    } else {
        console.error("Mermaid self-correction failed. Using the last attempted code.", finalValidation.error);
        // Return the corrected (but still invalid) code with a warning for debugging.
        return `%% ACCURACY WARNING: Auto-correction failed. The following diagram may not render correctly. %% \n\n${correctedCode}`;
    }
};


export const processTranscript = async (
  transcriptText: string,
  onProgress: (update: ProgressUpdate) => void,
  useHierarchical: boolean,
  summaryFormat: SummaryFormat
): Promise<SummaryOutput> => {
  if (!transcriptText) {
    return { finalSummary: "No summary could be generated because the input was empty.", highlights: [] };
  }
  
  const chunkPromptFn = CHUNK_SUMMARY_PROMPTS[summaryFormat];
  const reducePromptFn = REDUCE_SUMMARIES_PROMPTS[summaryFormat];
  
  if (!chunkPromptFn || !reducePromptFn) {
      throw new Error(`Invalid summary format provided: '${summaryFormat}'. No matching prompt function found.`);
  }

  // This function will perform the core summarization logic (chunking, mapping, reducing)
  const generateFinalSummaryText = async (): Promise<string> => {
    const isHierarchical = useHierarchical && transcriptText.length >= TARGET_CHUNK_CHAR_SIZE;
    const chunkSize = isHierarchical 
      ? Math.floor(TARGET_CHUNK_CHAR_SIZE / HIERARCHICAL_CHUNK_GROUP_SIZE) 
      : TARGET_CHUNK_CHAR_SIZE;
    const overlapSize = isHierarchical
      ? Math.floor(chunkSize * 0.1)
      : CHUNK_OVERLAP_CHAR_SIZE;
    const concurrencyLimit = isHierarchical 
      ? HIERARCHICAL_CONCURRENT_CHUNK_REQUEST_LIMIT 
      : CONCURRENT_CHUNK_REQUEST_LIMIT;

    if (transcriptText.length < TARGET_CHUNK_CHAR_SIZE) {
        onProgress({ stage: 'Processing Small Transcript', percentage: 20, message: 'Transcript is small, summarizing directly...' });
        const directSummaryPrompt = chunkPromptFn(transcriptText);
        return await generateText(directSummaryPrompt);
    }
  
    onProgress({ stage: 'Chunking Transcript', percentage: 15, message: 'Dividing transcript into manageable chunks...' });
    const chunks = chunkTranscript(transcriptText, chunkSize, overlapSize);
    if (chunks.length === 0) { 
      return "No summary could be generated because no content chunks were created.";
    }
    
    let chunkMessage = `${chunks.length} segments created.` + (isHierarchical ? ' Using hierarchical parallel mode.' : '');
    onProgress({ stage: 'Chunking Complete', percentage: 20, total: chunks.length, current: 0, message: chunkMessage });

    const mapPhaseStartProgress = 20;
    const mapPhaseProgressRange = summaryFormat === 'entityRelationshipDigest' ? 40 : 50; 
    let chunkSummaries: (string | null)[] = [];
    const chunkProcessingTimesMs: number[] = [];

    if (isHierarchical) {
        const chunkGroups: string[][] = [];
        for (let i = 0; i < chunks.length; i += HIERARCHICAL_CHUNK_GROUP_SIZE) {
            chunkGroups.push(chunks.slice(i, i + HIERARCHICAL_CHUNK_GROUP_SIZE));
        }
        const totalGroups = chunkGroups.length;
        let summarizedGroupsCount = 0;
        chunkSummaries = new Array(totalGroups).fill(null);

        for (let i = 0; i < totalGroups; i += concurrencyLimit) {
            const batchGroupsToProcess = chunkGroups.slice(i, i + concurrencyLimit);
            const batchPromises = batchGroupsToProcess.map((group, batchIndex) => {
                const originalIndex = i + batchIndex;
                const combinedText = group.join('\n\n--- CONSECUTIVE SEGMENT BREAK ---\n\n');
                return generateText(chunkPromptFn(combinedText))
                    .then(summary => ({ summary, originalIndex }))
                    .catch(error => {
                      console.error(`Error summarizing group ${originalIndex + 1}:`, error);
                      return { summary: `[Summary for group ${originalIndex + 1} failed.]`, originalIndex };
                    });
            });
            const batchResults = await Promise.all(batchPromises);
            
            for (const result of batchResults) {
                chunkSummaries[result.originalIndex] = result.summary;
                summarizedGroupsCount++;
            }
            const progressPercentage = mapPhaseStartProgress + (summarizedGroupsCount / totalGroups) * mapPhaseProgressRange;
            onProgress({
                stage: 'Summarizing Segment Groups',
                current: summarizedGroupsCount,
                total: totalGroups,
                percentage: progressPercentage,
                message: `Summarized segment group ${summarizedGroupsCount} of ${totalGroups}...`,
            });
        }
    } else {
        const totalChunks = chunks.length;
        let summarizedChunksCount = 0;
        chunkSummaries = new Array(totalChunks).fill(null);

        for (let i = 0; i < totalChunks; i += concurrencyLimit) {
            const batchChunksToProcess = chunks.slice(i, i + concurrencyLimit);
            const batchStartTime = Date.now();
            const batchPromises = batchChunksToProcess.map((chunk, batchIndex) => {
                const originalIndex = i + batchIndex;
                return generateText(chunkPromptFn(chunk))
                    .then(summary => ({ summary, originalIndex }))
                    .catch(error => {
                      console.error(`Error summarizing segment ${originalIndex + 1}:`, error);
                      return { summary: `[Summary for segment ${originalIndex + 1} failed.]`, originalIndex };
                    });
            });
            const batchResults = await Promise.all(batchPromises);
            const batchDurationMs = Date.now() - batchStartTime;
            
            let successfulItemsInBatch = 0;
            for (const result of batchResults) {
                chunkSummaries[result.originalIndex] = result.summary;
                summarizedChunksCount++;
                if (!result.summary.startsWith('[Summary for segment')) successfulItemsInBatch++;
            }
            if (successfulItemsInBatch > 0) {
                chunkProcessingTimesMs.push(...Array(successfulItemsInBatch).fill(batchDurationMs / successfulItemsInBatch));
            }
            const progressPercentage = mapPhaseStartProgress + (summarizedChunksCount / totalChunks) * mapPhaseProgressRange;
            onProgress({
                stage: 'Summarizing Segments',
                current: summarizedChunksCount,
                total: totalChunks,
                percentage: progressPercentage,
                message: `Summarized segment ${summarizedChunksCount} of ${totalChunks}...`,
                etrSeconds: calculateEtr(chunkProcessingTimesMs, totalChunks, summarizedChunksCount),
                thinkingHint: getNextChunkHint(chunks, summarizedChunksCount)
            });
        }
    }

    const validChunkSummaries = chunkSummaries.filter(s => typeof s === 'string' && !s.startsWith('[Summary for')) as string[];
    if (validChunkSummaries.length === 0) {
        return "No summary could be generated as all content segments failed to process.";
    }
    
    const reducePhaseStartProgress = mapPhaseStartProgress + mapPhaseProgressRange;
    const reducePhaseProgressRange = summaryFormat === 'entityRelationshipDigest' ? 10 : 30;
    let currentSummaries = validChunkSummaries;

    while (currentSummaries.length > 1) {
        const nextLevelSummaries: string[] = [];
        const numGroups = Math.ceil(currentSummaries.length / MAX_REDUCTION_INPUT_SUMMARIES);
        onProgress({ stage: 'Synthesizing Summaries', percentage: reducePhaseStartProgress, message: `Combining ${currentSummaries.length} summaries into ~${numGroups}...`});
        
        for (let j = 0; j < numGroups; j++) {
            const group = currentSummaries.slice(j * MAX_REDUCTION_INPUT_SUMMARIES, (j + 1) * MAX_REDUCTION_INPUT_SUMMARIES);
            if (group.length === 1) {
                nextLevelSummaries.push(group[0]);
                continue;
            }
            const combinedText = group.join('\n\n---\n\n');
            const reducedSummary = await generateText(reducePromptFn(combinedText));
            nextLevelSummaries.push(reducedSummary);
        }
        currentSummaries = nextLevelSummaries;
    }

    return currentSummaries[0] || "No summary could be generated.";
  };

  // --- Main Execution Logic ---
  const finalSummaryText = await generateFinalSummaryText();
  
  if (!finalSummaryText || finalSummaryText.trim() === '' || finalSummaryText.toLowerCase().includes('no summary could be generated')) {
      return { finalSummary: "No summary could be generated.", highlights: [] };
  }

  let mermaidDiagram: string | undefined = undefined;
  let mermaidDiagramSimple: string | undefined = undefined;


  // STEP 2: If the format requires a diagram, generate it with validation.
  if (summaryFormat === 'entityRelationshipDigest') {
      onProgress({ 
          stage: 'Generating Diagram', 
          percentage: 70, 
          message: 'Generating detailed entity-relationship diagram...',
          thinkingHint: 'Creating visual representation of entities...'
      });

      try {
          const diagramPrompt = GENERATE_MERMAID_FROM_DIGEST_PROMPT(finalSummaryText);
          mermaidDiagram = await generateAndValidateMermaid(diagramPrompt, onProgress, 'Generating detailed diagram...');
      } catch (e) {
          console.error("Failed to generate and validate detailed Mermaid diagram:", e);
          mermaidDiagram = "Error: Detailed diagram could not be generated.";
      }

      onProgress({ 
          stage: 'Simplifying Diagram', 
          percentage: 80, 
          message: 'Generating simplified diagram for documents...',
          thinkingHint: 'Creating a high-level overview...'
      });
      try {
          const simpleDiagramPrompt = GENERATE_SIMPLIFIED_MERMAID_PROMPT(finalSummaryText);
          mermaidDiagramSimple = await generateAndValidateMermaid(simpleDiagramPrompt, onProgress, 'Generating simplified diagram...');
      } catch(e) {
          console.error("Failed to generate and validate simplified Mermaid diagram:", e);
      }
  } else if (summaryFormat === 'reverseEngineering') {
      onProgress({ 
          stage: 'Generating Architecture Diagram', 
          percentage: 80, 
          message: 'Generating system architecture and flow diagram...',
          thinkingHint: 'Creating visual representation of components...'
      });
      try {
          const diagramPrompt = GENERATE_REVERSE_ENGINEERING_MERMAID_PROMPT(finalSummaryText);
          mermaidDiagram = await generateAndValidateMermaid(diagramPrompt, onProgress, 'Generating architecture diagram...');
      } catch (e) {
          console.error("Failed to generate and validate reverse engineering Mermaid diagram:", e);
          mermaidDiagram = "Error: Architecture diagram could not be generated.";
      }
      mermaidDiagramSimple = undefined;
  }


  const highlightStartPercentage = 90;
  onProgress({ 
      stage: 'Extracting Highlights', 
      percentage: highlightStartPercentage, 
      message: 'Extracting key highlights...', 
      thinkingHint: 'Analyzing final summary for highlights.' 
  });
  const highlights = await extractHighlightsFromJson(finalSummaryText);
  onProgress({ stage: 'Completed', percentage: 100, message: 'Processing complete.' });
  
  return { finalSummary: finalSummaryText, highlights, summaryFormat, mermaidDiagram, mermaidDiagramSimple };
};