import React from 'react';
import type { SettingsCategoryDefinition, SettingsCategoryId } from './categories';

interface SettingsCategoryTabsProps {
  categories: SettingsCategoryDefinition[];
  activeCategory: SettingsCategoryId;
  onSelect: (categoryId: SettingsCategoryId) => void;
}

export const SettingsCategoryTabs: React.FC<SettingsCategoryTabsProps> = ({
  categories,
  activeCategory,
  onSelect,
}) => (
  <nav className="sm:hidden px-4 pb-4 flex flex-wrap gap-2 border-b border-border-color bg-secondary/30">
    {categories.map(category => {
      const isActive = category.id === activeCategory;
      return (
        <button
          key={category.id}
          type="button"
          onClick={() => onSelect(category.id)}
          id={`settings-tab-${category.id}`}
          className={`px-4 py-2 text-sm rounded-full border transition-colors duration-150 ${
            isActive
              ? 'bg-primary/10 border-primary text-primary font-semibold'
              : 'bg-surface border-border-color text-text-secondary hover:text-text-primary'
          }`}
        >
          {category.label}
        </button>
      );
    })}
  </nav>
);
