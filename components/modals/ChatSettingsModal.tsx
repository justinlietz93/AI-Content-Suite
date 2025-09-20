

import React, { useState, useEffect, useCallback, useRef, MouseEvent } from 'react';
import type { ChatSettings, SavedPrompt, AIProviderSettings, AIProviderId, ModelOption } from '../../types';
import type { ProviderInfo } from '../../services/providerRegistry';
import { DEFAULT_PROVIDER_MODELS } from '../../constants';
import { XCircleIcon } from '../icons/XCircleIcon';
import { TrashIcon } from '../icons/TrashIcon';

interface ChatSettingsModalProps {
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

export const ChatSettingsModal: React.FC<ChatSettingsModalProps> = ({
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
  const [editedSettings, setEditedSettings] = useState<ChatSettings>(currentSettings);
  const [editedProviderSettings, setEditedProviderSettings] = useState<AIProviderSettings>(providerSettings);
  const [modelOptions, setModelOptions] = useState<ModelOption[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>(''); // Holds the name of the selected preset
  const loadRequestIdRef = useRef(0);

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
      setEditedSettings(currentSettings);
      setEditedProviderSettings(providerSettings);
      setModelOptions([]);
      setModelsError(null);
      setModelsLoading(false);
      setSelectedPreset(''); // Reset selection when opening
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
      const trimmed = typeof value === 'string' ? value.trim() : value;
      if (trimmed) {
        acc[key] = trimmed;
      }
      return acc;
    }, {});

    const finalProviderSettings: AIProviderSettings = {
      selectedProvider: providerId,
      selectedModel: trimmedModel || fallbackModel,
      apiKeys: sanitizedApiKeys,
    };

    onSave(editedSettings, finalProviderSettings);
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
    const name = window.prompt("Enter a name for this preset:", selectedPreset || "New Preset");
    if (name && name.trim() !== '') {
      onSavePreset(name.trim(), editedSettings.systemInstruction);
      setSelectedPreset(name.trim()); // Select the new/updated preset
    }
  };

  const handleDeletePreset = () => {
    if (selectedPreset && window.confirm(`Are you sure you want to delete the preset "${selectedPreset}"?`)) {
      onDeletePreset(selectedPreset);
      setSelectedPreset(''); // Deselect after deletion
    }
  };

