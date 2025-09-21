import type { AIProviderId, ThinkingSegment } from '../types';
import { DEFAULT_PROVIDER_MODELS } from '../constants';
import { GENERATION_DEFAULTS, ReasoningEffortLevel } from '../config/generationConfig';
import { getProviderLabel, requiresApiKey, ANTHROPIC_API_VERSION } from './providerRegistry';

export type ResponseFormat = 'text' | 'json';

export type ProviderMessages = Array<{
  role: 'system' | 'user' | 'assistant';
  content: string;
}>;

export interface ReasoningBehavior {
  enabled?: boolean;
  effort?: ReasoningEffortLevel;
  budgetTokens?: number;
}

export interface ThinkingBehavior {
  enabled?: boolean;
  budgetTokens?: number;
}

export type ProviderCallArgs = {
  messages: ProviderMessages;
  maxOutputTokens?: number;
  responseFormat?: ResponseFormat;
  temperature?: number;
  reasoning?: ReasoningBehavior;
  thinking?: ThinkingBehavior;
  signal?: AbortSignal;
};

interface ActiveProviderConfig {
  providerId: AIProviderId;
  model: string;
  apiKey?: string;
  maxOutputTokens: number;
}

export interface ProviderTextResponse {
  text: string;
  thinking: ThinkingSegment[];
}

let activeConfig: ActiveProviderConfig = {
  providerId: 'openai',
  model: DEFAULT_PROVIDER_MODELS.openai,
  apiKey: undefined,
  maxOutputTokens: GENERATION_DEFAULTS.maxOutputTokens,
};

const ensureConfig = (): ActiveProviderConfig => {
  if (!activeConfig.model || activeConfig.model.trim() === '') {
    const fallbackModel = DEFAULT_PROVIDER_MODELS[activeConfig.providerId];
    if (!fallbackModel) {
      throw new Error('No model configured for the selected provider. Please choose a model in settings.');
    }
    activeConfig = { ...activeConfig, model: fallbackModel };
  }
  const sanitizedMaxTokens = Number.isFinite(activeConfig.maxOutputTokens)
    ? Math.max(1, Math.round(activeConfig.maxOutputTokens))
    : GENERATION_DEFAULTS.maxOutputTokens;
  if (sanitizedMaxTokens !== activeConfig.maxOutputTokens) {
    activeConfig = { ...activeConfig, maxOutputTokens: sanitizedMaxTokens };
  }
  return activeConfig;
};

export const setActiveProviderConfig = (config: {
  providerId: AIProviderId;
  model?: string;
  apiKey?: string;
  maxOutputTokens?: number;
}) => {
  activeConfig = {
    providerId: config.providerId,
    model: config.model && config.model.trim() !== '' ? config.model.trim() : DEFAULT_PROVIDER_MODELS[config.providerId],
    apiKey: config.apiKey && config.apiKey.trim() !== '' ? config.apiKey.trim() : undefined,
    maxOutputTokens:
      typeof config.maxOutputTokens === 'number' && Number.isFinite(config.maxOutputTokens)
        ? Math.max(1, Math.round(config.maxOutputTokens))
        : GENERATION_DEFAULTS.maxOutputTokens,
  };
};

export const getActiveProviderConfig = (): ActiveProviderConfig => ({ ...ensureConfig() });

export const getActiveProviderLabel = (): string => getProviderLabel(activeConfig.providerId);

export const getActiveModelName = (): string => ensureConfig().model;

const toOpenAIMessage = (messages: ProviderMessages) =>
  messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));

const REASONING_MODEL_PREFIXES = ['gpt-5', 'o1', 'o3', 'o4'];
const REASONING_MODEL_KEYWORDS = ['reason', 'thinking', 'r1'];

const isReasoningModelId = (modelId: string): boolean => {
  const normalized = modelId.toLowerCase();
  return (
    REASONING_MODEL_PREFIXES.some(prefix => normalized.startsWith(prefix)) ||
    REASONING_MODEL_KEYWORDS.some(keyword => normalized.includes(keyword))
  );
};

