/**
 * Module Purpose: Shared helper utilities supporting sidebar drag-and-drop regression tests.
 * External Dependencies: Relies on Testing Library's cleanup helper; no CLI or HTTP usage.
 * Fallback Semantics: Not applicable because helpers wrap deterministic DOM interactions only.
 * Timeout Strategy: Not applicable; helper functions execute synchronously without timers.
 */
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

/**
 * Registers shared setup and teardown hooks used by sidebar organizer tests.
 *
 * The hooks clear persisted sidebar ordering before each test and restore
 * Vitest's real timer implementation during teardown to avoid cross-test leaks.
 *
 * @returns Nothing. The helper registers hooks via Vitest's lifecycle APIs.
 */
export const initializeSidebarOrganizerTestSuite = (): void => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });
};

/**
 * Builds a DataTransfer stub suitable for jsdom drag-and-drop simulations.
 *
 * @returns DataTransfer mock compatible with Testing Library drag helpers.
 */
export const createDataTransfer = (): DataTransfer => {
  const payload: Record<string, string> = {};
  return {
    dropEffect: 'move',
    effectAllowed: 'all',
    files: [] as unknown as FileList,
    items: [] as unknown as DataTransferItemList,
    types: [],
    setData: (format: string, value: string) => {
      payload[format] = value;
    },
    getData: (format: string) => payload[format] ?? '',
    clearData: (format?: string) => {
      if (typeof format === 'string') {
        delete payload[format];
        return;
      }
      Object.keys(payload).forEach(key => delete payload[key]);
    },
    setDragImage: () => {},
  } as unknown as DataTransfer;
};

/**
 * Reads the rendered category ordering by inspecting data attributes on the organizer sections.
 *
 * @returns Ordered list of category identifiers excluding the uncategorized bucket.
 */
export const getRenderedCategoryOrder = (): string[] =>
  Array.from(document.querySelectorAll('[data-testid^="category-section-"]'))
    .map(element => element.getAttribute('data-testid')?.replace('category-section-', '') ?? '')
    .filter(id => id && id !== 'uncategorized');

/**
 * Reads the feature ordering for a particular category section.
 *
 * @param categoryId - Category identifier or null for the uncategorized bucket.
 * @returns Ordered list of feature identifiers currently rendered for the category.
 */
export const getRenderedFeatureOrder = (categoryId: string | null): string[] => {
  const sectionId = categoryId ?? 'uncategorized';
  return Array.from(
    document.querySelectorAll(
      `[data-testid="category-section-${sectionId}"] [data-feature-id]`,
    ),
  )
    .map(element => element.getAttribute('data-feature-id') ?? '')
    .filter(Boolean);
};
