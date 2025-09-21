import type { AIProviderId, EmbeddingProviderId, ModelOption } from '../types';

/**
 * Friendly metadata describing an AI generation provider. Mirrors the information displayed in
 * selection menus across the workspace.
 */
export interface ProviderMetadata {
  id: AIProviderId;
  label: string;
  requiresApiKey: boolean;
  docsUrl?: string;
}

/**
 * Embedding provider information used when configuring vector store integrations.
 */
export interface EmbeddingProviderMetadata {
  id: EmbeddingProviderId;
  label: string;
  requiresApiKey: boolean;
  docsUrl?: string;
  defaultEndpoint?: string;
}

/**
 * Shape describing how to retrieve dynamic model listings from a provider SDK or HTTP endpoint.
 */
export interface ModelEndpointConfiguration {
  url: string;
  requiresApiKey?: boolean;
  buildRequestInit: (options: { apiKey?: string }) => RequestInit | null;
  parse: (payload: unknown) => ModelOption[];
}

/**
 * Composite configuration for a provider including metadata, default models, and endpoint settings.
 */
export interface ProviderConfiguration {
  metadata: ProviderMetadata;
  defaultModel: string;
  fallbackModels: ModelOption[];
  modelEndpoint?: ModelEndpointConfiguration;
}

/**
 * Anthropics' API version header required for model enumeration and text generation.
 */
export const ANTHROPIC_API_VERSION = '2023-06-01';

export const OPENROUTER_DEFAULT_REFERRER = 'https://local.app';

const normalizeModelOption = (model: ModelOption): ModelOption | null => {
  if (!model || typeof model.id !== 'string') {
    return null;
  }
  const trimmedId = model.id.trim();
  if (!trimmedId) {
    return null;
  }
  const trimmedLabel = typeof model.label === 'string' && model.label.trim().length > 0
    ? model.label.trim()
    : trimmedId;
  const description = typeof model.description === 'string' && model.description.trim().length > 0
    ? model.description.trim()
    : undefined;
  return { id: trimmedId, label: trimmedLabel, description };
};

const dedupeModels = (models: ModelOption[]): ModelOption[] => {
  const seen = new Map<string, ModelOption>();
  models.forEach(model => {
    const normalized = normalizeModelOption(model);
    if (!normalized) {
      return;
    }
    if (!seen.has(normalized.id)) {
      seen.set(normalized.id, normalized);
    }
  });
  return Array.from(seen.values());
};

const sortModels = (models: ModelOption[]): ModelOption[] => {
  return [...models].sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
};

const isLikelyOpenAIChatModel = (modelId: string): boolean => {
  const normalized = modelId.toLowerCase();
  return (
    normalized.startsWith('gpt') ||
    normalized.startsWith('o1') ||
    normalized.startsWith('o3') ||
    normalized.startsWith('o4') ||
    normalized.includes('chat')
  );
};

const parseOpenAIModels = (payload: unknown): ModelOption[] => {
  const data = (payload as { data?: Array<{ id?: string; owned_by?: string }> })?.data;
  if (!Array.isArray(data)) {
    return [];
  }
  const models = data
    .filter(item => item && typeof item.id === 'string' && isLikelyOpenAIChatModel(item.id))
    .map(item => ({
      id: item.id as string,
      label: item.id as string,
      description: item.owned_by ? `Owned by ${item.owned_by}` : undefined,
    }));
  return sortModels(dedupeModels(models));
};

const parseOpenRouterModels = (payload: unknown): ModelOption[] => {
  const data = (payload as { data?: Array<{ id?: string; name?: string; description?: string }> })?.data;
  if (!Array.isArray(data)) {
    return [];
  }
  const models = data
    .filter(item => item && typeof item.id === 'string')
    .map(item => ({
      id: item.id as string,
      label: item.name && item.name.trim().length > 0 ? item.name : (item.id as string),
      description: item.description,
    }));
  return sortModels(dedupeModels(models));
};

