/**
 * @fileoverview Hook encapsulating all interactive handlers for the sidebar organizer component.
 * The hook manages local UI state such as rename fields, drag indicators, and persistence events.
 */

import { useCallback, useState } from 'react';
import type { DragEvent, KeyboardEvent, Dispatch, SetStateAction } from 'react';
import type { SidebarOrganizerLabels, SidebarOrganizationState } from './types';
import type { SidebarOrganizationAction } from './types';
import type { LayoutBucket } from './useLayoutBuckets';
import {
  addCategory,
  deleteCategory,
  mergeCategories,
  moveCategory,
  moveFeature,
  renameCategory,
} from './actions';
import { createCategoryId } from './constants';
import type { DraggingItem, FeatureDropTarget, CategoryDropTarget } from './dragTypes';

const DRAG_DATA_MIME = 'application/x-sidebar-item';

interface UseSidebarOrganizerActionsParams {
  state: SidebarOrganizationState;
  dispatch: Dispatch<SidebarOrganizationAction>;
  layoutBuckets: LayoutBucket[];
  labels: SidebarOrganizerLabels;
  announce: (message: string) => void;
}

interface UseSidebarOrganizerActionsResult {
  editingCategoryId: string | null;
  editingName: string;
  editingError: string | null;
  /** True when a newly created category is awaiting a confirmed name. */
  isCreatingCategory: boolean;
  draggingItem: DraggingItem | null;
  featureDropTarget: FeatureDropTarget;
  categoryDropTarget: CategoryDropTarget;
  handleAddCategory: () => void;
  beginRename: (categoryId: string, currentName: string) => void;
  commitRename: () => void;
  cancelRename: () => void;
  handleRenameKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  handleRenameChange: (categoryId: string, value: string) => void;
  handleDeleteCategory: (categoryId: string) => void;
  handleFeatureKeyDown: (event: KeyboardEvent<HTMLButtonElement>, featureId: string) => void;
  handleCategoryKeyDown: (event: KeyboardEvent<HTMLDivElement>, categoryId: string) => void;
  handleFeatureDragStart: (event: DragEvent<HTMLButtonElement>, featureId: string) => void;
  handleCategoryDragStart: (event: DragEvent<HTMLDivElement>, categoryId: string) => void;
  dropFeature: (featureId: string, categoryId: string | null, index: number) => void;
  parseDragData: (event: DragEvent) => DraggingItem | null;
  resetDragState: () => void;
  setFeatureDropTarget: Dispatch<SetStateAction<FeatureDropTarget>>;
  setCategoryDropTarget: Dispatch<SetStateAction<CategoryDropTarget>>;
}

/**
 * Provides all stateful handlers required by the sidebar organizer component.
 */
