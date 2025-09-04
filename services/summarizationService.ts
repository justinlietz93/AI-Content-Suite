
import type { ProgressUpdate, SummaryOutput, Highlight } from '../types';
import { generateText, extractHighlightsFromJson } from './geminiService';
import { 
  TARGET_CHUNK_CHAR_SIZE, 
  CHUNK_OVERLAP_CHAR_SIZE,
  MAX_REDUCTION_INPUT_SUMMARIES,
  CONCURRENT_CHUNK_REQUEST_LIMIT,
  HIERARCHICAL_CONCURRENT_CHUNK_REQUEST_LIMIT,
  HIERARCHICAL_CHUNK_GROUP_SIZE,
  CHUNK_SUMMARY_PROMPT_TEMPLATE,
  REDUCE_SUMMARIES_PROMPT_TEMPLATE
} from '../constants';

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

export const processTranscript = async (
  transcriptText: string,
  onProgress: (update: ProgressUpdate) => void,
  useHierarchical: boolean
): Promise<SummaryOutput> => {
  if (!transcriptText) {
    throw new Error("Input text is empty or could not be read.");
  }

  // 1. Determine processing strategy
  const isHierarchical = useHierarchical && transcriptText.length >= TARGET_CHUNK_CHAR_SIZE;
  const chunkSize = isHierarchical 
    ? Math.floor(TARGET_CHUNK_CHAR_SIZE / HIERARCHICAL_CHUNK_GROUP_SIZE) 
    : TARGET_CHUNK_CHAR_SIZE;
  const overlapSize = isHierarchical
    ? Math.floor(chunkSize * 0.1) // 10% overlap for smaller chunks
    : CHUNK_OVERLAP_CHAR_SIZE;
  const concurrencyLimit = isHierarchical 
    ? HIERARCHICAL_CONCURRENT_CHUNK_REQUEST_LIMIT 
    : CONCURRENT_CHUNK_REQUEST_LIMIT;

  // Handle very small transcripts directly
  if (transcriptText.length < TARGET_CHUNK_CHAR_SIZE) {
      onProgress({ stage: 'Processing Small Transcript', percentage: 20, message: 'Transcript is relatively small, summarizing directly...' });
      const directSummaryPrompt = CHUNK_SUMMARY_PROMPT_TEMPLATE(transcriptText);
      const finalSummary = await generateText(directSummaryPrompt);
      onProgress({ stage: 'Extracting Highlights', percentage: 85, message: 'Extracting key highlights...', thinkingHint: 'Analyzing final summary for highlights.' });
      const highlights = await extractHighlightsFromJson(finalSummary);
      onProgress({ stage: 'Completed', percentage: 100, message: 'Processing complete.' });
      return { finalSummary, highlights };
  }
  
  // 2. Chunk Transcript
  onProgress({ stage: 'Chunking Transcript', percentage: 15, message: 'Dividing transcript into manageable chunks...' });
  const chunks = chunkTranscript(transcriptText, chunkSize, overlapSize);
  if (chunks.length === 0) { 
    throw new Error("No chunks were generated despite transcript size. Check chunking logic/settings.");
  }
  
  let chunkMessage = `${chunks.length} segments created.` + (isHierarchical ? ' Using hierarchical parallel mode.' : '');
  if (chunks.length > 50) { 
    chunkMessage += ` Processing this very large document will take a significant amount of time.`;
  }
  onProgress({ stage: 'Chunking Complete', percentage: 20, total: chunks.length, current: 0, message: chunkMessage });

  // 3. Map Phase: Summarize each chunk/group in parallel batches
  const mapPhaseStartProgress = 20;
  const mapPhaseProgressRange = 50;
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
        
        const batchStartTime = Date.now();
        const batchPromises = batchGroupsToProcess.map((group, batchIndex) => {
            const originalIndex = i + batchIndex;
            const combinedText = group.join('\n\n--- CONSECUTIVE SEGMENT BREAK ---\n\n');
            const summaryPrompt = CHUNK_SUMMARY_PROMPT_TEMPLATE(combinedText);
            return generateText(summaryPrompt)
                .then(summary => ({ summary, originalIndex }))
                .catch(error => {
                    console.warn(`Failed to summarize group ${originalIndex + 1} of ${totalGroups}: ${error instanceof Error ? error.message : String(error)}. Skipping.`);
                    return { summary: `[Summary for group ${originalIndex + 1} failed or was skipped due to an error.]`, originalIndex };
                });
        });

        const batchResults = await Promise.all(batchPromises);
        const batchDurationMs = Date.now() - batchStartTime;

        let successfulItemsInBatch = 0;
        for (const result of batchResults) {
            chunkSummaries[result.originalIndex] = result.summary;
            summarizedGroupsCount++;
            successfulItemsInBatch++;
        }

        if (successfulItemsInBatch > 0) {
            const avgTimePerItemInBatchMs = batchDurationMs / successfulItemsInBatch;
            chunkProcessingTimesMs.push(...Array(successfulItemsInBatch).fill(avgTimePerItemInBatchMs));
        }

        const etrSeconds = calculateEtr(chunkProcessingTimesMs, totalGroups, summarizedGroupsCount);
        const thinkingHint = getNextChunkHint(chunks, summarizedGroupsCount * HIERARCHICAL_CHUNK_GROUP_SIZE);

        const progressPercentage = mapPhaseStartProgress + (summarizedGroupsCount / totalGroups) * mapPhaseProgressRange;
        onProgress({
            stage: 'Summarizing Groups',
            current: summarizedGroupsCount,
            total: totalGroups,
            percentage: progressPercentage,
            message: `Summarized group ${summarizedGroupsCount} of ${totalGroups}...`,
            etrSeconds: etrSeconds,
            thinkingHint: thinkingHint
        });
    }
  } else {
    // Standard processing logic
    const totalChunks = chunks.length;
    let summarizedChunksCount = 0;
    chunkSummaries = new Array(totalChunks).fill(null);

    for (let i = 0; i < totalChunks; i += concurrencyLimit) {
        const batchChunksToProcess = chunks.slice(i, i + concurrencyLimit);
        
        const batchStartTime = Date.now();
        const batchPromises = batchChunksToProcess.map((chunk, batchIndex) => {
            const originalIndex = i + batchIndex;
            const summaryPrompt = CHUNK_SUMMARY_PROMPT_TEMPLATE(chunk);
            return generateText(summaryPrompt)
                .then(summary => ({ summary, originalIndex }))
                .catch(error => {
                    console.warn(`Failed to summarize chunk ${originalIndex + 1} of ${totalChunks}: ${error instanceof Error ? error.message : String(error)}. Skipping.`);
                    return { summary: `[Summary for segment ${originalIndex + 1} failed or was skipped due to an error.]`, originalIndex };
                });
        });

        const batchResults = await Promise.all(batchPromises);
        const batchDurationMs = Date.now() - batchStartTime;
        
        let successfulItemsInBatch = 0;
        for (const result of batchResults) {
            chunkSummaries[result.originalIndex] = result.summary;
            summarizedChunksCount++;
            successfulItemsInBatch++;
        }

        if (successfulItemsInBatch > 0) {
            const avgTimePerItemInBatchMs = batchDurationMs / successfulItemsInBatch;
            chunkProcessingTimesMs.push(...Array(successfulItemsInBatch).fill(avgTimePerItemInBatchMs));
        }

        const etrSeconds = calculateEtr(chunkProcessingTimesMs, totalChunks, summarizedChunksCount);
        const thinkingHint = getNextChunkHint(chunks, summarizedChunksCount);

        const progressPercentage = mapPhaseStartProgress + (summarizedChunksCount / totalChunks) * mapPhaseProgressRange;
        onProgress({
            stage: 'Summarizing Segments',
            current: summarizedChunksCount,
            total: totalChunks,
            percentage: progressPercentage,
            message: `Summarized segment ${summarizedChunksCount} of ${totalChunks}... (Each segment is very large)`,
            etrSeconds: etrSeconds,
            thinkingHint: thinkingHint
        });
    }
  }
  
  const validChunkSummaries = chunkSummaries.filter(
    s => typeof s === 'string' && !s.startsWith("[Summary for")
  ) as string[];

  if (validChunkSummaries.length === 0) {
    throw new Error("All segment/group summarizations failed. Unable to proceed.");
  }
  onProgress({ stage: 'Initial Summarization Complete', percentage: mapPhaseStartProgress + mapPhaseProgressRange, message: `${validChunkSummaries.length} of ${chunkSummaries.length} summaries successfully generated.` });

  // 4. Reduce Phase: Hierarchically combine summaries
  const reducePhaseStartProgress = mapPhaseStartProgress + mapPhaseProgressRange; // Should be 70%
  const reducePhaseProgressRange = 20;
  let currentSummaries = validChunkSummaries;
  let reductionLevel = 1;

  if (currentSummaries.length === 1) {
    onProgress({ stage: 'Final Summary Generated', percentage: reducePhaseStartProgress + reducePhaseProgressRange, message: 'Single summary used as final.' });
  }

  while (currentSummaries.length > 1) {
    const nextLevelSummaries: string[] = [];
    const numGroups = Math.ceil(currentSummaries.length / MAX_REDUCTION_INPUT_SUMMARIES);
    
    let thinkingHintForReduction = `Combining ${currentSummaries.length} summaries into approximately ${numGroups} new summaries...`;
    if (numGroups === 1) {
        thinkingHintForReduction = `Final combination of ${currentSummaries.length} summaries into one...`;
    }

    onProgress({
      stage: 'Reducing Summaries',
      percentage: reducePhaseStartProgress + ( (reductionLevel-1) * (reducePhaseProgressRange / Math.max(1, Math.ceil(Math.log(validChunkSummaries.length) / Math.log(MAX_REDUCTION_INPUT_SUMMARIES))))),
      message: `Combining summaries - Level ${reductionLevel} (${currentSummaries.length} into ~${numGroups})...`,
      thinkingHint: thinkingHintForReduction
    });
    
    for (let i = 0; i < numGroups; i++) {
      const groupStartIndex = i * MAX_REDUCTION_INPUT_SUMMARIES;
      const groupEndIndex = Math.min(groupStartIndex + MAX_REDUCTION_INPUT_SUMMARIES, currentSummaries.length);
      const summariesToCombine = currentSummaries.slice(groupStartIndex, groupEndIndex);
      
      if (summariesToCombine.length === 1) { 
        nextLevelSummaries.push(summariesToCombine[0]);
        continue;
      }

      const combinedTextForPrompt = summariesToCombine.map((s, idx) => `Input Summary ${idx+1}:\n${s}`).join('\n\n---\n\n');
      const reducePrompt = REDUCE_SUMMARIES_PROMPT_TEMPLATE(combinedTextForPrompt);
      
      try {
        const reducedSummary = await generateText(reducePrompt);
        nextLevelSummaries.push(reducedSummary);
      } catch (error) {
         console.warn(`Failed to reduce summary group ${i + 1} at level ${reductionLevel}: ${error instanceof Error ? error.message : String(error)}. Using combined inputs as fallback.`);
         nextLevelSummaries.push(`[Reduction Failed for Group] Original Summaries Combined:\n${summariesToCombine.join("\n---\n")}`);
      }
    }
    currentSummaries = nextLevelSummaries;
    reductionLevel++;
    if (reductionLevel > 10) { 
        console.warn(`Exceeded maximum reduction levels. Using combined set as final.`);
        break;
    }
  }
  
  const finalSummary = currentSummaries.join("\n\n---\n\n") || "No summary could be generated after reduction phase.";
  onProgress({ stage: 'Final Summary Generated', percentage: reducePhaseStartProgress + reducePhaseProgressRange, message: 'Final summary compiled.' });

  // 5. Extract Highlights
  onProgress({ stage: 'Extracting Highlights', percentage: 95, message: 'Identifying key highlights...', thinkingHint: 'Analyzing final summary for highlights.' });
  let highlights: Highlight[] = [];
   try {
    highlights = await extractHighlightsFromJson(finalSummary);
   } catch (error) {
     console.warn(`Failed to extract highlights: ${error instanceof Error ? error.message : String(error)}. Highlights will be empty.`);
     highlights = [{text: "Highlight extraction failed. See console for details."}];
   }
  onProgress({ stage: 'Completed', percentage: 100, message: 'Processing complete.' });

  return { finalSummary, highlights };
};

// --- Helper Functions ---

const calculateEtr = (processingTimesMs: number[], totalItems: number, completedItems: number): number | undefined => {
    if (processingTimesMs.length === 0 || completedItems >= totalItems) return 0;
    
    const totalTimeMs = processingTimesMs.reduce((sum, time) => sum + time, 0);
    const avgTimePerItemMs = totalTimeMs / processingTimesMs.length;
    const remainingItems = totalItems - completedItems;
    
    return Math.round((avgTimePerItemMs * remainingItems) / 1000);
};

const getNextChunkHint = (chunks: string[], nextChunkIndex: number): string | undefined => {
    if (nextChunkIndex >= chunks.length) return undefined;

    const nextChunkText = chunks[nextChunkIndex];
    if (nextChunkText) {
        const hintWords = nextChunkText.substring(0, 75).split(' ').slice(0, 7).join(' ');
        return `Next up: analyzing content starting with "${hintWords}..."`;
    }
    return undefined;
};