const parseXaiModels = (payload: unknown): ModelOption[] => {
  const data = (payload as { data?: Array<{ id?: string; display_name?: string }> })?.data;
  if (!Array.isArray(data)) {
    return [];
  }
  return sortModels(dedupeModels(
    data
      .filter(item => item && typeof item.id === 'string')
      .map(item => ({
        id: item.id as string,
        label: item.display_name && item.display_name.trim().length > 0 ? item.display_name : (item.id as string),
      })),
  ));
};

const parseDeepSeekModels = (payload: unknown): ModelOption[] => {
  const data = (payload as { data?: Array<{ id?: string; description?: string }> })?.data;
  if (!Array.isArray(data)) {
    return [];
  }
  return sortModels(dedupeModels(
    data
      .filter(item => item && typeof item.id === 'string')
      .map(item => ({
        id: item.id as string,
        label: item.id as string,
        description: item.description,
      })),
  ));
};

const parseAnthropicModels = (payload: unknown): ModelOption[] => {
  const data = (payload as { data?: Array<{ id?: string; display_name?: string; description?: string }> })?.data;
  if (!Array.isArray(data)) {
    return [];
  }
  return sortModels(dedupeModels(
    data
      .filter(item => item && typeof item.id === 'string')
      .map(item => ({
        id: item.id as string,
        label: item.display_name && item.display_name.trim().length > 0 ? item.display_name : (item.id as string),
        description: item.description,
      })),
  ));
};

const parseOllamaModels = (payload: unknown): ModelOption[] => {
  const models = (payload as { models?: Array<{ name?: string; details?: { family?: string } }> })?.models;
  if (!Array.isArray(models)) {
    return [];
  }
  return sortModels(dedupeModels(
    models
      .filter(item => item && typeof item.name === 'string')
      .map(item => ({
        id: item.name as string,
        label: item.name as string,
        description: item.details?.family,
      })),
  ));
};

