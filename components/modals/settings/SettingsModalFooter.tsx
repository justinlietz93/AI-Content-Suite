import React from 'react';

interface SettingsModalFooterProps {
  onClose: () => void;
  onSave: () => void;
  onSaveAsPreset: () => void;
}

export const SettingsModalFooter: React.FC<SettingsModalFooterProps> = ({ onClose, onSave, onSaveAsPreset }) => (
  <footer className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-secondary rounded-b-xl">
    <button
      onClick={onSaveAsPreset}
      className="px-4 py-2 bg-muted text-text-primary font-semibold rounded-lg hover:bg-border-color transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-secondary"
    >
      Save as preset
    </button>
    <div className="flex items-center gap-3">
      <button
        onClick={onClose}
        className="px-4 py-2 bg-muted text-text-primary font-semibold rounded-lg hover:bg-border-color transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-secondary"
      >
        Cancel
      </button>
      <button
        onClick={onSave}
        className="px-6 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary-hover transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-secondary"
      >
        Save &amp; close
      </button>
    </div>
  </footer>
);
