/**
 * @fileoverview Category header component exposing rename and delete controls.
 */

import React from 'react';
import HandymanIcon from '@mui/icons-material/Handyman';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import type { SidebarOrganizerLabels } from './types';

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
  const showActions = !isEditing;
  const errorId = editingError ? `rename-${categoryId}-error` : undefined;
  const isDropTarget = isCategoryDropTarget || isFeatureDropTarget;
  const containerClasses = [
    'group mb-2 flex items-center justify-between rounded-md px-2 py-1 text-[0.65rem] uppercase tracking-widest text-text-secondary/70 transition-colors',
    isDropTarget ? 'bg-primary/10 ring-2 ring-primary/60' : '',
  ]
    .filter(Boolean)
    .join(' ');

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
        tabIndex={isEditing ? -1 : 0}
        role="button"
        aria-grabbed={isDragging}
        aria-dropeffect={isDropTarget ? 'move' : undefined}
        data-category-id={categoryId}
      >
        <div className="flex flex-1 items-center gap-2 overflow-hidden">
          <div
            className={`flex flex-shrink-0 items-center gap-1 overflow-hidden transition-[width,opacity] duration-200 ease-out ${
              showActions
                ? 'w-0 opacity-0 group-hover:w-[3.5rem] group-hover:opacity-100 group-focus-within:w-[3.5rem] group-focus-within:opacity-100'
                : 'w-0 opacity-0'
            }`}
            aria-hidden={!showActions}
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
          onClick={onToggleCollapse}
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
