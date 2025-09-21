import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AIProviderSettings, FeatureModelPreferences, Mode } from '../types';
import { DEFAULT_PROVIDER_MODELS, INITIAL_AI_PROVIDER_SETTINGS } from '../constants';
import { GENERATION_DEFAULTS } from '../config/generationConfig';
import { AI_PROVIDERS, getProviderLabel } from '../services/providerRegistry';
import { sanitizeFeatureModelPreferences } from '../utils/providerSettings';

const PROVIDER_SETTINGS_STORAGE_KEY = 'ai_content_suite_provider_settings';
const AVAILABLE_PROVIDER_IDS = new Set(AI_PROVIDERS.map(provider => provider.id));

/**
 * Determines whether feature model preferences include any explicit overrides.
 * The helper distinguishes between empty objects and undefined values so the UI
 * can reflect whether per-feature provider choices are active.
 *
 * @param preferences - Optional record of feature IDs mapped to provider/model overrides.
 * @returns `true` when at least one override exists; otherwise `false`.
 * @throws This helper does not throw; falsy input is treated as having no overrides.
 * @remarks Side effects: none. Timeout and retry semantics: not applicable.
 */
const hasOverrides = (preferences?: FeatureModelPreferences): boolean =>
  Boolean(preferences && Object.keys(preferences).length > 0);

/**
 * Normalizes provider settings originating from persisted storage or runtime
 * updates. The helper validates provider/model identifiers, prunes empty API
 * keys, and clamps generation budgets to provider-supported ranges.
 *
 * @param settings - Provider configuration object to sanitize.
 * @returns A sanitized provider settings object that adheres to application defaults.
 * @throws This helper does not throw; invalid fields are replaced with defaults.
 * @remarks Side effects: none. Timeout and retry semantics: not applicable.
 */
const sanitizeSettings = (settings: AIProviderSettings): AIProviderSettings => {
  const selectedProvider = AVAILABLE_PROVIDER_IDS.has(settings.selectedProvider)
    ? settings.selectedProvider
    : INITIAL_AI_PROVIDER_SETTINGS.selectedProvider;

  const fallbackModel =
    DEFAULT_PROVIDER_MODELS[selectedProvider] ??
    DEFAULT_PROVIDER_MODELS[INITIAL_AI_PROVIDER_SETTINGS.selectedProvider];

  const selectedModel =
    typeof settings.selectedModel === 'string' && settings.selectedModel.trim().length > 0
      ? settings.selectedModel.trim()
      : fallbackModel;

  const apiKeys =
    settings.apiKeys && typeof settings.apiKeys === 'object' && settings.apiKeys !== null
      ? settings.apiKeys
      : {};

  const sanitizedPreferences = sanitizeFeatureModelPreferences(settings.featureModelPreferences);
  const maxOutputTokens = Number.isFinite(settings.maxOutputTokens)
    ? Math.max(1, Math.round(settings.maxOutputTokens))
    : GENERATION_DEFAULTS.maxOutputTokens;

  return {
    selectedProvider,
    selectedModel,
    apiKeys,
    featureModelPreferences: hasOverrides(sanitizedPreferences) ? sanitizedPreferences : undefined,
    maxOutputTokens,
  };
};

/**
 * Reads provider settings from `localStorage`, sanitizes the persisted payload,
 * and merges it with compile-time defaults. When running outside the browser or
 * when parsing fails the defaults are returned intact.
 *
 * @returns Sanitized provider settings ready for React state initialization.
 * @throws This helper does not throw; storage and parsing errors are logged and ignored.
 * @remarks Side effects: reads from `localStorage` in browser environments. Timeout
 *   and retry semantics: not applicable to synchronous storage access.
 */
const getInitialProviderSettings = (): AIProviderSettings => {
  if (typeof window === 'undefined') {
    return INITIAL_AI_PROVIDER_SETTINGS;
  }

  try {
    const saved = localStorage.getItem(PROVIDER_SETTINGS_STORAGE_KEY);
    if (!saved) {
      return INITIAL_AI_PROVIDER_SETTINGS;
    }

    const parsed = JSON.parse(saved) as Partial<AIProviderSettings> | null;
    if (!parsed || typeof parsed !== 'object') {
      return INITIAL_AI_PROVIDER_SETTINGS;
    }

    const candidate: AIProviderSettings = {
      selectedProvider: parsed.selectedProvider ?? INITIAL_AI_PROVIDER_SETTINGS.selectedProvider,
      selectedModel: parsed.selectedModel ?? INITIAL_AI_PROVIDER_SETTINGS.selectedModel,
      apiKeys: parsed.apiKeys ?? {},
      featureModelPreferences: parsed.featureModelPreferences,
      maxOutputTokens: parsed.maxOutputTokens ?? INITIAL_AI_PROVIDER_SETTINGS.maxOutputTokens,
    };

    return sanitizeSettings(candidate);
  } catch (error) {
    console.error('Failed to load provider settings from local storage:', error);
    return INITIAL_AI_PROVIDER_SETTINGS;
  }
};

