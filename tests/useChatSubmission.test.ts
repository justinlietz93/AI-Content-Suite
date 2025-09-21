import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FormEvent } from 'react';
import { useChatSubmission } from '../hooks/useChatSubmission';
import type { WorkspaceState } from '../hooks/useWorkspaceState';
import type { SetModeValue } from '../hooks/useMainFormProps';
import {
  INITIAL_AGENT_DESIGNER_SETTINGS,
  INITIAL_CHAT_SETTINGS,
  INITIAL_PROMPT_ENHANCER_SETTINGS,
  INITIAL_PROGRESS,
  INITIAL_REASONING_SETTINGS,
  INITIAL_REQUEST_SPLITTER_SETTINGS,
  INITIAL_SCAFFOLDER_SETTINGS,
} from '../constants';
import { GENERATION_DEFAULTS } from '../config/generationConfig';
import { deepClone } from '../utils/deepClone';
import type { AIProviderSettings, ChatSettings, Mode } from '../types';
import type { ProviderInfo } from '../services/providerRegistry';
import { sendChatMessage } from '../services/geminiService';
import { fileToGenerativePart } from '../utils/fileUtils';

vi.mock('../services/geminiService', () => ({
  sendChatMessage: vi.fn(),
}));

vi.mock('../utils/fileUtils', () => ({
  fileToGenerativePart: vi.fn(),
}));

const sendChatMessageMock = vi.mocked(sendChatMessage);
const fileToGenerativePartMock = vi.mocked(fileToGenerativePart);

type HookParams = Parameters<typeof useChatSubmission>[0];

const createWorkspaceState = (): WorkspaceState => ({
  currentFiles: null,
  appState: 'idle',
  progress: deepClone(INITIAL_PROGRESS),
  processedData: null,
  error: null,
  nextStepSuggestions: null,
  suggestionsLoading: false,
  styleTarget: '',
  rewriteStyle: '',
  rewriteInstructions: '',
  rewriteLength: 'medium',
  useHierarchical: false,
  summaryFormat: 'default',
  summarySearchTerm: '',
  summaryTextInput: '',
  reasoningPrompt: '',
  reasoningSettings: deepClone(INITIAL_REASONING_SETTINGS),
  scaffolderPrompt: '',
  scaffolderSettings: deepClone(INITIAL_SCAFFOLDER_SETTINGS),
  requestSplitterSpec: '',
  requestSplitterSettings: deepClone(INITIAL_REQUEST_SPLITTER_SETTINGS),
  promptEnhancerSettings: deepClone(INITIAL_PROMPT_ENHANCER_SETTINGS),
  agentDesignerSettings: deepClone(INITIAL_AGENT_DESIGNER_SETTINGS),
  chatHistory: [],
  isStreamingResponse: false,
  chatInput: '',
  chatFiles: null,
});

const createSetModeValue = (state: WorkspaceState) => {
  const impl: SetModeValue = (key, value) => {
    const current = state[key];
    const nextValue = typeof value === 'function' ? (value as (prev: typeof current) => typeof current)(current) : value;
    (state as unknown as Record<string, unknown>)[key as string] = nextValue as unknown;
  };
  return vi.fn(impl);
};

