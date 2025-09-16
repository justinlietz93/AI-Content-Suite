
export interface Highlight {
  text: string;
  relevance?: number; // Optional, depends on LLM output
}

export type SummaryFormat = 'default' | 'sessionHandoff' | 'readme' | 'solutionFinder' | 'timeline' | 'decisionMatrix' | 'pitchGenerator' | 'causeEffectChain' | 'swotAnalysis' | 'checklist' | 'dialogCondensation' | 'graphTreeOutline' | 'entityRelationshipDigest' | 'rulesDistiller' | 'metricsDashboard' | 'qaPairs' | 'processFlow' | 'raciSnapshot' | 'riskRegister' | 'milestoneTracker' | 'glossaryTermMap' | 'hierarchyOfNeeds' | 'stakeholderMap' | 'constraintList' | 'prosConsTable' | 'priorityRanking' | 'agentSystemInstructions';

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
// --- End Reasoning Studio types ---

// --- New types for Project Scaffolder ---
export type ScriptLanguage = 'python' | 'bash';
export type ProjectTemplate = 'api' | 'cli' | 'service' | 'library' | 'web' | 'pipeline' | 'custom';
export type PackageManager = 'pip' | 'uv' | 'npm' | 'pnpm' | 'cargo' | 'go' | 'none';
export type License = 'mit' | 'apache' | 'unlicense' | 'custom';

export interface ScaffolderSettings {
    language: ScriptLanguage;
    template: ProjectTemplate;
    packageManager: PackageManager;
    license: License;
    depth: number;
    criticRounds: number;
}

export interface ScaffoldTreeItem {
    path: string;
    layer: 'presentation' | 'application' | 'domain' | 'infrastructure' | 'shared' | 'tests';
    purpose: string;
    prompt: string; // The generated pseudocode prompt for this file
}

export interface ScaffoldDependency {
    from: string; // file path
    to: string[]; // array of file paths
}

export interface ScaffoldTask {
    goal: string;
    phases: {
        name: string;
        tasks: {
            name: string;
            outputs: string[];
            validate: {
                checks: string[];
                status: 'pending' | 'pass' | 'fail';
            };
        }[];
    }[];
}

export interface ScaffoldPlan {
    project: {
        name: string;
        language: ScriptLanguage;
        template: ProjectTemplate;
        packageManager: PackageManager;
        license: License;
    };
    layers: string[];
    tree: ScaffoldTreeItem[];
    dependencies: ScaffoldDependency[];
    constraints: {
        max_loc_per_file: number;
        enforce_layering: boolean;
        repository_pattern: boolean;
        framework_free_layers: string[];
    };
    tasks: ScaffoldTask[];
}

export interface ScaffolderOutput {
    scaffoldScript: string;
    scaffoldPlanJson: ScaffoldPlan;
    processingTimeSeconds?: number;
}
// --- End Scaffolder types ---

// --- New types for Request Splitter ---
export type SplitterPersona = 'none' | 'engineer' | 'project_manager' | 'physicist' | 'custom';

export interface RequestSplitterSettings {
    projectName: string;
    persona: SplitterPersona;
    customPersonaDirective?: string;
}

export interface SplitPlanPrompt {
    id: number;
    title: string;
    prompt: string;
    dependencies?: number[];
}

export interface SplitPlanJson {
    project: {
        name: string;
        architecture: string;
        invariants: string[];
    };
    prompts: SplitPlanPrompt[];
}


export interface RequestSplitterOutput {
    orderedPromptsMd: string;
    splitPlanJson: SplitPlanJson;
    processingTimeSeconds?: number;
}
// --- End Request Splitter types ---

// --- New types for Prompt Enhancer ---
export type PromptEnhancerTemplate = 'featureBuilder' | 'bugFix' | 'codeReview' | 'architecturalDesign' | 'refactoring' | 'testing' | 'dataAnalysis' | 'custom';

export interface PromptEnhancerSettings {
    rawPrompt: string;
    template: PromptEnhancerTemplate;
}

export interface EnhancedPromptJson {
    template: PromptEnhancerTemplate;
    [key: string]: any; // The rest of the JSON is dynamic
}

export interface PromptEnhancerOutput {
    enhancedPromptMd: string;
    enhancedPromptJson: EnhancedPromptJson;
    processingTimeSeconds?: number;
}
// --- End Prompt Enhancer types ---

// --- New types for Agent Designer ---
export type AgentProvider = 'gemini' | 'openai' | 'ollama' | 'anthropic';
export type ExecutionTrigger = 'eventDriven' | 'scheduled' | 'manual';
export type AgentSystemType = 'singleAgent' | 'multiAgent';

export interface AgentDesignerSettings {
  goal: string;
  provider: AgentProvider;
  trigger: ExecutionTrigger;
  capabilities: {
    webSearch: boolean;
    emailAccess: boolean;
    fileIO: boolean;
    codeExecution: boolean;
  };
  systemType: AgentSystemType;
}

export interface AgentDefinition {
    name: string;
    role: string;
    promptTemplate: string;
    tools: string[];
}

export interface ToolDefinition {
    name: string;
    description: string;
    inputSchema: object;
    outputSchema: object;
}

export interface FineTuningPlan {
    strategy: string;
    baseModel: string;
    datasetSize: string;
    evaluationMetrics: string[];
}

export interface DataCurationPlan {
    sources: string[];
    cleaningSteps: string[];
    formatting: string;
}

export interface AgentSystemPlan {
    systemName: string;
    goal: string;
    trigger: {
        type: ExecutionTrigger;
        details: string;
    };
    architecture: string;
    agents: AgentDefinition[];
    tools: ToolDefinition[];
    dataFlow: string;
    fineTuningPlan?: FineTuningPlan;
    dataCurationPlan?: DataCurationPlan;
}

export interface AgentDesignerOutput {
    designMarkdown: string;
    designPlanJson: AgentSystemPlan;
    designFlowDiagram: string;
    processingTimeSeconds?: number;
}
// --- End Agent Designer types ---


export type ProcessedOutput = SummaryOutput | StyleModelOutput | RewriterOutput | MathFormatterOutput | ReasoningOutput | ScaffolderOutput | RequestSplitterOutput | PromptEnhancerOutput | AgentDesignerOutput;

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
export type Mode = 'technical' | 'styleExtractor' | 'rewriter' | 'mathFormatter' | 'reasoningStudio' | 'scaffolder' | 'requestSplitter' | 'promptEnhancer' | 'agentDesigner';
export type RewriteLength = 'short' | 'medium' | 'long';


export interface ProcessingError {
    message: string;
    details?: string; // For stack trace or more info
}
