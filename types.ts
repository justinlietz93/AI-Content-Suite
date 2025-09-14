
export interface Highlight {
  text: string;
  relevance?: number; // Optional, depends on LLM output
}

export type SummaryFormat = 'default' | 'sessionHandoff' | 'readme' | 'solutionFinder' | 'timeline' | 'decisionMatrix' | 'pitchGenerator' | 'causeEffectChain' | 'swotAnalysis' | 'checklist' | 'dialogCondensation' | 'graphTreeOutline' | 'entityRelationshipDigest' | 'rulesDistiller' | 'metricsDashboard' | 'qaPairs' | 'processFlow' | 'raciSnapshot' | 'riskRegister' | 'milestoneTracker' | 'glossaryTermMap' | 'hierarchyOfNeeds' | 'stakeholderMap' | 'constraintList';

export interface SummaryOutput {
  finalSummary: string;
  highlights: Highlight[];
  processingTimeSeconds?: number;
  summaryFormat?: SummaryFormat;
  mermaidDiagram?: string;
  mermaidDiagramSimple?: string;
}

export interface StyleModelOutput {
  styleDescription: string;
  processingTimeSeconds?: number;
}

export interface RewriterOutput {
  rewrittenContent: string;
  processingTimeSeconds?: number;
}

export interface MathFormatterOutput {
  formattedContent: string;
  processingTimeSeconds?: number;
}

export type ProcessedOutput = SummaryOutput | StyleModelOutput | RewriterOutput | MathFormatterOutput;

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
export type Mode = 'technical' | 'styleExtractor' | 'rewriter' | 'mathFormatter';
export type RewriteLength = 'short' | 'medium' | 'long';


export interface ProcessingError {
    message: string;
    details?: string; // For stack trace or more info
}