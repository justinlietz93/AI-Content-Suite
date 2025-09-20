import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  AI_PROVIDERS,
  EMBEDDING_PROVIDERS,
  fetchModelsForProvider,
  getProviderLabel,
  requiresApiKey,
  requiresEmbeddingApiKey,
  getEmbeddingProviderDefaultEndpoint,
  registerProviderModels,
} from '../services/providerRegistry';
import { DEFAULT_PROVIDER_MODELS } from '../constants';
import type { AIProviderId, EmbeddingProviderId, ModelOption } from '../types';

const captureDefaultModels = async (): Promise<Record<AIProviderId, ModelOption[]>> => {
  const defaults: Partial<Record<AIProviderId, ModelOption[]>> = {};
  await Promise.all(
    AI_PROVIDERS.map(async provider => {
      defaults[provider.id] = await fetchModelsForProvider(provider.id);
    }),
  );
  return defaults as Record<AIProviderId, ModelOption[]>;
};

let originalModels: Record<AIProviderId, ModelOption[]>;

beforeEach(async () => {
  originalModels = await captureDefaultModels();
});

afterEach(() => {
  for (const provider of AI_PROVIDERS) {
    registerProviderModels(provider.id, originalModels[provider.id]);
  }
});

describe('providerRegistry', () => {
  it('exposes the expected provider metadata', () => {
    expect(AI_PROVIDERS.map(provider => provider.id)).toEqual([
      'openai',
      'openrouter',
      'xai',
      'deepseek',
      'anthropic',
      'ollama',
    ]);
    expect(AI_PROVIDERS.every(provider => provider.label.length > 0)).toBe(true);
  });

  it('returns a friendly provider label or falls back to the id', () => {
    expect(getProviderLabel('openai')).toBe('OpenAI');
    const unknownProvider = 'made-up-provider' as AIProviderId;
    expect(getProviderLabel(unknownProvider)).toBe(unknownProvider);
  });

  it('reports whether an API key is required for generation providers', () => {
    expect(requiresApiKey('openai')).toBe(true);
    expect(requiresApiKey('ollama')).toBe(false);
    const unknownProvider = 'non-existent-provider' as AIProviderId;
    expect(requiresApiKey(unknownProvider)).toBe(true);
  });

  it('reports API key requirements for embedding providers', () => {
    const providerWithKey = EMBEDDING_PROVIDERS.find(provider => provider.id === 'openai');
    expect(providerWithKey?.requiresApiKey).toBe(true);
    expect(requiresEmbeddingApiKey('openrouter')).toBe(true);
    expect(requiresEmbeddingApiKey('custom')).toBe(false);
    const unknownEmbedding = 'missing' as EmbeddingProviderId;
    expect(requiresEmbeddingApiKey(unknownEmbedding)).toBe(false);
  });

  it('returns default embedding endpoints when available', () => {
    expect(getEmbeddingProviderDefaultEndpoint('openai')).toMatch('api.openai.com');
    expect(getEmbeddingProviderDefaultEndpoint('custom')).toBeUndefined();
  });

  it('returns the registered models for a provider', async () => {
    const customModels: ModelOption[] = [
      { id: 'custom-model', label: 'Custom Model' },
    ];
    registerProviderModels('openai', customModels);

    const models = await fetchModelsForProvider('openai');
    expect(models).toEqual(customModels);
    expect(models).not.toBe(customModels); // defensive copy
  });

  it('falls back to default models when none are registered for a known provider', async () => {
    registerProviderModels('openai', []);

    const models = await fetchModelsForProvider('openai');
    expect(models).toEqual([
      {
        id: DEFAULT_PROVIDER_MODELS.openai,
        label: DEFAULT_PROVIDER_MODELS.openai,
      },
    ]);
  });

  it('returns an empty list for completely unknown providers', async () => {
    const unknownProvider = 'totally-unknown' as AIProviderId;
    const models = await fetchModelsForProvider(unknownProvider);
    expect(models).toEqual([]);
  });
});
