/**
 * @fileoverview Shared drag-and-drop type definitions for the sidebar organizer module.
 */

export type DraggingItem =
  | { type: 'feature'; id: string; viaKeyboard: boolean }
  | { type: 'category'; id: string; viaKeyboard: boolean };

export type FeatureDropTarget = { categoryId: string | null; index: number } | null;

export type CategoryDropTarget = { targetIndex: number } | null;
