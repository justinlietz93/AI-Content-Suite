
import type { ProgressUpdate, SummaryOutput, Highlight } from '../types';
import { generateText, extractHighlightsFromJson } from './geminiService';
import { 
  TARGET_CHUNK_CHAR_SIZE, 
  CHUNK_OVERLAP_CHAR_SIZE,
  MAX_REDUCTION_INPUT_SUMMARIES,
  CONCURRENT_CHUNK_REQUEST_LIMIT,
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
  onProgress: (update: ProgressUpdate) => void
): Promise<SummaryOutput> => {
  if (!transcriptText) {
    throw new Error("Input text is empty or could not be read.");
  }

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
  const chunks = chunkTranscript(transcriptText, TARGET_CHUNK_CHAR_SIZE, CHUNK_OVERLAP_CHAR_SIZE);
  if (chunks.length === 0) { 
    throw new Error("No chunks were generated despite transcript size. Check chunking logic/settings.");
  }
  
  let chunkMessage = `${chunks.length} primary segments created.`;
  if (chunks.length > 50) { 
    chunkMessage += ` Processing this very large document will take a significant amount of time (potentially many hours).`;
  } else if (chunks.length > 20) {
    chunkMessage += ` Processing this large document will take a considerable amount of time.`;
  }
  onProgress({ stage: 'Chunking Complete', percentage: 20, total: chunks.length, current: 0, message: chunkMessage });

  // 3. Map Phase: Summarize each chunk in parallel batches
  const mapPhaseStartProgress = 20;
  const mapPhaseProgressRange = 50;
  const chunkSummaries: (string | null)[] = new Array(chunks.length).fill(null);
  const totalChunks = chunks.length;
  let summarizedChunksCount = 0;
  const chunkProcessingTimesMs: number[] = [];


  for (let i = 0; i < totalChunks; i += CONCURRENT_CHUNK_REQUEST_LIMIT) {
    const batchChunksToProcess = chunks.slice(i, i + CONCURRENT_CHUNK_REQUEST_LIMIT);
    
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
        for (let k = 0; k < successfulItemsInBatch; k++) {
            chunkProcessingTimesMs.push(avgTimePerItemInBatchMs);
        }
    }
    
    let etrSeconds: number | undefined = undefined;
    if (chunkProcessingTimesMs.length > 0) {
        const totalTimeMs = chunkProcessingTimesMs.reduce((sum, time) => sum + time, 0);
        const avgTimePerChunkMs = totalTimeMs / chunkProcessingTimesMs.length;
        const remainingChunks = totalChunks - summarizedChunksCount;
        if (remainingChunks > 0) {
            etrSeconds = Math.round((avgTimePerChunkMs * remainingChunks) / 1000);
        } else {
            etrSeconds = 0; 
        }
    }

    let thinkingHint: string | undefined = undefined;
    if (summarizedChunksCount < totalChunks) {
        const nextChunkText = chunks[summarizedChunksCount]; // Next chunk to be processed is at index summarizedChunksCount
        if (nextChunkText) { // Add check for nextChunkText
            const hintWords = nextChunkText.substring(0, 75).split(' ').slice(0, 7).join(' ');
            thinkingHint = `Next up: analyzing content starting with "${hintWords}..."`;
        }
    }

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
  
  const validChunkSummaries = chunkSummaries.filter(
    s => typeof s === 'string' && !s.startsWith("[Summary for segment")
  ) as string[];

  if (validChunkSummaries.length === 0 && totalChunks > 0) {
    throw new Error("All segment summarizations failed. Unable to proceed.");
  }
  onProgress({ stage: 'Segment Summarization Complete', percentage: mapPhaseStartProgress + mapPhaseProgressRange, message: `${validChunkSummaries.length} of ${totalChunks} segments successfully summarized.` });

  // 4. Reduce Phase: Hierarchically combine summaries
  const reducePhaseStartProgress = mapPhaseStartProgress + mapPhaseProgressRange; // Should be 70%
  const reducePhaseProgressRange = 20;
  let currentSummaries = validChunkSummaries;
  let reductionLevel = 1;
  const initialSummariesForReduction = currentSummaries.length;
  let summariesProcessedInReduction = 0;

  if (currentSummaries.length === 0) { // Handle case where all summaries failed
    onProgress({ stage: 'Completed', percentage: 100, message: 'Summarization failed as no segments could be processed.' });
    return { finalSummary: "Summarization failed. No segments could be successfully processed.", highlights: [] };
  }
   if (currentSummaries.length === 1) {
    onProgress({ stage: 'Final Summary Generated', percentage: reducePhaseStartProgress + reducePhaseProgressRange, message: 'Single segment summary used as final.' });
    const finalSummary = currentSummaries[0];
    const highlightPhaseStartProgress = reducePhaseStartProgress + reducePhaseProgressRange; // Should be 90%
    onProgress({ stage: 'Extracting Highlights', percentage: highlightPhaseStartProgress, message: 'Identifying key highlights...', thinkingHint: 'Analyzing final summary for highlights.' });
    let highlights: Highlight[] = [];
    try {
        highlights = await extractHighlightsFromJson(finalSummary);
    } catch (error) {
        console.warn(`Failed to extract highlights: ${error instanceof Error ? error.message : String(error)}. Highlights will be empty.`);
        highlights = [{text: "Highlight extraction failed. See console for details."}];
    }
    onProgress({ stage: 'Completed', percentage: 100, message: 'Processing complete.' });
    return { finalSummary, highlights };
  }


  while (currentSummaries.length > 1) {
    const nextLevelSummaries: string[] = [];
    const numGroups = Math.ceil(currentSummaries.length / MAX_REDUCTION_INPUT_SUMMARIES);
    
    let thinkingHintForReduction = `Combining ${currentSummaries.length} summaries into approximately ${numGroups} new summaries...`;
    if (numGroups === 1 && currentSummaries.length > 1) {
        thinkingHintForReduction = `Final combination of ${currentSummaries.length} summaries into one...`;
    } else if (currentSummaries.length <= MAX_REDUCTION_INPUT_SUMMARIES) {
        thinkingHintForReduction = `Final combination of ${currentSummaries.length} summaries...`;
    }


    onProgress({
      stage: 'Reducing Summaries',
      percentage: reducePhaseStartProgress + (initialSummariesForReduction > 0 ? (summariesProcessedInReduction / initialSummariesForReduction) : 0) * reducePhaseProgressRange,
      message: `Combining summaries - Level ${reductionLevel} (${currentSummaries.length} into ~${numGroups})...`,
      thinkingHint: thinkingHintForReduction
    });
    
    for (let i = 0; i < numGroups; i++) {
      const groupStartIndex = i * MAX_REDUCTION_INPUT_SUMMARIES;
      const groupEndIndex = Math.min(groupStartIndex + MAX_REDUCTION_INPUT_SUMMARIES, currentSummaries.length);
      const summariesToCombine = currentSummaries.slice(groupStartIndex, groupEndIndex);
      
      if (summariesToCombine.length === 1) { 
        nextLevelSummaries.push(summariesToCombine[0]);
         // Avoid double counting if initialSummariesForReduction is small
        if (initialSummariesForReduction > MAX_REDUCTION_INPUT_SUMMARIES) summariesProcessedInReduction += 0.5;
        else summariesProcessedInReduction += summariesToCombine.length / 2; // approximate
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
      summariesProcessedInReduction += summariesToCombine.length; 

      const currentReductionProgress = reducePhaseStartProgress + (initialSummariesForReduction > 0 ? (summariesProcessedInReduction / initialSummariesForReduction) : 0) * reducePhaseProgressRange;
       onProgress({
        stage: 'Reducing Summaries',
        current: i + 1,
        total: numGroups,
        percentage: Math.min(currentReductionProgress, reducePhaseStartProgress + reducePhaseProgressRange - 0.1),
        message: `Level ${reductionLevel}: Combined group ${i + 1} of ${numGroups}...`,
        thinkingHint: thinkingHintForReduction // Keep same hint for duration of this reduction level
      });
    }
    currentSummaries = nextLevelSummaries;
    reductionLevel++;
    if (reductionLevel > 10 && currentSummaries.length > 1) { 
        console.warn(`Exceeded maximum reduction levels (${reductionLevel-1}) with ${currentSummaries.length} summaries remaining. Using current combined set as final.`);
        break;
    }
  }
  
  const finalSummary = currentSummaries[0] || "No summary could be generated after reduction phase.";
  onProgress({ stage: 'Final Summary Generated', percentage: reducePhaseStartProgress + reducePhaseProgressRange, message: 'Final summary compiled.' });

  // 5. Extract Highlights
  const highlightPhaseStartProgress = reducePhaseStartProgress + reducePhaseProgressRange; // Should be 90%
  const highlightPhaseProgressRange = 10;

  onProgress({ stage: 'Extracting Highlights', percentage: highlightPhaseStartProgress, message: 'Identifying key highlights...', thinkingHint: 'Analyzing final summary for highlights.' });
  let highlights: Highlight[] = [];
   try {
    highlights = await extractHighlightsFromJson(finalSummary);
   } catch (error) {
     console.warn(`Failed to extract highlights: ${error instanceof Error ? error.message : String(error)}. Highlights will be empty.`);
     highlights = [{text: "Highlight extraction failed. See console for details."}];
   }
  onProgress({ stage: 'Completed', percentage: highlightPhaseStartProgress + highlightPhaseProgressRange, message: 'Processing complete.' });

  return { finalSummary, highlights };
};
