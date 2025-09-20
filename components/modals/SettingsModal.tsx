import React, { useState, useEffect, useCallback, useRef, MouseEvent } from 'react';
import type {
  ChatSettings,
  SavedPrompt,
  AIProviderSettings,
  AIProviderId,
  ModelOption,
  VectorStoreSettings,
  EmbeddingProviderId,
  FeatureModelPreferences,
  Mode,
} from '../../types';
import type { ProviderInfo, EmbeddingProviderInfo } from '../../services/providerRegistry';
import { DEFAULT_PROVIDER_MODELS, DEFAULT_EMBEDDING_MODELS } from '../../constants';
import {
  EMBEDDING_PROVIDERS,
  requiresEmbeddingApiKey,
  getEmbeddingProviderDefaultEndpoint,
} from '../../services/providerRegistry';
import { sanitizeFeatureModelPreferences } from '../../utils/providerSettings';
import { GlobalProviderSection } from './settings/GlobalProviderSection';
import { FeatureOverridesSection } from './settings/FeatureOverridesSection';
import { VectorStoreSection } from './settings/VectorStoreSection';
import { ChatPresetsSection } from './settings/ChatPresetsSection';
import { SettingsModalHeader } from './settings/SettingsModalHeader';
import { SettingsModalFooter } from './settings/SettingsModalFooter';
import {
  ensureVectorStoreSettings,
  withDefaults,
  featurePreferenceCount,
  sanitizeVectorStoreSettings,
} from './settings/helpers';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: ChatSettings;
  providerSettings: AIProviderSettings;
  providers: ProviderInfo[];
  onSave: (newSettings: ChatSettings, providerSettings: AIProviderSettings) => void;
  onFetchModels: (providerId: AIProviderId, apiKey?: string) => Promise<ModelOption[]>;
  savedPrompts: SavedPrompt[];
  onSavePreset: (name: string, prompt: string) => void;
  onDeletePreset: (name: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentSettings,
  providerSettings,
  providers,
  onSave,
  onFetchModels,
  savedPrompts,
  onSavePreset,
  onDeletePreset,
}) => {
  const [editedSettings, setEditedSettings] = useState<ChatSettings>(() => withDefaults(currentSettings));
  const [editedProviderSettings, setEditedProviderSettings] = useState<AIProviderSettings>(providerSettings);
  const [modelOptions, setModelOptions] = useState<ModelOption[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const loadRequestIdRef = useRef(0);

  const updateVectorStore = useCallback((updater: (prev: VectorStoreSettings) => VectorStoreSettings) => {
    setEditedSettings(prev => {
      const currentVector = ensureVectorStoreSettings(prev.vectorStore);
      return {
        ...prev,
        vectorStore: updater(currentVector),
      };
    });
  }, []);

  const enableFeatureOverride = useCallback((mode: Mode, enabled: boolean) => {
    setEditedProviderSettings(prev => {
      const nextPreferences: FeatureModelPreferences = { ...(prev.featureModelPreferences ?? {}) };
      if (enabled) {
        const globalModel = prev.selectedModel?.trim() || DEFAULT_PROVIDER_MODELS[prev.selectedProvider] || '';
        nextPreferences[mode] = {
          provider: prev.selectedProvider,
          model: globalModel,
        };
      } else {
        delete nextPreferences[mode];
      }

      return {
        ...prev,
        featureModelPreferences: featurePreferenceCount(nextPreferences) > 0 ? nextPreferences : undefined,
      };
    });
  }, []);

  const updateFeaturePreference = useCallback((mode: Mode, updater: (prev: { provider: AIProviderId; model: string }) => {
    provider: AIProviderId;
    model: string;
  }) => {
    setEditedProviderSettings(prev => {
      const existing = prev.featureModelPreferences?.[mode] ?? {
        provider: prev.selectedProvider,
        model: prev.selectedModel?.trim() || DEFAULT_PROVIDER_MODELS[prev.selectedProvider] || '',
      };
      const nextPreferences: FeatureModelPreferences = {
        ...(prev.featureModelPreferences ?? {}),
        [mode]: updater(existing),
      };
      return {
        ...prev,
        featureModelPreferences: nextPreferences,
      };
    });
  }, []);

  const loadModels = useCallback(async (providerId: AIProviderId, apiKey?: string) => {
    const providerInfo = providers.find(p => p.id === providerId);
    const trimmedKey = apiKey?.trim();

    if (providerInfo?.requiresApiKey && !trimmedKey) {
      setModelOptions([]);
      setModelsError(`${providerInfo.label} requires an API key to load models.`);
      setModelsLoading(false);
      return;
    }

    const requestId = ++loadRequestIdRef.current;
    setModelsLoading(true);
    setModelsError(null);
    setModelOptions([]);

    try {
      const models = await onFetchModels(providerId, trimmedKey);
      if (loadRequestIdRef.current !== requestId) {
        return;
      }
      setModelOptions(models);
      if (models.length > 0) {
        setEditedProviderSettings(prev => {
          if (prev.selectedProvider !== providerId) return prev;
          if (models.some(model => model.id === prev.selectedModel)) {
            return prev;
          }
          return { ...prev, selectedModel: models[0].id };
        });
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      setModelsError(message);
      setModelOptions([]);
    } finally {
      if (loadRequestIdRef.current === requestId) {
        setModelsLoading(false);
      }
    }
  }, [onFetchModels, providers]);

  useEffect(() => {
    if (isOpen) {
      setEditedSettings(withDefaults(currentSettings));
      setEditedProviderSettings(providerSettings);
      setModelOptions([]);
      setModelsError(null);
      setModelsLoading(false);
      setSelectedPreset('');
    }
  }, [isOpen, currentSettings, providerSettings]);

  useEffect(() => {
    if (isOpen) {
      const providerId = providerSettings.selectedProvider;
      const apiKey = providerSettings.apiKeys?.[providerId];
      loadModels(providerId, apiKey);
    }
  }, [isOpen, providerSettings, loadModels]);

  const handleSave = () => {
    const providerId = editedProviderSettings.selectedProvider;
    const trimmedModel = editedProviderSettings.selectedModel.trim();
    const fallbackModel = DEFAULT_PROVIDER_MODELS[providerId] ?? DEFAULT_PROVIDER_MODELS[providerSettings.selectedProvider];

    const sanitizedApiKeys = Object.entries(editedProviderSettings.apiKeys || {}).reduce<AIProviderSettings['apiKeys']>((acc, [key, value]) => {
      const trimmed = typeof value === 'string' ? value.trim() : '';
      if (trimmed) {
        acc[key as AIProviderId] = trimmed;
      }
      return acc;
    }, {});

    const sanitizedVectorStore = sanitizeVectorStoreSettings(editedSettings.vectorStore);

    const sanitizedFeaturePreferences = sanitizeFeatureModelPreferences(editedProviderSettings.featureModelPreferences);
    const finalFeaturePreferences = featurePreferenceCount(sanitizedFeaturePreferences) > 0
      ? sanitizedFeaturePreferences
      : undefined;

    const finalProviderSettings: AIProviderSettings = {
      selectedProvider: providerId,
      selectedModel: trimmedModel || fallbackModel,
      apiKeys: sanitizedApiKeys,
      featureModelPreferences: finalFeaturePreferences,
    };

    const finalChatSettings: ChatSettings = {
      ...editedSettings,
      vectorStore: sanitizedVectorStore,
    };

    onSave(finalChatSettings, finalProviderSettings);
  };

  const handleProviderChange = (providerId: AIProviderId) => {
    setEditedProviderSettings(prev => {
      const fallbackModel = DEFAULT_PROVIDER_MODELS[providerId] ?? prev.selectedModel;
      return {
        ...prev,
        selectedProvider: providerId,
        selectedModel: fallbackModel,
      };
    });
    const apiKey = editedProviderSettings.apiKeys?.[providerId];
    loadModels(providerId, apiKey);
  };

  const handleApiKeyChange = (providerId: AIProviderId, value: string) => {
    setEditedProviderSettings(prev => ({
      ...prev,
      apiKeys: { ...prev.apiKeys, [providerId]: value },
    }));
  };

  const handleModelInputChange = (value: string) => {
    setEditedProviderSettings(prev => ({
      ...prev,
      selectedModel: value,
    }));
  };

  const handleVectorStoreEnabledChange = (enabled: boolean) => {
    updateVectorStore(prev => ({ ...prev, enabled }));
  };

  const handleVectorStoreUrlChange = (value: string) => {
    updateVectorStore(prev => ({ ...prev, url: value }));
  };

  const handleVectorStoreCollectionChange = (value: string) => {
    updateVectorStore(prev => ({ ...prev, collection: value }));
  };

  const handleVectorStoreApiKeyChange = (value: string) => {
    updateVectorStore(prev => ({ ...prev, apiKey: value }));
  };

  const handleVectorStoreTopKChange = (value: string) => {
    const numericValue = Number(value);
    updateVectorStore(prev => ({
      ...prev,
      topK: value === '' ? 0 : Number.isFinite(numericValue) ? numericValue : prev.topK,
    }));
  };

  const handleEmbeddingProviderChange = (providerId: EmbeddingProviderId) => {
    updateVectorStore(prev => {
      if (prev.embedding.provider === providerId) {
        return { ...prev, embedding: { ...prev.embedding, provider: providerId } };
      }
      const defaultModel = DEFAULT_EMBEDDING_MODELS[providerId] ?? '';
      const defaultEndpoint = getEmbeddingProviderDefaultEndpoint(providerId) ?? '';
      return {
        ...prev,
        embedding: {
          ...prev.embedding,
          provider: providerId,
          model: defaultModel,
          baseUrl: providerId === 'custom' ? '' : defaultEndpoint,
        },
      };
    });
  };

  const handleEmbeddingModelChange = (value: string) => {
    updateVectorStore(prev => ({
      ...prev,
      embedding: { ...prev.embedding, model: value },
    }));
  };

  const handleEmbeddingApiKeyChange = (value: string) => {
    updateVectorStore(prev => ({
      ...prev,
      embedding: { ...prev.embedding, apiKey: value },
    }));
  };

  const handleEmbeddingBaseUrlChange = (value: string) => {
    updateVectorStore(prev => ({
      ...prev,
      embedding: { ...prev.embedding, baseUrl: value },
    }));
  };

  const handleLoadPreset = (name: string) => {
    const preset = savedPrompts.find(p => p.name === name);
    if (preset) {
      setEditedSettings({ ...editedSettings, systemInstruction: preset.prompt });
      setSelectedPreset(name);
    } else {
      setSelectedPreset('');
    }
  };

  const handleSaveAsPreset = () => {
    const name = window.prompt('Enter a name for this preset:', selectedPreset || 'New Preset');
    if (name && name.trim() !== '') {
      onSavePreset(name.trim(), editedSettings.systemInstruction);
      setSelectedPreset(name.trim());
    }
  };

  const handleDeletePreset = () => {
    if (selectedPreset && window.confirm(`Are you sure you want to delete the preset "${selectedPreset}"?`)) {
      onDeletePreset(selectedPreset);
      setSelectedPreset('');
    }
  };

  const handleOverlayClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const selectedProviderInfo = providers.find(p => p.id === editedProviderSettings.selectedProvider);
  const globalProviderLabel = selectedProviderInfo?.label ?? 'Selected provider';
  const selectedApiKey = editedProviderSettings.apiKeys?.[editedProviderSettings.selectedProvider] ?? '';
  const vectorStoreSettings = ensureVectorStoreSettings(editedSettings.vectorStore);
  const embeddingSettings = vectorStoreSettings.embedding;
  const selectedEmbeddingProviderInfo = EMBEDDING_PROVIDERS.find(
    provider => provider.id === embeddingSettings.provider,
  ) as EmbeddingProviderInfo | undefined;
  const embeddingEndpointPlaceholder =
    embeddingSettings.provider === 'custom'
      ? 'https://your-embedding-endpoint/v1/embeddings'
      : getEmbeddingProviderDefaultEndpoint(embeddingSettings.provider) ?? '';
  const embeddingRequiresApiKey = requiresEmbeddingApiKey(embeddingSettings.provider);
  const featurePreferences = editedProviderSettings.featureModelPreferences ?? {};
  const globalModelName = editedProviderSettings.selectedModel?.trim() || DEFAULT_PROVIDER_MODELS[editedProviderSettings.selectedProvider] || '';

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 transition-opacity duration-300 animate-fade-in-scale"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="workspace-settings-modal"
    >
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-4xl transform transition-all duration-300">
        <SettingsModalHeader onClose={onClose} />

        <div className="p-6 sm:p-8 space-y-8 max-h-[80vh] overflow-y-auto">
          <GlobalProviderSection
            providers={providers}
            selectedProviderId={editedProviderSettings.selectedProvider}
            selectedModel={editedProviderSettings.selectedModel}
            selectedApiKey={selectedApiKey}
            modelOptions={modelOptions}
            modelsLoading={modelsLoading}
            modelsError={modelsError}
            onProviderChange={handleProviderChange}
            onApiKeyChange={handleApiKeyChange}
            onModelChange={handleModelInputChange}
            onRefreshModels={() => loadModels(editedProviderSettings.selectedProvider, selectedApiKey)}
          />

          <FeatureOverridesSection
            providers={providers}
            featurePreferences={featurePreferences}
            globalProviderLabel={globalProviderLabel}
            globalModelName={globalModelName}
            selectedProviderId={editedProviderSettings.selectedProvider}
            onToggleOverride={enableFeatureOverride}
            onUpdatePreference={updateFeaturePreference}
          />

          <VectorStoreSection
            vectorStoreSettings={vectorStoreSettings}
            embeddingEndpointPlaceholder={embeddingEndpointPlaceholder}
            embeddingRequiresApiKey={embeddingRequiresApiKey}
            selectedEmbeddingProviderInfo={selectedEmbeddingProviderInfo}
            onEnabledChange={handleVectorStoreEnabledChange}
            onUrlChange={handleVectorStoreUrlChange}
            onCollectionChange={handleVectorStoreCollectionChange}
            onApiKeyChange={handleVectorStoreApiKeyChange}
            onTopKChange={handleVectorStoreTopKChange}
            onEmbeddingProviderChange={handleEmbeddingProviderChange}
            onEmbeddingModelChange={handleEmbeddingModelChange}
            onEmbeddingApiKeyChange={handleEmbeddingApiKeyChange}
            onEmbeddingBaseUrlChange={handleEmbeddingBaseUrlChange}
          />

          <ChatPresetsSection
            savedPrompts={savedPrompts}
            selectedPreset={selectedPreset}
            systemInstruction={editedSettings.systemInstruction}
            onSelectPreset={handleLoadPreset}
            onDeletePreset={handleDeletePreset}
            onSystemInstructionChange={value => {
              setEditedSettings({ ...editedSettings, systemInstruction: value });
              if (selectedPreset) setSelectedPreset('');
            }}
          />
        </div>

        <SettingsModalFooter onClose={onClose} onSave={handleSave} onSaveAsPreset={handleSaveAsPreset} />
      </div>
    </div>
  );
};
