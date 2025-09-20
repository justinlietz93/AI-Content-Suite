
import type { SummaryFormat } from '../types';

export interface SummaryFormatOption {
  value: SummaryFormat;
  label: string;
  description: string;
  tags: string[];
}

export const SUMMARY_FORMAT_OPTIONS: SummaryFormatOption[] = [
  {
    value: 'default',
    label: 'Default Summary',
    description: "A concise, readable summary of the key points.",
    tags: ['general', 'standard', 'prose', 'text']
  },
  {
    value: 'sessionHandoff',
    label: 'Session Handoff for AI Agent',
    description: "A structured, detailed summary for another AI to process.",
    tags: ['ai', 'agent', 'structured', 'handoff', 'technical', 'json-like']
  },
  {
    value: 'readme',
    label: 'README.md Format',
    description: "Formats the summary as a project README.md file.",
    tags: ['documentation', 'project', 'code', 'technical', 'markdown', 'github']
  },
  {
    value: 'solutionFinder',
    label: 'Solution Finder Guide',
    description: "Identifies solutions in the text and formats them as a step-by-step guide with copyable commands.",
    tags: ['troubleshooting', 'guide', 'how-to', 'technical', 'code', 'steps']
  },
  {
    value: 'timeline',
    label: 'Timeline Format',
    description: "Generates a chronological list of key events, dates, and outcomes. Good for projects, history, or step-by-step processes.",
    tags: ['chronological', 'history', 'project management', 'events', 'sequence', 'date']
  },
  {
    value: 'decisionMatrix',
    label: 'Decision Matrix',
    description: "Extracts and organizes comparisons into a structured decision matrix table. Ideal for analyzing trade-offs.",
    tags: ['comparison', 'analysis', 'table', 'business', 'trade-off', 'matrix']
  },
  {
    value: 'pitchGenerator',
    label: 'Multi-Audience Pitch',
    description: "Generates a multi-audience pitch (Technical, Investor, User) from the content, covering problem, solution, benefits, and more.",
    tags: ['business', 'investor', 'marketing', 'strategy', 'presentation', 'startup']
  },
  {
    value: 'causeEffectChain',
    label: 'Cause-Effect Chain',
    description: "Identifies and links root causes (drivers) to their immediate outcomes and broader consequences. Excellent for root cause analysis.",
    tags: ['analysis', 'root cause', 'r-c-a', 'systems', 'troubleshooting', 'logic']
  },
  {
    value: 'swotAnalysis',
    label: 'SWOT Analysis',
    description: "Generates a SWOT matrix (Strengths, Weaknesses, Opportunities, Threats) for strategic planning or product evaluation.",
    tags: ['business', 'strategy', 'analysis', 'matrix', 'planning']
  },
  {
    value: 'checklist',
    label: 'Checklist Format',
    description: "Distills discussions and documents into a concrete, trackable list of action items with completion statuses.",
    tags: ['action items', 'tasks', 'project management', 'todo', 'list']
  },
  {
    value: 'dialogCondensation',
    label: 'Dialog-Style Condensation',
    description: "Condenses conversations into a compact, speaker-tagged log of key statements, decisions, and actions. Ideal for meeting minutes.",
    tags: ['meeting', 'conversation', 'transcript', 'minutes', 'dialogue', 'people']
  },
  {
    value: 'graphTreeOutline',
    label: 'Graph / Tree Outline',
    description: "Organizes content into a hierarchical tree structure with a root, branches, and leaves. Excellent for showing dependencies and structure.",
    tags: ['hierarchy', 'structure', 'outline', 'mind map', 'data', 'graph']
  },
  {
    value: 'entityRelationshipDigest',
    label: 'Entity-Relationship Digest',
    description: "Extracts key entities, their attributes, and their relationships to create a lightweight semantic map of the content. Ideal for data-heavy docs.",
    tags: ['data', 'database', 'systems', 'technical', 'diagram', 'e-r-d', 'graph']
  },
  {
    value: 'rulesDistiller',
    label: 'Rules Distiller',
    description: "Extracts all hard technical rules, syntax, and constraints into a dense, imperative-style reference list. Ideal for compliance checks.",
    tags: ['compliance', 'technical', 'constraints', 'documentation', 'syntax', 'rules']
  },
  {
    value: 'agentSystemInstructions',
    label: 'Agent System Instructions',
    description: "Distills the content into a set of clear, concise system instructions for configuring an AI agent's behavior.",
    tags: ['ai', 'agent', 'system prompt', 'instructions', 'configuration', 'rules']
  },
  {
    value: 'reverseEngineering',
    label: 'Reverse Engineering Plan',
    description: "Analyzes a codebase to produce an architectural overview, dependency map, and a plan to rebuild it.",
    tags: ['code', 'technical', 'architecture', 'analysis', 'reverse engineering', 'project']
  },
  {
    value: 'systemWalkthrough',
    label: 'System Walkthrough',
    description: 'Explains how a system works with design rationale and an example operational loop. Ideal for codebases or technical docs.',
    tags: ['code', 'technical', 'architecture', 'explanation', 'documentation', 'walkthrough']
  },
  {
    value: 'metricsDashboard',
    label: 'Metrics Dashboard Snapshot',
    description: "Distills raw data into a numeric baseline table of key indicators (KPIs) and their values like current, min, max, and average.",
    tags: ['kpi', 'data', 'dashboard', 'business', 'table', 'analysis', 'numbers']
  },
  {
    value: 'qaPairs',
    label: 'Q&A Pairs',
    description: "Transforms unstructured text into a clear, searchable list of questions and answers. Ideal for meeting minutes, FAQs, and knowledge capture.",
    tags: ['faq', 'interview', 'meeting', 'questions', 'answers', 'knowledge base']
  },
  {
    value: 'processFlow',
    label: 'Process Flow / Stepwise Map',
    description: "Converts complex procedures into a clear, sequential map of states and transitions. Excellent for workflows, protocols, and troubleshooting guides.",
    tags: ['workflow', 'steps', 'guide', 'procedure', 'diagram', 'how-to', 'sequence']
  },
  {
    value: 'raciSnapshot',
    label: 'RACI Snapshot',
    description: "Condenses tasks and ownership for AI agents into a single responsibility map (Responsible, Accountable, Consulted, Informed).",
    tags: ['project management', 'roles', 'ownership', 'matrix', 'table', 'ai', 'agent']
  },
  {
    value: 'riskRegister',
    label: 'Risk Register Digest',
    description: "Distills uncertainties, their severity, and their countermeasures into a single compact risk register table. Ideal for project management.",
    tags: ['project management', 'risk', 'analysis', 'table', 'strategy', 'planning']
  },
  {
    value: 'milestoneTracker',
    label: 'Milestone Tracker',
    description: "Compresses a project timeline into discrete, accountable checkpoints (milestones), making delivery progress transparent and traceable.",
    tags: ['project management', 'timeline', 'delivery', 'table', 'tracking', 'date']
  },
  {
    value: 'glossaryTermMap',
    label: 'Glossary / Term Map',
    description: "Distills key concepts and their relationships into a structured reference, ensuring clarity and consistency across complex contexts.",
    tags: ['definitions', 'terms', 'documentation', 'knowledge base', 'dictionary', 'vocabulary']
  },
  {
    value: 'hierarchyOfNeeds',
    label: 'Hierarchy of Needs / Pyramid',
    description: "Distills layered dependencies and priorities into a structured stack, highlighting what must be built first to sustain higher-level outcomes.",
    tags: ['strategy', 'priorities', 'dependencies', 'pyramid', 'planning', 'structure']
  },
  {
    value: 'stakeholderMap',
    label: 'Stakeholder Map',
    description: "Distills who is involved, what they want, and their influence into a clear map of project dynamics and communication priorities.",
    tags: ['project management', 'people', 'roles', 'strategy', 'communication', 'business']
  },
  {
    value: 'constraintList',
    label: 'Constraint / Requirement List',
    description: "Condenses project essentials, priorities, and trade-offs into a structured MoSCoW list (Must/Should/Could/Won't).",
    tags: ['requirements', 'scoping', 'project management', 'moscow', 'technical', 'planning']
  },
  {
    value: 'prosConsTable',
    label: 'Pros & Cons Table',
    description: "Distills trade-offs into a simple, scannable grid, making evaluations faster and reasoning more transparent.",
    tags: ['comparison', 'analysis', 'table', 'business', 'trade-off', 'decision']
  },
  {
    value: 'priorityRanking',
    label: 'Priority Ranking',
    description: "Compresses what matters most and in what order into a single ordered list, guiding focus and execution.",
    tags: ['project management', 'ranking', 'priorities', 'tasks', 'strategy', 'list']
  }
];