const THINKING_HINT_KEYWORDS = ['reason', 'think', 'analysis', 'chain', 'deliberat', 'scratchpad', 'plan', 'inner', 'cot', 'reflect'];
const JSON_HINT_KEYWORDS = ['json', 'schema', 'structured'];
const THINKING_LABEL_ALIASES: Record<string, string> = {
  cot: 'Chain of Thought',
  'chain_of_thought': 'Chain of Thought',
  'chain-of-thought': 'Chain of Thought',
  reasoning: 'Reasoning',
  reason: 'Reasoning',
  analysis: 'Analysis',
  deliberate: 'Deliberation',
  deliberation: 'Deliberation',
  reflection: 'Reflection',
  scratchpad: 'Scratchpad',
  plan: 'Plan',
  'inner_monologue': 'Inner Monologue',
  'inner-monologue': 'Inner Monologue',
};

type NormalizedCollector = {
  textParts: string[];
  thinkingSegments: ThinkingSegment[];
};

const createCollector = (): NormalizedCollector => ({ textParts: [], thinkingSegments: [] });

const isThinkingHint = (value?: string): boolean => {
  if (!value) return false;
  const normalized = value.toLowerCase();
  return THINKING_HINT_KEYWORDS.some((keyword) => normalized.includes(keyword));
};

const isJsonHint = (value?: string): boolean => {
  if (!value) {
    return false;
  }
  const normalized = value.toLowerCase();
  return JSON_HINT_KEYWORDS.some((keyword) => normalized.includes(keyword));
};

const formatThinkingLabel = (hint?: string): string => {
  if (!hint) return 'Thinking';
  const normalizedKey = hint.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  if (THINKING_LABEL_ALIASES[normalizedKey]) {
    return THINKING_LABEL_ALIASES[normalizedKey];
  }
  const cleaned = hint.replace(/[^a-zA-Z0-9_\s-]+/g, ' ').trim();
  if (!cleaned) {
    return 'Thinking';
  }
  return cleaned
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
};

const pushText = (collector: NormalizedCollector, value: unknown) => {
  if (typeof value !== 'string') return;
  const trimmed = value.trim();
  if (!trimmed) return;
  collector.textParts.push(trimmed);
};

const pushThinking = (collector: NormalizedCollector, value: unknown, hint?: string) => {
  if (typeof value !== 'string') return;
  const trimmed = value.trim();
  if (!trimmed) return;
  const normalizedHint = hint?.toLowerCase();
  collector.thinkingSegments.push({
    type: normalizedHint,
    label: formatThinkingLabel(normalizedHint ?? hint),
    text: trimmed,
  });
};

const pushJsonLike = (collector: NormalizedCollector, value: unknown): boolean => {
  if (value == null) {
    return false;
  }
  if (typeof value === 'string') {
    pushText(collector, value);
    return true;
  }
  try {
    const serialized = JSON.stringify(value);
    if (typeof serialized !== 'string' || serialized.trim() === '') {
      return false;
    }
    pushText(collector, serialized);
    return true;
  } catch {
    return false;
  }
};

const SKIP_OBJECT_KEYS = new Set([
  'id',
  'index',
  'finish_reason',
  'logprobs',
  'usage',
  'role',
  'model',
  'object',
  'created',
  'prompt_filter_results',
]);