export const useSidebarOrganizerActions = ({
  state,
  dispatch,
  layoutBuckets,
  labels,
  announce,
}: UseSidebarOrganizerActionsParams): UseSidebarOrganizerActionsResult => {
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingError, setEditingError] = useState<string | null>(null);
  const [pendingCategoryId, setPendingCategoryId] = useState<string | null>(null);
  const [draggingItem, setDraggingItem] = useState<DraggingItem | null>(null);
  const [featureDropTarget, setFeatureDropTarget] = useState<FeatureDropTarget>(null);
  const [categoryDropTarget, setCategoryDropTarget] = useState<CategoryDropTarget>(null);

  /**
   * Clears drag state for both features and categories.
   */
  const resetDragState = useCallback(() => {
    setDraggingItem(null);
    setFeatureDropTarget(null);
    setCategoryDropTarget(null);
  }, []);

  /**
   * Clears rename state and optionally removes a newly created category that was never finalized.
   */
  const resetEditingState = useCallback(
    (discardNewCategory: boolean) => {
      const pendingId = pendingCategoryId;
      const currentEditingId = editingCategoryId;
      setEditingCategoryId(null);
      setEditingName('');
      setEditingError(null);
      setPendingCategoryId(null);
      if (discardNewCategory && pendingId && currentEditingId === pendingId) {
        dispatch(deleteCategory(pendingId));
      }
    },
    [dispatch, editingCategoryId, pendingCategoryId],
  );

  /**
   * Enters rename mode for a chosen category.
   */
  const beginRename = useCallback((categoryId: string, currentName: string) => {
    setEditingCategoryId(categoryId);
    setEditingName(currentName);
    setEditingError(null);
  }, []);

  /**
   * Creates a new category entry and immediately opens rename mode so the user can supply a label.
   */
  const handleAddCategory = useCallback(() => {
    if (editingCategoryId !== null || pendingCategoryId !== null) {
      return;
    }
    const newId = createCategoryId();
    const defaultName = labels.newCategoryDefaultName;
    dispatch(addCategory(newId, defaultName));
    setPendingCategoryId(newId);
    beginRename(newId, defaultName);
  }, [beginRename, dispatch, editingCategoryId, labels.newCategoryDefaultName, pendingCategoryId]);

  /**
   * Cancels rename mode without persisting modifications.
   */
  const cancelRename = useCallback(() => {
    resetEditingState(true);
  }, [resetEditingState]);

  /**
   * Commits rename changes, merging with an existing category when names collide.
   */
  const commitRename = useCallback(() => {
    if (!editingCategoryId) {
      return;
    }
    const trimmed = editingName.trim();
    if (!trimmed) {
      setEditingError(labels.emptyCategoryError);
      return;
    }
    const duplicate = state.categories.find(
      category => category.name.toLowerCase() === trimmed.toLowerCase() && category.id !== editingCategoryId,
    );
    if (duplicate) {
      dispatch(mergeCategories(editingCategoryId, duplicate.id));
      announce(labels.dropOnCategoryAnnouncement.replace('{categoryName}', duplicate.name));
    } else {
      dispatch(renameCategory(editingCategoryId, trimmed));
      announce(labels.dropOnCategoryAnnouncement.replace('{categoryName}', trimmed));
    }
    resetEditingState(false);
  }, [
    announce,
    dispatch,
    editingCategoryId,
    editingName,
    labels.dropOnCategoryAnnouncement,
    labels.emptyCategoryError,
    resetEditingState,
    state.categories,
  ]);

  /**
   * Handles key interactions within the rename input.
   */
  const handleRenameKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        commitRename();
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        cancelRename();
      }
    },
    [cancelRename, commitRename],
  );

  /**
   * Updates the inline rename input for the provided category and clears validation state.
   *
   * @param categoryId - Identifier for the category whose name is being edited.
   * @param value - Latest text entered by the user.
   */
  const handleRenameChange = useCallback(
    (categoryId: string, value: string) => {
      if (editingCategoryId !== categoryId) {
        setEditingCategoryId(categoryId);
      }
      setEditingName(value);
      setEditingError(null);
    },
    [editingCategoryId],
  );

  /**
   * Removes a category and reassigns its features to the uncategorized bucket.
   */
  const handleDeleteCategory = useCallback(
    (categoryId: string) => {
      if (editingCategoryId === categoryId) {
        resetEditingState(false);
      } else {
        setPendingCategoryId(prev => (prev === categoryId ? null : prev));
      }
      dispatch(deleteCategory(categoryId));
      announce(labels.uncategorizedAnnouncement);
    },
    [announce, dispatch, editingCategoryId, labels.uncategorizedAnnouncement, resetEditingState],
  );

  /**
   * Internal helper for keyboard-based feature reordering.
   */
  const moveFeatureByOffset = useCallback(
    (featureId: string, direction: -1 | 1) => {
      const bucketIndex = layoutBuckets.findIndex(bucket =>
        bucket.features.some(feature => feature.id === featureId),
      );
      if (bucketIndex === -1) {
        return;
      }
      const bucket = layoutBuckets[bucketIndex];
      const featureIndex = bucket.features.findIndex(feature => feature.id === featureId);
      if (featureIndex === -1) {
        return;
      }

      const repositionWithinBucket = (index: number, neighbour?: { name: string }) => {
        dispatch(moveFeature(featureId, bucket.categoryId, index));
        if (neighbour) {
          announce(labels.dropBetweenFeaturesAnnouncement.replace('{featureName}', neighbour.name));
        }
      };

      if (direction === -1) {
        if (featureIndex > 0) {
          repositionWithinBucket(featureIndex - 1, bucket.features[featureIndex - 1]);
          return;
        }
        if (bucketIndex > 0) {
          const previousBucket = layoutBuckets[bucketIndex - 1];
          dispatch(moveFeature(featureId, previousBucket.categoryId, previousBucket.features.length));
          if (previousBucket.categoryId === null) {
            announce(labels.uncategorizedAnnouncement);
          } else if (previousBucket.features.length > 0) {
            const anchor = previousBucket.features[previousBucket.features.length - 1];
            announce(labels.dropBetweenFeaturesAnnouncement.replace('{featureName}', anchor.name));
          } else if (previousBucket.title) {
            announce(labels.dropOnCategoryAnnouncement.replace('{categoryName}', previousBucket.title));
          }
        }
        return;
      }

      if (featureIndex < bucket.features.length - 1) {
        repositionWithinBucket(featureIndex + 1, bucket.features[featureIndex + 1]);
        return;
      }
      if (bucketIndex < layoutBuckets.length - 1) {
        const nextBucket = layoutBuckets[bucketIndex + 1];
        dispatch(moveFeature(featureId, nextBucket.categoryId, 0));
        if (nextBucket.categoryId === null) {
          announce(labels.uncategorizedAnnouncement);
        } else if (nextBucket.title) {
          announce(labels.dropOnCategoryAnnouncement.replace('{categoryName}', nextBucket.title));
        }
      }
    },
    [announce, dispatch, labels.dropBetweenFeaturesAnnouncement, labels.dropOnCategoryAnnouncement, labels.uncategorizedAnnouncement, layoutBuckets],
  );

  /**
   * Handles keyboard-driven drag toggling for feature items.
   */
  const handleFeatureKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, featureId: string) => {
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        const isDragging = draggingItem?.type === 'feature' && draggingItem.id === featureId;
        setDraggingItem(isDragging ? null : { type: 'feature', id: featureId, viaKeyboard: true });
        announce(labels.featureGrabAnnouncement);
        return;
      }
      if ((event.key === 'ArrowUp' || event.key === 'ArrowDown') && draggingItem?.type === 'feature') {
        event.preventDefault();
        moveFeatureByOffset(featureId, event.key === 'ArrowUp' ? -1 : 1);
      }
      if (event.key === 'Escape') {
        resetDragState();
      }
    },
    [announce, draggingItem, labels.featureGrabAnnouncement, moveFeatureByOffset, resetDragState],
  );

  /**
   * Keyboard helper for category reordering.
   */
  const moveCategoryByOffset = useCallback(
    (categoryId: string, direction: -1 | 1) => {
      const ordered = state.categories.slice().sort((a, b) => a.order - b.order);
      const index = ordered.findIndex(category => category.id === categoryId);
      if (index === -1) {
        return;
      }
      const nextIndex = Math.max(0, Math.min(index + direction, ordered.length - 1));
      dispatch(moveCategory(categoryId, nextIndex));
      const neighbour = ordered[nextIndex];
      if (neighbour) {
        announce(labels.dropOnCategoryAnnouncement.replace('{categoryName}', neighbour.name));
      }
    },
    [announce, dispatch, labels.dropOnCategoryAnnouncement, state.categories],
  );

  /**
   * Handles keyboard events on category headers for drag toggling.
   */
  const handleCategoryKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>, categoryId: string) => {
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        const isDragging = draggingItem?.type === 'category' && draggingItem.id === categoryId;
        setDraggingItem(isDragging ? null : { type: 'category', id: categoryId, viaKeyboard: true });
        announce(labels.categoryGrabAnnouncement);
        return;
      }
      if ((event.key === 'ArrowUp' || event.key === 'ArrowDown') && draggingItem?.type === 'category') {
        event.preventDefault();
        moveCategoryByOffset(categoryId, event.key === 'ArrowUp' ? -1 : 1);
      }
      if (event.key === 'Escape') {
        resetDragState();
      }
    },
    [announce, draggingItem, labels.categoryGrabAnnouncement, moveCategoryByOffset, resetDragState],
  );

  /**
   * Dispatches feature moves and announces drop outcomes.
   */
  const dropFeature = useCallback(
    (featureId: string, categoryId: string | null, index: number) => {
      dispatch(moveFeature(featureId, categoryId, index));
      if (categoryId === null) {
        announce(labels.uncategorizedAnnouncement);
      } else {
        const category = state.categories.find(item => item.id === categoryId);
        if (category) {
          announce(labels.dropOnCategoryAnnouncement.replace('{categoryName}', category.name));
        }
      }
      resetDragState();
    },
    [announce, dispatch, labels.dropOnCategoryAnnouncement, labels.uncategorizedAnnouncement, resetDragState, state.categories],
  );

  /**
   * Safely parses drag payload metadata.
   */
  const parseDragData = useCallback((event: DragEvent) => {
    try {
      const data = event.dataTransfer?.getData(DRAG_DATA_MIME);
      if (!data) {
        return null;
      }
      return JSON.parse(data) as DraggingItem;
    } catch {
      return null;
    }
  }, []);

  /**
   * Configures drag payloads for feature items.
   */
  const handleFeatureDragStart = useCallback(
    (event: DragEvent<HTMLButtonElement>, featureId: string) => {
      event.dataTransfer?.setData(
        DRAG_DATA_MIME,
        JSON.stringify({ type: 'feature', id: featureId }),
      );
      event.dataTransfer?.setDragImage(event.currentTarget, 0, 0);
      event.dataTransfer.effectAllowed = 'move';
      setDraggingItem({ type: 'feature', id: featureId, viaKeyboard: false });
      announce(labels.featureGrabAnnouncement);
    },
    [announce, labels.featureGrabAnnouncement],
  );

  /**
   * Configures drag payloads for category headers.
   */
  const handleCategoryDragStart = useCallback(
    (event: DragEvent<HTMLDivElement>, categoryId: string) => {
      event.dataTransfer?.setData(
        DRAG_DATA_MIME,
        JSON.stringify({ type: 'category', id: categoryId }),
      );
      event.dataTransfer.effectAllowed = 'move';
      setDraggingItem({ type: 'category', id: categoryId, viaKeyboard: false });
      announce(labels.categoryGrabAnnouncement);
    },
    [announce, labels.categoryGrabAnnouncement],
  );

  return {
    editingCategoryId,
    editingName,
    editingError,
    isCreatingCategory: pendingCategoryId !== null,
    draggingItem,
    featureDropTarget,
    categoryDropTarget,
    handleAddCategory,
    beginRename,
    commitRename,
    cancelRename,
    handleRenameKeyDown,
    handleRenameChange,
    handleDeleteCategory,
    handleFeatureKeyDown,
    handleCategoryKeyDown,
    handleFeatureDragStart,
    handleCategoryDragStart,
    dropFeature,
    parseDragData,
    resetDragState,
    setFeatureDropTarget,
    setCategoryDropTarget,
  };
};
