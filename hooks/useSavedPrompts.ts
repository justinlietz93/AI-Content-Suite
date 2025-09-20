import { useEffect, useState } from 'react';
import type { SavedPrompt } from '../types';

const SAVED_PROMPTS_STORAGE_KEY = 'ai_content_suite_saved_prompts';

const getInitialSavedPrompts = (): SavedPrompt[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const saved = localStorage.getItem(SAVED_PROMPTS_STORAGE_KEY);
    if (!saved) {
      return [];
    }
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? (parsed as SavedPrompt[]) : [];
  } catch (error) {
    console.error('Failed to load saved prompts from local storage:', error);
    return [];
  }
};

export const useSavedPrompts = () => {
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>(getInitialSavedPrompts);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(SAVED_PROMPTS_STORAGE_KEY, JSON.stringify(savedPrompts));
    } catch (error) {
      console.error('Failed to save prompts to local storage:', error);
    }
  }, [savedPrompts]);

  return { savedPrompts, setSavedPrompts } as const;
};
