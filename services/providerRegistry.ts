import type { AIProviderId, ModelOption, EmbeddingProviderId } from '../types';
import { DEFAULT_PROVIDER_MODELS } from '../constants';

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
  {
    id: 'openai',
    label: 'OpenAI',
    requiresApiKey: true,
    docsUrl: 'https://platform.openai.com/docs/api-reference',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    requiresApiKey: true,
    docsUrl: 'https://openrouter.ai/docs',
  },
  {
    id: 'xai',
    label: 'xAI (Grok)',
    requiresApiKey: true,
    docsUrl: 'https://docs.x.ai/',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    requiresApiKey: true,
    docsUrl: 'https://platform.deepseek.com/docs',
  },
  {
    id: 'anthropic',
    label: 'Anthropic Claude',
    requiresApiKey: true,
    docsUrl: 'https://docs.anthropic.com/claude',
  },
  {
    id: 'ollama',
    label: 'Ollama (Local)',
    requiresApiKey: false,
    docsUrl: 'https://github.com/ollama/ollama',
  },
];

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
    docsUrl: 'https://openrouter.ai/docs',
    defaultEndpoint: 'https://openrouter.ai/api/v1/embeddings',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    requiresApiKey: true,
    docsUrl: 'https://platform.deepseek.com/docs',
    defaultEndpoint: 'https://api.deepseek.com/v1/embeddings',
  },
  {
    id: 'ollama',
    label: 'Ollama (Local)',
    requiresApiKey: false,
    docsUrl: 'https://github.com/ollama/ollama',
    defaultEndpoint: 'http://localhost:11434/api/embeddings',
  },
  {
    id: 'custom',
    label: 'Custom Endpoint',
    requiresApiKey: false,
  },
];

const STATIC_MODEL_OPTIONS: Record<AIProviderId, ModelOption[]> = {
  openai: [
    { id: 'gpt-4o', label: 'gpt-4o', description: 'Flagship general-purpose model' },
    { id: 'gpt-4o-mini', label: 'gpt-4o-mini', description: 'Fast and cost-effective 4o variant' },
    { id: 'o1-mini', label: 'o1-mini', description: 'Reasoning-optimised model' },
  ],
  openrouter: [
    { id: 'openrouter/auto', label: 'openrouter/auto', description: 'Smart router that picks the best model' },
    { id: 'anthropic/claude-3.5-sonnet', label: 'anthropic/claude-3.5-sonnet', description: 'Anthropic Claude via OpenRouter' },
    { id: 'google/gemini-pro', label: 'google/gemini-pro', description: 'Gemini Pro via OpenRouter' },
  ],
  xai: [
    { id: 'grok-beta', label: 'grok-beta', description: 'General purpose Grok model' },
    { id: 'grok-vision-beta', label: 'grok-vision-beta', description: 'Multimodal Grok variant with vision' },
  ],
  deepseek: [
    { id: 'deepseek-chat', label: 'deepseek-chat', description: 'DeepSeek general chat model' },
    { id: 'deepseek-coder', label: 'deepseek-coder', description: 'DeepSeek code-focused model' },
  ],
  anthropic: [
    { id: 'claude-3-5-sonnet-latest', label: 'claude-3.5-sonnet-latest', description: 'Latest Claude 3.5 Sonnet release' },
    { id: 'claude-3-opus-latest', label: 'claude-3-opus-latest', description: 'Claude 3 Opus for high quality outputs' },
  ],
  ollama: [
    { id: 'llama3.1:8b', label: 'llama3.1:8b', description: 'Meta Llama 3.1 8B local model' },
    { id: 'llama3.1:70b', label: 'llama3.1:70b', description: 'Meta Llama 3.1 70B local model' },
    { id: 'qwen2.5:14b', label: 'qwen2.5:14b', description: 'Qwen 2.5 local model' },
  ],
};

export const getProviderLabel = (providerId: AIProviderId): string => {
  return AI_PROVIDERS.find(provider => provider.id === providerId)?.label ?? providerId;
};

export const requiresApiKey = (providerId: AIProviderId): boolean => {
  return AI_PROVIDERS.find(provider => provider.id === providerId)?.requiresApiKey ?? true;
};

export const requiresEmbeddingApiKey = (providerId: EmbeddingProviderId): boolean => {
  return EMBEDDING_PROVIDERS.find(provider => provider.id === providerId)?.requiresApiKey ?? false;
};

export const getEmbeddingProviderDefaultEndpoint = (
  providerId: EmbeddingProviderId,
): string | undefined => {
  return EMBEDDING_PROVIDERS.find(provider => provider.id === providerId)?.defaultEndpoint;
};

export const fetchModelsForProvider = async (
  providerId: AIProviderId,
  apiKey?: string,
): Promise<ModelOption[]> => {
  void apiKey; // Currently unused but retained for future dynamic fetching support
  const models = STATIC_MODEL_OPTIONS[providerId];
  if (models && models.length > 0) {
    return models;
  }
  const fallback = DEFAULT_PROVIDER_MODELS[providerId];
  if (fallback) {
    return [{ id: fallback, label: fallback }];
  }
  return [];
};