const collectNormalizedParts = (value: unknown, collector: NormalizedCollector, hint?: string) => {
  if (value == null) {
    return;
  }

  if (typeof value === 'string') {
    if (isThinkingHint(hint)) {
      pushThinking(collector, value, hint);
    } else {
      pushText(collector, value);
    }
    return;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    if (!isThinkingHint(hint)) {
      pushText(collector, String(value));
    }
    return;
  }

  if (Array.isArray(value)) {
    if (isJsonHint(hint) && pushJsonLike(collector, value)) {
      return;
    }
    value.forEach((item) => collectNormalizedParts(item, collector, hint));
    return;
  }

  if (typeof value === 'object') {
    const objectValue = value as Record<string, unknown>;
    const typeHint = typeof objectValue.type === 'string' ? (objectValue.type as string) : hint;
    const handledKeys = new Set<string>(['type']);

    const hasStructuredPayload =
      Object.prototype.hasOwnProperty.call(objectValue, 'json') ||
      Object.prototype.hasOwnProperty.call(objectValue, 'parsed') ||
      Object.prototype.hasOwnProperty.call(objectValue, 'response_json') ||
      Object.prototype.hasOwnProperty.call(objectValue, 'arguments');

    if (isJsonHint(typeHint) && !hasStructuredPayload) {
      if (pushJsonLike(collector, objectValue)) {
        return;
      }
    }

    if (typeof objectValue.text === 'string') {
      if (isThinkingHint(typeHint)) {
        pushThinking(collector, objectValue.text, typeHint);
      } else {
        pushText(collector, objectValue.text);
      }
      handledKeys.add('text');
    }

    if (typeof objectValue.output_text === 'string') {
      if (isThinkingHint(typeHint)) {
        pushThinking(collector, objectValue.output_text, typeHint);
      } else {
        pushText(collector, objectValue.output_text);
      }
      handledKeys.add('output_text');
    }

    if (typeof objectValue.message === 'string') {
      if (isThinkingHint(typeHint)) {
        pushThinking(collector, objectValue.message, typeHint);
      } else {
        pushText(collector, objectValue.message);
      }
      handledKeys.add('message');
    }

    if (Object.prototype.hasOwnProperty.call(objectValue, 'json')) {
      if (pushJsonLike(collector, objectValue.json)) {
        handledKeys.add('json');
      }
    }

    if (Object.prototype.hasOwnProperty.call(objectValue, 'parsed')) {
      if (pushJsonLike(collector, objectValue.parsed)) {
        handledKeys.add('parsed');
      }
    }

    if (Object.prototype.hasOwnProperty.call(objectValue, 'response_json')) {
      if (pushJsonLike(collector, objectValue.response_json)) {
        handledKeys.add('response_json');
      }
    }

    if (Object.prototype.hasOwnProperty.call(objectValue, 'arguments')) {
      if (pushJsonLike(collector, objectValue.arguments)) {
        handledKeys.add('arguments');
      }
    }

    Object.entries(objectValue).forEach(([key, nestedValue]) => {
      if (handledKeys.has(key) || SKIP_OBJECT_KEYS.has(key)) {
        return;
      }
      const nextHint = isThinkingHint(key) ? key : typeHint;
      collectNormalizedParts(nestedValue, collector, nextHint);
    });
  }
};

