import type { AIProviderId, EmbeddingProviderId, ModelOption } from '../types';

export interface ProviderInfo {
  id: AIProviderId;
  label: string;
  requiresApiKey: boolean;
  docsUrl?: string;
}

export interface EmbeddingProviderInfo {
  id: EmbeddingProviderId;
  label: string;
  requiresApiKey: boolean;
  docsUrl?: string;
  defaultEndpoint?: string;
}
export const ANTHROPIC_API_VERSION = '2023-06-01';

export const AI_PROVIDERS: ProviderInfo[] = [
  { id: 'openai', label: 'OpenAI', requiresApiKey: true, docsUrl: 'https://platform.openai.com/' },
  { id: 'openrouter', label: 'OpenRouter', requiresApiKey: true, docsUrl: 'https://openrouter.ai/' },
  { id: 'xai', label: 'xAI (Grok)', requiresApiKey: true, docsUrl: 'https://docs.x.ai/' },
  { id: 'deepseek', label: 'DeepSeek', requiresApiKey: true, docsUrl: 'https://platform.deepseek.com/' },
  { id: 'anthropic', label: 'Anthropic', requiresApiKey: true, docsUrl: 'https://docs.anthropic.com/' },
  { id: 'ollama', label: 'Ollama (Local)', requiresApiKey: false, docsUrl: 'https://ollama.com/' },
];

const PROVIDER_LABEL_MAP: Record<AIProviderId, ProviderInfo> = AI_PROVIDERS.reduce((acc, provider) => {
  acc[provider.id] = provider;
  return acc;
}, {} as Record<AIProviderId, ProviderInfo>);

export const EMBEDDING_PROVIDERS: EmbeddingProviderInfo[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    requiresApiKey: true,
    docsUrl: 'https://platform.openai.com/docs/guides/embeddings',
    defaultEndpoint: 'https://api.openai.com/v1/embeddings',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    requiresApiKey: true,
    docsUrl: 'https://openrouter.ai/docs#embeddings',
    defaultEndpoint: 'https://openrouter.ai/api/v1/embeddings',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    requiresApiKey: true,
    docsUrl: 'https://platform.deepseek.com/docs/api/embeddings',
    defaultEndpoint: 'https://api.deepseek.com/v1/embeddings',
  },
  {
    id: 'ollama',
    label: 'Ollama (Local)',
    requiresApiKey: false,
    docsUrl: 'https://github.com/ollama/ollama/blob/main/docs/api.md#generate-embeddings',
    defaultEndpoint: 'http://127.0.0.1:11434/api/embeddings',
  },
  {
    id: 'custom',
    label: 'Custom (OpenAI-compatible)',
    requiresApiKey: false,
  },
];

const EMBEDDING_PROVIDER_MAP: Record<EmbeddingProviderId, EmbeddingProviderInfo> = EMBEDDING_PROVIDERS.reduce((acc, provider) => {
  acc[provider.id] = provider;
  return acc;
}, {} as Record<EmbeddingProviderId, EmbeddingProviderInfo>);

export const requiresApiKey = (providerId: AIProviderId): boolean => PROVIDER_LABEL_MAP[providerId]?.requiresApiKey ?? true;

export const getProviderLabel = (providerId: AIProviderId): string => PROVIDER_LABEL_MAP[providerId]?.label ?? providerId;

export const requiresEmbeddingApiKey = (providerId: EmbeddingProviderId): boolean =>
  EMBEDDING_PROVIDER_MAP[providerId]?.requiresApiKey ?? true;

export const getEmbeddingProviderLabel = (providerId: EmbeddingProviderId): string =>
  EMBEDDING_PROVIDER_MAP[providerId]?.label ?? providerId;

export const getEmbeddingProviderDefaultEndpoint = (providerId: EmbeddingProviderId): string | undefined =>
  EMBEDDING_PROVIDER_MAP[providerId]?.defaultEndpoint;

export const fetchModelsForProvider = async (
  providerId: AIProviderId,
  apiKey?: string,
  signal?: AbortSignal,
): Promise<ModelOption[]> => {
  switch (providerId) {
    case 'openai': {
      if (!apiKey) throw new Error('An OpenAI API key is required to load models.');
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal,
      });
      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`OpenAI model request failed (${response.status}): ${errorText || response.statusText}`);
      }
      const data = await response.json();
      return (data?.data || []).map((model: any) => ({ id: model.id, label: model.id }));
    }
    case 'openrouter': {
      const response = await fetch('https://openrouter.ai/api/v1/models', { signal });
      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`OpenRouter model request failed (${response.status}): ${errorText || response.statusText}`);
      }
      const data = await response.json();
      return (data?.data || []).map((model: any) => ({ id: model.id, label: model.name || model.id }));
    }
    case 'xai': {
      if (!apiKey) throw new Error('An xAI API key is required to load models.');
      const response = await fetch('https://api.x.ai/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal,
      });
      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`xAI model request failed (${response.status}): ${errorText || response.statusText}`);
      }
      const data = await response.json();
      const models = Array.isArray(data?.data) ? data.data : data?.models;
      return (models || []).map((model: any) => ({ id: model.id ?? model.name, label: model.id ?? model.name }));
    }
    case 'deepseek': {
      if (!apiKey) throw new Error('A DeepSeek API key is required to load models.');
      const response = await fetch('https://api.deepseek.com/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal,
      });
      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`DeepSeek model request failed (${response.status}): ${errorText || response.statusText}`);
      }
      const data = await response.json();
      return (data?.data || []).map((model: any) => ({ id: model.id, label: model.id }));
    }
    case 'anthropic': {
      if (!apiKey) throw new Error('An Anthropic API key is required to load models.');
      const response = await fetch('https://api.anthropic.com/v1/models', {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': ANTHROPIC_API_VERSION,
        },
        signal,
      });
      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`Anthropic model request failed (${response.status}): ${errorText || response.statusText}`);
      }
      const data = await response.json();
      return (data?.data || []).map((model: any) => ({ id: model.id, label: model.display_name || model.id }));
    }
    case 'ollama': {
      const response = await fetch('http://127.0.0.1:11434/api/tags', { signal });
      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`Ollama model request failed (${response.status}): ${errorText || response.statusText}`);
      }
      const data = await response.json();
      return (data?.models || []).map((model: any) => ({ id: model?.name ?? model?.model, label: model?.name ?? model?.model }));
    }
    default:
      return [];
  }
};
