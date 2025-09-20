import { useEffect, useMemo, useState } from 'react';
import type { AIProviderSettings } from '../types';
import { DEFAULT_PROVIDER_MODELS, INITIAL_AI_PROVIDER_SETTINGS } from '../constants';
import { AI_PROVIDERS, getProviderLabel } from '../services/providerRegistry';

const PROVIDER_SETTINGS_STORAGE_KEY = 'ai_content_suite_provider_settings';

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

    const availableProviders = new Set(AI_PROVIDERS.map(provider => provider.id));
    const selectedProvider = availableProviders.has(parsed.selectedProvider)
      ? parsed.selectedProvider!
      : INITIAL_AI_PROVIDER_SETTINGS.selectedProvider;

    const fallbackModel =
      DEFAULT_PROVIDER_MODELS[selectedProvider] ??
      DEFAULT_PROVIDER_MODELS[INITIAL_AI_PROVIDER_SETTINGS.selectedProvider];

    const selectedModel =
      typeof parsed.selectedModel === 'string' && parsed.selectedModel.trim().length > 0
        ? parsed.selectedModel
        : fallbackModel;

    const apiKeys =
      parsed.apiKeys && typeof parsed.apiKeys === 'object' && parsed.apiKeys !== null ? parsed.apiKeys : {};

    return {
      selectedProvider,
      selectedModel,
      apiKeys,
    };
  } catch (error) {
    console.error('Failed to load provider settings from local storage:', error);
    return INITIAL_AI_PROVIDER_SETTINGS;
  }
};

export const usePersistentProviderSettings = () => {
  const [providerSettings, setProviderSettings] = useState<AIProviderSettings>(getInitialProviderSettings);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(PROVIDER_SETTINGS_STORAGE_KEY, JSON.stringify(providerSettings));
    } catch (error) {
      console.error('Failed to save provider settings to local storage:', error);
    }
  }, [providerSettings]);

  const activeProviderInfo = useMemo(
    () => AI_PROVIDERS.find(provider => provider.id === providerSettings.selectedProvider),
    [providerSettings.selectedProvider],
  );

  const activeProviderLabel = useMemo(
    () => getProviderLabel(providerSettings.selectedProvider),
    [providerSettings.selectedProvider],
  );

  const activeModelName = useMemo(() => {
    const trimmed = providerSettings.selectedModel?.trim();
    if (trimmed && trimmed.length > 0) {
      return trimmed;
    }
    return DEFAULT_PROVIDER_MODELS[providerSettings.selectedProvider] ?? '';
  }, [providerSettings]);

  const isApiKeyConfigured = useMemo(() => {
    const key = providerSettings.apiKeys?.[providerSettings.selectedProvider];
    return typeof key === 'string' && key.trim().length > 0;
  }, [providerSettings]);

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
    activeProviderInfo,
    activeProviderLabel,
    activeModelName,
    providerStatusText,
    providerStatusTone,
    providerSummaryText,
  } as const;
};
