import type { AIProviderId, EmbeddingProviderId, ModelOption } from '../types';
import type { ProviderMetadata, EmbeddingProviderMetadata } from '../config/providerConfig';
import {
  PROVIDER_METADATA_LIST,
  EMBEDDING_PROVIDER_METADATA_LIST,
  DEFAULT_PROVIDER_MODELS,
  PROVIDER_FALLBACK_MODELS,
  PROVIDER_MODEL_ENDPOINTS,
  ANTHROPIC_API_VERSION,
} from '../config/providerConfig';

export type ProviderInfo = ProviderMetadata;
export type EmbeddingProviderInfo = EmbeddingProviderMetadata;

const providerMetadataMap = new Map<AIProviderId, ProviderMetadata>();
PROVIDER_METADATA_LIST.forEach(metadata => providerMetadataMap.set(metadata.id, metadata));

const embeddingMetadataMap = new Map<EmbeddingProviderId, EmbeddingProviderMetadata>();
EMBEDDING_PROVIDER_METADATA_LIST.forEach(metadata => embeddingMetadataMap.set(metadata.id, metadata));

export const AI_PROVIDERS: ProviderInfo[] = PROVIDER_METADATA_LIST.map(metadata => ({ ...metadata }));
export const EMBEDDING_PROVIDERS: EmbeddingProviderInfo[] = EMBEDDING_PROVIDER_METADATA_LIST.map(
  metadata => ({ ...metadata }),
);

/**
 * Normalizes and deduplicates provider model definitions ensuring downstream selectors receive
 * stable identifiers and human-friendly labels.
 *
 * @param models - Raw model metadata supplied by a provider SDK or HTTP response.
 * @returns A sorted collection of unique model options ready for presentation.
 */
const sanitizeModelOptions = (models: ModelOption[]): ModelOption[] => {
  const deduped = new Map<string, ModelOption>();
  models.forEach(model => {
    if (!model || typeof model.id !== 'string') {
      return;
    }
    const trimmedId = model.id.trim();
    if (!trimmedId) {
      return;
    }
    const trimmedLabel = typeof model.label === 'string' && model.label.trim().length > 0
      ? model.label.trim()
      : trimmedId;
    const trimmedDescription = typeof model.description === 'string' && model.description.trim().length > 0
      ? model.description.trim()
      : undefined;
    if (!deduped.has(trimmedId)) {
      deduped.set(trimmedId, trimmedDescription ? { id: trimmedId, label: trimmedLabel, description: trimmedDescription } : {
        id: trimmedId,
        label: trimmedLabel,
      });
    }
  });
  return Array.from(deduped.values()).sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
};

/**
 * Produces defensive copies of model entries to prevent accidental mutations in consuming code.
 *
 * @param models - Model option entries to duplicate.
 * @returns Cloned model entries preserving the original ordering.
 */
const cloneModels = (models: ModelOption[]): ModelOption[] => models.map(model => ({ ...model }));

const providerModelOptions: Record<AIProviderId, ModelOption[]> = {} as Record<AIProviderId, ModelOption[]>;

AI_PROVIDERS.forEach(provider => {
  const fallbackModels = PROVIDER_FALLBACK_MODELS[provider.id];
  const sanitizedFallback = fallbackModels ? sanitizeModelOptions(fallbackModels) : [];
  providerModelOptions[provider.id] = sanitizedFallback;
});

/**
 * Registers an explicit model listing for a provider, overriding the default fallback values.
 *
 * @param providerId - Target provider identifier.
 * @param models - Model definitions supplied by the caller.
 */
export const registerProviderModels = (providerId: AIProviderId, models: ModelOption[]): void => {
  providerModelOptions[providerId] = sanitizeModelOptions(models);
};

/**
 * Resolves the friendly display name associated with a provider identifier.
 *
 * @param providerId - Provider identifier to describe.
 * @returns A human-readable provider label.
 */
export const getProviderLabel = (providerId: AIProviderId): string => {
  return providerMetadataMap.get(providerId)?.label ?? providerId;
};

/**
 * Determines whether a provider requires an API key for text generation operations.
 *
 * @param providerId - Provider identifier to evaluate.
 * @returns True when an API key is required, otherwise false.
 */
