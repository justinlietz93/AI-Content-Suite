import React from 'react';

interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTabId: string;
  onTabChange: (id: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTabId, onTabChange }) => {
  return (
    <div className="flex border-b border-border-color" role="tablist" aria-label="Analysis Modes">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          id={`tab-${tab.id}`}
          role="tab"
          aria-selected={activeTabId === tab.id}
          aria-controls={`tabpanel-${tab.id}`} // Assuming panels would have this ID if they existed
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-3 sm:px-6 font-medium text-sm sm:text-base focus:outline-none transition-colors duration-150
            ${
              activeTabId === tab.id
                ? 'border-b-2 border-primary text-primary'
                : 'text-text-secondary hover:text-text-primary hover:border-b-2 hover:border-slate-500'
            }
          `}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};