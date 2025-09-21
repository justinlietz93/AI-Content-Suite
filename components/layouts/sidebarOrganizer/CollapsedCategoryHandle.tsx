/**
 * @fileoverview Presents an accessible drag handle for sidebar categories when the organizer is collapsed.
 * @purpose Provide a compact yet discoverable control so users can reorder categories without expanding the sidebar.
 * @externalDependencies Relies solely on the React library for rendering and hooks; no CLI or HTTP integrations are used.
 * @fallbackSemantics No fallback flows are required because rendering either succeeds synchronously or React surfaces an error.
 * @timeoutStrategy Not applicable because the component performs no asynchronous operations or side-effectful work.
 */

import React from 'react';
import type { SidebarOrganizerLabels } from './types';

interface CollapsedCategoryHandleProps {
  /** Identifier for the category represented by the handle. */
  categoryId: string;
  /** Display name used for accessibility metadata. */
  name: string;
  /** Highlights the handle when the category is currently dragged. */
  isDragging: boolean;
  /** Indicates which edge of the handle is targeted by category drops. */
  categoryDropPosition: 'before' | 'after' | null;
  /** True when a feature intends to drop into the category. */
  isFeatureDropTarget: boolean;
  /** Labels bundle leveraged for localized messaging and fallbacks. */
  labels: SidebarOrganizerLabels;
  /** Prevents drag interactions while the category is renamed. */
  isEditing: boolean;
  /** Drag start handler wired to organizer state. */
  onDragStart: (event: React.DragEvent<HTMLElement>) => void;
  /** Drag end handler to clean up organizer state. */
  onDragEnd: () => void;
  /** Keyboard drag handler shared with the expanded header. */
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  /** Hover handler enabling drop targeting logic. */
  onHeaderDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  /** Clears drop state when the pointer exits the handle. */
  onHeaderDragLeave: (event: React.DragEvent<HTMLDivElement>) => void;
  /** Processes both category and feature drops on the handle. */
  onHeaderDrop: (event: React.DragEvent<HTMLDivElement>) => void;
}

/**
 * Compact circular drag handle that surfaces category ordering interactions while the sidebar is collapsed.
 *
 * @param props - Component properties configuring drag handlers and visual state.
 * @returns React element representing the draggable handle.
 * @throws Never throws directly; React handles rendering errors upstream.
 * @remarks The component is purely presentational and produces no side effects.
 */
export const CollapsedCategoryHandle: React.FC<CollapsedCategoryHandleProps> = ({
  categoryId,
  name,
  isDragging,
  categoryDropPosition,
  isFeatureDropTarget,
  labels,
  isEditing,
  onDragStart,
  onDragEnd,
  onKeyDown,
  onHeaderDragOver,
  onHeaderDragLeave,
  onHeaderDrop,
}) => {
  const normalizedName = name.trim() || labels.newCategoryDefaultName;
  const badgeText = normalizedName.slice(0, 3).toUpperCase();
  const dropBeforeActive = categoryDropPosition === 'before';
  const dropAfterActive = categoryDropPosition === 'after';
  const isDropTarget = dropBeforeActive || dropAfterActive || isFeatureDropTarget;
  const containerClasses = [
    'flex h-9 w-9 items-center justify-center rounded-full border border-border-color bg-surface text-[0.6rem] font-semibold uppercase tracking-tight text-text-secondary transition-colors transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
    isDropTarget ? 'bg-primary/10 text-primary ring-2 ring-primary/60' : '',
    isDragging ? 'scale-[1.05] shadow-lg ring-2 ring-primary/70' : '',
    isEditing ? 'cursor-not-allowed opacity-60' : 'cursor-grab hover:bg-secondary/60 hover:text-text-primary',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="relative mb-1 flex justify-center">
      {dropBeforeActive ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-2 -top-1 h-1 rounded-full bg-primary"
        />
      ) : null}
      {dropAfterActive ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-2 -bottom-1 h-1 rounded-full bg-primary"
        />
      ) : null}
      <div
        className={containerClasses}
        role="button"
        tabIndex={isEditing ? -1 : 0}
        draggable={!isEditing}
        title={normalizedName}
        aria-label={normalizedName}
        aria-grabbed={isDragging}
        aria-dropeffect={isDropTarget ? 'move' : undefined}
        aria-disabled={isEditing ? true : undefined}
        data-drag-handle="category"
        data-category-id={categoryId}
        onDragStart={event => {
          if (isEditing) {
            event.preventDefault();
            return;
          }
          onDragStart(event);
        }}
        onDragEnd={onDragEnd}
        onKeyDown={event => onKeyDown(event)}
        onDragOver={event => {
          if (isEditing) {
            event.preventDefault();
            return;
          }
          onHeaderDragOver(event);
        }}
        onDragLeave={onHeaderDragLeave}
        onDrop={event => {
          if (isEditing) {
            event.preventDefault();
            return;
          }
          onHeaderDrop(event);
        }}
      >
        <span className="sr-only">{normalizedName}</span>
        <span aria-hidden>{badgeText}</span>
      </div>
    </div>
  );
};
