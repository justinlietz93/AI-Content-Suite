/**
 * @fileoverview Category header component exposing rename and delete controls.
 */

import React from 'react';
import HandymanIcon from '@mui/icons-material/Handyman';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import type { SidebarOrganizerLabels } from './types';

/** Pixel distance from the left edge that activates the category action tray. */
const ACTION_ZONE_THRESHOLD_PX = 60;

interface CategoryHeaderProps {
  /** Unique category identifier. */
  categoryId: string;
  /** Display label for the category. */
  name: string;
  /** Indicates that this category is currently dragged. */
  isDragging: boolean;
  /** Highlights the header when another category is targeting it. */
  isCategoryDropTarget: boolean;
  /** Highlights the header when a feature intends to drop into the category. */
  isFeatureDropTarget: boolean;
  /** Accessibility labels used for tooltips. */
  labels: SidebarOrganizerLabels;
  /** When true the features list is collapsed. */
  isCollapsed: boolean;
  /** Whether rename mode is active. */
  isEditing: boolean;
  /** Current rename input value. */
  editingValue: string;
  /** Inline validation message for rename. */
  editingError: string | null;
  /** Handler for toggling collapse. */
  onToggleCollapse: () => void;
  /** Handler for initiating rename. */
  onBeginRename: () => void;
  /** Handler for delete button. */
  onDelete: () => void;
  /** Input change handler for rename text. */
  onRenameChange: (categoryId: string, value: string) => void;
  /** Keydown handler for rename field. */
  onRenameKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  /** Blur handler that commits rename. */
  onRenameBlur: () => void;
  /** Drag start handler for the category header. */
  onDragStart: (event: React.DragEvent<HTMLDivElement>) => void;
  /** Drag end handler. */
  onDragEnd: () => void;
  /** Keyboard handler used for accessible drag toggling. */
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  /** Handles drag over events to support dropping features or categories on the header. */
  onHeaderDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  /** Clears drop target state when the pointer leaves the header area. */
  onHeaderDragLeave: (event: React.DragEvent<HTMLDivElement>) => void;
  /** Processes drop events for categories and features. */
  onHeaderDrop: (event: React.DragEvent<HTMLDivElement>) => void;
}

/**
 * Renders the category title row along with rename/delete affordances.
 */