const providerConfigurations: ProviderConfiguration[] = [
  {
    metadata: {
      id: 'openai',
      label: 'OpenAI',
      requiresApiKey: true,
      docsUrl: 'https://platform.openai.com/docs/api-reference',
    },
    defaultModel: 'gpt-4o-mini',
    fallbackModels: [
      { id: 'gpt-4o', label: 'gpt-4o', description: 'Flagship general-purpose model' },
      { id: 'gpt-4o-mini', label: 'gpt-4o-mini', description: 'Fast and cost-effective 4o variant' },
      { id: 'o1-mini', label: 'o1-mini', description: 'Reasoning-optimised model' },
    ],
    modelEndpoint: {
      url: 'https://api.openai.com/v1/models',
      requiresApiKey: true,
      buildRequestInit: ({ apiKey }) => {
        if (!apiKey || apiKey.trim() === '') {
          return null;
        }
        return {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${apiKey.trim()}`,
            'Content-Type': 'application/json',
          },
        };
      },
      parse: parseOpenAIModels,
    },
  },
  {
    metadata: {
      id: 'openrouter',
      label: 'OpenRouter',
      requiresApiKey: true,
      docsUrl: 'https://openrouter.ai/docs',
    },
    defaultModel: 'openrouter/auto',
    fallbackModels: [
      { id: 'openrouter/auto', label: 'openrouter/auto', description: 'Smart router that picks the best model' },
      {
        id: 'anthropic/claude-3.5-sonnet',
        label: 'anthropic/claude-3.5-sonnet',
        description: 'Anthropic Claude via OpenRouter',
      },
      { id: 'google/gemini-pro', label: 'google/gemini-pro', description: 'Gemini Pro via OpenRouter' },
    ],
    modelEndpoint: {
      url: 'https://openrouter.ai/api/v1/models',
      requiresApiKey: true,
      buildRequestInit: ({ apiKey }) => {
        if (!apiKey || apiKey.trim() === '') {
          return null;
        }
        const trimmedKey = apiKey.trim();
        const referer = typeof window !== 'undefined' && window.location?.origin
          ? window.location.origin
          : OPENROUTER_DEFAULT_REFERRER;
        return {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${trimmedKey}`,
            'HTTP-Referer': referer,
            'X-Title': 'AI Content Suite',
          },
        };
      },
      parse: parseOpenRouterModels,
    },
  },
  {
    metadata: {
      id: 'xai',
      label: 'xAI (Grok)',
      requiresApiKey: true,
      docsUrl: 'https://docs.x.ai/',
    },
    defaultModel: 'grok-beta',
    fallbackModels: [
      { id: 'grok-beta', label: 'grok-beta', description: 'General purpose Grok model' },
      { id: 'grok-vision-beta', label: 'grok-vision-beta', description: 'Multimodal Grok variant with vision' },
    ],
    modelEndpoint: {
      url: 'https://api.x.ai/v1/models',
      requiresApiKey: true,
      buildRequestInit: ({ apiKey }) => {
        if (!apiKey || apiKey.trim() === '') {
          return null;
        }
        return {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${apiKey.trim()}`,
            'Content-Type': 'application/json',
          },
        };
      },
      parse: parseXaiModels,
    },
  },
  {
    metadata: {
      id: 'deepseek',
      label: 'DeepSeek',
      requiresApiKey: true,
      docsUrl: 'https://platform.deepseek.com/docs',
    },
    defaultModel: 'deepseek-chat',
    fallbackModels: [
      { id: 'deepseek-chat', label: 'deepseek-chat', description: 'DeepSeek general chat model' },
      { id: 'deepseek-coder', label: 'deepseek-coder', description: 'DeepSeek code-focused model' },
    ],
    modelEndpoint: {
      url: 'https://api.deepseek.com/models',
      requiresApiKey: true,
      buildRequestInit: ({ apiKey }) => {
        if (!apiKey || apiKey.trim() === '') {
          return null;
        }
        return {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${apiKey.trim()}`,
            'Content-Type': 'application/json',
          },
        };
      },
      parse: parseDeepSeekModels,
    },
  },
  {
    metadata: {
      id: 'anthropic',
      label: 'Anthropic Claude',
      requiresApiKey: true,
      docsUrl: 'https://docs.anthropic.com/claude',
    },
    defaultModel: 'claude-3-5-sonnet-latest',
    fallbackModels: [
      {
        id: 'claude-3-5-sonnet-latest',
        label: 'claude-3.5-sonnet-latest',
        description: 'Latest Claude 3.5 Sonnet release',
      },
      {
        id: 'claude-3-opus-latest',
        label: 'claude-3-opus-latest',
        description: 'Claude 3 Opus for high quality outputs',
      },
    ],
    modelEndpoint: {
      url: 'https://api.anthropic.com/v1/models',
      requiresApiKey: true,
      buildRequestInit: ({ apiKey }) => {
        if (!apiKey || apiKey.trim() === '') {
          return null;
        }
        return {
          method: 'GET',
          headers: {
            'x-api-key': apiKey.trim(),
            'anthropic-version': ANTHROPIC_API_VERSION,
          },
        };
      },
      parse: parseAnthropicModels,
    },
  },
  {
    metadata: {
      id: 'ollama',
      label: 'Ollama (Local)',
      requiresApiKey: false,
      docsUrl: 'https://github.com/ollama/ollama',
    },
    defaultModel: 'llama3.1:8b',
    fallbackModels: [
      { id: 'llama3.1:8b', label: 'llama3.1:8b', description: 'Meta Llama 3.1 8B local model' },
      { id: 'llama3.1:70b', label: 'llama3.1:70b', description: 'Meta Llama 3.1 70B local model' },
      { id: 'qwen2.5:14b', label: 'qwen2.5:14b', description: 'Qwen 2.5 local model' },
    ],
    modelEndpoint: {
      url: 'http://127.0.0.1:11434/api/tags',
      requiresApiKey: false,
      buildRequestInit: () => ({ method: 'GET' }),
      parse: parseOllamaModels,
    },
  },
];

