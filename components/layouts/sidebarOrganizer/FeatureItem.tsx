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
  const handleDragStart = React.useCallback(
    (event: React.DragEvent<HTMLElement>) => {
      onDragStart(event, feature.id);
    },
    [feature.id, onDragStart],
  );
  const handleDragEnd = React.useCallback(() => {
    onDragEnd();
  }, [onDragEnd]);
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
      onKeyDown={event => onKeyDown(event, feature.id)}
      onClick={() => onSelectMode?.(feature.mode)}
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
