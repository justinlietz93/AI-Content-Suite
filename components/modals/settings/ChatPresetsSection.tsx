import React from 'react';
import type { SavedPrompt } from '../../../types';
import { TrashIcon } from '../../icons/TrashIcon';

interface ChatPresetsSectionProps {
  savedPrompts: SavedPrompt[];
  selectedPreset: string;
  systemInstruction: string;
  onSelectPreset: (name: string) => void;
  onDeletePreset: () => void;
  onSystemInstructionChange: (value: string) => void;
}

export const ChatPresetsSection: React.FC<ChatPresetsSectionProps> = ({
  savedPrompts,
  selectedPreset,
  systemInstruction,
  onSelectPreset,
  onDeletePreset,
  onSystemInstructionChange,
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
    </div>
  </section>
);