const dedupeThinkingSegments = (segments: ThinkingSegment[]): ThinkingSegment[] => {
  const seen = new Set<string>();
  return segments
    .map((segment) => ({ ...segment, text: segment.text.trim() }))
    .filter((segment) => {
      if (!segment.text) return false;
      const key = `${segment.type ?? 'thinking'}::${segment.text}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const finalizeCollector = (collector: NormalizedCollector, fallback?: string): ProviderTextResponse => {
  const textParts = collector.textParts.map((part) => part.trim()).filter(Boolean);
  let text = textParts.join('\n\n');
  if (!text && fallback && fallback.trim()) {
    text = fallback.trim();
  }
  return {
    text,
    thinking: dedupeThinkingSegments(collector.thinkingSegments),
  };
};

const extractFirstNonEmpty = (candidates: unknown[]): string | undefined => {
  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      if (trimmed) {
        return trimmed;
      }
    } else if (Array.isArray(candidate)) {
      const joined = candidate
        .map((item) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object' && typeof (item as any).text === 'string') {
            return (item as any).text;
          }
          return '';
        })
        .filter(Boolean)
        .join('\n\n')
        .trim();
      if (joined) {
        return joined;
      }
    } else if (candidate && typeof candidate === 'object' && typeof (candidate as any).text === 'string') {
      const trimmed = ((candidate as any).text as string).trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }
  return undefined;
};

const callOpenAICompatible = async (
  endpoint: string,
  apiKey: string,
  { messages, maxOutputTokens, responseFormat, temperature, reasoning, thinking, signal }: ProviderCallArgs,
  extraHeaders: Record<string, string> = {},
): Promise<ProviderTextResponse> => {
  const { model, maxOutputTokens: defaultMaxTokens } = ensureConfig();
  const requestBody: Record<string, unknown> = {
    model,
    messages: toOpenAIMessage(messages),
    stream: false,
  };

  const resolvedTemperature = typeof temperature === 'number' ? temperature : GENERATION_DEFAULTS.temperature;
  const resolvedMaxOutputTokens = typeof maxOutputTokens === 'number'
    ? Math.max(1, Math.round(maxOutputTokens))
    : defaultMaxTokens;
  const isReasoningModel = isReasoningModelId(model);

  if (isReasoningModel) {
    requestBody.temperature = resolvedTemperature;
    requestBody.max_output_tokens = resolvedMaxOutputTokens;

    const reasoningPayload: Record<string, unknown> = {
      effort: reasoning?.effort ?? GENERATION_DEFAULTS.reasoningEffort,
    };
    if (typeof reasoning?.budgetTokens === 'number') {
      reasoningPayload.budget_tokens = Math.max(1, Math.round(reasoning.budgetTokens));
    }
    requestBody.reasoning = reasoningPayload;

    const thinkingEnabled = thinking?.enabled ?? false;
    const thinkingPayload: Record<string, unknown> = {
      enabled: thinkingEnabled,
    };
    if (typeof thinking?.budgetTokens === 'number') {
      thinkingPayload.budget_tokens = Math.max(1, Math.round(thinking.budgetTokens));
    }
    requestBody.thinking = thinkingPayload;
  } else {
    requestBody.temperature = resolvedTemperature;
    requestBody.max_tokens = resolvedMaxOutputTokens;
  }

  if (responseFormat === 'json') {
    requestBody.response_format = { type: 'json_object' };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
    ...extraHeaders,
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Provider request failed (${response.status}): ${errorText || response.statusText}`);
  }

  const data = await response.json();
  const choice = data?.choices?.[0];
  const message = choice?.message ?? {};

  const collector = createCollector();
  collectNormalizedParts(message?.content, collector);
  collectNormalizedParts(message?.reasoning, collector, 'reasoning');
  collectNormalizedParts(message?.thinking, collector, 'thinking');
  collectNormalizedParts(choice?.reasoning, collector, 'reasoning');
  collectNormalizedParts(choice?.thinking, collector, 'thinking');

  const fallback = extractFirstNonEmpty([
    message?.content,
    message?.text,
    choice?.text,
  ]);

  return finalizeCollector(collector, fallback);
};

