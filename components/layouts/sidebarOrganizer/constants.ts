/**
 * @fileoverview Houses constants and helper data structures used by the sidebar organization module.
 * The module depends solely on browser storage APIs; it does not invoke external services.
 */

import type { Mode } from '../../../types';
import { TABS } from '../../../constants/uiConstants';
import type {
  SidebarCategory,
  SidebarFeature,
  SidebarOrganizerLabels,
  SidebarOrganizationState,
} from './types';

/**
 * Storage key for persisting sidebar organization metadata.
 */
export const SIDEBAR_ORGANIZATION_STORAGE_KEY = 'ai_content_suite_sidebar_organization_v1';

/**
 * Blueprint of initial categories reflecting the legacy static sidebar layout.
 */
export const DEFAULT_CATEGORIES: SidebarCategory[] = [
  { id: 'workspace', name: 'Workspace', order: 0 },
  { id: 'orchestration', name: 'Orchestration', order: 1 },
  { id: 'interactive', name: 'Interactive', order: 2 },
];

/**
 * Default uncategorized order baseline. Values lower than this float to the top of the uncategorized list.
 */
const UNCATEGORIZED_BASE_ORDER = -1_000_000;

/**
 * Generates deterministic default feature entries derived from the global tab registry.
 */
export const buildDefaultFeatures = (): SidebarFeature[] =>
  TABS.map((tab, index): SidebarFeature => ({
    id: tab.id,
    mode: tab.id as Mode,
    name: tab.label,
    categoryId:
      index <= 5
        ? 'workspace'
        : index <= 8
          ? 'orchestration'
          : index === 9
            ? 'interactive'
            : null,
    order: index,
  }));

/**
 * Default persisted state used when no prior user customization exists.
 */
export const buildDefaultSidebarState = (): SidebarOrganizationState => ({
  categories: DEFAULT_CATEGORIES.map(category => ({ ...category })),
  features: buildDefaultFeatures(),
  collapsedCategoryIds: [],
  lastUpdated: new Date().toISOString(),
});

/**
 * Localizable strings surfaced throughout the organizer. Consumers may override individual entries.
 */
export const DEFAULT_LABELS: SidebarOrganizerLabels = {
  addCategoryLabel: 'Add a new category',
  addCategoryButton: 'Add category',
  renameCategory: 'Rename category',
  deleteCategory: 'Delete category',
  emptyCategoryError: 'Category name cannot be empty.',
  newCategoryDefaultName: 'New category',
  persistenceError: 'We were unable to save your sidebar changes. Your previous layout has been restored.',
  retryPersistence: 'Retry save',
  featureGrabAnnouncement: 'Started moving feature.',
  categoryGrabAnnouncement: 'Started moving category.',
  dropOnCategoryAnnouncement: 'Moved into category {categoryName}.',
  dropBetweenFeaturesAnnouncement: 'Placed before {featureName}.',
  uncategorizedAnnouncement: 'Moved to the uncategorized area.',
  collapsedCategoryHandleLabel: 'Move category {categoryName}',
};

/**
 * Produces a deterministic identifier for newly created categories.
 */
export const createCategoryId = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `category-${Math.random().toString(36).slice(2, 10)}`;

/**
 * Calculates an order index that ensures uncategorized items surface at the top after a merge.
 */
export const computeUncategorizedInsertionOrder = (currentMin: number, offset: number): number =>
  UNCATEGORIZED_BASE_ORDER + currentMin - offset;
