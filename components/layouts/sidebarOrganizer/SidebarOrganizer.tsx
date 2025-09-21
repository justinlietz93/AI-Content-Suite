/**
 * @fileoverview React component composing the sidebar organizer experience with drag-and-drop, rename, and persistence support.
 * The component relies exclusively on browser APIs and local state; it does not issue network requests and therefore needs no
 * explicit timeout management.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Mode } from '../../../types';
import { TABS } from '../../../constants/uiConstants';
import { DropZone } from './DropZone';
import { CategorySection } from './CategorySection';
import { moveCategory, toggleCategory } from './actions';
import type { ModeIconMap, SidebarOrganizerLabels } from './types';
import { useSidebarOrganizationState } from './useSidebarOrganizationState';
import { useLayoutBuckets } from './useLayoutBuckets';
import { useSidebarOrganizerActions } from './useSidebarOrganizerActions';

interface SidebarOrganizerProps {
  collapsed: boolean;
  activeMode: Mode;
  onSelectMode?: (mode: Mode) => void;
  iconMap: ModeIconMap;
  labels?: Partial<SidebarOrganizerLabels>;
}

/**
 * Derives a quick lookup between mode identifiers and human-readable labels.
 */
const useTabLabelMap = (): Record<Mode, string> =>
  useMemo(
    () =>
      TABS.reduce<Record<Mode, string>>((acc, tab) => {
        acc[tab.id as Mode] = tab.label;
        return acc;
      }, {} as Record<Mode, string>),
    [],
  );

/**
 * Broadcasts messages to an aria-live region for assistive technologies.
 */
const useAnnouncement = (): [React.MutableRefObject<HTMLDivElement | null>, (message: string) => void] => {
  const regionRef = useRef<HTMLDivElement | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (regionRef.current) {
      regionRef.current.textContent = message;
    }
  }, [message]);

  const announce = (text: string) => {
    setMessage(prev => (prev === text ? `${text} ` : text));
  };

  return [regionRef, announce];
};

/**
 * SidebarOrganizer composes category sections, drag logic, and persistence state.
 */
export const SidebarOrganizer: React.FC<SidebarOrganizerProps> = ({
  collapsed,
  activeMode,
  onSelectMode,
  iconMap,
  labels,
}) => {
  const { state, dispatch, labels: mergedLabels, persistenceError, retryPersistence } =
    useSidebarOrganizationState(labels);
  const tabLabels = useTabLabelMap();
  const layoutBuckets = useLayoutBuckets(state.features, state.categories, state.collapsedCategoryIds);
  const [liveRegionRef, announce] = useAnnouncement();

  const {
    editingCategoryId,
    editingName,
    editingError,
    isCreatingCategory,
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
  } = useSidebarOrganizerActions({
    state,
    dispatch,
    layoutBuckets,
    labels: mergedLabels,
    announce,
  });

  useEffect(() => {
    if (collapsed) {
      cancelRename();
      resetDragState();
    }
  }, [cancelRename, collapsed, resetDragState]);

  return (
    <div className="flex h-full flex-col" role="navigation" aria-label="Sidebar organizer">
      {persistenceError ? (
        <div className="mb-2 rounded-md border border-red-500/60 bg-red-500/10 p-3 text-sm text-red-500">
          <p>{persistenceError}</p>
          <button
            type="button"
            className="mt-2 rounded-md bg-red-500 px-3 py-1 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={retryPersistence}
          >
            {mergedLabels.retryPersistence}
          </button>
        </div>
      ) : null}

      <div ref={liveRegionRef} aria-live="polite" className="sr-only" />

      <div className="flex-1 overflow-y-auto pb-4" role="list">
        {layoutBuckets.map((bucket, index) => (
          <CategorySection
            key={bucket.categoryId ?? 'uncategorized'}
            bucket={bucket}
            bucketIndex={index}
            collapsed={collapsed}
            activeMode={activeMode}
            iconMap={iconMap}
            tabLabels={tabLabels}
            draggingItem={draggingItem}
            featureDropTarget={featureDropTarget}
            categoryDropTarget={categoryDropTarget}
            mergedLabels={mergedLabels}
            collapsedCategoryIds={state.collapsedCategoryIds}
            editingCategoryId={editingCategoryId}
            editingName={editingName}
            editingError={editingError}
            onToggleCollapse={categoryId => dispatch(toggleCategory(categoryId))}
            onBeginRename={beginRename}
            onDeleteCategory={handleDeleteCategory}
            onRenameChange={handleRenameChange}
            onRenameKeyDown={handleRenameKeyDown}
            onRenameBlur={commitRename}
            onFeatureKeyDown={handleFeatureKeyDown}
            onFeatureDragStart={handleFeatureDragStart}
            onFeatureDragEnd={resetDragState}
            onFeatureDrop={dropFeature}
            onCategoryDragStart={handleCategoryDragStart}
            onCategoryDragEnd={resetDragState}
            onCategoryKeyDown={handleCategoryKeyDown}
            onCategoryDrop={(categoryId, targetIndex) => {
              dispatch(moveCategory(categoryId, targetIndex));
              const target = state.categories.find(item => item.order === targetIndex);
              if (target) {
                announce(mergedLabels.dropOnCategoryAnnouncement.replace('{categoryName}', target.name));
              }
              resetDragState();
            }}
            setFeatureDropTarget={setFeatureDropTarget}
            setCategoryDropTarget={setCategoryDropTarget}
            parseDragData={parseDragData}
            onSelectMode={onSelectMode}
          />
        ))}
        {!collapsed ? (
          <DropZone
            active={categoryDropTarget?.targetIndex === state.categories.length}
            sizeClassName="h-3"
            onDragOver={event => {
              const data = parseDragData(event);
              if (data?.type !== 'category') {
                return;
              }
              event.preventDefault();
              setCategoryDropTarget({ targetIndex: state.categories.length });
            }}
            onDrop={event => {
              const data = parseDragData(event);
              if (data?.type !== 'category') {
                return;
              }
              event.preventDefault();
              dispatch(moveCategory(data.id, state.categories.length));
              resetDragState();
            }}
          />
        ) : null}
      </div>

      {!collapsed ? (
        <div className="mt-auto border-t border-border-color/60 px-3 py-3">
          <button
            type="button"
            onClick={handleAddCategory}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border-color/70 bg-secondary/50 px-3 py-2 text-sm font-semibold text-text-secondary transition-colors hover:border-border-color hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            aria-label={mergedLabels.addCategoryLabel}
            disabled={editingCategoryId !== null || isCreatingCategory}
          >
            <span className="text-base" aria-hidden="true">
              +
            </span>
            <span>{mergedLabels.addCategoryButton}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
};
