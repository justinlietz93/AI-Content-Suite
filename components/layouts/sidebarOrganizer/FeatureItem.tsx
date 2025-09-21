/**
 * @fileoverview Reusable component for rendering a sidebar feature entry.
 */

import React from 'react';
import type { Mode } from '../../../types';
import type { ModeIconMap } from './types';
import type { SidebarFeature } from './types';

interface FeatureItemProps {
  /** Feature metadata representing the shortcut entry. */
  feature: SidebarFeature;
  /** Whether the sidebar is collapsed into icon-only mode. */
  collapsed: boolean;
  /** Currently active mode used for highlighting. */
  activeMode: Mode;
  /** Icon registry for the workspace modes. */
  iconMap: ModeIconMap;
  /** Localized label lookup keyed by mode. */
  tabLabels: Record<Mode, string>;
  /** Indicates that the feature is being dragged. */
  isDragging: boolean;
  /** Callback triggered when the entry is selected. */
  onSelectMode?: (mode: Mode) => void;
  /** Keyboard handler supporting drag shortcuts. */
  onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>, featureId: string) => void;
  /** Pointer drag start handler. */
  onDragStart: (event: React.DragEvent<HTMLElement>, featureId: string) => void;
  /** Pointer drag end handler. */
  onDragEnd: () => void;
}

/**
 * Visual representation of a feature with drag, keyboard, and selection affordances.
 */
export const FeatureItem: React.FC<FeatureItemProps> = ({
  feature,
  collapsed,
  activeMode,
  iconMap,
  tabLabels,
  isDragging,
  onSelectMode,
  onKeyDown,
  onDragStart,
  onDragEnd,
}) => {
  const IconComponent = iconMap[feature.mode];
  const isActive = activeMode === feature.mode;
  /** Tracks whether a drag interaction just completed so the click handler can be suppressed. */
  const suppressClickRef = React.useRef(false);
  const handleDragStart = React.useCallback(
    (event: React.DragEvent<HTMLElement>) => {
      suppressClickRef.current = true;
      onDragStart(event, feature.id);
    },
    [feature.id, onDragStart],
  );
  const handleDragEnd = React.useCallback(() => {
    onDragEnd();
    setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
  }, [onDragEnd]);
  /**
   * Prevents drag terminations from triggering a mode switch while still allowing regular clicks to activate features.
   */
  const handleClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (suppressClickRef.current) {
        event.preventDefault();
        event.stopPropagation();
        suppressClickRef.current = false;
        return;
      }
      onSelectMode?.(feature.mode);
    },
    [feature.mode, onSelectMode],
  );
  const buttonClasses = [
    'group flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface',
    isActive
      ? 'bg-primary/20 text-primary'
      : 'text-text-secondary hover:bg-secondary/60 hover:text-text-primary focus-visible:text-text-primary',
    collapsed ? 'justify-center px-0' : '',
    isDragging ? 'scale-[1.02] ring-2 ring-primary/70 shadow-lg' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={buttonClasses}
      data-drag-handle="feature"
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onKeyDown={event => onKeyDown(event, feature.id)}
      aria-grabbed={isDragging}
      data-feature-id={feature.id}
      role="listitem"
    >
      {IconComponent ? (
        <IconComponent
          fontSize={collapsed ? 'large' : 'medium'}
          className={`shrink-0 ${isActive ? 'text-primary' : 'text-text-secondary'} ${collapsed ? 'mx-auto' : ''}`}
          draggable
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        />
      ) : null}
      {collapsed ? (
        <span className="sr-only">{tabLabels[feature.mode]}</span>
      ) : (
        <span className="truncate">{tabLabels[feature.mode]}</span>
      )}
    </button>
  );
};
