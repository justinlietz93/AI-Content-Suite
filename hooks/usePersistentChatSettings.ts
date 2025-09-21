import { useEffect, useState } from 'react';
import type { ChatGenerationSettings, ChatSettings } from '../types';
import { INITIAL_CHAT_SETTINGS } from '../constants';

const REASONING_EFFORT_VALUES = new Set(['low', 'medium', 'high']);

/**
 * Normalizes raw numeric input that should represent a strictly positive
 * integer. Non-finite, zero, or negative values are replaced by a caller
 * supplied fallback so persisted configuration settings remain valid.
 *
 * @param value - Incoming numeric candidate sourced from storage or user input.
 * @param fallback - Safe default value applied when the candidate is invalid.
 * @returns A positive integer suitable for downstream settings storage.
 * @throws This helper does not throw; invalid data paths fall back to the
 *   provided default instead of raising.
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
 * Converts an arbitrary numeric candidate into an optional positive integer
 * suitable for provider configuration settings. Invalid or non-positive inputs
 * resolve to `undefined` so optional form fields can be cleared safely.
 *
 * @param value - Candidate numeric value that may be undefined or malformed.
 * @returns A sanitized positive integer when the candidate is valid; otherwise
 *   `undefined`.
 * @throws This helper does not throw; invalid data coerce to `undefined`.
 * @remarks Side effects: none. Timeout and retry semantics: not applicable.
 */
const sanitizeOptionalPositiveInteger = (value: unknown): number | undefined => {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return undefined;
  }
  return Math.max(1, Math.round(numeric));
};

/**
 * Merges loosely typed persisted generation settings with the canonical chat
 * defaults. Each nested property is validated to ensure feature toggles and
 * numeric ranges remain within provider-supported bounds.
 *
 * @param candidate - Raw persisted object retrieved from storage or defaults.
 * @returns A fully populated `ChatGenerationSettings` instance with sanitized
 *   numeric values and fallback toggles.
 * @throws This helper does not throw; malformed input is replaced by defaults.
 * @remarks Side effects: none. Timeout and retry semantics: not applicable.
 */
const mergeGenerationSettings = (candidate: unknown): ChatGenerationSettings => {
  const defaults = INITIAL_CHAT_SETTINGS.generation;
  if (!candidate || typeof candidate !== 'object') {
    return {
      maxOutputTokens: defaults.maxOutputTokens,
      temperature: defaults.temperature,
      reasoning: { ...defaults.reasoning },
      thinking: { ...defaults.thinking },
    };
  }

  const raw = candidate as Partial<ChatGenerationSettings> & Record<string, unknown>;
  const rawReasoning =
    raw.reasoning && typeof raw.reasoning === 'object' ? raw.reasoning : defaults.reasoning;
  const rawThinking =
    raw.thinking && typeof raw.thinking === 'object' ? raw.thinking : defaults.thinking;

  const resolvedEffort =
    typeof rawReasoning.effort === 'string' && REASONING_EFFORT_VALUES.has(rawReasoning.effort)
      ? (rawReasoning.effort as ChatGenerationSettings['reasoning']['effort'])
      : defaults.reasoning.effort;

  const sanitizedTemperature = (() => {
    const numeric = typeof raw.temperature === 'number' ? raw.temperature : Number(raw.temperature);
    if (!Number.isFinite(numeric)) {
      return defaults.temperature;
    }
    return Math.min(Math.max(numeric, 0), 2);
  })();

  return {
    maxOutputTokens: sanitizePositiveInteger(raw.maxOutputTokens, defaults.maxOutputTokens),
    temperature: sanitizedTemperature,
    reasoning: {
      enabled:
        typeof rawReasoning.enabled === 'boolean'
          ? rawReasoning.enabled
          : defaults.reasoning.enabled,
      effort: resolvedEffort,
      budgetTokens: sanitizeOptionalPositiveInteger(rawReasoning.budgetTokens),
    },
    thinking: {
      enabled:
        typeof rawThinking.enabled === 'boolean' ? rawThinking.enabled : defaults.thinking.enabled,
      budgetTokens: sanitizeOptionalPositiveInteger(rawThinking.budgetTokens),
    },
  };
};

const CHAT_SETTINGS_STORAGE_KEY = 'ai_content_suite_chat_settings';

/**
 * Loads chat settings from `localStorage`, sanitizes the persisted payload, and
 * merges it with the current application defaults. When parsing fails or the
 * environment lacks browser APIs the defaults are returned unchanged.
 *
 * @returns A sanitized `ChatSettings` object ready for React state initialisation.
 * @throws This helper does not throw; JSON parsing errors are caught and logged
 *   before falling back to defaults.
 * @remarks Side effects: reads from `localStorage` when running in a browser.
 *   Timeout and retry semantics: not applicable to synchronous storage access.
 */
const getInitialChatSettings = (): ChatSettings => {
  if (typeof window === 'undefined') {
    return INITIAL_CHAT_SETTINGS;
  }

  try {
    const saved = localStorage.getItem(CHAT_SETTINGS_STORAGE_KEY);
    if (!saved) {
      return INITIAL_CHAT_SETTINGS;
    }

    const parsed = JSON.parse(saved);
    if (!parsed || typeof parsed !== 'object') {
      return INITIAL_CHAT_SETTINGS;
    }

    const defaults = INITIAL_CHAT_SETTINGS.vectorStore;
    const parsedVectorStore =
      parsed.vectorStore && typeof parsed.vectorStore === 'object' ? parsed.vectorStore : {};

    const mergedVectorStore = defaults
      ? {
          ...defaults,
          ...parsedVectorStore,
          embedding: {
            ...defaults.embedding,
            ...(parsedVectorStore.embedding ?? {}),
          },
        }
      : parsedVectorStore;

    const mergedGeneration = mergeGenerationSettings((parsed as Record<string, unknown>).generation);

    return {
      ...INITIAL_CHAT_SETTINGS,
      ...parsed,
      generation: mergedGeneration,
      vectorStore: mergedVectorStore,
    } as ChatSettings;
  } catch (error) {
    console.error('Failed to load chat settings from local storage:', error);
    return INITIAL_CHAT_SETTINGS;
  }
};

/**
 * React hook that exposes chat settings backed by `localStorage`. The hook
 * seeds state from sanitized persisted values, writes changes back whenever the
 * settings object updates, and ensures server-side rendering contexts fall back
 * to compile-time defaults.
 *
 * @returns Read/write accessors for the persistent chat settings tuple.
 * @throws This hook does not throw; storage errors are logged and ignored.
 * @remarks Side effects: writes to and reads from `localStorage` in browser
 *   environments. Timeout and retry semantics: not applicable because storage
 *   operations are synchronous.
 */
export const usePersistentChatSettings = () => {
  const [chatSettings, setChatSettings] = useState<ChatSettings>(getInitialChatSettings);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(CHAT_SETTINGS_STORAGE_KEY, JSON.stringify(chatSettings));
    } catch (error) {
      console.error('Failed to save chat settings to local storage:', error);
    }
  }, [chatSettings]);

  return { chatSettings, setChatSettings } as const;
};
