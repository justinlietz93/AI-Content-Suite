import React from 'react';
import type { SettingsCategoryDefinition, SettingsCategoryId } from './categories';

interface SettingsCategoryTabsProps {
  categories: SettingsCategoryDefinition[];
  activeCategory: SettingsCategoryId;
  onSelect: (categoryId: SettingsCategoryId) => void;
}

/**
 * Provides the mobile-friendly tab list for navigating between settings categories.
 *
 * @param props - Tab metadata, the currently selected category, and selection handler.
 * @returns A responsive tab strip tailored for smaller viewports.
 */
export const SettingsCategoryTabs: React.FC<SettingsCategoryTabsProps> = ({
  categories,
  activeCategory,
  onSelect,
}) => (
  <nav className="sm:hidden px-4 pb-4 flex flex-wrap gap-2 border-b border-border-color/70 bg-background/80 backdrop-blur-sm">
    {categories.map(category => {
      const isActive = category.id === activeCategory;
      return (
        <button
          key={category.id}
          type="button"
          onClick={() => onSelect(category.id)}
          id={`settings-tab-${category.id}`}
          className={`px-4 py-2 text-sm rounded-lg border transition-colors duration-200 ${
            isActive
              ? 'bg-primary/15 border-primary/60 text-primary font-semibold'
              : 'bg-background/70 border-border-color/70 text-text-secondary hover:text-text-primary hover:border-border-color/50 hover:bg-background/80'
          }`}
        >
          {category.label}
        </button>
      );
    })}
  </nav>
);
