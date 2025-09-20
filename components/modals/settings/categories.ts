export type SettingsCategoryId = 'global' | 'feature-overrides' | 'vector-store' | 'chat-presets';

export interface SettingsCategoryDefinition {
  id: SettingsCategoryId;
  label: string;
  description: string;
}

export const SETTINGS_CATEGORIES: SettingsCategoryDefinition[] = [
  {
    id: 'global',
    label: 'Global Provider',
    description: 'Set the default provider, model, and API credentials.',
  },
  {
    id: 'feature-overrides',
    label: 'Feature Overrides',
    description: 'Customize providers and models on a per-feature basis.',
  },
  {
    id: 'vector-store',
    label: 'Vector Store',
    description: 'Configure retrieval, embeddings, and vector database settings.',
  },
  {
    id: 'chat-presets',
    label: 'Chat Presets',
    description: 'Manage saved prompts and default system instructions.',
  },
];
