/**
 * @fileoverview Action creators for the sidebar organization reducer.
 * Each action is a pure object describing a state transition and therefore carries no timeout or retry logic.
 */

import type { SidebarOrganizationAction, SidebarOrganizationState } from './types';

/**
 * Creates an action that appends a new category.
 */
export const addCategory = (id: string, name: string): SidebarOrganizationAction => ({
  type: 'ADD_CATEGORY',
  payload: { id, name },
});

/**
 * Produces an action that merges two categories. All features from the source flow into the target.
 */
export const mergeCategories = (sourceId: string, targetId: string): SidebarOrganizationAction => ({
  type: 'MERGE_CATEGORIES',
  payload: { sourceId, targetId },
});

/**
 * Generates an action for renaming a category.
 */
export const renameCategory = (id: string, name: string): SidebarOrganizationAction => ({
  type: 'RENAME_CATEGORY',
  payload: { id, name },
});

/**
 * Constructs an action that removes a category without deleting its features.
 */
export const deleteCategory = (id: string): SidebarOrganizationAction => ({
  type: 'DELETE_CATEGORY',
  payload: { id },
});

/**
 * Reorders a category relative to its siblings.
 */
export const moveCategory = (id: string, targetIndex: number): SidebarOrganizationAction => ({
  type: 'MOVE_CATEGORY',
  payload: { id, targetIndex },
});

/**
 * Moves a feature into a new category or reorders it within the same category.
 */
export const moveFeature = (
  featureId: string,
  targetCategoryId: string | null,
  targetIndex: number,
): SidebarOrganizationAction => ({
  type: 'MOVE_FEATURE',
  payload: { featureId, targetCategoryId, targetIndex },
});

/**
 * Toggles the collapsed state for a category panel.
 */
export const toggleCategory = (id: string): SidebarOrganizationAction => ({
  type: 'TOGGLE_CATEGORY',
  payload: { id },
});

/**
 * Hydrates the state tree with an externally loaded snapshot.
 */
export const hydrateState = (snapshot: SidebarOrganizationState): SidebarOrganizationAction => ({
  type: 'HYDRATE',
  payload: snapshot,
});