type ProviderSettingsUpdater = AIProviderSettings | ((prev: AIProviderSettings) => AIProviderSettings);

/**
 * React hook that surfaces provider selection state backed by `localStorage`.
 * Settings are sanitized after each update, persisted automatically, and the
 * hook resolves contextual provider selections for feature modes when overrides
 * are configured.
 *
 * @param activeMode - Optional feature mode whose provider override should be resolved.
 * @returns Accessors for provider settings, helper resolvers, and derived display labels.
 * @throws This hook does not throw; persistence errors are logged and skipped.
 * @remarks Side effects: reads from and writes to `localStorage` in browser environments.
 *   Timeout and retry semantics: not applicable because storage operations are synchronous.
 */
export const usePersistentProviderSettings = (activeMode?: Mode) => {
  const [providerSettings, setProviderSettingsState] = useState<AIProviderSettings>(getInitialProviderSettings);

  const setProviderSettings = useCallback((updater: ProviderSettingsUpdater) => {
    setProviderSettingsState(prev => {
      const next = typeof updater === 'function' ? (updater as (prev: AIProviderSettings) => AIProviderSettings)(prev) : updater;
      return sanitizeSettings(next);
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const sanitized = sanitizeSettings(providerSettings);
      localStorage.setItem(PROVIDER_SETTINGS_STORAGE_KEY, JSON.stringify(sanitized));
    } catch (error) {
      console.error('Failed to save provider settings to local storage:', error);
    }
  }, [providerSettings]);

  /**
   * Resolves which provider and model should be used for a given feature mode.
   * Feature-specific overrides take precedence over the globally selected provider
   * and model while still falling back to defaults when overrides are incomplete.
   *
   * @param mode - Optional feature mode requesting provider resolution.
   * @returns The normalized provider identifier and model string for the mode.
   * @throws This callback does not throw; invalid overrides fall back to defaults.
   * @remarks Side effects: none. Timeout and retry semantics: not applicable.
   */
  const resolveProviderForMode = useCallback(
    (mode?: Mode) => {
      const override = mode ? providerSettings.featureModelPreferences?.[mode] : undefined;
      const providerId =
        override && AVAILABLE_PROVIDER_IDS.has(override.provider)
          ? override.provider
          : providerSettings.selectedProvider;

      const fallbackModel =
        DEFAULT_PROVIDER_MODELS[providerId] ??
        DEFAULT_PROVIDER_MODELS[providerSettings.selectedProvider];

      const candidateModel = override?.model ?? providerSettings.selectedModel;
      const trimmedModel = typeof candidateModel === 'string' ? candidateModel.trim() : '';

      return {
        providerId,
        model: trimmedModel.length > 0 ? trimmedModel : fallbackModel,
      };
    },
    [providerSettings],
  );

  const resolvedSelection = useMemo(() => resolveProviderForMode(activeMode), [activeMode, resolveProviderForMode]);

  const activeProviderInfo = useMemo(
    () => AI_PROVIDERS.find(provider => provider.id === resolvedSelection.providerId),
    [resolvedSelection.providerId],
  );

  const activeProviderLabel = useMemo(
    () => getProviderLabel(resolvedSelection.providerId),
    [resolvedSelection.providerId],
  );

  const activeModelName = resolvedSelection.model;

  const isApiKeyConfigured = useMemo(() => {
    const key = providerSettings.apiKeys?.[resolvedSelection.providerId];
    return typeof key === 'string' && key.trim().length > 0;
  }, [providerSettings.apiKeys, resolvedSelection.providerId]);

  const providerStatusText = useMemo(() => {
    if (!activeProviderInfo) return 'Provider status unavailable';
    if (activeProviderInfo.requiresApiKey) {
      return isApiKeyConfigured ? 'API key saved' : 'API key required';
    }
    return 'API key optional';
  }, [activeProviderInfo, isApiKeyConfigured]);

  const providerStatusTone = useMemo(() => {
    if (!activeProviderInfo) return 'text-destructive';
    if (activeProviderInfo.requiresApiKey) {
      return isApiKeyConfigured ? 'text-emerald-400' : 'text-destructive';
    }
    return 'text-text-secondary';
  }, [activeProviderInfo, isApiKeyConfigured]);

  const providerSummaryText = useMemo(
    () => (activeModelName ? `${activeProviderLabel} • ${activeModelName}` : activeProviderLabel),
    [activeProviderLabel, activeModelName],
  );

  return {
    providerSettings,
    setProviderSettings,
    resolveProviderForMode,
    activeProviderInfo,
    activeProviderLabel,
    activeModelName,
    providerStatusText,
    providerStatusTone,
    providerSummaryText,
  } as const;
};
