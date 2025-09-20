import type { Highlight, Mode, ChatMessage, ChatMessagePart, AIProviderId } from '../types';
import {
  HIGHLIGHT_EXTRACTION_PROMPT_TEMPLATE,
  NEXT_STEPS_TECHNICAL_SUMMARY_PROMPT_TEMPLATE,
  NEXT_STEPS_STYLE_MODEL_PROMPT_TEMPLATE,
  DEFAULT_PROVIDER_MODELS,
} from '../constants';
import { cleanAndParseJson } from '../utils';
import { AI_PROVIDERS, requiresApiKey, getProviderLabel, ANTHROPIC_API_VERSION } from './providerRegistry';

export { AI_PROVIDERS, fetchModelsForProvider } from './providerRegistry';
export type { ProviderInfo } from './providerRegistry';
type ResponseFormat = 'text' | 'json';

type ProviderMessages = Array<{
  role: 'system' | 'user' | 'assistant';
  content: string;
}>;

type ProviderCallArgs = {
  messages: ProviderMessages;
  maxOutputTokens?: number;
  responseFormat?: ResponseFormat;
  signal?: AbortSignal;
};

interface ActiveProviderConfig {
  providerId: AIProviderId;
  model: string;
  apiKey?: string;
}

let activeConfig: ActiveProviderConfig = {
  providerId: 'openai',
  model: DEFAULT_PROVIDER_MODELS.openai,
  apiKey: undefined,
};

const ensureConfig = (): ActiveProviderConfig => {
  if (!activeConfig.model || activeConfig.model.trim() === '') {
    const fallbackModel = DEFAULT_PROVIDER_MODELS[activeConfig.providerId];
    if (!fallbackModel) {
      throw new Error('No model configured for the selected provider. Please choose a model in settings.');
    }
    activeConfig = { ...activeConfig, model: fallbackModel };
  }
  return activeConfig;
};

export const setActiveProviderConfig = (config: { providerId: AIProviderId; model?: string; apiKey?: string }) => {
  activeConfig = {
    providerId: config.providerId,
    model: config.model && config.model.trim() !== '' ? config.model.trim() : DEFAULT_PROVIDER_MODELS[config.providerId],
    apiKey: config.apiKey && config.apiKey.trim() !== '' ? config.apiKey.trim() : undefined,
  };
};

export const getActiveProviderConfig = (): ActiveProviderConfig => ({ ...activeConfig });

export const getActiveProviderLabel = (): string => getProviderLabel(activeConfig.providerId);

export const getActiveModelName = (): string => ensureConfig().model;

const toOpenAIMessage = (messages: ProviderMessages) =>
  messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));

