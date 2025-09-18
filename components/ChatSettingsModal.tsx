
import React, { useState, useEffect, MouseEvent } from 'react';
import type { ChatSettings, SavedPrompt } from '../types';
import { XCircleIcon } from './icons/XCircleIcon';
import { TrashIcon } from './icons/TrashIcon';

interface ChatSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: ChatSettings;
  onSave: (newSettings: ChatSettings) => void;
  savedPrompts: SavedPrompt[];
  onSavePreset: (name: string, prompt: string) => void;
  onDeletePreset: (name: string) => void;
}

export const ChatSettingsModal: React.FC<ChatSettingsModalProps> = ({ isOpen, onClose, currentSettings, onSave, savedPrompts, onSavePreset, onDeletePreset }) => {
  const [editedSettings, setEditedSettings] = useState<ChatSettings>(currentSettings);
  const [selectedPreset, setSelectedPreset] = useState<string>(''); // Holds the name of the selected preset

  useEffect(() => {
    if (isOpen) {
      setEditedSettings(currentSettings);
      setSelectedPreset(''); // Reset selection when opening
    }
  }, [isOpen, currentSettings]);

  const handleSave = () => {
    onSave(editedSettings);
  };

  const handleLoadPreset = (name: string) => {
    const preset = savedPrompts.find(p => p.name === name);
    if (preset) {
      setEditedSettings({ ...editedSettings, systemInstruction: preset.prompt });
      setSelectedPreset(name);
    } else {
      setSelectedPreset('');
    }
  };

  const handleSaveAsPreset = () => {
    const name = window.prompt("Enter a name for this preset:", selectedPreset || "New Preset");
    if (name && name.trim() !== '') {
      onSavePreset(name.trim(), editedSettings.systemInstruction);
      setSelectedPreset(name.trim()); // Select the new/updated preset
    }
  };

  const handleDeletePreset = () => {
    if (selectedPreset && window.confirm(`Are you sure you want to delete the preset "${selectedPreset}"?`)) {
      onDeletePreset(selectedPreset);
      setSelectedPreset(''); // Deselect after deletion
    }
  };

  const handleOverlayClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
        onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 transition-opacity duration-300 animate-fade-in-scale"
        onClick={handleOverlayClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
    >
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-lg transform transition-all duration-300">
        <header className="flex items-center justify-between p-4 sm:p-5 border-b border-border-color">
          <h2 id="modal-title" className="text-lg sm:text-xl font-semibold text-text-primary">Chat Settings</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors" aria-label="Close modal">
            <XCircleIcon className="w-7 h-7" />
          </button>
        </header>
        
        <div className="p-6 sm:p-8 space-y-4">
            <div>
              <label htmlFor="preset-selector" className="block text-sm font-medium text-text-secondary mb-2">
                Manage Presets
              </label>
              <div className="flex items-center gap-2">
                <select 
                  id="preset-selector"
                  value={selectedPreset}
                  onChange={(e) => handleLoadPreset(e.target.value)}
                  className="flex-grow w-full px-3 py-2 bg-input border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring text-text-primary placeholder-text-secondary text-sm"
                >
                  <option value="">-- Load a preset --</option>
                  {savedPrompts.map(p => (
                    <option key={p.name} value={p.name}>{p.name}</option>
                  ))}
                </select>
                <button
                  onClick={handleDeletePreset}
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
                    System Prompt
                </label>
                <textarea
                    id="system-instruction-modal"
                    rows={8}
                    value={editedSettings.systemInstruction}
                    onChange={(e) => {
                        setEditedSettings({ ...editedSettings, systemInstruction: e.target.value });
                        // If user edits, it's no longer a pristine preset
                        if (selectedPreset) setSelectedPreset('');
                    }}
                    placeholder="Define the AI's persona and instructions..."
                    className="w-full px-3 py-2 bg-input border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring text-text-primary placeholder-text-secondary text-sm"
                />
                 <p className="mt-2 text-xs text-text-secondary">
                    Changes to the system prompt will start a new chat session to take effect.
                </p>
            </div>
        </div>

        <footer className="flex items-center justify-between gap-4 p-4 bg-secondary rounded-b-xl">
            <button
                onClick={handleSaveAsPreset}
                className="px-4 py-2 bg-muted text-text-primary font-semibold rounded-lg hover:bg-border-color transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-secondary"
            >
                Save as Preset
            </button>
            <div className="flex items-center gap-4">
              <button
                  onClick={onClose}
                  className="px-4 py-2 bg-muted text-text-primary font-semibold rounded-lg hover:bg-border-color transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-secondary"
              >
                  Cancel
              </button>
              <button
                  onClick={handleSave}
                  className="px-6 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary-hover transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-secondary"
              >
                  Save &amp; Close
              </button>
            </div>
        </footer>
      </div>
    </div>
  );
};