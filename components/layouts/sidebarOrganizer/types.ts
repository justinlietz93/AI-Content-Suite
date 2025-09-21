/**
 * @fileoverview Defines strongly typed contracts used by the sidebar organization module.
 * The module manages drag-and-drop organization of feature categories while remaining UI-framework agnostic.
 * It uses browser `localStorage` for persistence and does not perform network requests, so no timeout strategy is required.
 */

import type { ElementType } from 'react';
import type { Mode } from '../../../types';

/**
 * Describes a sidebar category that groups related feature shortcuts.
 */
export interface SidebarCategory {
  /** Unique identifier for the category. */
  id: string;
  /** Visible category label displayed to the user. */
  name: string;
  /**
   * Order index used for deterministic rendering. Lower values render higher in the list.
   * Values are persisted so categories maintain their position across sessions.
   */
  order: number;
}

/**
 * Represents a single feature entry within the sidebar.
 */
export interface SidebarFeature {
  /** Identifier that also maps to the workspace mode. */
  id: string;
  /** Workspace mode associated with this feature. */
  mode: Mode;
  /** Localized label rendered next to the feature icon. */
  name: string;
  /** Category identifier or null when the feature is uncategorized. */
  categoryId: string | null;
  /**
   * Order value used to position the feature within its category.
   * Ordering is relative per category.
   */
  order: number;
}

/**
 * Captures persisted sidebar organization state.
 */
export interface SidebarOrganizationState {
  /** Ordered categories excluding the implicit uncategorized bucket. */
  categories: SidebarCategory[];
  /** All feature entries regardless of assignment. */
  features: SidebarFeature[];
  /**
   * Categories that are currently collapsed. Collapsed state is persisted and scoped per category id.
   */
  collapsedCategoryIds: string[];
  /** ISO timestamp for the last successful state mutation. */
  lastUpdated: string;
}

/**
 * Enumerates supported reducer actions. Consumers typically create them through helper functions.
 */
export type SidebarOrganizationAction =
  | { type: 'ADD_CATEGORY'; payload: { id: string; name: string } }
  | { type: 'MERGE_CATEGORIES'; payload: { sourceId: string; targetId: string } }
  | { type: 'RENAME_CATEGORY'; payload: { id: string; name: string } }
  | { type: 'DELETE_CATEGORY'; payload: { id: string } }
  | { type: 'MOVE_CATEGORY'; payload: { id: string; targetIndex: number } }
  | {
      type: 'MOVE_FEATURE';
      payload: {
        featureId: string;
        targetCategoryId: string | null;
        targetIndex: number;
      };
    }
  | { type: 'TOGGLE_CATEGORY'; payload: { id: string } }
  | { type: 'HYDRATE'; payload: SidebarOrganizationState };

/**
 * Maps workspace modes to React components responsible for rendering their icons.
 */
export type ModeIconMap = Record<Mode, ElementType>;

/**
 * Localizable text snippets used throughout the organizer UI.
 */
export interface SidebarOrganizerLabels {
  /** Label for the add-category text input. */
  addCategoryLabel: string;
  /** Text for the add-category button. */
  addCategoryButton: string;
  /** Accessible label for the rename control. */
  renameCategory: string;
  /** Accessible label for the delete control. */
  deleteCategory: string;
  /** Inline validation message for blank category names. */
  emptyCategoryError: string;
  /** Default name applied when creating a new category before it is renamed. */
  newCategoryDefaultName: string;
  /** Message shown when persistence fails. */
  persistenceError: string;
  /** Button label that retries persistence. */
  retryPersistence: string;
  /** Announcement when a feature drag starts. */
  featureGrabAnnouncement: string;
  /** Announcement when a category drag starts. */
  categoryGrabAnnouncement: string;
  /** Announcement template when dropping onto a category. */
  dropOnCategoryAnnouncement: string;
  /** Announcement template when dropping between features. */
  dropBetweenFeaturesAnnouncement: string;
  /** Announcement when moving to uncategorized. */
  uncategorizedAnnouncement: string;
}

/**
 * Signature for broadcasting updates to an aria-live region.
 */
export type AnnounceFn = (message: string) => void;
