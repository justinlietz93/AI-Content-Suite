import React from 'react';
import SummarizeIcon from '@mui/icons-material/Summarize';
import StyleIcon from '@mui/icons-material/Style';
import EditNoteIcon from '@mui/icons-material/EditNote';
import FunctionsIcon from '@mui/icons-material/Functions';
import PsychologyIcon from '@mui/icons-material/Psychology';
import InsightsIcon from '@mui/icons-material/Insights';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ArchitectureIcon from '@mui/icons-material/Architecture';
import AssistantIcon from '@mui/icons-material/Assistant';
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

type NavSection = {
  id: string;
  title: string;
  modes: Mode[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    id: 'workspace',
    title: 'Workspace',
    modes: ['technical', 'styleExtractor', 'rewriter', 'mathFormatter', 'reasoningStudio', 'scaffolder'] as Mode[],
  },
  {
    id: 'orchestration',
    title: 'Orchestration',
    modes: ['requestSplitter', 'promptEnhancer', 'agentDesigner'] as Mode[],
  },
  {
    id: 'interactive',
    title: 'Interactive',
    modes: ['chat'] as Mode[],
  },
];

const MODE_ICONS: Record<Mode, React.ElementType> = {
  technical: SummarizeIcon,
  styleExtractor: StyleIcon,
  rewriter: EditNoteIcon,
  mathFormatter: FunctionsIcon,
  reasoningStudio: PsychologyIcon,
  scaffolder: InsightsIcon,
  requestSplitter: CallSplitIcon,
  promptEnhancer: AutoAwesomeIcon,
  agentDesigner: ArchitectureIcon,
  chat: AssistantIcon,
};

/**
 * Renders the workspace navigation sidebar, including optional collapse mode and
 * per-section toggles for feature categories. The component does not perform
 * asynchronous work and therefore has no timeout concerns.
 *
 * @param props - Sidebar configuration including collapse state, callbacks, and the active mode.
 * @returns The sidebar navigation element.
 * @throws Never throws directly; relies on React error boundaries for rendering issues.
 * @remarks Updates internal React state when section toggle handlers run.
 */
export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggle,
  activeMode,
  onSelectMode,
  variant = 'desktop',
  className,
  showCollapseToggle = true,
}) => {
  const [collapsedSections, setCollapsedSections] = React.useState<Record<string, boolean>>(() =>
    NAV_SECTIONS.reduce((acc, section) => {
      acc[section.id] = false;
      return acc;
    }, {} as Record<string, boolean>),
  );

  /**
   * Toggles the collapsed state for a sidebar category.
   *
   * @param sectionId - Identifier for the navigation section that should change visibility.
   * @returns void
   * @throws This handler never throws; it only updates component state.
   * @remarks Mutates React state to track the collapsed sections map.
   */
  const handleSectionToggle = React.useCallback((sectionId: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  }, []);

  const baseVisibility = variant === 'overlay' ? 'flex md:hidden' : 'hidden md:flex';
  const widthStyle =
    variant === 'overlay'
      ? undefined
      : {
          width: collapsed ? 'clamp(3.75rem, 5vw, 5.5rem)' : 'clamp(13rem, 18vw, 20rem)',
        };
  const classes = [
    baseVisibility,
    'flex flex-col shrink-0 border-r border-border-color/70 bg-surface/80 backdrop-blur-sm transition-all duration-300 ease-in-out',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <aside className={classes} aria-label="Workspace navigation" style={widthStyle}>
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
        {NAV_SECTIONS.map(section => {
          const listId = `${section.id}-nav-list`;
          const isSectionCollapsed = collapsed ? false : collapsedSections[section.id] ?? false;

          const sectionSpacingClasses = collapsed
            ? 'px-1 first:pt-2 last:pb-2'
            : 'px-2 py-4';

          return (
            <div
              key={section.id}
              className={sectionSpacingClasses}
              data-testid={`sidebar-section-${section.id}`}
            >
              {!collapsed && (
                <button
                  type="button"
                  onClick={() => handleSectionToggle(section.id)}
                  className="mb-3 flex w-full items-center justify-between text-[0.65rem] uppercase tracking-widest text-text-secondary/70"
                  aria-controls={listId}
                  aria-expanded={!isSectionCollapsed}
                >
                  <span>{section.title}</span>
                  <span aria-hidden="true">{isSectionCollapsed ? '▸' : '▾'}</span>
                </button>
              )}
              <ul
                id={listId}
                aria-hidden={isSectionCollapsed}
                className={`space-y-1 ${isSectionCollapsed ? 'hidden' : ''}`}
                hidden={isSectionCollapsed}
              >
                {section.modes.map(mode => {
                  const tab = TABS.find(tabItem => tabItem.id === mode);
                  if (!tab) return null;
                  const isActive = activeMode === mode;
                  const IconComponent = MODE_ICONS[mode];
                  const buttonStateClasses = isActive
                    ? 'bg-primary/20 text-primary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-secondary/60 focus-visible:text-text-primary';
                  const layoutClasses = collapsed
                    ? 'justify-center px-0 py-2'
                    : 'gap-4 px-2 py-2 text-left';
                  const iconColorClasses = isActive
                    ? 'text-primary'
                    : 'text-text-secondary group-hover:text-text-primary group-focus-visible:text-text-primary';

                  return (
                    <li key={mode}>
                      <button
                        type="button"
                        onClick={() => onSelectMode?.(mode)}
                        className={`w-full rounded-md text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface flex items-center group ${buttonStateClasses} ${layoutClasses}`}
                        aria-label={collapsed ? tab.label : undefined}
                        title={collapsed ? tab.label : undefined}
                      >
                        {IconComponent ? (
                          <IconComponent
                            fontSize={collapsed ? 'large' : 'medium'}
                            sx={{ fontSize: collapsed ? '1.95rem' : '1.5rem' }}
                            className={`shrink-0 transition-colors ${iconColorClasses}`}
                            aria-hidden="true"
                          />
                        ) : null}
                        {collapsed ? (
                          <span className="sr-only">{tab.label}</span>
                        ) : (
                          <span className="truncate">{tab.label}</span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
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