export const requiresApiKey = (providerId: AIProviderId): boolean => {
  return providerMetadataMap.get(providerId)?.requiresApiKey ?? true;
};

/**
 * Determines whether an embedding provider requires an API key for vector generation.
 *
 * @param providerId - Embedding provider identifier to evaluate.
 * @returns True when the embedding provider requires an API key.
 */
export const requiresEmbeddingApiKey = (providerId: EmbeddingProviderId): boolean => {
  return embeddingMetadataMap.get(providerId)?.requiresApiKey ?? false;
};

/**
 * Retrieves the default embedding API endpoint for a provider when one is known.
 *
 * @param providerId - Embedding provider identifier to look up.
 * @returns A default endpoint URL or undefined when no default exists.
 */
export const getEmbeddingProviderDefaultEndpoint = (
  providerId: EmbeddingProviderId,
): string | undefined => {
  return embeddingMetadataMap.get(providerId)?.defaultEndpoint;
};

/**
 * Attempts to retrieve a live model listing from a provider using its configured endpoint.
 *
 * @param providerId - Provider whose models should be fetched.
 * @param apiKey - Optional API key to authorize the request.
 * @param signal - Optional abort signal to cancel the request.
 * @returns Sanitized model options when successful; otherwise null.
 */
const attemptDynamicModelFetch = async (
  providerId: AIProviderId,
  apiKey: string | undefined,
  signal?: AbortSignal,
): Promise<ModelOption[] | null> => {
  const endpoint = PROVIDER_MODEL_ENDPOINTS[providerId];
  if (!endpoint || typeof fetch !== 'function') {
    return null;
  }

  const trimmedKey = apiKey?.trim();
  if (endpoint.requiresApiKey && (!trimmedKey || trimmedKey.length === 0)) {
    return null;
  }

  const requestInit = endpoint.buildRequestInit({ apiKey: trimmedKey });
  if (!requestInit) {
    return null;
  }

  try {
    const response = await fetch(endpoint.url, { ...requestInit, signal });
    if (!response.ok) {
      return null;
    }
    const payload = await response.json();
    const sanitized = sanitizeModelOptions(endpoint.parse(payload));
    if (sanitized.length === 0) {
      return null;
    }
    providerModelOptions[providerId] = sanitized;
    return cloneModels(sanitized);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    console.warn(`Failed to load models for provider "${providerId}":`, error);
    return null;
  }
};

/**
 * Retrieves model options for the requested provider, prioritizing registered or dynamically
 * fetched listings before falling back to configuration defaults.
 *
 * @param providerId - Provider whose models should be returned.
 * @param apiKey - Optional API key enabling dynamic discovery.
 * @param signal - Optional abort signal for cancellation.
 * @returns A list of models suitable for UI selection components.
 */
export interface FetchModelsOptions {
  signal?: AbortSignal;
  forceRefresh?: boolean;
}

export const fetchModelsForProvider = async (
  providerId: AIProviderId,
  apiKey?: string,
  options?: FetchModelsOptions,
): Promise<ModelOption[]> => {
  const trimmedKey = apiKey?.trim();
  const providerRequiresKey = requiresApiKey(providerId);
  const signal = options?.signal;
  const forceRefresh = options?.forceRefresh ?? false;

  if (forceRefresh || (trimmedKey && trimmedKey.length > 0)) {
    const dynamicModels = await attemptDynamicModelFetch(providerId, trimmedKey, signal);
    if (dynamicModels && dynamicModels.length > 0) {
      return dynamicModels;
    }
  }

  const registeredModels = providerModelOptions[providerId];
  if (registeredModels && registeredModels.length > 0) {
    return cloneModels(registeredModels);
  }

  const fallbackModels = PROVIDER_FALLBACK_MODELS[providerId];
  if (fallbackModels && fallbackModels.length > 0) {
    const sanitizedFallback = sanitizeModelOptions(fallbackModels);
    providerModelOptions[providerId] = sanitizedFallback;
    return cloneModels(sanitizedFallback);
  }

  const fallbackModelId = DEFAULT_PROVIDER_MODELS[providerId];
  if (fallbackModelId) {
    return [{ id: fallbackModelId, label: fallbackModelId }];
  }

  return [];
};

export { ANTHROPIC_API_VERSION };
