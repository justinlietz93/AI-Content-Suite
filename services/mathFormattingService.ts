

import type { ProgressUpdate, MathFormatterOutput } from '../types';
import { generateText } from './geminiService';
import { 
  TARGET_CHUNK_CHAR_SIZE, 
  CONCURRENT_CHUNK_REQUEST_LIMIT,
  CHUNK_MATH_FORMAT_PROMPT_TEMPLATE
} from '../constants';
import { chunkTextByLines } from '../utils';

export const processMathFormatting = async (
  inputText: string,
  onProgress: (update: ProgressUpdate) => void,
  signal?: AbortSignal,
): Promise<MathFormatterOutput> => {

  if (!inputText) {
    throw new Error("Input text is empty or could not be read.");
  }
  
  const checkForCancellation = () => {
    if (signal?.aborted) {
        throw new DOMException('Aborted by user', 'AbortError');
    }
  };
  
  // Handle very small texts directly
  if (inputText.length < TARGET_CHUNK_CHAR_SIZE) {
    onProgress({ stage: 'Formatting Document', percentage: 20, message: `Document is small, formatting directly...` });
    const directFormatPrompt = CHUNK_MATH_FORMAT_PROMPT_TEMPLATE(inputText);
    const formattedContent = await generateText(directFormatPrompt, undefined, signal);
    onProgress({ stage: 'Completed', percentage: 100, message: 'Formatting complete.' });
    return { formattedContent };
  }
  
  checkForCancellation();

  // 2. Chunk Text using a line-aware strategy
  onProgress({ stage: 'Chunking Document', percentage: 15, message: 'Dividing document into manageable segments...' });
  const chunks = chunkTextByLines(inputText, TARGET_CHUNK_CHAR_SIZE);
   if (chunks.length === 0) {
    throw new Error("No chunks were generated despite text size. Check chunking logic/settings.");
  }
  let chunkMessage = `${chunks.length} segments created for formatting.`;
   if (chunks.length > 20) {
    chunkMessage += ` Processing this large document will take some time.`;
  }
  onProgress({ stage: 'Chunking Complete', percentage: 20, total: chunks.length, current: 0, message: chunkMessage });

  // 3. Map Phase: Format each chunk
  const mapPhaseStartProgress = 20;
  const mapPhaseProgressRange = 75; // Give more weight to this phase as it's the main work
  const formattedChunks: (string | null)[] = new Array(chunks.length).fill(null);
  const totalChunks = chunks.length;
  let processedChunksCount = 0;

  for (let i = 0; i < totalChunks; i += CONCURRENT_CHUNK_REQUEST_LIMIT) {
    checkForCancellation();
    const batchChunksToProcess = chunks.slice(i, i + CONCURRENT_CHUNK_REQUEST_LIMIT);

    const batchPromises = batchChunksToProcess.map((chunk, batchIndex) => {
      const originalIndex = i + batchIndex;
      const formatPrompt = CHUNK_MATH_FORMAT_PROMPT_TEMPLATE(chunk);
      return generateText(formatPrompt, undefined, signal)
        .then(formatted => ({ formatted, originalIndex }))
        .catch(error => {
          if (error.name === 'AbortError') throw error;
          console.warn(`Failed to format chunk ${originalIndex + 1} of ${totalChunks}: ${error instanceof Error ? error.message : String(error)}. Using original chunk as fallback.`);
          // Fallback to original chunk content on error to prevent data loss
          return { formatted: chunks[originalIndex], originalIndex }; 
        });
    });

    const batchResults = await Promise.all(batchPromises);
    
    for (const result of batchResults) {
      formattedChunks[result.originalIndex] = result.formatted;
      processedChunksCount++;
    }
    
    const progressPercentage = mapPhaseStartProgress + (processedChunksCount / totalChunks) * mapPhaseProgressRange;
    onProgress({
      stage: 'Formatting Segments',
      current: processedChunksCount,
      total: totalChunks,
      percentage: progressPercentage,
      message: `Formatting segment ${processedChunksCount} of ${totalChunks}...`,
    });
  }
  
  // 4. Join the formatted chunks
  onProgress({ stage: 'Assembling Document', percentage: 95, message: 'Joining formatted segments...' });
  // Since we used non-overlapping, line-aware chunking, we can join them back together.
  // The chunks already have their internal newlines, so we join with a single newline to reconstruct the document.
  const formattedContent = formattedChunks.join('\n');

  onProgress({ stage: 'Completed', percentage: 100, message: 'Formatting process finished.' });

  return { formattedContent };
};