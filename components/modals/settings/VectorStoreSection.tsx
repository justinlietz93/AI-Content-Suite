import React from 'react';
import type { EmbeddingProviderInfo } from '../../../services/providerRegistry';
import type { EmbeddingProviderId, VectorStoreSettings } from '../../../types';
import { EMBEDDING_PROVIDERS } from '../../../services/providerRegistry';

interface VectorStoreSectionProps {
  vectorStoreSettings: VectorStoreSettings;
  embeddingEndpointPlaceholder: string;
  embeddingRequiresApiKey: boolean;
  selectedEmbeddingProviderInfo?: EmbeddingProviderInfo;
  onEnabledChange: (enabled: boolean) => void;
  onUrlChange: (value: string) => void;
  onCollectionChange: (value: string) => void;
  onApiKeyChange: (value: string) => void;
  onTopKChange: (value: string) => void;
  onEmbeddingProviderChange: (providerId: EmbeddingProviderId) => void;
  onEmbeddingModelChange: (value: string) => void;
  onEmbeddingApiKeyChange: (value: string) => void;
  onEmbeddingBaseUrlChange: (value: string) => void;
}

export const VectorStoreSection: React.FC<VectorStoreSectionProps> = ({
  vectorStoreSettings,
  embeddingEndpointPlaceholder,
  embeddingRequiresApiKey,
  selectedEmbeddingProviderInfo,
  onEnabledChange,
  onUrlChange,
  onCollectionChange,
  onApiKeyChange,
  onTopKChange,
  onEmbeddingProviderChange,
  onEmbeddingModelChange,
  onEmbeddingApiKeyChange,
  onEmbeddingBaseUrlChange,
}) => (
  <section className="space-y-4">
    <div>
      <h3 className="text-base font-semibold text-text-primary">Vector store & embeddings</h3>
      <p className="text-sm text-text-secondary">
        Connect a Qdrant cluster and embedding provider to enrich chat conversations with contextual memory.
      </p>
    </div>
    <div className="border border-border-color rounded-lg p-4 space-y-4">
      <div className="flex items-start gap-3">
        <input
          id="vector-store-enabled"
          type="checkbox"
          checked={vectorStoreSettings.enabled}
          onChange={event => onEnabledChange(event.target.checked)}
          className="mt-1 h-4 w-4 text-primary focus:ring-ring border-border-color rounded"
        />
        <div>
          <label htmlFor="vector-store-enabled" className="text-sm font-medium text-text-secondary">
            Enable Qdrant retrieval
          </label>
          <p className="mt-1 text-xs text-text-secondary">
            When enabled, chat requests will fetch relevant knowledge base entries from your centralized Qdrant collection and share them with the model before it responds.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="vector-store-url" className="block text-sm font-medium text-text-secondary mb-2">
            Qdrant URL
          </label>
          <input
            id="vector-store-url"
            type="url"
            value={vectorStoreSettings.url}
            onChange={event => onUrlChange(event.target.value)}
            placeholder="https://qdrant.yourcompany.com"
            className="w-full px-3 py-2 bg-input border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring text-text-primary placeholder-text-secondary text-sm"
            disabled={!vectorStoreSettings.enabled}
          />
        </div>

        <div>
          <label htmlFor="vector-store-collection" className="block text-sm font-medium text-text-secondary mb-2">
            Collection name
          </label>
          <input
            id="vector-store-collection"
            type="text"
            value={vectorStoreSettings.collection}
            onChange={event => onCollectionChange(event.target.value)}
            placeholder="knowledge-base"
            className="w-full px-3 py-2 bg-input border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring text-text-primary placeholder-text-secondary text-sm"
            disabled={!vectorStoreSettings.enabled}
          />
        </div>

        <div>
          <label htmlFor="vector-store-api-key" className="block text-sm font-medium text-text-secondary mb-2">
            Qdrant API key
          </label>
          <input
            id="vector-store-api-key"
            type="password"
            value={vectorStoreSettings.apiKey ?? ''}
            onChange={event => onApiKeyChange(event.target.value)}
            placeholder="Optional"
            className="w-full px-3 py-2 bg-input border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring text-text-primary placeholder-text-secondary text-sm"
            disabled={!vectorStoreSettings.enabled}
          />
          <p className="mt-1 text-xs text-text-secondary">
            Leave blank if your cluster is secured by network rules. Provide a key for hosted deployments.
          </p>
        </div>

        <div>
          <label htmlFor="vector-store-topk" className="block text-sm font-medium text-text-secondary mb-2">
            Results per query (Top-k)
          </label>
          <input
            id="vector-store-topk"
            type="number"
            min={1}
            max={20}
            value={vectorStoreSettings.topK || ''}
            onChange={event => onTopKChange(event.target.value)}
            className="w-full px-3 py-2 bg-input border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring text-text-primary placeholder-text-secondary text-sm"
            disabled={!vectorStoreSettings.enabled}
          />
        </div>

        <div>
          <label htmlFor="embedding-provider" className="block text-sm font-medium text-text-secondary mb-2">
            Embedding provider
          </label>
          <select
            id="embedding-provider"
            value={vectorStoreSettings.embedding.provider}
            onChange={event => onEmbeddingProviderChange(event.target.value as EmbeddingProviderId)}
            className="w-full px-3 py-2 bg-input border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring text-text-primary text-sm"
            disabled={!vectorStoreSettings.enabled}
          >
            {EMBEDDING_PROVIDERS.map(provider => (
              <option key={provider.id} value={provider.id}>
                {provider.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="embedding-model" className="block text-sm font-medium text-text-secondary mb-2">
            Embedding model
          </label>
          <input
            id="embedding-model"
            type="text"
            value={vectorStoreSettings.embedding.model}
            onChange={event => onEmbeddingModelChange(event.target.value)}
            placeholder="text-embedding-3-small"
            className="w-full px-3 py-2 bg-input border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring text-text-primary placeholder-text-secondary text-sm"
            disabled={!vectorStoreSettings.enabled}
          />
        </div>

        <div>
          <label htmlFor="embedding-api-key" className="block text-sm font-medium text-text-secondary mb-2">
            Embedding API key
          </label>
          <input
            id="embedding-api-key"
            type="password"
            value={vectorStoreSettings.embedding.apiKey ?? ''}
            onChange={event => onEmbeddingApiKeyChange(event.target.value)}
            placeholder={embeddingRequiresApiKey ? 'Required for this provider' : 'Optional'}
            className="w-full px-3 py-2 bg-input border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring text-text-primary placeholder-text-secondary text-sm"
            disabled={!vectorStoreSettings.enabled}
          />
          <p className="mt-1 text-xs text-text-secondary">
            {embeddingRequiresApiKey
              ? 'Required to request embeddings from this provider.'
              : 'Optional. Local endpoints such as Ollama typically do not need an API key.'}
          </p>
        </div>

        <div>
          <label htmlFor="embedding-endpoint" className="block text-sm font-medium text-text-secondary mb-2">
            Embedding endpoint override
          </label>
          <input
            id="embedding-endpoint"
            type="url"
            value={vectorStoreSettings.embedding.baseUrl ?? ''}
            onChange={event => onEmbeddingBaseUrlChange(event.target.value)}
            placeholder={embeddingEndpointPlaceholder || 'https://…'}
            className="w-full px-3 py-2 bg-input border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring text-text-primary placeholder-text-secondary text-sm"
            disabled={!vectorStoreSettings.enabled}
          />
          <p className="mt-1 text-xs text-text-secondary">
            Leave blank to use the default endpoint for {selectedEmbeddingProviderInfo?.label ?? 'this provider'}. Provide a custom URL for self-hosted or proxy deployments.
          </p>
        </div>
      </div>
    </div>
  </section>
);
