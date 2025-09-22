/**
 * @fileoverview Reusable component for rendering a sidebar feature entry.
 */

import React from 'react';
import { debugToastDragEnd, debugToastDragStart } from '../../../utils/debugToast';
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
      // Emit a small dev-only toast for quick confirmation.
      debugToastDragStart(feature.id, collapsed);
      onDragStart(event, feature.id);
    },
    [collapsed, feature.id, onDragStart],
  );
  const handleDragEnd = React.useCallback(() => {
    // Emit a small dev-only toast for quick confirmation.
    debugToastDragEnd(feature.id);
    onDragEnd();
    setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
  }, [feature.id, onDragEnd]);
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
    'group flex w-full items-center gap-3 rounded-md px-2 py-2 text-left select-none transition-colors transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface',
    isActive
      ? 'bg-primary/20 text-primary'
      : 'text-text-secondary hover:bg-secondary/60 hover:text-text-primary focus-visible:text-text-primary',
    collapsed ? 'justify-center px-0 cursor-grab active:cursor-grabbing' : 'cursor-grab active:cursor-grabbing',
    // Intentionally avoid mutating the draggable element's visual styles during drag to prevent
    // immediate drag cancellation on some environments (e.g., Linux/Wayland) that are sensitive
    // to source-node DOM/style changes mid-drag. Visual feedback is provided via previews/indicators.
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={buttonClasses}
      data-drag-handle={'feature'}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onKeyDown={event => onKeyDown(event, feature.id)}
      data-grabbed={String(isDragging)}
      data-feature-id={feature.id}
      role="listitem"
      aria-pressed={isActive}
    >
      {IconComponent ? (
        collapsed ? (
          <IconComponent
            fontSize="large"
            className={`shrink-0 ${isActive ? 'text-primary' : 'text-text-secondary'}`}
          />
        ) : (
          <IconComponent
            fontSize="medium"
            className={`shrink-0 ${isActive ? 'text-primary' : 'text-text-secondary'}`}
          />
        )
      ) : null}
      {collapsed ? (
        <span className="sr-only">{tabLabels[feature.mode]}</span>
      ) : (
        <span className="truncate">{tabLabels[feature.mode]}</span>
      )}
    </button>
  );
};
