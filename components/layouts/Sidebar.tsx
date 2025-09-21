import React from 'react';
import type { Mode } from '../../types';
import { TABS } from '../../constants/uiConstants';

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
  activeMode: Mode;
  onSelectMode?: (mode: Mode) => void;
  /**
   * Controls the base visibility behavior of the sidebar.
   * `desktop` hides the panel on smaller screens while `overlay`
   * keeps it visible for mobile overlays.
   */
  variant?: 'desktop' | 'overlay';
  /**
   * Additional classes merged onto the sidebar container.
   */
  className?: string;
  /**
   * When false the collapse toggle button is omitted, which is
   * useful for mobile overlays where closing is handled externally.
   */
  showCollapseToggle?: boolean;
};

const NAV_SECTIONS = [
  {
    title: 'Workspace',
    modes: ['technical', 'styleExtractor', 'rewriter', 'mathFormatter', 'reasoningStudio', 'scaffolder'] as Mode[],
  },
  {
    title: 'Orchestration',
    modes: ['requestSplitter', 'promptEnhancer', 'agentDesigner'] as Mode[],
  },
  {
    title: 'Interactive',
    modes: ['chat'] as Mode[],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggle,
  activeMode,
  onSelectMode,
  variant = 'desktop',
  className,
  showCollapseToggle = true,
}) => {
  const baseVisibility = variant === 'overlay' ? 'flex md:hidden' : 'hidden md:flex';
  const classes = [
    baseVisibility,
    'flex flex-col border-r border-border-color/70 bg-surface/80 backdrop-blur-sm transition-all duration-300 ease-in-out',
    collapsed ? 'w-16' : 'w-64',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <aside className={classes} aria-label="Workspace navigation">
      <div className="flex items-center justify-between px-3 py-4 border-b border-border-color/60">
        <span
          className={`text-xs font-semibold uppercase tracking-widest text-text-secondary transition-opacity ${
            collapsed ? 'opacity-0' : 'opacity-80'
          }`}
        >
          AI Suite
        </span>
        {showCollapseToggle && (
          <button
            type="button"
            onClick={onToggle}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border-color/80 bg-secondary/60 text-text-secondary hover:text-text-primary hover:border-border-color transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
          >
            <span className="text-lg" aria-hidden="true">
              {collapsed ? '»' : '«'}
            </span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {NAV_SECTIONS.map(section => (
          <div key={section.title} className="px-2 py-4">
            <p
              className={`text-[0.65rem] uppercase tracking-widest text-text-secondary/70 mb-3 ${
                collapsed ? 'hidden' : 'block'
              }`}
            >
              {section.title}
            </p>
            <ul className="space-y-1">
              {section.modes.map(mode => {
                const tab = TABS.find(tabItem => tabItem.id === mode);
                if (!tab) return null;
                const isActive = activeMode === mode;

                return (
                  <li key={mode}>
                    <button
                      type="button"
                      onClick={() => onSelectMode?.(mode)}
                      className={`w-full rounded-md px-2 py-2 text-left text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-surface ${
                        isActive
                          ? 'bg-primary/20 text-text-primary border border-primary/40'
                          : 'text-text-secondary hover:text-text-primary hover:bg-secondary/60'
                      } ${collapsed ? 'justify-center text-[0.65rem] px-0 py-1.5' : ''}`}
                    >
                      {collapsed ? tab.label[0] : tab.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div
        className={`px-3 py-4 text-xs text-text-secondary/70 border-t border-border-color/60 ${
          collapsed ? 'hidden' : 'block'
        }`}
      >
        Future modules and team dashboards will appear here.
      </div>
    </aside>
  );
};
