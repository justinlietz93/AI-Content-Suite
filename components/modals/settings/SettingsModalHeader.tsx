import React from 'react';
import { XCircleIcon } from '../../icons/XCircleIcon';

interface SettingsModalHeaderProps {
  onClose: () => void;
}

export const SettingsModalHeader: React.FC<SettingsModalHeaderProps> = ({ onClose }) => (
  <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-6 border-b border-border-color">
    <div>
      <h2 id="workspace-settings-modal" className="text-xl font-semibold text-text-primary">
        Workspace Settings
      </h2>
      <p className="mt-1 text-sm text-text-secondary">
        Configure global AI providers, per-feature overrides, and retrieval settings for your team.
      </p>
    </div>
    <button
      onClick={onClose}
      className="self-start text-text-secondary hover:text-text-primary transition-colors"
      aria-label="Close settings"
    >
      <XCircleIcon className="w-7 h-7" />
    </button>
  </header>
);
