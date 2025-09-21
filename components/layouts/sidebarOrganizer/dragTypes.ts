/**
 * @fileoverview Shared drag-and-drop type definitions for the sidebar organizer module.
 */

export type DraggingItem =
  | { type: 'feature'; id: string; viaKeyboard: boolean }
  | { type: 'category'; id: string; viaKeyboard: boolean };

export type FeatureDropContext = 'before-item' | 'after-item' | 'zone' | 'header';

export type FeatureDropTarget =
  | { categoryId: string | null; index: number; context?: FeatureDropContext }
  | null;

export type CategoryDropPosition = 'before' | 'after';

export type CategoryDropTarget =
  | { targetIndex: number; position: CategoryDropPosition; hoveredCategoryId: string | null }
  | null;
