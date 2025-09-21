/**
 * @fileoverview React hook responsible for orchestrating sidebar organization state and persistence.
 * The hook reads from and writes to `localStorage` and therefore has no reliance on remote services or custom timeouts.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { DEFAULT_LABELS, SIDEBAR_ORGANIZATION_STORAGE_KEY, buildDefaultSidebarState } from './constants';
import { sidebarOrganizationReducer } from './reducer';
import type {
  SidebarFeature,
  SidebarOrganizerLabels,
  SidebarOrganizationAction,
  SidebarOrganizationState,
} from './types';

/**
 * Normalizes category ordering while preserving insertion order for existing items.
 */
const normalizeCategories = (categories: SidebarOrganizationState['categories']) =>
  categories
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((category, index) => ({ ...category, order: index }));

/**
 * Normalizes feature ordering per category.
 */
const normalizeFeatures = (features: SidebarFeature[]): SidebarFeature[] => {
  const buckets = new Map<string | null, SidebarFeature[]>();
  for (const feature of features) {
    const key = feature.categoryId ?? null;
    const bucket = buckets.get(key) ?? [];
    bucket.push(feature);
    buckets.set(key, bucket);
  }

  const ordered: SidebarFeature[] = [];
  buckets.forEach((bucket, categoryId) => {
    bucket
      .slice()
      .sort((a, b) => a.order - b.order)
      .forEach((feature, index) => {
        ordered.push({ ...feature, categoryId, order: index });
      });
  });
  return ordered;
};

/**
 * Safely reads an existing snapshot from localStorage.
 */
const readStoredState = (): SidebarOrganizationState | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  const raw = window.localStorage.getItem(SIDEBAR_ORGANIZATION_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as SidebarOrganizationState;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn('Failed to parse stored sidebar organization state.', error);
    return null;
  }
};

/**
 * Builds a resilient initial state by merging stored data with defaults.
 */
const buildInitialState = (): SidebarOrganizationState => {
  const defaults = buildDefaultSidebarState();
  const stored = readStoredState();
  if (!stored) {
    return defaults;
  }

  const storedCategories = Array.isArray(stored.categories) ? stored.categories : [];
  const storedFeatures = Array.isArray(stored.features) ? stored.features : [];

  const mergedCategories = normalizeCategories([
    ...storedCategories,
    ...defaults.categories.filter(category =>
      storedCategories.every(existing => existing.id !== category.id),
    ),
  ]);
  const validCategoryIds = new Set(mergedCategories.map(category => category.id));

  const mergedFeatures = normalizeFeatures([
    ...storedFeatures.map(feature =>
      feature.categoryId && !validCategoryIds.has(feature.categoryId)
        ? { ...feature, categoryId: null }
        : feature,
    ),
    ...defaults.features.filter(feature => storedFeatures.every(item => item.id !== feature.id)),
  ]);

  return {
    categories: mergedCategories,
    features: mergedFeatures,
    collapsedCategoryIds: stored.collapsedCategoryIds?.filter(id => validCategoryIds.has(id)) ?? [],
    lastUpdated: stored.lastUpdated ?? new Date().toISOString(),
  };
};

/**
 * Persists state to localStorage.
 */
const persistState = (state: SidebarOrganizationState): void => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(SIDEBAR_ORGANIZATION_STORAGE_KEY, JSON.stringify(state));
};

/**
 * Hook return signature describing state and helper utilities.
 */
export interface SidebarOrganizationHook {
  /** Current sidebar organization snapshot. */
  state: SidebarOrganizationState;
  /** Dispatches an action to mutate the state. */
  dispatch: (action: SidebarOrganizationAction) => void;
  /** Optional localized labels. */
  labels: SidebarOrganizerLabels;
  /** Error message shown when persistence fails. */
  persistenceError: string | null;
  /** Retries persisting the current state. */
  retryPersistence: () => void;
}

/**
 * React hook that centralizes sidebar organization state, persistence, and localization.
 */
export const useSidebarOrganizationState = (
  labels: Partial<SidebarOrganizerLabels> | undefined = undefined,
): SidebarOrganizationHook => {
  const mergedLabels = useMemo(() => ({ ...DEFAULT_LABELS, ...labels }), [labels]);
  const [state, setState] = useState<SidebarOrganizationState>(() => buildInitialState());
  const stateRef = useRef(state);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);

  stateRef.current = state;

  const dispatch = useCallback(
    (action: SidebarOrganizationAction) => {
      setState(prev => {
        const next = sidebarOrganizationReducer(prev, action);
        try {
          persistState(next);
          setPersistenceError(null);
          return next;
        } catch (error) {
          console.error('Unable to persist sidebar organization state.', error);
          setPersistenceError(mergedLabels.persistenceError);
          return prev;
        }
      });
    },
    [mergedLabels.persistenceError],
  );

  const retryPersistence = useCallback(() => {
    try {
      persistState(stateRef.current);
      setPersistenceError(null);
    } catch (error) {
      console.error('Retrying sidebar organization persistence failed.', error);
      setPersistenceError(mergedLabels.persistenceError);
    }
  }, [mergedLabels.persistenceError]);

  return {
    state,
    dispatch,
    labels: mergedLabels,
    persistenceError,
    retryPersistence,
  };
};