const embeddingProviderConfigurations: Array<{
  metadata: EmbeddingProviderMetadata;
  defaultModel: string;
}> = [
  {
    metadata: {
      id: 'openai',
      label: 'OpenAI',
      requiresApiKey: true,
      docsUrl: 'https://platform.openai.com/docs/guides/embeddings',
      defaultEndpoint: 'https://api.openai.com/v1/embeddings',
    },
    defaultModel: 'text-embedding-3-small',
  },
  {
    metadata: {
      id: 'openrouter',
      label: 'OpenRouter',
      requiresApiKey: true,
      docsUrl: 'https://openrouter.ai/docs',
      defaultEndpoint: 'https://openrouter.ai/api/v1/embeddings',
    },
    defaultModel: 'text-embedding-3-small',
  },
  {
    metadata: {
      id: 'deepseek',
      label: 'DeepSeek',
      requiresApiKey: true,
      docsUrl: 'https://platform.deepseek.com/docs',
      defaultEndpoint: 'https://api.deepseek.com/v1/embeddings',
    },
    defaultModel: 'deepseek-embedding',
  },
  {
    metadata: {
      id: 'ollama',
      label: 'Ollama (Local)',
      requiresApiKey: false,
      docsUrl: 'https://github.com/ollama/ollama',
      defaultEndpoint: 'http://localhost:11434/api/embeddings',
    },
    defaultModel: 'nomic-embed-text',
  },
  {
    metadata: {
      id: 'custom',
      label: 'Custom Endpoint',
      requiresApiKey: false,
    },
    defaultModel: '',
  },
];

/**
 * All configured provider definitions keyed by identifier for quick lookup.
 */
export const PROVIDER_CONFIGURATION_MAP: Record<AIProviderId, ProviderConfiguration> =
  providerConfigurations.reduce((acc, config) => {
    acc[config.metadata.id] = config;
    return acc;
  }, {} as Record<AIProviderId, ProviderConfiguration>);

/**
 * Collection of provider metadata exported as an ordered array for UI rendering.
 */
export const PROVIDER_METADATA_LIST: ProviderMetadata[] = providerConfigurations.map(config => config.metadata);

/**
 * Default model identifier per provider, preserving backward compatibility with existing imports.
 */
export const DEFAULT_PROVIDER_MODELS: Record<AIProviderId, string> = providerConfigurations.reduce(
  (acc, config) => {
    acc[config.metadata.id] = config.defaultModel;
    return acc;
  },
  {} as Record<AIProviderId, string>,
);

/**
 * Fallback model collections used when dynamic fetching is unavailable or fails.
 */
export const PROVIDER_FALLBACK_MODELS: Record<AIProviderId, ModelOption[]> = providerConfigurations.reduce(
  (acc, config) => {
    acc[config.metadata.id] = config.fallbackModels.map(model => ({ ...model }));
    return acc;
  },
  {} as Record<AIProviderId, ModelOption[]>,
);

/**
 * Model endpoint definitions keyed by provider for on-demand lookup.
 */
export const PROVIDER_MODEL_ENDPOINTS: Partial<Record<AIProviderId, ModelEndpointConfiguration>> =
  providerConfigurations.reduce((acc, config) => {
    if (config.modelEndpoint) {
      acc[config.metadata.id] = config.modelEndpoint;
    }
    return acc;
  }, {} as Partial<Record<AIProviderId, ModelEndpointConfiguration>>);

/**
 * Embedding provider metadata and defaults exported for settings management.
 */
export const EMBEDDING_PROVIDER_METADATA_LIST: EmbeddingProviderMetadata[] = embeddingProviderConfigurations.map(
  config => config.metadata,
);

/**
 * Default embedding model selection keyed by provider identifier.
 */
export const DEFAULT_EMBEDDING_MODELS: Record<EmbeddingProviderId, string> = embeddingProviderConfigurations.reduce(
  (acc, config) => {
    acc[config.metadata.id] = config.defaultModel;
    return acc;
  },
  {} as Record<EmbeddingProviderId, string>,
);