const callAnthropic = async (
  { messages, maxOutputTokens, responseFormat, temperature, signal }: ProviderCallArgs,
  apiKey: string,
): Promise<ProviderTextResponse> => {
  const systemMessage = messages.find((msg) => msg.role === 'system');
  const conversation = messages.filter((msg) => msg.role !== 'system').map((msg) => ({
    role: msg.role === 'assistant' ? 'assistant' : 'user',
    content: [{ type: 'text', text: msg.content }],
  }));

  const { model, maxOutputTokens: defaultMaxTokens } = ensureConfig();
  const body: Record<string, unknown> = {
    model,
    max_tokens: typeof maxOutputTokens === 'number' ? maxOutputTokens : defaultMaxTokens,
    temperature: typeof temperature === 'number' ? temperature : GENERATION_DEFAULTS.temperature,
    messages: conversation,
  };

  if (systemMessage) {
    body.system = systemMessage.content;
  }
  if (responseFormat === 'json') {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_API_VERSION,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Anthropic request failed (${response.status}): ${errorText || response.statusText}`);
  }

  const data = await response.json();
  const collector = createCollector();
  collectNormalizedParts(data?.content, collector);
  collectNormalizedParts((data as any)?.reasoning, collector, 'reasoning');

  const fallback = extractFirstNonEmpty([data?.content]);
  const result = finalizeCollector(collector, fallback);
  if (!result.text && result.thinking.length === 0) {
    throw new Error('Anthropic did not return a textual response.');
  }
  return result;
};

const callOllama = async ({ messages, maxOutputTokens, temperature, signal }: ProviderCallArgs): Promise<ProviderTextResponse> => {
  const systemMessages = messages.filter((msg) => msg.role === 'system');
  const conversation = messages.filter((msg) => msg.role !== 'system');
  const { maxOutputTokens: defaultMaxTokens } = ensureConfig();

  const promptSections: string[] = [];
  if (systemMessages.length > 0) {
    promptSections.push(`System:\n${systemMessages.map((msg) => msg.content).join('\n\n')}`);
  }

  conversation.forEach((msg) => {
    const speaker = msg.role === 'assistant' ? 'Assistant' : 'User';
    promptSections.push(`${speaker}: ${msg.content}`);
  });
  promptSections.push('Assistant:');

  const body: Record<string, unknown> = {
    model: ensureConfig().model,
    prompt: promptSections.join('\n\n'),
    stream: false,
  };

  const options: Record<string, unknown> = {};
  const resolvedMaxPredict = typeof maxOutputTokens === 'number' ? maxOutputTokens : defaultMaxTokens;
  if (Number.isFinite(resolvedMaxPredict)) {
    options.num_predict = resolvedMaxPredict;
  }
  if (typeof temperature === 'number') {
    options.temperature = temperature;
  }
  if (Object.keys(options).length > 0) {
    body.options = options;
  }

  const response = await fetch('http://127.0.0.1:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Ollama request failed (${response.status}): ${errorText || response.statusText}`);
  }

  const data = await response.json();
  if (!data || typeof data.response !== 'string') {
    throw new Error('Ollama did not return a textual response.');
  }
  return { text: data.response, thinking: [] };
};

export const callProvider = async ({
  messages,
  maxOutputTokens,
  responseFormat = 'text',
  temperature,
  reasoning,
  thinking,
  signal,
}: ProviderCallArgs): Promise<ProviderTextResponse> => {
  if (signal?.aborted) {
    throw new DOMException('Aborted by user', 'AbortError');
  }

  const config = ensureConfig();
  const providerLabel = getProviderLabel(config.providerId);
  const apiKey = config.apiKey;

  if (requiresApiKey(config.providerId) && !apiKey) {
    throw new Error(`${providerLabel} requires an API key. Please add it in settings before running this action.`);
  }

  try {
    switch (config.providerId) {
      case 'openai':
        return await callOpenAICompatible('https://api.openai.com/v1/chat/completions', apiKey!, {
          messages,
          maxOutputTokens,
          responseFormat,
          temperature,
          reasoning,
          thinking,
          signal,
        });
      case 'openrouter': {
        const referer = typeof window !== 'undefined' ? window.location.origin : 'https://local.app';
        return await callOpenAICompatible(
          'https://openrouter.ai/api/v1/chat/completions',
          apiKey!,
          { messages, maxOutputTokens, responseFormat, temperature, reasoning, thinking, signal },
          { 'HTTP-Referer': referer, 'X-Title': 'AI Content Suite' },
        );
      }
      case 'xai':
        return await callOpenAICompatible('https://api.x.ai/v1/chat/completions', apiKey!, {
          messages,
          maxOutputTokens,
          responseFormat,
          temperature,
          reasoning,
          thinking,
          signal,
        });
      case 'deepseek':
        return await callOpenAICompatible('https://api.deepseek.com/chat/completions', apiKey!, {
          messages,
          maxOutputTokens,
          responseFormat,
          temperature,
          reasoning,
          thinking,
          signal,
        });
      case 'anthropic':
        return await callAnthropic({ messages, maxOutputTokens, responseFormat, temperature, signal }, apiKey!);
      case 'ollama':
        return await callOllama({ messages, maxOutputTokens, responseFormat, temperature, signal });
      default:
        throw new Error(`Unsupported provider: ${config.providerId}`);
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    throw new Error(`${providerLabel} request failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};
