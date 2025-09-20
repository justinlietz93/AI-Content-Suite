import React from 'react';
import { ChevronRightIcon } from '../../icons/ChevronRightIcon';
import type { SettingsCategoryDefinition, SettingsCategoryId } from './categories';

interface SettingsCategorySidebarProps {
  categories: SettingsCategoryDefinition[];
  activeCategory: SettingsCategoryId;
  onSelect: (categoryId: SettingsCategoryId) => void;
  scrollbarClassName?: string;
}

/**
 * Renders the desktop navigation list for switching between settings categories within the modal.
 *
 * @param props - Category metadata, the active selection, and optional theming classes for scroll treatment.
 * @returns Sidebar navigation markup that reflects the current selection state.
 */
export const SettingsCategorySidebar: React.FC<SettingsCategorySidebarProps> = ({
  categories,
  activeCategory,
  onSelect,
  scrollbarClassName,
}) => {
  const baseClassName =
    'hidden sm:flex sm:flex-col w-72 border-r border-border-color/70 bg-background/80 p-5 gap-3 overflow-y-auto pr-3';
  const composedClassName = scrollbarClassName ? `${baseClassName} ${scrollbarClassName}` : baseClassName;

  return (
    <aside className={composedClassName} role="tablist" aria-orientation="vertical">
      {categories.map(category => {
        const isActive = category.id === activeCategory;
        const buttonBaseClass =
          'w-full flex items-center justify-between gap-3 px-4 py-3 text-sm rounded-lg border transition-colors duration-200 text-left';
        const buttonStateClass = isActive
          ? 'bg-primary/15 border-primary/60 text-primary font-semibold'
          : 'bg-background/70 border-border-color/70 text-text-secondary hover:text-text-primary hover:border-border-color/50 hover:bg-background/80';

        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onSelect(category.id)}
            id={`settings-tab-${category.id}`}
            aria-selected={isActive}
            aria-controls={`settings-panel-${category.id}`}
            role="tab"
            className={`${buttonBaseClass} ${buttonStateClass}`}
          >
            <span className="flex-1">
              <span className="block text-sm text-text-primary/95">{category.label}</span>
              <span className="mt-1 block text-xs text-text-secondary/80">{category.description}</span>
            </span>
            <ChevronRightIcon
              className={`w-4 h-4 transition-transform duration-150 ${
                isActive ? 'rotate-90 text-primary' : 'text-text-secondary/80'
              }`}
            />
          </button>
        );
      })}
    </aside>
  );
};
