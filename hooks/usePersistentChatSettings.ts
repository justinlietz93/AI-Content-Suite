import { useEffect, useState } from 'react';
import type { ChatSettings } from '../types';
import { INITIAL_CHAT_SETTINGS } from '../constants';

const CHAT_SETTINGS_STORAGE_KEY = 'ai_content_suite_chat_settings';

const getInitialChatSettings = (): ChatSettings => {
  if (typeof window === 'undefined') {
    return INITIAL_CHAT_SETTINGS;
  }

  try {
    const saved = localStorage.getItem(CHAT_SETTINGS_STORAGE_KEY);
    if (!saved) {
      return INITIAL_CHAT_SETTINGS;
    }

    const parsed = JSON.parse(saved);
    if (!parsed || typeof parsed !== 'object') {
      return INITIAL_CHAT_SETTINGS;
    }

    const defaults = INITIAL_CHAT_SETTINGS.vectorStore;
    const parsedVectorStore =
      parsed.vectorStore && typeof parsed.vectorStore === 'object' ? parsed.vectorStore : {};

    const mergedVectorStore = defaults
      ? {
          ...defaults,
          ...parsedVectorStore,
          embedding: {
            ...defaults.embedding,
            ...(parsedVectorStore.embedding ?? {}),
          },
        }
      : parsedVectorStore;

    return {
      ...INITIAL_CHAT_SETTINGS,
      ...parsed,
      vectorStore: mergedVectorStore,
    } as ChatSettings;
  } catch (error) {
    console.error('Failed to load chat settings from local storage:', error);
    return INITIAL_CHAT_SETTINGS;
  }
};

export const usePersistentChatSettings = () => {
  const [chatSettings, setChatSettings] = useState<ChatSettings>(getInitialChatSettings);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(CHAT_SETTINGS_STORAGE_KEY, JSON.stringify(chatSettings));
    } catch (error) {
      console.error('Failed to save chat settings to local storage:', error);
    }
  }, [chatSettings]);

  return { chatSettings, setChatSettings } as const;
};
