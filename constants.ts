
import type { ProgressUpdate, ReasoningSettings, ScaffolderSettings, RequestSplitterSettings } from './types';

// Import all summary prompts from the new modular structure
import * as summaryPrompts from './prompts/summaries';

// Import other specific prompts
import { HIGHLIGHT_EXTRACTION_PROMPT_TEMPLATE } from './prompts/highlightExtraction';
import { NEXT_STEPS_TECHNICAL_SUMMARY_PROMPT_TEMPLATE, NEXT_STEPS_STYLE_MODEL_PROMPT_TEMPLATE } from './prompts/nextSteps';
import { SINGLE_TEXT_STYLE_EXTRACTION_PROMPT_TEMPLATE, CHUNK_STYLE_ANALYSIS_PROMPT_TEMPLATE, REDUCE_STYLE_ANALYSES_PROMPT_TEMPLATE } from './prompts/styleExtraction';
import { REWRITER_PROMPT_TEMPLATE } from './prompts/rewriter';
import { CHUNK_MATH_FORMAT_PROMPT_TEMPLATE } from './prompts/mathFormatting';
import { GENERATE_MERMAID_FROM_DIGEST_PROMPT, GENERATE_SIMPLIFIED_MERMAID_PROMPT } from './prompts/mermaid';
import { REASONING_STUDIO_PROMPT_TEMPLATE } from './prompts/reasoning';
import { SCAFFOLDER_PROMPT_TEMPLATE } from './prompts/scaffolder';
import { REQUEST_SPLITTER_PROMPT_TEMPLATE } from './prompts/requestSplitter';


export const GEMINI_FLASH_MODEL = 'gemini-2.5-flash';

// Approximate token estimation: 1 token ~ 4 characters.
// Target chunk size for LLM processing. Drastically increased to maximize model's context window.
// Aiming for ~112.5k tokens (450k chars) within the 128k token limit of gemini-2.5-flash.
export const TARGET_CHUNK_CHAR_SIZE = 450000; 
// Overlap characters to maintain context between chunks, adjusted for new chunk size (10%).
export const CHUNK_OVERLAP_CHAR_SIZE = 45000; 

export const MAX_REDUCTION_INPUT_SUMMARIES = 5; // Number of summaries/analyses to combine in one reduction step

// Low concurrency as individual chunk processing calls will be very large and take significant time.
export const CONCURRENT_CHUNK_REQUEST_LIMIT = 2; 

// New constants for hierarchical "power" mode
export const HIERARCHICAL_CONCURRENT_CHUNK_REQUEST_LIMIT = 5; // Reduced from 10 to avoid rate limiting
export const HIERARCHICAL_CHUNK_GROUP_SIZE = 3;

export const INITIAL_PROGRESS: ProgressUpdate = {
  stage: 'Idle',
  percentage: 0,
  message: 'Waiting for file selection.'
};

export const INITIAL_REASONING_SETTINGS: ReasoningSettings = {
    depth: 3,
    breadth: 2,
    criticRounds: 1,
    evidenceMode: 'none',
    style: 'plain',
    customStyle: '',
    persona: 'none',
    customPersonaDirective: '',
    temperature: 0.3,
    seed: 42,
    budget: 0.25,
    safety: {
        pii: true,
        claimCheck: true,
        jailbreak: true
    }
};

export const INITIAL_SCAFFOLDER_SETTINGS: ScaffolderSettings = {
    language: 'python',
    template: 'api',
    packageManager: 'pip',
    license: 'mit',
    depth: 2,
    criticRounds: 1
};

export const INITIAL_REQUEST_SPLITTER_SETTINGS: RequestSplitterSettings = {
    projectName: '',
    persona: 'none',
    customPersonaDirective: '',
};

