/**
 * @fileoverview Category header component exposing rename and delete controls.
 */

import React from 'react';
import type { SidebarOrganizerLabels } from './types';

interface CategoryHeaderProps {
  /** Unique category identifier. */
  categoryId: string;
  /** Display label for the category. */
  name: string;
  /** Whether the sidebar is collapsed. */
  collapsed: boolean;
  /** Indicates that this category is currently dragged. */
  isDragging: boolean;
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
}

/**
 * Renders the category title row along with rename/delete affordances.
 */
export const CategoryHeader: React.FC<CategoryHeaderProps> = ({
  categoryId,
  name,
  collapsed,
  isDragging,
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
}) => (
  <div className="px-2">
    <div
      className={`group mb-2 flex items-center justify-between rounded-md px-2 py-1 text-[0.65rem] uppercase tracking-widest text-text-secondary/70 ${
        collapsed ? 'justify-center' : ''
      }`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onKeyDown={onKeyDown}
      tabIndex={0}
      role="button"
      aria-grabbed={isDragging}
      data-category-id={categoryId}
    >
      <div className={`relative flex flex-1 items-center ${collapsed ? 'justify-center' : ''}`}>
        <span className={collapsed ? 'sr-only' : 'truncate'}>{name}</span>
        <div className="absolute left-0 flex gap-1 -translate-x-full opacity-0 transition-all duration-200 ease-out group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:translate-x-0 group-focus-within:opacity-100">
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={onBeginRename}
            aria-label={labels.renameCategory}
          >
            🔧
          </button>
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={onDelete}
            aria-label={labels.deleteCategory}
          >
            ✕
          </button>
        </div>
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
    {isEditing ? (
      <div className="mb-3">
        <label className="sr-only" htmlFor={`rename-${categoryId}`}>
          {labels.renameCategory}
        </label>
        <input
          id={`rename-${categoryId}`}
          className="w-full rounded-md border border-border-color bg-surface px-2 py-1 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={editingValue}
          onChange={event => onRenameChange(categoryId, event.target.value)}
          onKeyDown={onRenameKeyDown}
          onBlur={onRenameBlur}
          autoFocus
        />
        {editingError ? <p className="mt-1 text-xs text-red-500">{editingError}</p> : null}
      </div>
    ) : null}
  </div>
);
