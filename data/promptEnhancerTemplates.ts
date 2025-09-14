import type { PromptEnhancerTemplate } from '../types';

export interface PromptEnhancerTemplateOption {
  value: PromptEnhancerTemplate;
  label: string;
  description: string;
}

export const PROMPT_ENHANCER_TEMPLATE_OPTIONS: PromptEnhancerTemplateOption[] = [
  {
    value: 'featureBuilder',
    label: 'Feature Builder',
    description: "For creating a new feature specification.",
  },
  {
    value: 'bugFix',
    label: 'Bug Fix',
    description: "For describing a defect and the expected behavior.",
  },
  {
    value: 'codeReview',
    label: 'Code Review',
    description: "For defining goals and checklists for a code review.",
  },
  {
    value: 'architecturalDesign',
    label: 'Architectural Design',
    description: "For outlining a system design with constraints.",
  },
  {
    value: 'refactoring',
    label: 'Refactoring',
    description: "For defining a refactoring task with risks and goals.",
  },
  {
    value: 'testing',
    label: 'Testing Plan',
    description: "For creating unit/integration test plans.",
  },
  {
    value: 'dataAnalysis',
    label: 'Data Analysis / Report',
    description: "For requesting a data analysis or report.",
  },
  {
    value: 'custom',
    label: 'Custom',
    description: "For freeform prompts using a custom structure.",
  }
];
