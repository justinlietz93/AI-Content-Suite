
import type { ProgressUpdate, StyleModelOutput } from '../types';
import { generateText } from './geminiService';
import { 
  TARGET_CHUNK_CHAR_SIZE, 
  CHUNK_OVERLAP_CHAR_SIZE,
  MAX_REDUCTION_INPUT_SUMMARIES,
  CONCURRENT_CHUNK_REQUEST_LIMIT,
  CHUNK_STYLE_ANALYSIS_PROMPT_TEMPLATE,
  REDUCE_STYLE_ANALYSES_PROMPT_TEMPLATE,
  SINGLE_TEXT_STYLE_EXTRACTION_PROMPT_TEMPLATE // For small texts
} from '../constants';
import { chunkText } from '../utils';

export const processStyleExtraction = async (
  inputText: string,
  styleTarget: string,
  onProgress: (update: ProgressUpdate) => void,
  signal?: AbortSignal
): Promise<StyleModelOutput> => {

  if (!inputText) {
    throw new Error("Input text is empty or could not be read.");
  }

  const checkForCancellation = () => {
    if (signal?.aborted) {
        throw new DOMException('Aborted by user', 'AbortError');
    }
  };
  
  const analysisTargetMsgPart = (styleTarget && styleTarget.trim().toLowerCase() !== 'all' && styleTarget.trim() !== '')
    ? ` for "${styleTarget}"`
    : ' for overall style';

  // Handle very small texts directly
  if (inputText.length < TARGET_CHUNK_CHAR_SIZE) {
    onProgress({ stage: 'Analyzing Small Text', percentage: 20, message: `Text is small, analyzing style directly${analysisTargetMsgPart}...`, thinkingHint: `Direct style analysis${analysisTargetMsgPart}...` });
    const directStylePrompt = SINGLE_TEXT_STYLE_EXTRACTION_PROMPT_TEMPLATE(inputText, styleTarget);
    const styleDescription = await generateText(directStylePrompt, undefined, signal);
    onProgress({ stage: 'Completed', percentage: 100, message: 'Style extraction complete.' });
    return { styleDescription };
  }
  
  checkForCancellation();

  // 2. Chunk Text
  onProgress({ stage: 'Chunking Text', percentage: 15, message: 'Dividing text into manageable segments...' });
  const chunks = chunkText(inputText, TARGET_CHUNK_CHAR_SIZE, CHUNK_OVERLAP_CHAR_SIZE);
   if (chunks.length === 0) {
    throw new Error("No chunks were generated despite text size. Check chunking logic/settings.");
  }
  let chunkMessage = `${chunks.length} segments created for style analysis${analysisTargetMsgPart}.`;
   if (chunks.length > 20) {
    chunkMessage += ` Processing this large document will take a considerable amount of time.`;
  }
  onProgress({ stage: 'Chunking Complete', percentage: 20, total: chunks.length, current: 0, message: chunkMessage });

  // 3. Map Phase: Analyze style of each chunk
  const mapPhaseStartProgress = 20;
  const mapPhaseProgressRange = 50; 
  const chunkAnalyses: (string | null)[] = new Array(chunks.length).fill(null);
  const totalChunks = chunks.length;
  let analyzedChunksCount = 0;
  const chunkProcessingTimesMs: number[] = [];


  for (let i = 0; i < totalChunks; i += CONCURRENT_CHUNK_REQUEST_LIMIT) {
    checkForCancellation();
    const batchChunksToProcess = chunks.slice(i, i + CONCURRENT_CHUNK_REQUEST_LIMIT);

    const batchStartTime = Date.now();
    const batchPromises = batchChunksToProcess.map((chunk, batchIndex) => {
      const originalIndex = i + batchIndex;
      const analysisPrompt = CHUNK_STYLE_ANALYSIS_PROMPT_TEMPLATE(chunk, styleTarget);
      return generateText(analysisPrompt, undefined, signal)
        .then(analysis => ({ analysis, originalIndex }))
        .catch(error => {
          if (error.name === 'AbortError') throw error;
          console.warn(`Failed to analyze style for chunk ${originalIndex + 1} of ${totalChunks}: ${error instanceof Error ? error.message : String(error)}. Skipping.`);
          return { analysis: `[Style analysis for segment ${originalIndex + 1} failed or was skipped.]`, originalIndex };
        });
    });

    const batchResults = await Promise.all(batchPromises);
    const batchDurationMs = Date.now() - batchStartTime;
    
    let successfulItemsInBatch = 0;
    for (const result of batchResults) {
      chunkAnalyses[result.originalIndex] = result.analysis;
      analyzedChunksCount++;
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
        const remainingChunks = totalChunks - analyzedChunksCount;
        if (remainingChunks > 0) {
            etrSeconds = Math.round((avgTimePerChunkMs * remainingChunks) / 1000);
        } else {
            etrSeconds = 0;
        }
    }

    let thinkingHint: string | undefined = undefined;
    if (analyzedChunksCount < totalChunks) {
        const nextChunkText = chunks[analyzedChunksCount];
        if (nextChunkText) { // Add check for nextChunkText
            const hintWords = nextChunkText.substring(0, 75).split(' ').slice(0, 7).join(' ');
            thinkingHint = `Next up: style analysis of content starting with "${hintWords}..."`;
        }
    }
    
    const progressPercentage = mapPhaseStartProgress + (analyzedChunksCount / totalChunks) * mapPhaseProgressRange;
    onProgress({
      stage: 'Analyzing Segments',
      current: analyzedChunksCount,
      total: totalChunks,
      percentage: progressPercentage,
      message: `Analyzing style of segment ${analyzedChunksCount} of ${totalChunks}${analysisTargetMsgPart}... (Each segment is large)`,
      etrSeconds: etrSeconds,
      thinkingHint: thinkingHint
    });
  }
  
  const validChunkAnalyses = chunkAnalyses.filter(
    s => typeof s === 'string' && !s.startsWith("[Style analysis for segment")
  ) as string[];

  if (validChunkAnalyses.length === 0 && totalChunks > 0) {
    throw new Error("All segment style analyses failed. Unable to proceed.");
  }
  onProgress({ stage: 'Segment Analysis Complete', percentage: mapPhaseStartProgress + mapPhaseProgressRange, message: `${validChunkAnalyses.length} of ${totalChunks} segments successfully analyzed for style.` });

  // 4. Reduce Phase: Hierarchically combine style analyses
  const reducePhaseStartProgress = mapPhaseStartProgress + mapPhaseProgressRange; // 70%
  const reducePhaseProgressRange = 30; 
  let currentAnalyses = validChunkAnalyses;
  let reductionLevel = 1;
  const initialAnalysesForReduction = currentAnalyses.length;
  let analysesProcessedInReduction = 0;

  if (currentAnalyses.length === 0) { // Handle case where all analyses failed
    onProgress({ stage: 'Completed', percentage: 100, message: 'Style extraction failed as no segments could be analyzed.' });
    return { styleDescription: "Style extraction failed. No segments could be successfully analyzed." };
  }
  if (currentAnalyses.length === 1) { 
     onProgress({ stage: 'Finalizing Style Model', percentage: 95, message: 'Single segment analysis used as final style model.' });
     const finalStyleDescription = currentAnalyses[0];
     onProgress({ stage: 'Completed', percentage: 100, message: 'Style extraction complete.' });
     return { styleDescription: finalStyleDescription };
  }


  while (currentAnalyses.length > 1) {
    checkForCancellation();
    const nextLevelAnalyses: string[] = [];
    const numGroups = Math.ceil(currentAnalyses.length / MAX_REDUCTION_INPUT_SUMMARIES);
    
    let thinkingHintForReduction = `Combining ${currentAnalyses.length} style analyses into approximately ${numGroups} refined models${analysisTargetMsgPart}...`;
    if (numGroups === 1 && currentAnalyses.length > 1) {
        thinkingHintForReduction = `Final synthesis of ${currentAnalyses.length} style analyses${analysisTargetMsgPart}...`;
    } else if (currentAnalyses.length <= MAX_REDUCTION_INPUT_SUMMARIES) {
        thinkingHintForReduction = `Final synthesis of ${currentAnalyses.length} style analyses${analysisTargetMsgPart}...`;
    }

    onProgress({
      stage: 'Synthesizing Style Model',
      percentage: reducePhaseStartProgress + (initialAnalysesForReduction > 0 ? (analysesProcessedInReduction / initialAnalysesForReduction) : 0) * reducePhaseProgressRange,
      message: `Combining style analyses - Level ${reductionLevel} (${currentAnalyses.length} into ~${numGroups})${analysisTargetMsgPart}...`,
      thinkingHint: thinkingHintForReduction
    });
    
    for (let j = 0; j < numGroups; j++) {
      checkForCancellation();
      const groupStartIndex = j * MAX_REDUCTION_INPUT_SUMMARIES;
      const groupEndIndex = Math.min(groupStartIndex + MAX_REDUCTION_INPUT_SUMMARIES, currentAnalyses.length);
      const analysesToCombine = currentAnalyses.slice(groupStartIndex, groupEndIndex);
      
      if (analysesToCombine.length === 1) { 
        nextLevelAnalyses.push(analysesToCombine[0]);
        // Avoid double counting if initialAnalysesForReduction is small
        if (initialAnalysesForReduction > MAX_REDUCTION_INPUT_SUMMARIES) analysesProcessedInReduction += 0.5; 
        else analysesProcessedInReduction += analysesToCombine.length / 2; // approximate
        continue;
      }

      const combinedTextForPrompt = analysesToCombine.map((s, idx) => `Style Analysis from Segment ${idx+1}:\n${s}`).join('\n\n---\n\n');
      const reducePrompt = REDUCE_STYLE_ANALYSES_PROMPT_TEMPLATE(combinedTextForPrompt, styleTarget);
      
      try {
        const reducedAnalysis = await generateText(reducePrompt, undefined, signal);
        nextLevelAnalyses.push(reducedAnalysis);
      } catch (error) {
         if ((error as any).name === 'AbortError') throw error;
         console.warn(`Failed to reduce style analysis group ${j + 1} at level ${reductionLevel}: ${error instanceof Error ? error.message : String(error)}. Using combined inputs as fallback.`);
         nextLevelAnalyses.push(`[Reduction Failed for Style Group] Original Analyses Combined:\n${analysesToCombine.join("\n---\n")}`);
      }
      analysesProcessedInReduction += analysesToCombine.length;

      const currentReductionProgress = reducePhaseStartProgress + (initialAnalysesForReduction > 0 ? (analysesProcessedInReduction / initialAnalysesForReduction) : 0) * reducePhaseProgressRange;
       onProgress({
        stage: 'Synthesizing Style Model',
        current: j + 1,
        total: numGroups,
        percentage: Math.min(currentReductionProgress, reducePhaseStartProgress + reducePhaseProgressRange - 0.1),
        message: `Level ${reductionLevel}: Combined style analysis group ${j + 1} of ${numGroups}${analysisTargetMsgPart}...`,
        thinkingHint: thinkingHintForReduction
      });
    }
    currentAnalyses = nextLevelAnalyses;
    reductionLevel++;
    if (reductionLevel > 10 && currentAnalyses.length > 1) { 
        console.warn(`Exceeded maximum reduction levels (${reductionLevel-1}) for style analyses with ${currentAnalyses.length} items remaining. Using current combined set.`);
        break;
    }
  }
  
  const finalStyleDescription = currentAnalyses[0] || "No comprehensive style model could be generated after reduction phase.";
  onProgress({ stage: 'Style Model Generated', percentage: 98, message: `Final style model compiled${analysisTargetMsgPart}.` }); 
  onProgress({ stage: 'Completed', percentage: 100, message: 'Style extraction process finished.' });

  return { styleDescription: finalStyleDescription };
};