export const CategoryHeader: React.FC<CategoryHeaderProps> = ({
  categoryId,
  name,
  isDragging,
  isCategoryDropTarget,
  isFeatureDropTarget,
  labels,
  isCollapsed,
  isEditing,
  editingValue,
  editingError,
  onToggleCollapse,
  onBeginRename,
  onDelete,
  onRenameChange,
  onRenameKeyDown,
  onRenameBlur,
  onDragStart,
  onDragEnd,
  onKeyDown,
  onHeaderDragOver,
  onHeaderDragLeave,
  onHeaderDrop,
}) => {
  const actionContainerRef = React.useRef<HTMLDivElement | null>(null);
  const [isPointerInActionZone, setPointerInActionZone] = React.useState(false);
  const [isActionFocused, setActionFocused] = React.useState(false);
  const [isHeaderFocused, setHeaderFocused] = React.useState(false);
  const pointerFocusRef = React.useRef(false);

  const showActions = !isEditing;
  const errorId = editingError ? `rename-${categoryId}-error` : undefined;
  const isDropTarget = isCategoryDropTarget || isFeatureDropTarget;
  const containerClasses = [
    'group mb-2 flex items-center justify-between rounded-md px-2 py-1 text-[0.65rem] uppercase tracking-widest text-text-secondary/70 transition-colors',
    isDropTarget ? 'bg-primary/10 ring-2 ring-primary/60' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const shouldRevealActions = showActions && (isPointerInActionZone || isActionFocused || isHeaderFocused);

  React.useEffect(() => {
    if (isEditing) {
      setPointerInActionZone(false);
      setActionFocused(false);
      setHeaderFocused(false);
    }
  }, [isEditing]);

  /**
   * Reveals category actions when the pointer hovers near the title's leading edge.
   */
  const handleHeaderMouseMove = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!showActions) {
        return;
      }

      const { left } = event.currentTarget.getBoundingClientRect();
      const offset = event.clientX - left;
      const withinZone = offset <= ACTION_ZONE_THRESHOLD_PX;

      setPointerInActionZone(previous => (previous === withinZone ? previous : withinZone));
    },
    [showActions],
  );

  /**
   * Hides the action tray once the pointer leaves the header region.
   */
  const handleHeaderMouseLeave = React.useCallback(() => {
    setPointerInActionZone(false);
    pointerFocusRef.current = false;
  }, []);

  /**
   * Ensures keyboard users reveal the action tray when the header gains focus.
   */
  const handleHeaderFocus = React.useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      if (!showActions) {
        return;
      }

      const element = event.currentTarget;
      const supportsMatches = typeof element.matches === 'function';
      const isKeyboardFocus =
        !pointerFocusRef.current && (!supportsMatches || element.matches(':focus-visible'));

      pointerFocusRef.current = false;

      if (isKeyboardFocus) {
        setHeaderFocused(true);
      }
    },
    [showActions],
  );

  /**
   * Hides the action tray when focus leaves the header entirely.
   */
  const handleHeaderBlur = React.useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      const nextFocus = event.relatedTarget as Node | null;
      if (actionContainerRef.current && nextFocus && actionContainerRef.current.contains(nextFocus)) {
        return;
      }

      setHeaderFocused(false);
      pointerFocusRef.current = false;
    },
    [],
  );

  /**
   * Marks the upcoming focus event as pointer-driven so hover controls are not revealed.
   */
  const handleHeaderPointerDown = React.useCallback(() => {
    pointerFocusRef.current = true;
  }, []);

  /**
   * Clears pointer-driven focus tracking when the pointer interaction finishes.
   */
  const handleHeaderPointerUp = React.useCallback(() => {
    pointerFocusRef.current = false;
  }, []);

  /**
   * Toggles the category expansion state when clicking anywhere on the header that is not
   * reserved for rename/delete actions. Editing mode blocks toggling to avoid cancelling input.
   */
  const handleHeaderClick = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (isEditing) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (actionContainerRef.current && target && actionContainerRef.current.contains(target)) {
        return;
      }

      onToggleCollapse();
    },
    [isEditing, onToggleCollapse],
  );

  /**
   * Prevents the collapse chevron click from bubbling back to the header container.
   */
  const handleCollapseToggleClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      onToggleCollapse();
    },
    [onToggleCollapse],
  );

  /**
   * Maintains visibility of actions while the pointer rests on the tray.
   */
  const handleActionMouseEnter = React.useCallback(() => {
    if (showActions) {
      setPointerInActionZone(true);
    }
  }, [showActions]);

  /**
   * Conceals the tray when pointer leaves the actions container.
   */
  const handleActionMouseLeave = React.useCallback(() => {
    setPointerInActionZone(false);
  }, []);

  /**
   * Shows actions when a control inside the tray receives focus.
   */
  const handleActionFocusCapture = React.useCallback(() => {
    setActionFocused(true);
    setPointerInActionZone(true);
  }, []);

  /**
   * Clears the action focus state when keyboard focus exits the tray.
   */
  const handleActionBlurCapture = React.useCallback((event: React.FocusEvent<HTMLDivElement>) => {
    const nextFocus = event.relatedTarget as Node | null;
    if (event.currentTarget.contains(nextFocus)) {
      return;
    }

    setActionFocused(false);
    setPointerInActionZone(false);
  }, []);

  return (
    <div className="space-y-1">
      <div
        className={containerClasses}
        draggable={!isEditing}
        onDragStart={event => {
          if (isEditing) {
            event.preventDefault();
            return;
          }
          onDragStart(event);
        }}
        onDragEnd={onDragEnd}
        onKeyDown={onKeyDown}
        onDragOver={onHeaderDragOver}
        onDragLeave={onHeaderDragLeave}
        onDrop={onHeaderDrop}
        onMouseMove={handleHeaderMouseMove}
        onMouseLeave={handleHeaderMouseLeave}
        onFocus={handleHeaderFocus}
        onBlur={handleHeaderBlur}
        onPointerDown={handleHeaderPointerDown}
        onPointerUp={handleHeaderPointerUp}
        onPointerCancel={handleHeaderPointerUp}
        onClick={handleHeaderClick}
        tabIndex={isEditing ? -1 : 0}
        role="button"
        aria-grabbed={isDragging}
        aria-dropeffect={isDropTarget ? 'move' : undefined}
        data-category-id={categoryId}
      >
        <div className="flex flex-1 items-center gap-2 overflow-hidden">
          <div
            ref={actionContainerRef}
            className={`flex flex-shrink-0 items-center gap-1 overflow-hidden transition-[width,opacity] duration-200 ease-out ${
              shouldRevealActions ? 'w-[3.5rem] opacity-100' : 'w-0 opacity-0'
            }`}
            data-testid={`category-actions-${categoryId}`}
            aria-hidden={!shouldRevealActions}
            onMouseEnter={handleActionMouseEnter}
            onMouseLeave={handleActionMouseLeave}
            onFocusCapture={handleActionFocusCapture}
            onBlurCapture={handleActionBlurCapture}
          >
            {showActions ? (
              <>
                <button
                  type="button"
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={onBeginRename}
                  aria-label={labels.renameCategory}
                >
                  <HandymanIcon fontSize="small" />
                </button>
                <button
                  type="button"
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={onDelete}
                  aria-label={labels.deleteCategory}
                >
                  <HighlightOffIcon fontSize="small" />
                </button>
              </>
            ) : null}
          </div>
          {isEditing ? (
            <>
              <label className="sr-only" htmlFor={`rename-${categoryId}`}>
                {labels.renameCategory}
              </label>
              <input
                id={`rename-${categoryId}`}
                className="min-w-0 flex-1 rounded-md border border-border-color bg-surface px-2 py-1 text-[0.65rem] uppercase tracking-widest text-text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={editingValue}
                onChange={event => onRenameChange(categoryId, event.target.value)}
                onKeyDown={onRenameKeyDown}
                onBlur={onRenameBlur}
                onFocus={event => event.currentTarget.select()}
                aria-invalid={editingError ? true : undefined}
                aria-describedby={errorId}
                autoFocus
              />
            </>
          ) : (
            <span className="truncate">{name}</span>
          )}
        </div>
        <button
          type="button"
          className="ml-2 text-xs text-text-secondary"
          onClick={handleCollapseToggleClick}
          aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${name}`}
        >
          {isCollapsed ? '▸' : '▾'}
        </button>
      </div>
      {editingError ? (
        <p id={errorId} className="px-2 text-xs text-red-500">
          {editingError}
        </p>
      ) : null}
    </div>
  );
};
