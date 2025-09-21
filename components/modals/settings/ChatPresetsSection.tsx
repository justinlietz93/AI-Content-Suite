import React from 'react';
import type { ChatGenerationSettings, SavedPrompt } from '../../../types';
import { TrashIcon } from '../../icons/TrashIcon';

interface ChatPresetsSectionProps {
  savedPrompts: SavedPrompt[];
  selectedPreset: string;
  systemInstruction: string;
  generation: ChatGenerationSettings;
  onSelectPreset: (name: string) => void;
  onDeletePreset: () => void;
  onSystemInstructionChange: (value: string) => void;
  onGenerationChange: (
    updater: (previous: ChatGenerationSettings) => ChatGenerationSettings,
  ) => void;
}

const REASONING_EFFORT_OPTIONS: ChatGenerationSettings['reasoning']['effort'][] = [
  'low',
  'medium',
  'high',
];

export const ChatPresetsSection: React.FC<ChatPresetsSectionProps> = ({
  savedPrompts,
  selectedPreset,
  systemInstruction,
  generation,
  onSelectPreset,
  onDeletePreset,
  onSystemInstructionChange,
  onGenerationChange,
}) => (
  <section className="space-y-4">
    <div>
      <h3 className="text-base font-semibold text-text-primary">Chat behaviour</h3>
      <p className="text-sm text-text-secondary">
        Manage reusable system prompts and presets for the conversational workspace.
      </p>
    </div>
    <div className="space-y-4">
      <div>
        <label htmlFor="preset-selector" className="block text-sm font-medium text-text-secondary mb-2">
          Manage presets
        </label>
        <div className="flex items-center gap-2">
          <select
            id="preset-selector"
            value={selectedPreset}
            onChange={event => onSelectPreset(event.target.value)}
            className="flex-grow w-full px-3 py-2 bg-input border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring text-text-primary placeholder-text-secondary text-sm"
          >
            <option value="">-- Load a preset --</option>
            {savedPrompts.map(preset => (
              <option key={preset.name} value={preset.name}>
                {preset.name}
              </option>
            ))}
          </select>
          <button
            onClick={onDeletePreset}
            disabled={!selectedPreset}
            className="p-2 bg-destructive/80 text-destructive-foreground rounded-md hover:bg-destructive disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Delete selected preset"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="system-instruction-modal" className="block text-sm font-medium text-text-secondary mb-2">
          System prompt
        </label>
        <textarea
          id="system-instruction-modal"
          rows={8}
          value={systemInstruction}
          onChange={event => onSystemInstructionChange(event.target.value)}
          placeholder="Define the AI's persona and instructions..."
          className="w-full px-3 py-2 bg-input border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring text-text-primary placeholder-text-secondary text-sm"
        />
        <p className="mt-2 text-xs text-text-secondary">
          Changes to the system prompt will start a new chat session to take effect.
        </p>
      </div>

      <div className="border border-border-color rounded-lg p-4 space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-text-primary">Response configuration</h4>
          <p className="text-xs text-text-secondary">
            Control how expansive answers can be and whether to retain the model&apos;s reasoning traces.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="chat-max-output" className="block text-xs font-medium text-text-secondary mb-2">
              Max output tokens
            </label>
            <input
              id="chat-max-output"
              type="number"
              min={1}
              step={1}
              value={generation.maxOutputTokens}
              onChange={event => {
                const parsed = Number(event.target.value);
                onGenerationChange(prev => ({
                  ...prev,
                  maxOutputTokens: Number.isFinite(parsed)
                    ? Math.max(1, Math.round(parsed))
                    : prev.maxOutputTokens,
                }));
              }}
              className="w-full px-3 py-2 bg-input border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring text-text-primary text-sm"
            />
            <p className="mt-1 text-[11px] text-text-secondary">
              Applies to chat replies. Other tools inherit this ceiling unless overridden.
            </p>
          </div>
          <div>
            <label htmlFor="chat-temperature" className="block text-xs font-medium text-text-secondary mb-2">
              Temperature
            </label>
            <input
              id="chat-temperature"
              type="number"
              min={0}
              max={2}
              step={0.1}
              value={generation.temperature}
              onChange={event => {
                const parsed = Number(event.target.value);
                onGenerationChange(prev => ({
                  ...prev,
                  temperature: Number.isFinite(parsed)
                    ? Math.min(Math.max(parsed, 0), 2)
                    : prev.temperature,
                }));
              }}
              className="w-full px-3 py-2 bg-input border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring text-text-primary text-sm"
            />
            <p className="mt-1 text-[11px] text-text-secondary">Lower values yield deterministic answers.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="text-xs font-semibold text-text-primary uppercase tracking-wide">Reasoning</h5>
                <p className="text-[11px] text-text-secondary">Enable multi-step planning on reasoning models.</p>
              </div>
              <label className="inline-flex items-center gap-2 text-xs text-text-secondary">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-primary focus:ring-ring border-border-color rounded"
                  checked={generation.reasoning.enabled}
                  onChange={event =>
                    onGenerationChange(prev => ({
                      ...prev,
                      reasoning: { ...prev.reasoning, enabled: event.target.checked },
                    }))
                  }
                />
                Enabled
              </label>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Effort</label>
              <select
                value={generation.reasoning.effort}
                onChange={event => {
                  const value = event.target.value as ChatGenerationSettings['reasoning']['effort'];
                  const sanitized = REASONING_EFFORT_OPTIONS.includes(value)
                    ? value
                    : generation.reasoning.effort;
                  onGenerationChange(prev => ({
                    ...prev,
                    reasoning: { ...prev.reasoning, effort: sanitized },
                  }));
                }}
                className="w-full px-3 py-2 bg-input border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring text-text-primary text-sm"
                disabled={!generation.reasoning.enabled}
              >
                {REASONING_EFFORT_OPTIONS.map(option => (
                  <option key={option} value={option}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="chat-reasoning-budget" className="block text-xs font-medium text-text-secondary mb-1">
                Budget tokens (optional)
              </label>
              <input
                id="chat-reasoning-budget"
                type="number"
                min={1}
                step={1}
                value={generation.reasoning.budgetTokens ?? ''}
                onChange={event => {
                  const raw = event.target.value;
                  onGenerationChange(prev => ({
                    ...prev,
                    reasoning: {
                      ...prev.reasoning,
                      budgetTokens:
                        raw.trim() === ''
                          ? undefined
                          : Math.max(1, Math.round(Number(raw) || prev.reasoning.budgetTokens || 1)),
                    },
                  }));
                }}
                className="w-full px-3 py-2 bg-input border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring text-text-primary text-sm"
                disabled={!generation.reasoning.enabled}
              />
              <p className="mt-1 text-[11px] text-text-secondary">
                Leave blank to allocate roughly half of the response budget automatically.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="text-xs font-semibold text-text-primary uppercase tracking-wide">Thinking traces</h5>
                <p className="text-[11px] text-text-secondary">Expose the model&apos;s step-by-step thoughts.</p>
              </div>
              <label className="inline-flex items-center gap-2 text-xs text-text-secondary">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-primary focus:ring-ring border-border-color rounded"
                  checked={generation.thinking.enabled}
                  onChange={event =>
                    onGenerationChange(prev => ({
                      ...prev,
                      thinking: { ...prev.thinking, enabled: event.target.checked },
                    }))
                  }
                />
                Enabled
              </label>
            </div>
            <div>
              <label htmlFor="chat-thinking-budget" className="block text-xs font-medium text-text-secondary mb-1">
                Budget tokens (optional)
              </label>
              <input
                id="chat-thinking-budget"
                type="number"
                min={1}
                step={1}
                value={generation.thinking.budgetTokens ?? ''}
                onChange={event => {
                  const raw = event.target.value;
                  onGenerationChange(prev => ({
                    ...prev,
                    thinking: {
                      ...prev.thinking,
                      budgetTokens:
                        raw.trim() === ''
                          ? undefined
                          : Math.max(1, Math.round(Number(raw) || prev.thinking.budgetTokens || 1)),
                    },
                  }));
                }}
                className="w-full px-3 py-2 bg-input border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring text-text-primary text-sm"
                disabled={!generation.thinking.enabled}
              />
              <p className="mt-1 text-[11px] text-text-secondary">
                Leave blank to request a balanced share of the overall token budget.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);