// --- Prompt Collections (Re-constructed from imports) ---
export const CHUNK_SUMMARY_PROMPTS = {
  default: summaryPrompts.CHUNK_SUMMARY_PROMPT_TEMPLATE_DEFAULT,
  sessionHandoff: summaryPrompts.CHUNK_SUMMARY_PROMPT_TEMPLATE_SESSION_HANDOFF,
  readme: summaryPrompts.CHUNK_SUMMARY_PROMPT_TEMPLATE_README,
  solutionFinder: summaryPrompts.CHUNK_SUMMARY_PROMPT_TEMPLATE_SOLUTION_FINDER,
  timeline: summaryPrompts.CHUNK_SUMMARY_PROMPT_TEMPLATE_TIMELINE,
  decisionMatrix: summaryPrompts.CHUNK_SUMMARY_PROMPT_TEMPLATE_DECISION_MATRIX,
  pitchGenerator: summaryPrompts.CHUNK_SUMMARY_PROMPT_TEMPLATE_PITCH_GENERATOR,
  causeEffectChain: summaryPrompts.CHUNK_SUMMARY_PROMPT_TEMPLATE_CAUSE_EFFECT_CHAIN,
  swotAnalysis: summaryPrompts.CHUNK_SUMMARY_PROMPT_TEMPLATE_SWOT_ANALYSIS,
  checklist: summaryPrompts.CHUNK_SUMMARY_PROMPT_TEMPLATE_CHECKLIST,
  dialogCondensation: summaryPrompts.CHUNK_SUMMARY_PROMPT_TEMPLATE_DIALOG_CONDENSATION,
  graphTreeOutline: summaryPrompts.CHUNK_SUMMARY_PROMPT_TEMPLATE_GRAPH_TREE_OUTLINE,
  entityRelationshipDigest: summaryPrompts.CHUNK_SUMMARY_PROMPT_TEMPLATE_ENTITY_RELATIONSHIP_DIGEST,
  rulesDistiller: summaryPrompts.CHUNK_SUMMARY_PROMPT_TEMPLATE_RULES_DISTILLER,
  metricsDashboard: summaryPrompts.CHUNK_SUMMARY_PROMPT_TEMPLATE_METRICS_DASHBOARD,
  qaPairs: summaryPrompts.CHUNK_SUMMARY_PROMPT_TEMPLATE_QA_PAIRS,
  processFlow: summaryPrompts.CHUNK_SUMMARY_PROMPT_TEMPLATE_PROCESS_FLOW,
  raciSnapshot: summaryPrompts.CHUNK_SUMMARY_PROMPT_TEMPLATE_RACI_SNAPSHOT,
  riskRegister: summaryPrompts.CHUNK_SUMMARY_PROMPT_TEMPLATE_RISK_REGISTER,
  milestoneTracker: summaryPrompts.CHUNK_SUMMARY_PROMPT_TEMPLATE_MILESTONE_TRACKER,
  glossaryTermMap: summaryPrompts.CHUNK_SUMMARY_PROMPT_TEMPLATE_GLOSSARY_TERM_MAP,
  hierarchyOfNeeds: summaryPrompts.CHUNK_SUMMARY_PROMPT_TEMPLATE_HIERARCHY_OF_NEEDS,
  stakeholderMap: summaryPrompts.CHUNK_SUMMARY_PROMPT_TEMPLATE_STAKEHOLDER_MAP,
  constraintList: summaryPrompts.CHUNK_SUMMARY_PROMPT_TEMPLATE_CONSTRAINT_LIST,
  prosConsTable: summaryPrompts.CHUNK_SUMMARY_PROMPT_TEMPLATE_PROS_CONS_TABLE,
  priorityRanking: summaryPrompts.CHUNK_SUMMARY_PROMPT_TEMPLATE_PRIORITY_RANKING
};

