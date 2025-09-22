/**
 * @fileoverview React component composing the sidebar organizer experience with drag-and-drop, rename, and persistence support.
 * The component relies exclusively on browser APIs and local state; it does not issue network requests and therefore needs no
 * explicit timeout management.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { debugLog } from '../../../utils/debugToast';
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
  const orderedCategoryIds = React.useMemo(
    () =>
      state.categories
        .slice()
        .sort((a, b) => a.order - b.order)
        .map(category => category.id),
    [state.categories],
  );
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

  // Guard against browsers cancelling drags when the pointer crosses non-droppable areas
  // by preventing default on window dragover/drop while a drag is active.
  useEffect(() => {
    if (!draggingItem) {
      return;
    }
    const handleWindowDragOver = (e: DragEvent) => {
      debugLog('window.dragover', { target: (e.target as HTMLElement)?.tagName });
      e.preventDefault();
    };
    const handleWindowDrop = (e: DragEvent) => {
      debugLog('window.drop', { target: (e.target as HTMLElement)?.tagName });
      e.preventDefault();
    };
    debugLog('window.listeners.attach');
    window.addEventListener('dragover', handleWindowDragOver);
    window.addEventListener('drop', handleWindowDrop);
    return () => {
      debugLog('window.listeners.detach');
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('drop', handleWindowDrop);
    };
  }, [draggingItem]);

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

      <div
        className="flex-1 overflow-y-auto pb-4"
        role="list"
        onDragOver={event => {
          // Keep the drag operation alive across whitespace between drop zones.
          if (draggingItem) {
            debugLog('container.dragover');
            event.preventDefault();
            if (event.dataTransfer) {
              event.dataTransfer.dropEffect = 'move';
            }
          }
        }}
        onDrop={event => {
          // Avoid the browser navigating or cancelling unexpectedly when dropping on container gaps.
          if (draggingItem) {
            debugLog('container.drop');
            event.preventDefault();
            event.stopPropagation();
          }
        }}
      >
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
            orderedCategoryIds={orderedCategoryIds}
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
              const hoveredCategoryId = categoryDropTarget?.hoveredCategoryId ?? null;
              const announcementCategory =
                hoveredCategoryId !== null
                  ? state.categories.find(item => item.id === hoveredCategoryId)
                  : null;

              dispatch(moveCategory(categoryId, targetIndex));

              if (announcementCategory && announcementCategory.id !== categoryId) {
                announce(
                  mergedLabels.dropOnCategoryAnnouncement.replace(
                    '{categoryName}',
                    announcementCategory.name,
                  ),
                );
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
            active={
              categoryDropTarget?.targetIndex === state.categories.length &&
              categoryDropTarget.position === 'after' &&
              categoryDropTarget.hoveredCategoryId === null
            }
            sizeClassName="h-3"
            className="px-2"
            onDragOver={event => {
              const data = draggingItem ?? parseDragData(event);
              if (data?.type !== 'category') {
                return;
              }
              event.preventDefault();
              if (event.dataTransfer) {
                event.dataTransfer.dropEffect = 'move';
              }
              setCategoryDropTarget({
                targetIndex: state.categories.length,
                position: 'after',
                hoveredCategoryId: null,
              });
            }}
            onDragLeave={() => {
              setCategoryDropTarget(prev => {
                if (
                  prev &&
                  prev.targetIndex === state.categories.length &&
                  prev.position === 'after' &&
                  prev.hoveredCategoryId === null
                ) {
                  return null;
                }
                return prev;
              });
            }}
            onDrop={event => {
              const data = draggingItem ?? parseDragData(event);
              if (data?.type !== 'category') {
                return;
              }
              event.preventDefault();
              dispatch(moveCategory(data.id, state.categories.length));
              resetDragState();
              setCategoryDropTarget(null);
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