const callOpenAICompatible = async (
  endpoint: string,
  apiKey: string,
  { messages, maxOutputTokens, responseFormat, signal }: ProviderCallArgs,
  extraHeaders: Record<string, string> = {},
): Promise<string> => {
  const requestBody: Record<string, unknown> = {
    model: ensureConfig().model,
    messages: toOpenAIMessage(messages),
    temperature: 0.7,
    stream: false,
  };

  if (typeof maxOutputTokens === 'number') {
    requestBody.max_tokens = maxOutputTokens;
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
  const message = choice?.message?.content ?? choice?.message?.text ?? '';

  if (Array.isArray(message)) {
    return message.map((part: any) => part?.text ?? '').join('');
  }
  if (typeof message === 'string') {
    return message;
  }
  return '';
};

const callAnthropic = async ({ messages, maxOutputTokens, responseFormat, signal }: ProviderCallArgs, apiKey: string): Promise<string> => {
  const systemMessage = messages.find((msg) => msg.role === 'system');
  const conversation = messages.filter((msg) => msg.role !== 'system').map((msg) => ({
    role: msg.role === 'assistant' ? 'assistant' : 'user',
    content: [{ type: 'text', text: msg.content }],
  }));

  const body: Record<string, unknown> = {
    model: ensureConfig().model,
    max_tokens: maxOutputTokens ?? 4096,
    temperature: 0.7,
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
  const content = Array.isArray(data?.content) ? data.content.map((item: any) => item?.text ?? '').join('') : data?.content ?? '';
  if (typeof content !== 'string') {
    throw new Error('Anthropic did not return a textual response.');
  }
  return content;
};

const callOllama = async ({ messages, maxOutputTokens, signal }: ProviderCallArgs): Promise<string> => {
  const systemMessages = messages.filter((msg) => msg.role === 'system');
  const conversation = messages.filter((msg) => msg.role !== 'system');

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

  if (typeof maxOutputTokens === 'number') {
    body.options = { num_predict: maxOutputTokens };
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
  return data.response;
};

const callProvider = async ({ messages, maxOutputTokens, responseFormat = 'text', signal }: ProviderCallArgs): Promise<string> => {
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
          signal,
        });
      case 'openrouter': {
        const referer = typeof window !== 'undefined' ? window.location.origin : 'https://local.app';
        return await callOpenAICompatible(
          'https://openrouter.ai/api/v1/chat/completions',
          apiKey!,
          { messages, maxOutputTokens, responseFormat, signal },
          { 'HTTP-Referer': referer, 'X-Title': 'AI Content Suite' },
        );
      }
      case 'xai':
        return await callOpenAICompatible('https://api.x.ai/v1/chat/completions', apiKey!, {
          messages,
          maxOutputTokens,
          responseFormat,
          signal,
        });
      case 'deepseek':
        return await callOpenAICompatible('https://api.deepseek.com/chat/completions', apiKey!, {
          messages,
          maxOutputTokens,
          responseFormat,
          signal,
        });
      case 'anthropic':
        return await callAnthropic({ messages, maxOutputTokens, responseFormat, signal }, apiKey!);
      case 'ollama':
        return await callOllama({ messages, maxOutputTokens, responseFormat, signal });
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

const partsToPlainText = (parts: ChatMessagePart[]): string => {
  return parts
    .map((part) => {
      if ('text' in part) {
        return part.text;
      }
      if ('inlineData' in part) {
        const preview = part.inlineData.data.slice(0, 40);
        return `Attached data (${part.inlineData.mimeType}): ${preview}...`;
      }
      return '';
    })
    .filter(Boolean)
    .join('\n\n');
};

const buildMessages = (history: ChatMessage[], userMessage: ChatMessagePart[] | null, systemInstruction?: string): ProviderMessages => {
  const messages: ProviderMessages = [];
  if (systemInstruction && systemInstruction.trim() !== '') {
    messages.push({ role: 'system', content: systemInstruction.trim() });
  }

  history.forEach((message) => {
    const content = partsToPlainText(message.parts);
    if (!content) return;
    const role = message.role === 'model' ? 'assistant' : 'user';
    messages.push({ role, content });
  });

  if (userMessage) {
    const content = partsToPlainText(userMessage);
    if (content) {
      messages.push({ role: 'user', content });
    }
  }

  return messages;
};

export const generateText = async (
  prompt: string,
  config?: { maxOutputTokens?: number; responseMimeType?: string; systemInstruction?: string },
  signal?: AbortSignal,
): Promise<string> => {
  const messages = buildMessages([], [{ text: prompt }], config?.systemInstruction);
  const responseFormat: ResponseFormat | undefined = config?.responseMimeType === 'application/json' ? 'json' : 'text';
  return callProvider({ messages, maxOutputTokens: config?.maxOutputTokens, responseFormat, signal });
};

export const generateMultiModalContent = async (parts: ChatMessagePart[], signal?: AbortSignal): Promise<string> => {
  const content = partsToPlainText(parts);
  const messages: ProviderMessages = buildMessages([], [{ text: content }], undefined);
  return callProvider({ messages, signal });
};

export const extractHighlightsFromJson = async (summaryText: string, signal?: AbortSignal): Promise<Highlight[]> => {
  if (!summaryText) return [];

  const prompt = HIGHLIGHT_EXTRACTION_PROMPT_TEMPLATE(summaryText);
  let rawResponseText = '';
  try {
    rawResponseText = await generateText(prompt, { responseMimeType: 'application/json' }, signal);
    const parsedData = cleanAndParseJson<any>(rawResponseText);

    if (Array.isArray(parsedData)) {
      return parsedData.filter((item) => item && typeof item.text === 'string') as Highlight[];
    } else if (parsedData && typeof parsedData.text === 'string') {
      return [parsedData as Highlight];
    }
    console.warn('Parsed JSON is not an array of highlights or a single highlight object:', parsedData);
    return [];
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    const rawOutput = (error as any)?.details || rawResponseText;
    console.error('Failed to parse highlights. Raw output logged below.', error);
    console.error('--- RAW HIGHLIGHTS OUTPUT ---\n', rawOutput);

    const lines = String(rawOutput || '')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('* ') || line.startsWith('- ') || /^\d+\.\s/.test(line))
      .map((line) => ({ text: line.replace(/^(\* |- |\d+\.\s)/, '') }))
      .slice(0, 5);

    return lines;
  }
};

export const generateSuggestions = async (
  mode: Mode,
  processedContent: string,
  styleTargetText?: string,
  signal?: AbortSignal,
): Promise<string[] | null> => {
  if (!processedContent || processedContent.trim() === '') {
    return null;
  }

  let prompt = '';
  if (mode === 'technical') {
    prompt = NEXT_STEPS_TECHNICAL_SUMMARY_PROMPT_TEMPLATE(processedContent);
  } else if (mode === 'styleExtractor') {
    prompt = NEXT_STEPS_STYLE_MODEL_PROMPT_TEMPLATE(processedContent, styleTargetText);
  } else {
    return null;
  }

  let rawResponseText = '';
  try {
    rawResponseText = await generateText(prompt, { responseMimeType: 'application/json' }, signal);
    const parsedData = cleanAndParseJson<string[]>(rawResponseText);
    if (Array.isArray(parsedData)) {
      const suggestions = parsedData.filter((item) => typeof item === 'string' && item.trim() !== '');
      return suggestions.length > 0 ? suggestions : null;
    }
    return null;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    const rawOutput = (error as any)?.details || rawResponseText || 'Raw response not available.';
    console.error('Error generating or parsing next step suggestions.', error);
    console.error('--- RAW SUGGESTIONS OUTPUT ---\n', rawOutput);
    return null;
  }
};

export const sendChatMessage = async (
  args: {
    history: ChatMessage[];
    userMessage: ChatMessagePart[];
    systemInstruction: string;
    signal?: AbortSignal;
  },
): Promise<string> => {
  const { history, userMessage, systemInstruction, signal } = args;
  const messages = buildMessages(history, userMessage, systemInstruction);
  return callProvider({ messages, signal });
};
