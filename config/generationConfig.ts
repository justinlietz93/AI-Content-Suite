/**
 * Default generation parameters used when feature-specific overrides are not supplied.
 */
export const GENERATION_DEFAULTS = {
  temperature: 0.7,
  maxOutputTokens: 1024,
  reasoningEffort: 'medium' as const,
};

export type ReasoningEffortLevel = typeof GENERATION_DEFAULTS.reasoningEffort | 'low' | 'high';
