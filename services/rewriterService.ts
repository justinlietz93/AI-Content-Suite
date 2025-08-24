import type { ProgressUpdate, RewriterOutput, RewriteLength } from '../types';
import { generateMultiModalContent } from './geminiService';
import { REWRITER_PROMPT_TEMPLATE } from '../constants';

export const processRewrite = async (
  fileParts: any[], // Parts are pre-formatted in App.tsx
  style: string,
  instructions: string,
  length: RewriteLength,
  onProgress: (update: ProgressUpdate) => void
): Promise<RewriterOutput> => {
  if (!fileParts || fileParts.length === 0) {
    throw new Error("No content provided for rewriting.");
  }

  onProgress({
    stage: 'Preparing Content',
    percentage: 25,
    message: `Preparing ${fileParts.length} content piece(s) for the writer...`,
  });
  
  const instructionPrompt = REWRITER_PROMPT_TEMPLATE(style, instructions, length);
  const promptPart = { text: instructionPrompt };
  
  const allParts = [promptPart, ...fileParts];

  onProgress({
    stage: 'Generating Narrative',
    percentage: 50,
    message: 'The AI writer is crafting your narrative...',
    thinkingHint: 'This may take a few moments depending on the amount of content provided.'
  });

  const rewrittenContent = await generateMultiModalContent(allParts);

  onProgress({
    stage: 'Finalizing Document',
    percentage: 95,
    message: 'Finalizing the generated document.'
  });

  onProgress({
    stage: 'Completed',
    percentage: 100,
    message: 'Rewrite complete.'
  });

  return { rewrittenContent };
};
