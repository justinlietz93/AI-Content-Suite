import React from 'react';

export const HierarchicalToggle: React.FC<{ enabled: boolean; onChange: (enabled: boolean) => void; }> = ({ enabled, onChange }) => {
    return (
      <div className="flex items-center justify-between bg-secondary p-3 rounded-lg my-4">
        <div>
          <label htmlFor="hierarchical-toggle" className="font-semibold text-text-primary cursor-pointer">
            Hierarchical Processing
          </label>
          <p id="hierarchical-description" className="text-xs text-text-secondary mt-1 max-w-sm">
            For very large documents. Uses more parallel agents for faster, potentially more detailed results.
          </p>
        </div>
        <button
          type="button"
          id="hierarchical-toggle"
          role="switch"
          aria-checked={enabled}
          aria-describedby='hierarchical-description'
          onClick={() => onChange(!enabled)}
          className={`${
            enabled ? 'bg-primary' : 'bg-muted'
          } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-surface`}
        >
          <span
            aria-hidden="true"
            className={`${
              enabled ? 'translate-x-6' : 'translate-x-1'
            } inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out`}
          />
        </button>
      </div>
    );
};