  const handleOverlayClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
        onClose();
    }
  };

  const selectedProviderInfo = providers.find(p => p.id === editedProviderSettings.selectedProvider);
  const selectedApiKey = editedProviderSettings.apiKeys?.[editedProviderSettings.selectedProvider] ?? '';

  if (!isOpen) return null;

  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 transition-opacity duration-300 animate-fade-in-scale"
        onClick={handleOverlayClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
    >
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-lg transform transition-all duration-300">
        <header className="flex items-center justify-between p-4 sm:p-5 border-b border-border-color">
          <h2 id="modal-title" className="text-lg sm:text-xl font-semibold text-text-primary">Chat Settings</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors" aria-label="Close modal">
            <XCircleIcon className="w-7 h-7" />
          </button>
        </header>
        
        <div className="p-6 sm:p-8 space-y-4">
            <div>
              <label htmlFor="provider-selector" className="block text-sm font-medium text-text-secondary mb-2">
                AI Provider
              </label>
              <select
                id="provider-selector"
                value={editedProviderSettings.selectedProvider}
                onChange={(e) => handleProviderChange(e.target.value as AIProviderId)}
                className="w-full px-3 py-2 bg-input border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring text-text-primary text-sm"
              >
                {providers.map(provider => (
                  <option key={provider.id} value={provider.id}>{provider.label}</option>
                ))}
              </select>
              {selectedProviderInfo?.docsUrl && (
                <p className="mt-1 text-xs text-text-secondary">
                  API docs:{' '}
                  <a href={selectedProviderInfo.docsUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                    {selectedProviderInfo.docsUrl}
                  </a>
                </p>
              )}
            </div>

            <div>
              <label htmlFor="provider-api-key" className="block text-sm font-medium text-text-secondary mb-2">
                API Key
              </label>
              <input
                id="provider-api-key"
                type="password"
                value={selectedApiKey}
                onChange={(e) => handleApiKeyChange(editedProviderSettings.selectedProvider, e.target.value)}
                placeholder={selectedProviderInfo?.requiresApiKey ? 'Enter your API key' : 'Optional for this provider'}
                className="w-full px-3 py-2 bg-input border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring text-text-primary placeholder-text-secondary text-sm"
              />
              <p className="mt-1 text-xs text-text-secondary">
                {selectedProviderInfo?.requiresApiKey
                  ? 'Required to authenticate requests.'
                  : 'Optional. Leave blank for local deployments.'}
              </p>
            </div>

            <div>
              <label htmlFor="provider-model" className="block text-sm font-medium text-text-secondary mb-2">
                Model
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="provider-model"
                  type="text"
                  list="provider-model-options"
                  value={editedProviderSettings.selectedModel}
                  onChange={(e) => handleModelInputChange(e.target.value)}
                  placeholder="Select or enter a model name"
                  className="flex-grow px-3 py-2 bg-input border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring text-text-primary placeholder-text-secondary text-sm"
                />
                <button
                  type="button"
                  onClick={() => loadModels(editedProviderSettings.selectedProvider, selectedApiKey)}
                  className="px-3 py-2 bg-muted text-text-primary font-medium rounded-md hover:bg-border-color transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-secondary disabled:opacity-50"
                  disabled={modelsLoading}
                >
                  {modelsLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>
              <datalist id="provider-model-options">
                {modelOptions.map(model => (
                  <option key={model.id} value={model.id}>{model.label}</option>
                ))}
              </datalist>
              {modelsError ? (
                <p className="mt-1 text-xs text-destructive">{modelsError}</p>
              ) : modelOptions.length > 0 ? (
                <p className="mt-1 text-xs text-text-secondary">Choose a model from the suggestions or provide a custom value.</p>
              ) : (
                <p className="mt-1 text-xs text-text-secondary">Enter a model name or refresh to fetch available options.</p>
              )}
            </div>

            <div>
              <label htmlFor="preset-selector" className="block text-sm font-medium text-text-secondary mb-2">
                Manage Presets
              </label>
              <div className="flex items-center gap-2">
                <select
                  id="preset-selector"
                  value={selectedPreset}
                  onChange={(e) => handleLoadPreset(e.target.value)}
                  className="flex-grow w-full px-3 py-2 bg-input border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring text-text-primary placeholder-text-secondary text-sm"
                >
                  <option value="">-- Load a preset --</option>
                  {savedPrompts.map(p => (
                    <option key={p.name} value={p.name}>{p.name}</option>
                  ))}
                </select>
                <button
                  onClick={handleDeletePreset}
                  disabled={!selectedPreset}
                  className="p-2 bg-destructive/80 text-destructive-foreground rounded-md hover:bg-destructive disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Delete selected preset"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div>
                <label htmlFor="system-instruction-modal" className="block text-sm font-medium text-text-secondary mb-2">
                    System Prompt
                </label>
                <textarea
                    id="system-instruction-modal"
                    rows={8}
                    value={editedSettings.systemInstruction}
                    onChange={(e) => {
                        setEditedSettings({ ...editedSettings, systemInstruction: e.target.value });
                        // If user edits, it's no longer a pristine preset
                        if (selectedPreset) setSelectedPreset('');
                    }}
                    placeholder="Define the AI's persona and instructions..."
                    className="w-full px-3 py-2 bg-input border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring text-text-primary placeholder-text-secondary text-sm"
                />
                 <p className="mt-2 text-xs text-text-secondary">
                    Changes to the system prompt will start a new chat session to take effect.
                </p>
            </div>
        </div>

        <footer className="flex items-center justify-between gap-4 p-4 bg-secondary rounded-b-xl">
            <button
                onClick={handleSaveAsPreset}
                className="px-4 py-2 bg-muted text-text-primary font-semibold rounded-lg hover:bg-border-color transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-secondary"
            >
                Save as Preset
            </button>
            <div className="flex items-center gap-4">
              <button
                  onClick={onClose}
                  className="px-4 py-2 bg-muted text-text-primary font-semibold rounded-lg hover:bg-border-color transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-secondary"
              >
                  Cancel
              </button>
              <button
                  onClick={handleSave}
                  className="px-6 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary-hover transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-secondary"
              >
                  Save &amp; Close
              </button>
            </div>
        </footer>
      </div>
    </div>
  );
};