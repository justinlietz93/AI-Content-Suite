export interface Highlight {
  text: string;
  relevance?: number; // Optional, depends on LLM output
}

export interface SummaryOutput {
  finalSummary: string;
  highlights: Highlight[];
  processingTimeSeconds?: number;
}

export interface StyleModelOutput {
  styleDescription: string;
  processingTimeSeconds?: number;
}

export type ProcessedOutput = SummaryOutput | StyleModelOutput;

export interface ProgressUpdate {
  stage: string;
  current?: number;
  total?: number;
  percentage: number;
  message?: string;
  etrSeconds?: number; // Estimated time remaining in seconds
  thinkingHint?: string; // Short insight into current/next processing step
}

export type AppState = 'idle' | 'fileSelected' | 'processing' | 'completed' | 'error';
export type Mode = 'technical' | 'styleExtractor';

export interface ProcessingError {
    message: string;
    details?: string; // For stack trace or more info
}