/**
 * @fileoverview Implements the reducer that orchestrates sidebar organization state transitions.
 * Reducer operations are synchronous and operate entirely in-memory, therefore they do not require timeout handling.
 */

import type {
  SidebarFeature,
  SidebarOrganizationAction,
  SidebarOrganizationState,
} from './types';

/**
 * Ensures order indexes are contiguous and start at zero.
 */
const normalizeOrder = <T extends { order: number }>(items: T[]): T[] =>
  items
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((item, index) => ({ ...item, order: index }));

/**
 * Applies an updated timestamp to the provided state payload.
 */
const withTimestamp = (state: Omit<SidebarOrganizationState, 'lastUpdated'>): SidebarOrganizationState => ({
  ...state,
  lastUpdated: new Date().toISOString(),
});

/**
 * Buckets features by category id for easier manipulation.
 */
const bucketFeatures = (
  features: SidebarFeature[],
): Map<string | null, SidebarFeature[]> => {
  const buckets = new Map<string | null, SidebarFeature[]>();
  const sorted = features.slice().sort((a, b) => a.order - b.order);
  for (const feature of sorted) {
    const key = feature.categoryId ?? null;
    const collection = buckets.get(key) ?? [];
    collection.push({ ...feature });
    buckets.set(key, collection);
  }
  return buckets;
};

/**
 * Flattens buckets back into a feature array while normalizing order indexes per bucket.
 */
const flattenBuckets = (buckets: Map<string | null, SidebarFeature[]>): SidebarFeature[] => {
  const flattened: SidebarFeature[] = [];
  buckets.forEach((bucket, categoryId) => {
    bucket.forEach((feature, index) => {
      flattened.push({ ...feature, categoryId, order: index });
    });
  });
  return flattened;
};

/**
 * Inserts moved features at the start of the uncategorized bucket while preserving their relative order.
 */
const prependToUncategorized = (
  buckets: Map<string | null, SidebarFeature[]>,
  moved: SidebarFeature[],
): void => {
  const uncategorized = buckets.get(null) ?? [];
  const existing = uncategorized.filter(feature => !moved.some(item => item.id === feature.id));
  buckets.set(null, [...moved.map(item => ({ ...item, categoryId: null })), ...existing]);
};

/**
 * Core reducer handling every supported organization action.
 */
export const sidebarOrganizationReducer = (
  state: SidebarOrganizationState,
  action: SidebarOrganizationAction,
): SidebarOrganizationState => {
  switch (action.type) {
    case 'ADD_CATEGORY': {
      const order = state.categories.reduce((max, category) => Math.max(max, category.order), -1) + 1;
      return withTimestamp({
        ...state,
        categories: [...state.categories, { id: action.payload.id, name: action.payload.name, order }],
      });
    }
    case 'MERGE_CATEGORIES': {
      const { sourceId, targetId } = action.payload;
      if (sourceId === targetId) {
        return state;
      }
      const buckets = bucketFeatures(state.features);
      const sourceBucket = buckets.get(sourceId) ?? [];
      if (targetId === null) {
        prependToUncategorized(buckets, sourceBucket);
      } else {
        const targetBucket = buckets.get(targetId) ?? [];
        buckets.set(targetId, [...targetBucket, ...sourceBucket.map(feature => ({ ...feature, categoryId: targetId }))]);
      }
      buckets.delete(sourceId);
      const categories = normalizeOrder(state.categories.filter(category => category.id !== sourceId));
      return withTimestamp({
        ...state,
        categories,
        features: flattenBuckets(buckets),
        collapsedCategoryIds: state.collapsedCategoryIds.filter(id => id !== sourceId),
      });
    }
    case 'RENAME_CATEGORY': {
      const { id, name } = action.payload;
      return withTimestamp({
        ...state,
        categories: state.categories.map(category =>
          category.id === id
            ? {
                ...category,
                name,
              }
            : category,
        ),
      });
    }
    case 'DELETE_CATEGORY': {
      const { id } = action.payload;
      const buckets = bucketFeatures(state.features);
      const moved = buckets.get(id) ?? [];
      prependToUncategorized(buckets, moved);
      buckets.delete(id);
      return withTimestamp({
        ...state,
        categories: normalizeOrder(state.categories.filter(category => category.id !== id)),
        features: flattenBuckets(buckets),
        collapsedCategoryIds: state.collapsedCategoryIds.filter(categoryId => categoryId !== id),
      });
    }
    case 'MOVE_CATEGORY': {
      const { id, targetIndex } = action.payload;
      const sorted = normalizeOrder(state.categories);
      const currentIndex = sorted.findIndex(category => category.id === id);
      if (currentIndex === -1) {
        return state;
      }
      const updated = sorted.slice();
      const [removed] = updated.splice(currentIndex, 1);
      const boundedIndex = Math.max(0, Math.min(targetIndex, updated.length));
      updated.splice(boundedIndex, 0, removed);
      return withTimestamp({
        ...state,
        categories: updated.map((category, index) => ({ ...category, order: index })),
      });
    }
    case 'MOVE_FEATURE': {
      const { featureId, targetCategoryId, targetIndex } = action.payload;
      const buckets = bucketFeatures(state.features);
      const sourceKey = Array.from(buckets.keys()).find(key =>
        (buckets.get(key) ?? []).some(feature => feature.id === featureId),
      );
      if (typeof sourceKey === 'undefined') {
        return state;
      }
      const sourceBucket = buckets.get(sourceKey) ?? [];
      const movingIndex = sourceBucket.findIndex(feature => feature.id === featureId);
      if (movingIndex === -1) {
        return state;
      }
      const [movingFeature] = sourceBucket.splice(movingIndex, 1);
      buckets.set(sourceKey, sourceBucket);

      const destinationKey = targetCategoryId ?? null;
      const destinationBucket = buckets.get(destinationKey) ?? [];
      const boundedIndex = Math.max(0, Math.min(targetIndex, destinationBucket.length));
      destinationBucket.splice(boundedIndex, 0, { ...movingFeature, categoryId: destinationKey });
      buckets.set(destinationKey, destinationBucket);

      return withTimestamp({
        ...state,
        features: flattenBuckets(buckets),
      });
    }
    case 'TOGGLE_CATEGORY': {
      const { id } = action.payload;
      const isCollapsed = state.collapsedCategoryIds.includes(id);
      return withTimestamp({
        ...state,
        collapsedCategoryIds: isCollapsed
          ? state.collapsedCategoryIds.filter(categoryId => categoryId !== id)
          : [...state.collapsedCategoryIds, id],
      });
    }
    case 'HYDRATE': {
      return { ...action.payload };
    }
    default:
      return state;
  }
};
