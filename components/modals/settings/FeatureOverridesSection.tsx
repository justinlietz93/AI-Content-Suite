import React from 'react';
import type { ProviderInfo } from '../../../services/providerRegistry';
import type { AIProviderId, FeatureModelPreferences, Mode } from '../../../types';
import { DEFAULT_PROVIDER_MODELS } from '../../../constants';
import { MODE_IDS } from '../../../constants/uiConstants';
import { MODE_LABEL_MAP } from './helpers';

interface FeatureOverridesSectionProps {
  providers: ProviderInfo[];
  featurePreferences: FeatureModelPreferences;
  globalProviderLabel: string;
  globalModelName: string;
  selectedProviderId: AIProviderId;
  onToggleOverride: (mode: Mode, enabled: boolean) => void;
  onUpdatePreference: (
    mode: Mode,
    updater: (prev: { provider: AIProviderId; model: string }) => { provider: AIProviderId; model: string },
  ) => void;
}

export const FeatureOverridesSection: React.FC<FeatureOverridesSectionProps> = ({
  providers,
  featurePreferences,
  globalProviderLabel,
  globalModelName,
  selectedProviderId,
  onToggleOverride,
  onUpdatePreference,
}) => (
  <section className="space-y-4">
    <div>
      <h3 className="text-base font-semibold text-text-primary">Per-feature overrides</h3>
      <p className="text-sm text-text-secondary">
        Enable custom providers and models for individual workflows. When disabled the feature uses the global configuration (
        {globalProviderLabel} • {globalModelName || 'model auto-selection'}).
      </p>
    </div>
    <div className="space-y-4">
      {MODE_IDS.map(mode => {
        const preference = featurePreferences[mode];
        const overrideEnabled = Boolean(preference);
        const providerValue = preference?.provider ?? selectedProviderId;
        const modelValue = preference?.model ?? '';
        const providerInfo = providers.find(provider => provider.id === providerValue);

        return (
          <div key={mode} className="border border-border-color rounded-lg p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-text-primary">{MODE_LABEL_MAP[mode]}</h4>
                <p className="text-xs text-text-secondary">
                  {overrideEnabled
                    ? 'Requests for this feature will always use the provider defined below.'
                    : 'Using the global provider and model until a custom override is enabled.'}
                </p>
              </div>
              <label className="inline-flex items-center gap-2 text-xs text-text-secondary">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-primary focus:ring-ring border-border-color rounded"
                  checked={overrideEnabled}
                  onChange={event => onToggleOverride(mode, event.target.checked)}
                />
                Custom settings
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-2">Provider</label>
                <select
                  value={providerValue}
                  onChange={event =>
                    onUpdatePreference(mode, prev => ({
                      provider: event.target.value as AIProviderId,
                      model:
                        prev.provider === (event.target.value as AIProviderId)
                          ? prev.model
                          : DEFAULT_PROVIDER_MODELS[event.target.value as AIProviderId] ?? prev.model,
                    }))
                  }
                  className="w-full px-3 py-2 bg-input border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring text-text-primary text-sm"
                  disabled={!overrideEnabled}
                >
                  {providers.map(provider => (
                    <option key={provider.id} value={provider.id}>
                      {provider.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-text-secondary">
                  {providerInfo?.requiresApiKey
                    ? 'Ensure an API key is stored for this provider.'
                    : 'Local providers can be used without an API key.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-2">Preferred model</label>
                <input
                  type="text"
                  value={modelValue}
                  onChange={event =>
                    onUpdatePreference(mode, prev => ({
                      provider: prev.provider,
                      model: event.target.value,
                    }))
                  }
                  placeholder="Leave blank to use the provider default"
                  className="w-full px-3 py-2 bg-input border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring text-text-primary placeholder-text-secondary text-sm"
                  disabled={!overrideEnabled}
                />
                <p className="mt-1 text-[11px] text-text-secondary">
                  Will fall back to {DEFAULT_PROVIDER_MODELS[providerValue] ?? 'the provider default'} when blank.
                </p>
              </div>
            </div>

            {overrideEnabled && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => onToggleOverride(mode, false)}
                  className="text-xs font-medium text-primary hover:text-primary-hover"
                >
                  Reset to global defaults
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  </section>
);
