
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

// --- New types for Reasoning Studio ---
export type EvidenceMode = 'none' | 'rag' | 'web';
export type Persona = 'none' | 'physicist' | 'software_engineer' | 'project_manager' | 'strategist' | 'data_scientist' | 'custom';
export type ReasoningStyle = 'plain' | 'technical' | 'executive' | 'custom';

export interface ReasoningSafetySettings {
  pii: boolean;
  claimCheck: boolean;
  jailbreak: boolean;
}

export interface ReasoningSettings {
  depth: number;
  breadth: number;
  criticRounds: number;
  evidenceMode: EvidenceMode;
  style: ReasoningStyle;
  customStyle?: string;
  persona: Persona;
  customPersonaDirective?: string;
  temperature: number;
  seed: number;
  budget: number;
  safety: ReasoningSafetySettings;
}

export type ReasoningNodeType = 'goal' | 'phase' | 'task' | 'step' | 'validate' | 'correction';

export interface ReasoningNode {
  id: string;
  type: ReasoningNodeType;
  title: string;
  content: string;
  children?: string[];
  // Task-specific
  assumptions?: string[];
  risks?: string[];
  // Step-specific
  outputs?: string[];
  citations?: { kind: 'file' | 'url'; ref: string; span: [number, number]; title: string }[];
  // Validate-specific
  checks?: {
    evidence: string[];
    constraints: string[];
    success_criteria: string[];
    persona_checks: string[];
  };
  result?: {
    status: 'pass' | 'fail';
    confidence: number;
    failures?: { check: string; reason: string; impacted_steps: string[] }[];
  };
  // Correction-specific
  target_steps?: string[];
  actions?: string[];
}


export interface ReasoningTree {
  version: string;
  goal: string;
  constraints: string[];
  success_criteria: string[];
  settings: ReasoningSettings & { persona: { name: string, directive: string } };
  nodes: ReasoningNode[];
  artifacts: {
    final_md: string;
    exported_at: string;
  };
  audit: {
    model: string;
    tokens_in: number;
    tokens_out: number;
    cost_usd: number;
  };
}

export interface ReasoningOutput {
  finalResponseMd: string;
  reasoningTreeJson: ReasoningTree;
  processingTimeSeconds?: number;
}
// --- End new types ---


export type ProcessedOutput = SummaryOutput | StyleModelOutput | RewriterOutput | MathFormatterOutput | ReasoningOutput;

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
export type Mode = 'technical' | 'styleExtractor' | 'rewriter' | 'mathFormatter' | 'reasoningStudio';
export type RewriteLength = 'short' | 'medium' | 'long';


export interface ProcessingError {
    message: string;
    details?: string; // For stack trace or more info
}
