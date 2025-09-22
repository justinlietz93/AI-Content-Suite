/**
 * @fileoverview Collapsed sidebar category handle component enabling drag-and-drop reordering.
 * @purpose Provide an accessible drag affordance for categories when the sidebar is in icon-only mode.
 * @externalDependencies Depends solely on React for rendering; no network or CLI interactions occur.
 * @fallbackSemantics Falls back to native drag previews if custom previews are unavailable.
 * @timeoutStrategy Not applicable because all handlers execute synchronously in response to pointer events.
 */

import React from 'react';
import type { SidebarOrganizerLabels } from './types';

interface CollapsedCategoryHandleProps {
  /** Identifier for the category represented by the handle. */
  categoryId: string;
  /** Display name used for accessibility announcements. */
  name: string;
  /** Indicates whether the category is currently being dragged. */
  isDragging: boolean;
  /** Highlights the intended insertion edge when another category hovers the handle. */
  categoryDropPosition: 'before' | 'after' | null;
  /** Signals that a feature drag intends to drop into the category. */
  isFeatureDropTarget: boolean;
  /** Localized labels used for accessible strings. */
  labels: SidebarOrganizerLabels;
  /** Callback invoked when dragging begins. */
  onDragStart: (event: React.DragEvent<HTMLElement>, categoryId: string) => void;
  /** Callback invoked when dragging ends. */
  onDragEnd: () => void;
  /** Keyboard handler for toggling drag interactions. */
  onKeyDown: (event: React.KeyboardEvent<HTMLElement>, categoryId: string) => void;
  /** Drag-over handler mirroring the expanded header logic. */
  onHandleDragOver: (event: React.DragEvent<HTMLElement>) => void;
  /** Drag-leave handler mirroring the expanded header logic. */
  onHandleDragLeave: (event: React.DragEvent<HTMLElement>) => void;
  /** Drop handler mirroring the expanded header logic. */
  onHandleDrop: (event: React.DragEvent<HTMLElement>) => void;
}

/**
 * Renders a circular icon-only control that exposes drag, drop, and keyboard support for categories
 * while the sidebar is collapsed.
 */
export const CollapsedCategoryHandle: React.FC<CollapsedCategoryHandleProps> = ({
  categoryId,
  name,
  isDragging,
  categoryDropPosition,
  isFeatureDropTarget,
  labels,
  onDragStart,
  onDragEnd,
  onKeyDown,
  onHandleDragOver,
  onHandleDragLeave,
  onHandleDrop,
}) => {
  const accessibleLabel = labels.collapsedCategoryHandleLabel.replace(
    '{categoryName}',
    name || 'category',
  );

  /**
   * Delegates drag start events to the organizer action handlers with the bound category identifier.
   */
  const handleDragStart = React.useCallback(
    (event: React.DragEvent<HTMLElement>) => {
      onDragStart(event, categoryId);
    },
    [categoryId, onDragStart],
  );

  /**
   * Delegates keyboard gestures to the shared organizer handler.
   */
  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      onKeyDown(event, categoryId);
    },
    [categoryId, onKeyDown],
  );

  const isCategoryDropTarget = categoryDropPosition !== null;

  const baseClasses = [
    'relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-border-color/70 bg-secondary/70 text-text-secondary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface cursor-grab active:cursor-grabbing',
    isDragging ? 'scale-[1.02] ring-2 ring-primary/70 shadow-lg' : '',
    isCategoryDropTarget ? 'bg-primary/20 text-primary ring-2 ring-primary/60' : '',
    isFeatureDropTarget ? 'bg-primary/10 ring-2 ring-primary/60 text-primary' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const dropIndicatorClass = categoryDropPosition
    ? `pointer-events-none absolute inset-x-2 ${
        categoryDropPosition === 'before' ? '-top-1' : '-bottom-1'
      } h-1 rounded-full bg-primary ring-2 ring-primary/50 ring-offset-1 ring-offset-surface`
    : null;

  return (
    <div className="mb-2 flex justify-center" data-testid={`collapsed-category-${categoryId}`}>
      <button
        type="button"
        className={baseClasses}
        aria-label={accessibleLabel}
        data-category-id={categoryId}
        data-drag-handle="category"
        data-testid={`collapsed-category-handle-${categoryId}`}
        draggable
        aria-grabbed={isDragging}
        onDragStart={handleDragStart}
        onDragEnd={onDragEnd}
        onDragOver={onHandleDragOver}
        onDragLeave={onHandleDragLeave}
        onDrop={onHandleDrop}
        onKeyDown={handleKeyDown}
      >
        {dropIndicatorClass ? <span aria-hidden className={dropIndicatorClass} /> : null}
        <span aria-hidden className="flex h-6 w-6 flex-col items-center justify-center gap-1">
          <span className="block h-0.5 w-4 rounded-full bg-border-color/80" />
          <span className="block h-0.5 w-4 rounded-full bg-border-color/80" />
          <span className="block h-0.5 w-4 rounded-full bg-border-color/80" />
        </span>
      </button>
    </div>
  );
};
