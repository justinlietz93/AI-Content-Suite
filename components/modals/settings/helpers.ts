import type {
  ChatGenerationSettings,
  ChatSettings,
  FeatureModelPreferences,
  Mode,
  VectorStoreSettings,
} from '../../../types';
import { INITIAL_CHAT_SETTINGS } from '../../../constants';
import { TABS } from '../../../constants/uiConstants';

/**
 * Ensures numeric inputs intended for modal form fields resolve to a positive
 * integer. When a user provides non-numeric or non-positive content the helper
 * falls back to the supplied default so UI state remains valid.
 *
 * @param value - Candidate numeric value collected from form state.
 * @param fallback - Default applied when the candidate cannot be coerced safely.
 * @returns A positive integer that satisfies provider requirements.
 * @throws This helper does not throw; invalid data uses the fallback instead.
 * @remarks Side effects: none. Timeout and retry semantics: not applicable.
 */
const sanitizePositiveInteger = (value: unknown, fallback: number): number => {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }
  return Math.max(1, Math.round(numeric));
};

/**
 * Converts a raw numeric form input into an optional positive integer. Values
 * that cannot be represented as a strict positive integer resolve to
 * `undefined`, allowing downstream components to treat the field as unset.
 *
 * @param value - Candidate numeric value that may come from uncontrolled input.
 * @returns A sanitized positive integer or `undefined` when the value is invalid.
 * @throws This helper does not throw; invalid values resolve to `undefined`.
 * @remarks Side effects: none. Timeout and retry semantics: not applicable.
 */
const sanitizeOptionalPositiveInteger = (value: unknown): number | undefined => {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return undefined;
  }
  return Math.max(1, Math.round(numeric));
};

const REASONING_EFFORT_VALUES = new Set<ChatGenerationSettings['reasoning']['effort']>([
  'low',
  'medium',
  'high',
]);

/**
 * Guarantees that vector store settings presented in the modal include all
 * required defaults. Nested embedding configuration values are merged
 * recursively so partial persisted objects can be safely edited.
 *
 * @param vectorStore - Optional previously persisted vector store settings.
 * @returns A fully populated vector store configuration object.
 * @throws This helper does not throw; it merges defaults for invalid input.
 * @remarks Side effects: none. Timeout and retry semantics: not applicable.
 */
export const ensureVectorStoreSettings = (
  vectorStore?: VectorStoreSettings,
): VectorStoreSettings => {
  const defaults = INITIAL_CHAT_SETTINGS.vectorStore!;
  return {
    ...defaults,
    ...(vectorStore ?? {}),
    embedding: {
      ...defaults.embedding,
      ...(vectorStore?.embedding ?? {}),
    },
  };
};

/**
 * Produces a sanitized set of generation settings for the settings modal. The
 * helper clamps numeric values, validates reasoning effort enumerations, and
 * merges missing toggles with the chat defaults.
 *
 * @param generation - Optional persisted generation settings to normalize.
 * @returns Sanitized generation settings safe to render in form controls.
 * @throws This helper does not throw; invalid input is replaced by defaults.
 * @remarks Side effects: none. Timeout and retry semantics: not applicable.
 */
const ensureGenerationSettings = (
  generation?: ChatGenerationSettings,
): ChatGenerationSettings => {
  const defaults = INITIAL_CHAT_SETTINGS.generation;
  if (!generation) {
    return {
      maxOutputTokens: defaults.maxOutputTokens,
      temperature: defaults.temperature,
      reasoning: { ...defaults.reasoning },
      thinking: { ...defaults.thinking },
    };
  }

  const temperature = Number.isFinite(generation.temperature)
    ? Math.min(Math.max(generation.temperature, 0), 2)
    : defaults.temperature;

  const resolvedEffort = REASONING_EFFORT_VALUES.has(generation.reasoning.effort)
    ? generation.reasoning.effort
    : defaults.reasoning.effort;

  return {
    maxOutputTokens: sanitizePositiveInteger(generation.maxOutputTokens, defaults.maxOutputTokens),
    temperature,
    reasoning: {
      enabled:
        typeof generation.reasoning.enabled === 'boolean'
          ? generation.reasoning.enabled
          : defaults.reasoning.enabled,
      effort: resolvedEffort,
      budgetTokens: sanitizeOptionalPositiveInteger(generation.reasoning.budgetTokens),
    },
    thinking: {
      enabled:
        typeof generation.thinking.enabled === 'boolean'
          ? generation.thinking.enabled
          : defaults.thinking.enabled,
      budgetTokens: sanitizeOptionalPositiveInteger(generation.thinking.budgetTokens),
    },
  };
};

/**
 * Applies modal-safe defaults across the chat settings payload, ensuring that
 * both vector store and generation subsections are sanitized prior to render or
 * persistence.
 *
 * @param settings - Chat settings object that may contain partial data.
 * @returns A chat settings object with defaults applied to all subsections.
 * @throws This helper does not throw; invalid portions are replaced with defaults.
 * @remarks Side effects: none. Timeout and retry semantics: not applicable.
 */
export const withDefaults = (settings: ChatSettings): ChatSettings => ({
  ...settings,
  vectorStore: ensureVectorStoreSettings(settings.vectorStore),
  generation: ensureGenerationSettings(settings.generation),
});

export const MODE_LABEL_MAP: Record<Mode, string> = TABS.reduce((acc, tab) => {
  acc[tab.id as Mode] = tab.label;
  return acc;
}, {} as Record<Mode, string>);

/**
 * Calculates the number of explicit feature model overrides present so the UI
 * can highlight when custom provider preferences exist.
 *
 * @param preferences - Optional record of feature IDs to preferred model names.
 * @returns The count of configured feature preferences.
 * @throws This helper does not throw; missing input is treated as zero entries.
 * @remarks Side effects: none. Timeout and retry semantics: not applicable.
 */
export const featurePreferenceCount = (
  preferences?: FeatureModelPreferences,
): number => (preferences ? Object.keys(preferences).length : 0);

/**
 * Prepares vector store settings gathered from the modal form for persistence
 * by trimming strings, constraining numeric ranges, and normalizing optional
 * fields. The helper ensures downstream API calls receive consistent payloads.
 *
 * @param vectorStore - Raw vector store configuration captured from the form.
 * @returns Sanitized vector store configuration ready for storage or submission.
 * @throws This helper does not throw; malformed fields are coerced to safe defaults.
 * @remarks Side effects: none. Timeout and retry semantics: not applicable.
 */
export const sanitizeVectorStoreSettings = (
  vectorStore?: VectorStoreSettings,
): VectorStoreSettings => {
  const draft = ensureVectorStoreSettings(vectorStore);
  const parsedTopK = Number(draft.topK);
  const sanitizedTopK = Number.isFinite(parsedTopK) && parsedTopK > 0
    ? Math.min(Math.round(parsedTopK), 20)
    : 5;

  const baseUrl = draft.embedding.baseUrl?.trim();
  const resolvedBaseUrl = baseUrl === '' ? undefined : baseUrl;

  return {
    enabled: Boolean(draft.enabled),
    url: draft.url.trim(),
    apiKey: draft.apiKey?.trim() || undefined,
    collection: draft.collection.trim(),
    topK: sanitizedTopK,
    embedding: {
      provider: draft.embedding.provider,
      model: draft.embedding.model.trim(),
      apiKey: draft.embedding.apiKey?.trim() || undefined,
      baseUrl: resolvedBaseUrl,
    },
  };
};
