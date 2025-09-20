import type {
  ChatSettings,
  FeatureModelPreferences,
  Mode,
  VectorStoreSettings,
} from '../../../types';
import { INITIAL_CHAT_SETTINGS } from '../../../constants';
import { TABS } from '../../../constants/uiConstants';

export const ensureVectorStoreSettings = (
  vectorStore?: VectorStoreSettings,
): VectorStoreSettings => {
  const defaults = INITIAL_CHAT_SETTINGS.vectorStore!;
  return {
    ...defaults,
    ...(vectorStore ?? {}),
    embedding: {
      ...defaults.embedding,
      ...(vectorStore?.embedding ?? {}),
    },
  };
};

export const withDefaults = (settings: ChatSettings): ChatSettings => ({
  ...settings,
  vectorStore: ensureVectorStoreSettings(settings.vectorStore),
});

export const MODE_LABEL_MAP: Record<Mode, string> = TABS.reduce((acc, tab) => {
  acc[tab.id as Mode] = tab.label;
  return acc;
}, {} as Record<Mode, string>);

export const featurePreferenceCount = (
  preferences?: FeatureModelPreferences,
): number => (preferences ? Object.keys(preferences).length : 0);

export const sanitizeVectorStoreSettings = (
  vectorStore?: VectorStoreSettings,
): VectorStoreSettings => {
  const draft = ensureVectorStoreSettings(vectorStore);
  const parsedTopK = Number(draft.topK);
  const sanitizedTopK = Number.isFinite(parsedTopK) && parsedTopK > 0
    ? Math.min(Math.round(parsedTopK), 20)
    : 5;

  const baseUrl = draft.embedding.baseUrl?.trim();
  const resolvedBaseUrl = baseUrl === '' ? undefined : baseUrl;

  return {
    enabled: Boolean(draft.enabled),
    url: draft.url.trim(),
    apiKey: draft.apiKey?.trim() || undefined,
    collection: draft.collection.trim(),
    topK: sanitizedTopK,
    embedding: {
      provider: draft.embedding.provider,
      model: draft.embedding.model.trim(),
      apiKey: draft.embedding.apiKey?.trim() || undefined,
      baseUrl: resolvedBaseUrl,
    },
  };
};
