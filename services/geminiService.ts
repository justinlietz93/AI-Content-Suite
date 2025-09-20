import type { Highlight, Mode, ChatMessage, ChatMessagePart, VectorStoreSettings } from '../types';
import {
  HIGHLIGHT_EXTRACTION_PROMPT_TEMPLATE,
  NEXT_STEPS_TECHNICAL_SUMMARY_PROMPT_TEMPLATE,
  NEXT_STEPS_STYLE_MODEL_PROMPT_TEMPLATE,
} from '../constants';
import { cleanAndParseJson } from '../utils';
import { fetchVectorStoreContext } from './vectorStoreService';
import type {
  ProviderMessages,
  ResponseFormat,
  ProviderTextResponse,
  ReasoningBehavior,
  ThinkingBehavior,
} from './providerClient';
import { callProvider } from './providerClient';

export { AI_PROVIDERS, fetchModelsForProvider } from './providerRegistry';
export type { ProviderInfo } from './providerRegistry';
export {
  setActiveProviderConfig,
  getActiveProviderConfig,
  getActiveProviderLabel,
  getActiveModelName,
} from './providerClient';


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

const buildMessages = (
  history: ChatMessage[],
  userMessage: ChatMessagePart[] | null,
  systemInstruction?: string,
  contextSections?: string[],
): ProviderMessages => {
  const messages: ProviderMessages = [];
  if (systemInstruction && systemInstruction.trim() !== '') {
    messages.push({ role: 'system', content: systemInstruction.trim() });
  }

  if (contextSections && contextSections.length > 0) {
    const trimmedSections = contextSections.map(section => section.trim()).filter(Boolean);
    if (trimmedSections.length > 0) {
      messages.push({
        role: 'system',
        content:
          'Relevant knowledge base references (use when helpful and cite the reference number):\n\n' +
          trimmedSections.join('\n\n'),
      });
    }
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

export type GenerateTextConfig = {
  maxOutputTokens?: number;
  responseMimeType?: string;
  systemInstruction?: string;
  temperature?: number;
  reasoning?: ReasoningBehavior;
  thinking?: ThinkingBehavior;
};

export const generateText = async (
  prompt: string,
  config?: GenerateTextConfig,
  signal?: AbortSignal,
): Promise<string> => {
  const messages = buildMessages([], [{ text: prompt }], config?.systemInstruction, undefined);
  const responseFormat: ResponseFormat | undefined = config?.responseMimeType === 'application/json' ? 'json' : 'text';
  const result = await callProvider({
    messages,
    maxOutputTokens: config?.maxOutputTokens,
    responseFormat,
    temperature: config?.temperature,
    reasoning: config?.reasoning,
    thinking: config?.thinking,
    signal,
  });
  return result.text;
};

export const generateMultiModalContent = async (parts: ChatMessagePart[], signal?: AbortSignal): Promise<string> => {
  const content = partsToPlainText(parts);
  const messages: ProviderMessages = buildMessages([], [{ text: content }], undefined, undefined);
  const result = await callProvider({ messages, signal });
  return result.text;
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
    vectorStoreSettings?: VectorStoreSettings;
    signal?: AbortSignal;
  },
): Promise<ProviderTextResponse> => {
  const { history, userMessage, systemInstruction, vectorStoreSettings, signal } = args;

  let contextSections: string[] | undefined;
  if (vectorStoreSettings?.enabled) {
    const queryText = partsToPlainText(userMessage).trim();
    if (queryText) {
      try {
        const matches = await fetchVectorStoreContext(queryText, vectorStoreSettings, signal);
        if (matches.length > 0) {
          contextSections = matches.map((match, index) => {
            const headerParts: string[] = [`#${index + 1}`];
            if (Number.isFinite(match.score)) {
              headerParts.push(`score=${match.score.toFixed(3)}`);
            }
            const metadataText = match.metadata && Object.keys(match.metadata).length > 0
              ? `\nMetadata: ${JSON.stringify(match.metadata)}`
              : '';
            return `${headerParts.join(' ')}\n${match.text}${metadataText ? `\n${metadataText}` : ''}`;
          });
        }
      } catch (error) {
        console.warn('Failed to load vector store context:', error);
      }
    }
  }

  const messages = buildMessages(history, userMessage, systemInstruction, contextSections);
  return callProvider({ messages, signal });
};
