/**
 * @fileoverview Hook that builds memoized layout buckets combining categories and their feature lists.
 * The hook operates purely on in-memory collections and requires no timeout configuration.
 */

import { useMemo } from 'react';
import type { SidebarFeature } from './types';
import type { SidebarOrganizationState } from './types';

/**
 * Describes the shape of a rendered category bucket.
 */
export interface LayoutBucket {
  /** Null for the uncategorized bucket, otherwise the category id. */
  categoryId: string | null;
  /** Optional visible title. */
  title: string | null;
  /** Feature entries assigned to the bucket. */
  features: SidebarFeature[];
  /** Whether the bucket is currently collapsed. */
  isCollapsible: boolean;
}

/**
 * Memoizes a union of uncategorized and categorized feature buckets for rendering convenience.
 */
export const useLayoutBuckets = (
  features: SidebarFeature[],
  categories: SidebarOrganizationState['categories'],
  collapsedCategoryIds: string[],
): LayoutBucket[] =>
  useMemo(() => {
    const categoryLookup = new Map(categories.map(category => [category.id, category]));
    const buckets = new Map<string | null, SidebarFeature[]>();
    const sortedFeatures = features.slice().sort((a, b) => a.order - b.order);
    for (const feature of sortedFeatures) {
      const key = feature.categoryId ?? null;
      const group = buckets.get(key) ?? [];
      group.push(feature);
      buckets.set(key, group);
    }

    const orderedCategories = categories.slice().sort((a, b) => a.order - b.order);
    const layout: LayoutBucket[] = [
      {
        categoryId: null,
        title: null,
        features: buckets.get(null) ?? [],
        isCollapsible: false,
      },
    ];

    orderedCategories.forEach(category => {
      layout.push({
        categoryId: category.id,
        title: categoryLookup.get(category.id)?.name ?? category.name,
        features: buckets.get(category.id) ?? [],
        isCollapsible: collapsedCategoryIds.includes(category.id),
      });
    });

    return layout;
  }, [categories, collapsedCategoryIds, features]);
