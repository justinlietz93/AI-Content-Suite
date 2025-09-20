import React from 'react';
import { ChevronRightIcon } from '../../icons/ChevronRightIcon';
import type { SettingsCategoryDefinition, SettingsCategoryId } from './categories';

interface SettingsCategorySidebarProps {
  categories: SettingsCategoryDefinition[];
  activeCategory: SettingsCategoryId;
  onSelect: (categoryId: SettingsCategoryId) => void;
}

export const SettingsCategorySidebar: React.FC<SettingsCategorySidebarProps> = ({
  categories,
  activeCategory,
  onSelect,
}) => (
  <aside
    className="hidden sm:flex sm:flex-col w-64 border-r border-border-color bg-secondary/40 p-4 gap-3 overflow-y-auto"
    role="tablist"
    aria-orientation="vertical"
  >
    {categories.map(category => {
      const isActive = category.id === activeCategory;
      return (
        <button
          key={category.id}
          type="button"
          onClick={() => onSelect(category.id)}
          id={`settings-tab-${category.id}`}
          aria-selected={isActive}
          aria-controls={`settings-panel-${category.id}`}
          role="tab"
          className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-sm rounded-full border transition-colors duration-150 text-left ${
            isActive
              ? 'bg-primary/10 border-primary text-primary font-semibold shadow-sm'
              : 'bg-surface border-border-color text-text-secondary hover:text-text-primary'
          }`}
        >
          <span className="flex-1">
            <span className="block text-sm">{category.label}</span>
            <span className="mt-1 block text-xs text-text-secondary">{category.description}</span>
          </span>
          <ChevronRightIcon
            className={`w-4 h-4 transition-transform duration-150 ${isActive ? 'rotate-90 text-primary' : 'text-text-secondary'}`}
          />
        </button>
      );
    })}
  </aside>
);