export const REDUCE_SUMMARIES_PROMPTS = {
  default: summaryPrompts.REDUCE_SUMMARIES_PROMPT_TEMPLATE_DEFAULT,
  sessionHandoff: summaryPrompts.REDUCE_SUMMARIES_PROMPT_TEMPLATE_SESSION_HANDOFF,
  readme: summaryPrompts.REDUCE_SUMMARIES_PROMPT_TEMPLATE_README,
  solutionFinder: summaryPrompts.REDUCE_SUMMARIES_PROMPT_TEMPLATE_SOLUTION_FINDER,
  timeline: summaryPrompts.REDUCE_SUMMARIES_PROMPT_TEMPLATE_TIMELINE,
  decisionMatrix: summaryPrompts.REDUCE_SUMMARIES_PROMPT_TEMPLATE_DECISION_MATRIX,
  pitchGenerator: summaryPrompts.REDUCE_SUMMARIES_PROMPT_TEMPLATE_PITCH_GENERATOR,
  causeEffectChain: summaryPrompts.REDUCE_SUMMARIES_PROMPT_TEMPLATE_CAUSE_EFFECT_CHAIN,
  swotAnalysis: summaryPrompts.REDUCE_SUMMARIES_PROMPT_TEMPLATE_SWOT_ANALYSIS,
  checklist: summaryPrompts.REDUCE_SUMMARIES_PROMPT_TEMPLATE_CHECKLIST,
  dialogCondensation: summaryPrompts.REDUCE_SUMMARIES_PROMPT_TEMPLATE_DIALOG_CONDENSATION,
  graphTreeOutline: summaryPrompts.REDUCE_SUMMARIES_PROMPT_TEMPLATE_GRAPH_TREE_OUTLINE,
  entityRelationshipDigest: summaryPrompts.REDUCE_SUMMARIES_PROMPT_TEMPLATE_ENTITY_RELATIONSHIP_DIGEST,
  rulesDistiller: summaryPrompts.REDUCE_SUMMARIES_PROMPT_TEMPLATE_RULES_DISTILLER,
  metricsDashboard: summaryPrompts.REDUCE_SUMMARIES_PROMPT_TEMPLATE_METRICS_DASHBOARD,
  qaPairs: summaryPrompts.REDUCE_SUMMARIES_PROMPT_TEMPLATE_QA_PAIRS,
  processFlow: summaryPrompts.REDUCE_SUMMARIES_PROMPT_TEMPLATE_PROCESS_FLOW,
  raciSnapshot: summaryPrompts.REDUCE_SUMMARIES_PROMPT_TEMPLATE_RACI_SNAPSHOT,
  riskRegister: summaryPrompts.REDUCE_SUMMARIES_PROMPT_TEMPLATE_RISK_REGISTER,
  milestoneTracker: summaryPrompts.REDUCE_SUMMARIES_PROMPT_TEMPLATE_MILESTONE_TRACKER,
  glossaryTermMap: summaryPrompts.REDUCE_SUMMARIES_PROMPT_TEMPLATE_GLOSSARY_TERM_MAP,
  hierarchyOfNeeds: summaryPrompts.REDUCE_SUMMARIES_PROMPT_TEMPLATE_HIERARCHY_OF_NEEDS,
  stakeholderMap: summaryPrompts.REDUCE_SUMMARIES_PROMPT_TEMPLATE_STAKEHOLDER_MAP,
  constraintList: summaryPrompts.REDUCE_SUMMARIES_PROMPT_TEMPLATE_CONSTRAINT_LIST,
  prosConsTable: summaryPrompts.REDUCE_SUMMARIES_PROMPT_TEMPLATE_PROS_CONS_TABLE,
  priorityRanking: summaryPrompts.REDUCE_SUMMARIES_PROMPT_TEMPLATE_PRIORITY_RANKING
};

// Re-export other prompts so other files don't need to change their imports
export { 
    GENERATE_MERMAID_FROM_DIGEST_PROMPT, 
    GENERATE_SIMPLIFIED_MERMAID_PROMPT, 
    HIGHLIGHT_EXTRACTION_PROMPT_TEMPLATE,
    NEXT_STEPS_TECHNICAL_SUMMARY_PROMPT_TEMPLATE,
    NEXT_STEPS_STYLE_MODEL_PROMPT_TEMPLATE,
    SINGLE_TEXT_STYLE_EXTRACTION_PROMPT_TEMPLATE,
    CHUNK_STYLE_ANALYSIS_PROMPT_TEMPLATE,
    REDUCE_STYLE_ANALYSES_PROMPT_TEMPLATE,
    REWRITER_PROMPT_TEMPLATE,
    CHUNK_MATH_FORMAT_PROMPT_TEMPLATE,
    REASONING_STUDIO_PROMPT_TEMPLATE,
    SCAFFOLDER_PROMPT_TEMPLATE,
    REQUEST_SPLITTER_PROMPT_TEMPLATE
};
