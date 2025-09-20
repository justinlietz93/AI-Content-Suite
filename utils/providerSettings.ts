import type { FeatureModelPreferences, Mode, AIProviderId } from '../types';
import { MODE_IDS } from '../constants/uiConstants';
import { AI_PROVIDERS } from '../services/providerRegistry';

const MODE_SET = new Set<Mode>(MODE_IDS);
const PROVIDER_SET = new Set<AIProviderId>(AI_PROVIDERS.map(provider => provider.id));

export const sanitizeFeatureModelPreferences = (
  rawPreferences?: Partial<Record<string, unknown>>,
): FeatureModelPreferences => {
  if (!rawPreferences || typeof rawPreferences !== 'object') {
    return {};
  }

  const sanitized: FeatureModelPreferences = {};
  for (const [modeKey, value] of Object.entries(rawPreferences)) {
    if (!MODE_SET.has(modeKey as Mode)) {
      continue;
    }
    if (!value || typeof value !== 'object') {
      continue;
    }

    const providerId = (value as { provider?: AIProviderId }).provider;
    if (!providerId || !PROVIDER_SET.has(providerId)) {
      continue;
    }

    const modelValue = (value as { model?: unknown }).model;
    sanitized[modeKey as Mode] = {
      provider: providerId,
      model: typeof modelValue === 'string' ? modelValue.trim() : '',
    };
  }

  return sanitized;
};
