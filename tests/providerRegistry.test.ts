import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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
import { PROVIDER_FALLBACK_MODELS, PROVIDER_MODEL_ENDPOINTS } from '../config/providerConfig';
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

  it('sanitizes registered models that contain whitespace and empty labels', async () => {
    registerProviderModels('openai', [
      { id: '   ', label: 'Should be ignored' },
      { id: ' trimmed-id ', label: '   ' },
    ]);

    const models = await fetchModelsForProvider('openai');
    expect(models).toEqual([{ id: 'trimmed-id', label: 'trimmed-id' }]);
  });

  it('falls back to default models when none are registered for a known provider', async () => {
    registerProviderModels('openai', []);

    const models = await fetchModelsForProvider('openai');
    expect(models.length).toBeGreaterThan(0);
    expect(models).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: DEFAULT_PROVIDER_MODELS.openai }),
      ]),
    );
  });

  it('returns dynamically fetched models when an API key is provided', async () => {
    const mockResponse = {
      data: [
        { id: 'gpt-test', name: 'GPT Test', description: 'Mocked model', owned_by: 'openai' },
      ],
    };
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const models = await fetchModelsForProvider('openai', 'api-key', { forceRefresh: true });

    expect(fetchSpy).toHaveBeenCalled();
    expect(models).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'gpt-test', label: 'gpt-test' })]),
    );

    fetchSpy.mockRestore();
  });

  it('refreshes local providers without an API key when forceRefresh is true', async () => {
    const mockResponse = {
      models: [
        { name: 'local-model', details: { family: 'test-family' } },
      ],
    };
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const models = await fetchModelsForProvider('ollama', undefined, { forceRefresh: true });

    expect(fetchSpy).toHaveBeenCalled();
    expect(models).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'local-model', label: 'local-model' })]),
    );

    fetchSpy.mockRestore();
  });

  it('falls back when dynamic fetch responds with an error status', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('error', { status: 500 }),
    );

    registerProviderModels('openai', []);
    const models = await fetchModelsForProvider('openai', 'api-key', { forceRefresh: true });

    expect(fetchSpy).toHaveBeenCalled();
    expect(models).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: DEFAULT_PROVIDER_MODELS.openai })]),
    );

    fetchSpy.mockRestore();
  });

  it('falls back when dynamic fetch returns no usable models', async () => {
    const mockResponse = { data: [] };
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    registerProviderModels('openai', []);
    const models = await fetchModelsForProvider('openai', 'api-key', { forceRefresh: true });

    expect(fetchSpy).toHaveBeenCalled();
    expect(models).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: DEFAULT_PROVIDER_MODELS.openai })]),
    );

    fetchSpy.mockRestore();
  });

  it('returns fallback when dynamic fetch throws a non-abort error', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network failure'));

    registerProviderModels('openai', []);
    const models = await fetchModelsForProvider('openai', 'api-key', { forceRefresh: true });

    expect(fetchSpy).toHaveBeenCalled();
    expect(models).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: DEFAULT_PROVIDER_MODELS.openai })]),
    );

    fetchSpy.mockRestore();
  });

  it('propagates abort errors from dynamic fetch', async () => {
    const abortError = new DOMException('Aborted', 'AbortError');
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(abortError);

    await expect(
      fetchModelsForProvider('openai', 'api-key', { forceRefresh: true }),
    ).rejects.toBe(abortError);

    fetchSpy.mockRestore();
  });

  it('falls back to the default provider model when no fallback list exists', async () => {
    const originalFallback = PROVIDER_FALLBACK_MODELS.openai;
    try {
      PROVIDER_FALLBACK_MODELS.openai = [];
      registerProviderModels('openai', []);

      const models = await fetchModelsForProvider('openai');
      expect(models).toEqual([
        {
          id: DEFAULT_PROVIDER_MODELS.openai,
          label: DEFAULT_PROVIDER_MODELS.openai,
        },
      ]);
    } finally {
      PROVIDER_FALLBACK_MODELS.openai = originalFallback;
    }
  });

  it('skips dynamic fetch when an API key is blank for key-required providers', async () => {
    registerProviderModels('openai', []);
    const models = await fetchModelsForProvider('openai', '   ', { forceRefresh: true });

    expect(models).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: DEFAULT_PROVIDER_MODELS.openai })]),
    );
  });

  it('falls back when a request configuration cannot be created', async () => {
    const originalEndpoint = PROVIDER_MODEL_ENDPOINTS.openai!;
    PROVIDER_MODEL_ENDPOINTS.openai = {
      ...originalEndpoint,
      buildRequestInit: () => null,
    };

    registerProviderModels('openai', []);
    const models = await fetchModelsForProvider('openai', 'api-key', { forceRefresh: true });

    expect(models).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: DEFAULT_PROVIDER_MODELS.openai })]),
    );

    PROVIDER_MODEL_ENDPOINTS.openai = originalEndpoint;
  });

  it('falls back when fetch is not available in the environment', async () => {
    const originalFetch = globalThis.fetch;
    // @ts-expect-error overriding fetch for test coverage
    globalThis.fetch = undefined;

    try {
      registerProviderModels('openai', []);
      const models = await fetchModelsForProvider('openai', 'api-key', { forceRefresh: true });

      expect(models).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: DEFAULT_PROVIDER_MODELS.openai })]),
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('returns an empty list for completely unknown providers', async () => {
    const unknownProvider = 'totally-unknown' as AIProviderId;
    const models = await fetchModelsForProvider(unknownProvider);
    expect(models).toEqual([]);
  });
});
