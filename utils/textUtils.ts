
/**
 * Chunks a large text into smaller pieces with overlap.
 * @param text The full text to chunk.
 * @param chunkSize Target size of each chunk in characters.
 * @param overlapSize Overlap size in characters.
 * @returns An array of text chunks.
 */
export const chunkText = (text: string, chunkSize: number, overlapSize: number): string[] => {
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

/**
 * Chunks a large text into smaller pieces by grouping lines, ensuring lines are never split.
 * This is a non-overlapping chunking strategy suitable for formatting tasks.
 * @param text The full text to chunk.
 * @param chunkSize Target size of each chunk in characters.
 * @returns An array of text chunks.
 */
export const chunkTextByLines = (text: string, chunkSize: number): string[] => {
    const chunks: string[] = [];
    if (!text) return chunks;

    const lines = text.split('\n');
    let currentChunkLines: string[] = [];
    let currentChunkCharCount = 0;
    
    for (const line of lines) {
        // +1 for the newline character
        if (currentChunkCharCount + line.length + 1 > chunkSize && currentChunkLines.length > 0) {
            chunks.push(currentChunkLines.join('\n'));
            currentChunkLines = [];
            currentChunkCharCount = 0;
        }
        currentChunkLines.push(line);
        currentChunkCharCount += line.length + 1;
    }
    
    if (currentChunkLines.length > 0) {
        chunks.push(currentChunkLines.join('\n'));
    }
    return chunks;
}
