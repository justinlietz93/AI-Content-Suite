import React from 'react';
import type { ProviderInfo } from '../../../services/providerRegistry';
import type { AIProviderId, ModelOption } from '../../../types';

interface GlobalProviderSectionProps {
  providers: ProviderInfo[];
  selectedProviderId: AIProviderId;
  selectedModel: string;
  selectedApiKey: string;
  maxOutputTokens: number;
  modelOptions: ModelOption[];
  modelsLoading: boolean;
  modelsError: string | null;
  onProviderChange: (providerId: AIProviderId) => void;
  onApiKeyChange: (providerId: AIProviderId, value: string) => void;
  onModelChange: (value: string) => void;
  onMaxOutputTokensChange: (value: number) => void;
  onRefreshModels: () => void;
}

export const GlobalProviderSection: React.FC<GlobalProviderSectionProps> = ({
  providers,
  selectedProviderId,
  selectedModel,
  selectedApiKey,
  maxOutputTokens,
  modelOptions,
  modelsLoading,
  modelsError,
  onProviderChange,
  onApiKeyChange,
  onModelChange,
  onMaxOutputTokensChange,
  onRefreshModels,
}) => {
  const providerInfo = providers.find(provider => provider.id === selectedProviderId);

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-text-primary">Global Provider</h3>
        <p className="text-sm text-text-secondary">
          Select the default provider, model, and API key the suite should use when a feature does not have a custom override.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="provider-selector" className="block text-sm font-medium text-text-secondary mb-2">
            AI provider
          </label>
          <select
            id="provider-selector"
            value={selectedProviderId}
            onChange={event => onProviderChange(event.target.value as AIProviderId)}
            className="w-full px-3 py-2 bg-input border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring text-text-primary text-sm"
          >
            {providers.map(provider => (
              <option key={provider.id} value={provider.id}>
                {provider.label}
              </option>
            ))}
          </select>
          {providerInfo?.docsUrl && (
            <p className="mt-1 text-xs text-text-secondary">
              API docs:{' '}
              <a href={providerInfo.docsUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                {providerInfo.docsUrl}
              </a>
            </p>
          )}
        </div>

        <div>
          <label htmlFor="provider-api-key" className="block text-sm font-medium text-text-secondary mb-2">
            API key
          </label>
          <input
            id="provider-api-key"
            type="password"
            value={selectedApiKey}
            onChange={event => onApiKeyChange(selectedProviderId, event.target.value)}
            placeholder={providerInfo?.requiresApiKey ? 'Enter your API key' : 'Optional for this provider'}
            className="w-full px-3 py-2 bg-input border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring text-text-primary placeholder-text-secondary text-sm"
          />
          <p className="mt-1 text-xs text-text-secondary">
            {providerInfo?.requiresApiKey ? 'Required to authenticate requests.' : 'Optional. Leave blank for local deployments.'}
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
              value={selectedModel}
              onChange={event => onModelChange(event.target.value)}
              placeholder="Select or enter a model name"
              className="flex-grow px-3 py-2 bg-input border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring text-text-primary placeholder-text-secondary text-sm"
            />
            <button
              type="button"
              onClick={onRefreshModels}
              className="px-3 py-2 bg-muted text-text-primary font-medium rounded-md hover:bg-border-color transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-secondary disabled:opacity-50"
              disabled={modelsLoading}
            >
              {modelsLoading ? 'Loading…' : 'Refresh'}
            </button>
          </div>
          <datalist id="provider-model-options">
            {modelOptions.map(model => (
              <option key={model.id} value={model.id}>
                {model.label}
              </option>
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

        <div className="sm:col-span-2">
          <label htmlFor="provider-max-output" className="block text-sm font-medium text-text-secondary mb-2">
            Max output tokens
          </label>
          <input
            id="provider-max-output"
            type="number"
            min={1}
            step={1}
            value={maxOutputTokens}
            onChange={event => {
              const parsedValue = Number(event.target.value);
              const sanitizedValue = Number.isFinite(parsedValue)
                ? Math.max(1, Math.round(parsedValue))
                : maxOutputTokens;
              onMaxOutputTokensChange(sanitizedValue);
            }}
            className="w-full px-3 py-2 bg-input border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring text-text-primary placeholder-text-secondary text-sm"
          />
          <p className="mt-1 text-xs text-text-secondary">
            Sets the default completion length for all tools. Individual features may still apply stricter limits.
          </p>
        </div>
      </div>
    </section>
  );
};
