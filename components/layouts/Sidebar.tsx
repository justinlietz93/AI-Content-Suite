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
import { SidebarOrganizer } from './sidebarOrganizer/SidebarOrganizer';
import type { ModeIconMap } from './sidebarOrganizer/types';

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

const MODE_ICONS: ModeIconMap = {
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
 * Renders the workspace navigation sidebar and delegates mode organization to the
 * {@link SidebarOrganizer} component. The sidebar itself remains synchronous and
 * therefore has no timeout considerations.
 *
 * @param props - Sidebar configuration including collapse state, callbacks, and the active mode.
 * @returns The sidebar navigation element.
 * @throws Never throws directly; relies on React error boundaries for rendering issues.
 * @remarks Adjusts inline width styles when the collapse toggle is activated.
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

      <div className="flex-1 overflow-hidden">
        <SidebarOrganizer
          collapsed={collapsed}
          activeMode={activeMode}
          onSelectMode={onSelectMode}
          iconMap={MODE_ICONS}
        />
      </div>
    </aside>
  );
};
