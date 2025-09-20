import { useCallback } from 'react';
import type { FormEvent } from 'react';
import type { Mode, ChatMessage, ChatSettings, AIProviderSettings } from '../types';
import type { WorkspaceState } from './useWorkspaceState';
import type { ProviderInfo } from '../services/providerRegistry';
import { getProviderLabel, requiresApiKey } from '../services/providerRegistry';
import type { SetModeValue } from './useMainFormProps';
import { sendChatMessage } from '../services/geminiService';
import { fileToGenerativePart } from '../utils/fileUtils';
import { DEFAULT_PROVIDER_MODELS } from '../constants';

interface UseChatSubmissionParams {
  activeMode: Mode;
  aiProviderSettings: AIProviderSettings;
  activeProviderInfo?: ProviderInfo;
  chatSettings: ChatSettings;
  canSubmit: boolean;
  chatInput: string;
  chatFiles: File[] | null;
  getStateForMode: (mode: Mode) => WorkspaceState;
  setModeValue: SetModeValue;
}

export const useChatSubmission = ({
  activeMode,
  aiProviderSettings,
  activeProviderInfo,
  chatSettings,
  canSubmit,
  chatInput,
  chatFiles,
  getStateForMode,
  setModeValue,
}: UseChatSubmissionParams) => {
  const resolveChatProviderConfig = useCallback(() => {
    const override = aiProviderSettings.featureModelPreferences?.chat;
    const providerId = override?.provider ?? aiProviderSettings.selectedProvider;
    const trimmedOverrideModel = override?.model?.trim();
    const trimmedSelectedModel = aiProviderSettings.selectedModel?.trim();
    const fallbackModel =
      DEFAULT_PROVIDER_MODELS[providerId] ?? DEFAULT_PROVIDER_MODELS[aiProviderSettings.selectedProvider] ?? '';
    const resolvedModel = trimmedOverrideModel || trimmedSelectedModel || fallbackModel;

    return { providerId, model: resolvedModel };
  }, [aiProviderSettings]);

  return useCallback(
    async (event?: FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      if (!canSubmit) return;

      const modeAtSubmit = activeMode;
      const { providerId } = resolveChatProviderConfig();
      const providerInfo: ProviderInfo | undefined =
        activeProviderInfo && activeProviderInfo.id === providerId ? activeProviderInfo : undefined;
      const providerLabel = providerInfo?.label ?? getProviderLabel(providerId);
      const providerRequiresKey = providerInfo?.requiresApiKey ?? requiresApiKey(providerId);

      if (providerRequiresKey) {
        const apiKeyForProvider = aiProviderSettings.apiKeys?.[providerId]?.trim();
        if (!apiKeyForProvider) {
          setModeValue(
            'error',
            {
              message: `${providerLabel} requires an API key. Please add it in settings before starting a chat.`,
            },
            modeAtSubmit,
          );
          return;
        }
      }

      const historyBeforeMessage = [...getStateForMode(modeAtSubmit).chatHistory];
      const trimmedInput = chatInput.trim();

      const fileParts = chatFiles ? await Promise.all(chatFiles.map(fileToGenerativePart)) : [];
      const textParts = trimmedInput ? [{ text: trimmedInput }] : [];
      const userMessageParts = [...fileParts, ...textParts];

      if (userMessageParts.length === 0) {
        return;
      }

      const userMessage: ChatMessage = { role: 'user', parts: userMessageParts };
      const placeholder: ChatMessage = { role: 'model', parts: [{ text: '' }], thinking: [] };

      setModeValue('chatHistory', prev => [...prev, userMessage, placeholder], modeAtSubmit);
      setModeValue('chatInput', '', modeAtSubmit);
      setModeValue('chatFiles', null, modeAtSubmit);
      setModeValue('isStreamingResponse', true, modeAtSubmit);
      setModeValue('error', null, modeAtSubmit);

      try {
        const response = await sendChatMessage({
          history: historyBeforeMessage,
          userMessage: userMessageParts,
          systemInstruction: chatSettings.systemInstruction,
          vectorStoreSettings: chatSettings.vectorStore,
        });

        setModeValue(
          'chatHistory',
          prev => {
            if (prev.length === 0) return prev;
            const updated = [...prev];
            const lastIndex = updated.length - 1;
            const lastMessage = updated[lastIndex];
            if (lastMessage && lastMessage.role === 'model') {
              const thinkingSegments = response.thinking.length > 0 ? [...response.thinking] : undefined;
              const finalText = response.text;
              const firstPart = lastMessage.parts[0];

              if (firstPart && 'text' in firstPart) {
                firstPart.text = finalText;
                lastMessage.thinking = thinkingSegments;
              } else {
                updated[lastIndex] = { role: 'model', parts: [{ text: finalText }], thinking: thinkingSegments };
              }
            }
            return updated;
          },
          modeAtSubmit,
        );
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          setModeValue('chatHistory', prev => (prev.length > 0 ? prev.slice(0, prev.length - 1) : prev), modeAtSubmit);
          return;
        }
        console.error('Chat error:', err);
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setModeValue('error', { message: `Chat failed: ${errorMessage}` }, modeAtSubmit);
        setModeValue('chatHistory', prev => (prev.length > 0 ? prev.slice(0, prev.length - 1) : prev), modeAtSubmit);
      } finally {
        setModeValue('isStreamingResponse', false, modeAtSubmit);
      }
    },
    [
      activeMode,
      activeProviderInfo,
      aiProviderSettings,
      chatSettings.systemInstruction,
      chatSettings.vectorStore,
      canSubmit,
      chatInput,
      chatFiles,
      getStateForMode,
      resolveChatProviderConfig,
      setModeValue,
    ],
  );
};