const createParams = (
  state: WorkspaceState,
  overrides: Partial<HookParams> = {},
): HookParams & { setModeValue: ReturnType<typeof createSetModeValue>; getStateForMode: ReturnType<typeof vi.fn> } => {
  const aiProviderSettings: AIProviderSettings = {
    selectedProvider: 'openai',
    selectedModel: 'gpt-4o-mini',
    apiKeys: { openai: 'sk-test-key' },
    featureModelPreferences: undefined,
    maxOutputTokens: GENERATION_DEFAULTS.maxOutputTokens,
    ...(overrides.aiProviderSettings ?? {}),
  };

  const defaultChatSettings = deepClone(INITIAL_CHAT_SETTINGS);
  defaultChatSettings.systemInstruction = 'Be helpful';
  const chatSettings: ChatSettings = overrides.chatSettings ?? defaultChatSettings;
  const activeProviderInfo: ProviderInfo | undefined =
    'activeProviderInfo' in overrides
      ? overrides.activeProviderInfo
      : {
          id: 'openai',
          label: 'OpenAI',
          requiresApiKey: true,
        };
  const setModeValue = createSetModeValue(state);
  const getStateForMode = vi.fn(() => state);

  return {
    activeMode: (overrides.activeMode ?? 'chat') as Mode,
    aiProviderSettings,
    activeProviderInfo,
    chatSettings,
    canSubmit: overrides.canSubmit ?? true,
    chatInput: overrides.chatInput ?? state.chatInput ?? '',
    chatFiles: overrides.chatFiles ?? state.chatFiles ?? null,
    getStateForMode,
    setModeValue,
  };
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('useChatSubmission', () => {
  it('prevents submission when canSubmit is false', async () => {
    const state = createWorkspaceState();
    const params = createParams(state, { canSubmit: false, chatInput: 'Hello' });
    const { result } = renderHook(() => useChatSubmission(params));
    const preventDefault = vi.fn();

    await act(async () => {
      await result.current({ preventDefault } as unknown as FormEvent<HTMLFormElement>);
    });

    expect(preventDefault).toHaveBeenCalled();
    expect(sendChatMessageMock).not.toHaveBeenCalled();
    expect(params.setModeValue).not.toHaveBeenCalled();
    expect(state.chatHistory).toEqual([]);
  });

  it('requires an API key when the provider needs one', async () => {
    const state = createWorkspaceState();
    const params = createParams(state, {
      aiProviderSettings: {
        selectedProvider: 'openai',
        selectedModel: 'gpt-4o-mini',
        apiKeys: {},
        featureModelPreferences: undefined,
        maxOutputTokens: GENERATION_DEFAULTS.maxOutputTokens,
      },
      chatInput: 'Hello world',
    });

    const { result } = renderHook(() => useChatSubmission(params));

    await act(async () => {
      await result.current();
    });

    expect(sendChatMessageMock).not.toHaveBeenCalled();
    expect(state.error).toEqual({
      message: 'OpenAI requires an API key. Please add it in settings before starting a chat.',
    });
    expect(state.chatHistory).toEqual([]);
  });

  it('checks API key requirements against per-feature overrides', async () => {
    const state = createWorkspaceState();
    const params = createParams(state, {
      aiProviderSettings: {
        selectedProvider: 'openai',
        selectedModel: 'gpt-4o-mini',
        apiKeys: { openai: 'sk-test-key' },
        featureModelPreferences: {
          chat: { provider: 'openrouter', model: 'openrouter/auto' },
        },
        maxOutputTokens: GENERATION_DEFAULTS.maxOutputTokens,
      },
      activeProviderInfo: {
        id: 'openrouter',
        label: 'OpenRouter',
        requiresApiKey: true,
      },
      chatInput: 'Hello override',
    });

    const { result } = renderHook(() => useChatSubmission(params));

    await act(async () => {
      await result.current();
    });

    expect(sendChatMessageMock).not.toHaveBeenCalled();
    expect(state.error).toEqual({
      message: 'OpenRouter requires an API key. Please add it in settings before starting a chat.',
    });
    expect(state.chatHistory).toEqual([]);
  });

  it('falls back to registry metadata when active provider info is unavailable', async () => {
    const state = createWorkspaceState();
    const params = createParams(state, {
      aiProviderSettings: {
        selectedProvider: 'openrouter',
        selectedModel: 'openrouter/auto',
        apiKeys: {},
        featureModelPreferences: undefined,
        maxOutputTokens: GENERATION_DEFAULTS.maxOutputTokens,
      },
      activeProviderInfo: undefined,
      chatInput: 'Need credentials',
    });

    const { result } = renderHook(() => useChatSubmission(params));

    await act(async () => {
      await result.current();
    });

    expect(sendChatMessageMock).not.toHaveBeenCalled();
    expect(state.error).toEqual({
      message: 'OpenRouter requires an API key. Please add it in settings before starting a chat.',
    });
  });

  it('uses provider defaults when override model is blank', async () => {
    const state = createWorkspaceState();
    const params = createParams(state, {
      aiProviderSettings: {
        selectedProvider: 'openai',
        selectedModel: '   ',
        apiKeys: { xai: 'xai-key' },
        featureModelPreferences: {
          chat: { provider: 'xai', model: '   ' },
        },
        maxOutputTokens: GENERATION_DEFAULTS.maxOutputTokens,
      },
      activeProviderInfo: { id: 'xai', label: 'xAI (Grok)', requiresApiKey: true },
      chatInput: 'Use fallback model',
    });

    sendChatMessageMock.mockResolvedValue({ text: 'fallback response', thinking: [] });

    const { result } = renderHook(() => useChatSubmission(params));

    await act(async () => {
      await result.current();
    });

    expect(sendChatMessageMock).toHaveBeenCalled();
  });

  it('returns early when no text or files are provided', async () => {
    const state = createWorkspaceState();
    const params = createParams(state, { chatInput: '   ', chatFiles: [] });
    const { result } = renderHook(() => useChatSubmission(params));

    await act(async () => {
      await result.current();
    });

    expect(sendChatMessageMock).not.toHaveBeenCalled();
    expect(params.setModeValue).not.toHaveBeenCalled();
  });

  it('sends a chat message and updates chat history', async () => {
    const state = createWorkspaceState();
    const params = createParams(state, { chatInput: 'Hello model' });
    sendChatMessageMock.mockResolvedValue({
      text: 'Response text',
      thinking: [
        { label: 'Reasoning', text: 'Deliberation trace' },
      ],
    });

    const { result } = renderHook(() => useChatSubmission(params));

    await act(async () => {
      await result.current();
    });

    expect(sendChatMessageMock).toHaveBeenCalledWith({
      history: [],
      userMessage: [{ text: 'Hello model' }],
      systemInstruction: 'Be helpful',
      vectorStoreSettings: params.chatSettings.vectorStore,
      generation: params.chatSettings.generation,
    });
    expect(state.chatHistory).toHaveLength(2);
    expect(state.chatHistory[0]).toEqual({ role: 'user', parts: [{ text: 'Hello model' }] });
    expect(state.chatHistory[1]).toEqual({
      role: 'model',
      parts: [{ text: 'Response text' }],
      thinking: [
        { label: 'Reasoning', text: 'Deliberation trace' },
      ],
    });
    expect(state.chatInput).toBe('');
    expect(state.chatFiles).toBeNull();
    expect(state.isStreamingResponse).toBe(false);
    expect(state.error).toBeNull();
    expect(fileToGenerativePartMock).not.toHaveBeenCalled();
  });

  it('converts attached files to generative parts before sending', async () => {
    const state = createWorkspaceState();
    const file = new File(['binary'], 'diagram.png', { type: 'image/png' });
    fileToGenerativePartMock.mockResolvedValue({ inlineData: { mimeType: 'image/png', data: 'base64-data' } });
    sendChatMessageMock.mockResolvedValue({ text: 'ok', thinking: [] });

    const params = createParams(state, {
      chatInput: '   ',
      chatFiles: [file],
      activeProviderInfo: { id: 'ollama', label: 'Ollama', requiresApiKey: false },
      aiProviderSettings: {
        selectedProvider: 'ollama',
        selectedModel: 'llama3.1:8b',
        apiKeys: {},
        featureModelPreferences: undefined,
        maxOutputTokens: GENERATION_DEFAULTS.maxOutputTokens,
      },
    });
    const { result } = renderHook(() => useChatSubmission(params));

    await act(async () => {
      await result.current();
    });

    expect(fileToGenerativePartMock).toHaveBeenCalledTimes(1);
    expect(fileToGenerativePartMock.mock.calls[0][0]).toBe(file);
    expect(sendChatMessageMock).toHaveBeenCalledWith({
      history: [],
      userMessage: [{ inlineData: { mimeType: 'image/png', data: 'base64-data' } }],
      systemInstruction: 'Be helpful',
      vectorStoreSettings: params.chatSettings.vectorStore,
      generation: params.chatSettings.generation,
    });
    expect(state.chatFiles).toBeNull();
  });

  it('replaces placeholders that no longer contain text parts', async () => {
    const state = createWorkspaceState();
    const params = createParams(state, { chatInput: 'Needs cleanup' });
    sendChatMessageMock.mockImplementation(async () => {
      const placeholder = state.chatHistory[state.chatHistory.length - 1];
      if (placeholder) {
        placeholder.parts = [{ inlineData: { mimeType: 'application/octet-stream', data: 'AA==' } }];
      }
      return { text: 'Final response', thinking: [] };
    });

    const { result } = renderHook(() => useChatSubmission(params));

    await act(async () => {
      await result.current();
    });

    const lastMessage = state.chatHistory[state.chatHistory.length - 1];
    expect(lastMessage.role).toBe('model');
    expect(lastMessage.parts).toEqual([{ text: 'Final response' }]);
    expect(lastMessage.thinking).toBeUndefined();
  });

  it('skips response updates when chat history was cleared mid-flight', async () => {
    const state = createWorkspaceState();
    const params = createParams(state, { chatInput: 'History cleared' });
    sendChatMessageMock.mockImplementation(async () => {
      state.chatHistory = [];
      return { text: 'Irrelevant', thinking: [] };
    });

    const { result } = renderHook(() => useChatSubmission(params));

    await act(async () => {
      await result.current();
    });

    expect(state.chatHistory).toEqual([]);
  });

  it('handles unknown errors without removing additional history entries', async () => {
    const state = createWorkspaceState();
    const params = createParams(state, { chatInput: 'Trigger unknown failure' });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    sendChatMessageMock.mockImplementation(async () => {
      state.chatHistory = [];
      throw 'unexpected failure';
    });

    const { result } = renderHook(() => useChatSubmission(params));

    await act(async () => {
      await result.current();
    });

    expect(state.error).toEqual({ message: 'Chat failed: An unknown error occurred.' });
    expect(state.chatHistory).toEqual([]);
    expect(state.isStreamingResponse).toBe(false);
    consoleError.mockRestore();
  });

  it('removes the placeholder response when the request is aborted', async () => {
    const state = createWorkspaceState();
    const params = createParams(state, { chatInput: 'Abort please' });
    sendChatMessageMock.mockRejectedValue(new DOMException('Stopped', 'AbortError'));

    const { result } = renderHook(() => useChatSubmission(params));

    await act(async () => {
      await result.current();
    });

    expect(state.chatHistory).toHaveLength(1);
    expect(state.chatHistory[0]).toEqual({ role: 'user', parts: [{ text: 'Abort please' }] });
    expect(state.isStreamingResponse).toBe(false);
  });

  it('reports errors from the provider and removes the placeholder', async () => {
    const state = createWorkspaceState();
    const params = createParams(state, { chatInput: 'Trigger failure' });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    sendChatMessageMock.mockRejectedValue(new Error('Network issue'));

    const { result } = renderHook(() => useChatSubmission(params));

    await act(async () => {
      await result.current();
    });

    expect(state.chatHistory).toHaveLength(1);
    expect(state.chatHistory[0]).toEqual({ role: 'user', parts: [{ text: 'Trigger failure' }] });
    expect(state.error).toEqual({ message: 'Chat failed: Network issue' });
    expect(state.isStreamingResponse).toBe(false);
    consoleError.mockRestore();
  });
});
