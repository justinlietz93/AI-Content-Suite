/**
 * @fileoverview Component that renders a single category section including its header and feature list.
 */

import React from 'react';
import { CategoryHeader } from './CategoryHeader';
import { FeatureList } from './FeatureList';
import type { LayoutBucket } from './useLayoutBuckets';
import type { DraggingItem, FeatureDropTarget, CategoryDropTarget } from './dragTypes';
import type { Mode } from '../../../types';
import type { SidebarOrganizerLabels, ModeIconMap } from './types';
import { DropZone } from './DropZone';

interface CategorySectionProps {
  bucket: LayoutBucket;
  bucketIndex: number;
  collapsed: boolean;
  activeMode: Mode;
  iconMap: ModeIconMap;
  tabLabels: Record<Mode, string>;
  draggingItem: DraggingItem | null;
  featureDropTarget: FeatureDropTarget;
  categoryDropTarget: CategoryDropTarget;
  mergedLabels: SidebarOrganizerLabels;
  collapsedCategoryIds: string[];
  orderedCategoryIds: string[];
  editingCategoryId: string | null;
  editingName: string;
  editingError: string | null;
  onToggleCollapse: (categoryId: string) => void;
  onBeginRename: (categoryId: string, name: string) => void;
  onDeleteCategory: (categoryId: string) => void;
  onRenameChange: (categoryId: string, value: string) => void;
  onRenameKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onRenameBlur: () => void;
  onFeatureKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>, featureId: string) => void;
  onFeatureDragStart: (event: React.DragEvent<HTMLButtonElement>, featureId: string) => void;
  onFeatureDragEnd: () => void;
  onFeatureDrop: (featureId: string, categoryId: string | null, index: number) => void;
  onCategoryDragStart: (event: React.DragEvent<HTMLDivElement>, categoryId: string) => void;
  onCategoryDragEnd: () => void;
  onCategoryKeyDown: (event: React.KeyboardEvent<HTMLDivElement>, categoryId: string) => void;
  onCategoryDrop: (categoryId: string, targetIndex: number) => void;
  setFeatureDropTarget: React.Dispatch<React.SetStateAction<FeatureDropTarget>>;
  setCategoryDropTarget: React.Dispatch<React.SetStateAction<CategoryDropTarget>>;
  parseDragData: (event: React.DragEvent) => DraggingItem | null;
  onSelectMode?: (mode: Mode) => void;
}

/**
 * Renders a category bucket including drop zones for categories and features.
 */
export const CategorySection: React.FC<CategorySectionProps> = ({
  bucket,
  bucketIndex,
  collapsed,
  activeMode,
  iconMap,
  tabLabels,
  draggingItem,
  featureDropTarget,
  categoryDropTarget,
  mergedLabels,
  collapsedCategoryIds,
  orderedCategoryIds,
  editingCategoryId,
  editingName,
  editingError,
  onToggleCollapse,
  onBeginRename,
  onDeleteCategory,
  onRenameChange,
  onRenameKeyDown,
  onRenameBlur,
  onFeatureKeyDown,
  onFeatureDragStart,
  onFeatureDragEnd,
  onFeatureDrop,
  onCategoryDragStart,
  onCategoryDragEnd,
  onCategoryKeyDown,
  onCategoryDrop,
  setFeatureDropTarget,
  setCategoryDropTarget,
  parseDragData,
  onSelectMode,
}) => {
  const sectionSpacing = collapsed ? 'px-1 first:pt-2 last:pb-2' : 'px-2 py-3';
  const testId = `category-section-${bucket.categoryId ?? 'uncategorized'}`;

  if (bucket.categoryId === null) {
    const hasUncategorizedFeatures = bucket.features.length > 0;
    const isDraggingFeature = draggingItem?.type === 'feature';
    const isRootZoneTargeted =
      featureDropTarget?.categoryId === null && featureDropTarget.context === 'zone';
    const shouldRenderRootZone =
      hasUncategorizedFeatures || isDraggingFeature || isRootZoneTargeted;

    const rootSectionSpacing = collapsed
      ? shouldRenderRootZone
        ? sectionSpacing
        : 'px-1 first:pt-0 last:pb-2'
      : shouldRenderRootZone
      ? sectionSpacing
      : 'px-2 pb-3 pt-0';

    return (
      <div className={rootSectionSpacing} data-testid={testId}>
        {shouldRenderRootZone ? (
          <DropZone
            active={
              featureDropTarget?.categoryId === null &&
              featureDropTarget.index === 0 &&
              featureDropTarget.context === 'zone'
            }
            sizeClassName={collapsed ? 'h-4' : 'h-6'}
            className={collapsed ? '' : 'px-2'}
            onDragOver={event => {
              const data = draggingItem ?? parseDragData(event);
              if (data?.type !== 'feature') {
                return;
              }
              event.preventDefault();
              if (event.dataTransfer) {
                event.dataTransfer.dropEffect = 'move';
              }
              setFeatureDropTarget({ categoryId: null, index: 0, context: 'zone' });
            }}
            onDragLeave={event => {
              const related = event.relatedTarget as Node | null;
              if (related && event.currentTarget.contains(related)) {
                return;
              }
              setFeatureDropTarget(prev =>
                prev?.categoryId === null && prev.context === 'zone' ? null : prev,
              );
            }}
            onDrop={event => {
              const data = draggingItem ?? parseDragData(event);
              if (data?.type !== 'feature') {
                return;
              }
              event.preventDefault();
              onFeatureDrop(data.id, null, 0);
              setFeatureDropTarget(null);
            }}
          />
        ) : null}
        <FeatureList
          bucket={bucket}
          collapsed={collapsed}
          activeMode={activeMode}
          iconMap={iconMap}
          tabLabels={tabLabels}
          draggingItem={draggingItem}
          featureDropTarget={featureDropTarget}
          onSelectMode={onSelectMode}
          onDragStart={onFeatureDragStart}
          onDragEnd={onFeatureDragEnd}
          onKeyDown={onFeatureKeyDown}
          onDrop={onFeatureDrop}
          setFeatureDropTarget={setFeatureDropTarget}
          parseDragData={parseDragData}
        />
      </div>
    );
  }

  if (collapsed) {
    return (
      <div className={sectionSpacing} data-testid={testId}>
        <FeatureList
          bucket={bucket}
          collapsed={collapsed}
          activeMode={activeMode}
          iconMap={iconMap}
          tabLabels={tabLabels}
          draggingItem={draggingItem}
          featureDropTarget={featureDropTarget}
          onSelectMode={onSelectMode}
          onDragStart={onFeatureDragStart}
          onDragEnd={onFeatureDragEnd}
          onKeyDown={onFeatureKeyDown}
          onDrop={onFeatureDrop}
          setFeatureDropTarget={setFeatureDropTarget}
          parseDragData={parseDragData}
        />
      </div>
    );
  }

  const isCollapsed = collapsedCategoryIds.includes(bucket.categoryId);

  const categoryInsertionIndex = Math.max(0, bucketIndex - 1);
  const headerCategoryDropTarget =
    categoryDropTarget?.hoveredCategoryId === bucket.categoryId ? categoryDropTarget : null;
  const isCategoryDropTarget = Boolean(headerCategoryDropTarget);
  const categoryDropPosition = headerCategoryDropTarget?.position ?? null;
  const isLeadingDropTarget =
    categoryDropTarget?.hoveredCategoryId === bucket.categoryId &&
    categoryDropTarget.targetIndex === categoryInsertionIndex &&
    categoryDropTarget.position === 'before';
  const isFeatureHeaderDropTarget =
    featureDropTarget?.categoryId === bucket.categoryId && featureDropTarget.context === 'header';
  const headerDropPositionRef = React.useRef<'before' | 'after'>('before');
  const headerPointerActiveRef = React.useRef(false);

  /**
   * Highlights the category header when a draggable hovers above it and records the intended target.
   */
  const handleHeaderDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    const data = draggingItem ?? parseDragData(event);
    if (!data) {
      return;
    }
    if (data.type === 'category') {
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
      const rect = event.currentTarget.getBoundingClientRect();
      const height = rect.height || 1;
      const offset = event.clientY - rect.top;
      const hasPointer = Number.isFinite(event.clientY);
      const pointerOffset = Number.isFinite(offset) ? offset : height / 2;
      const pointerIndicatesAfter = hasPointer ? pointerOffset > height / 2 : false;
      const sourceIndex = orderedCategoryIds.indexOf(data.id);
      const targetIndexInOrder = orderedCategoryIds.indexOf(bucket.categoryId!);
      const isMovingDown = sourceIndex !== -1 && targetIndexInOrder !== -1 && sourceIndex < targetIndexInOrder;
      const position = hasPointer
        ? ((pointerIndicatesAfter ? 'after' : 'before') as const)
        : ((isMovingDown ? 'after' : 'before') as const);
      headerPointerActiveRef.current = hasPointer;
      const targetIndex = position === 'after' ? categoryInsertionIndex + 1 : categoryInsertionIndex;
      headerDropPositionRef.current = position;
      setCategoryDropTarget({
        targetIndex,
        position,
        hoveredCategoryId: bucket.categoryId,
      });
      return;
    }
    if (data.type === 'feature') {
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
      setFeatureDropTarget({
        categoryId: bucket.categoryId,
        index: bucket.features.length,
        context: 'header',
      });
    }
  };

  /**
   * Clears drop state once the pointer leaves the category header.
   */
  const handleHeaderDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    const related = event.relatedTarget as Node | null;
    if (related && event.currentTarget.contains(related)) {
      return;
    }
    setCategoryDropTarget(prev =>
      prev?.hoveredCategoryId === bucket.categoryId ? null : prev,
    );
    setFeatureDropTarget(prev =>
      prev?.categoryId === bucket.categoryId && prev.context === 'header' ? null : prev,
    );
  };

  /**
   * Processes drops on the header, delegating to category reordering or feature reassignment handlers.
   */
  const handleHeaderDrop = (event: React.DragEvent<HTMLDivElement>) => {
    const data = draggingItem ?? parseDragData(event);
    if (!data) {
      return;
    }
    if (data.type === 'category') {
      event.preventDefault();
      event.stopPropagation();
      const sourceIndex = orderedCategoryIds.indexOf(data.id);
      const targetIndexInOrder = orderedCategoryIds.indexOf(bucket.categoryId!);
      const isMovingDown = sourceIndex !== -1 && targetIndexInOrder !== -1 && sourceIndex < targetIndexInOrder;
      const shouldUseAfter =
        headerDropPositionRef.current === 'after' || (!headerPointerActiveRef.current && isMovingDown);
      const fallbackTargetIndex = shouldUseAfter ? categoryInsertionIndex + 1 : categoryInsertionIndex;
      if (shouldUseAfter) {
        headerDropPositionRef.current = 'after';
      }
      const dropTarget =
        headerCategoryDropTarget ?? {
          targetIndex: fallbackTargetIndex,
          position: headerDropPositionRef.current,
        };
      onCategoryDrop(data.id, dropTarget.targetIndex);
      setCategoryDropTarget(null);
      headerPointerActiveRef.current = false;
      headerDropPositionRef.current = 'before';
      return;
    }
    if (data.type === 'feature') {
      event.preventDefault();
      event.stopPropagation();
      onFeatureDrop(data.id, bucket.categoryId, bucket.features.length);
    }
  };

  return (
    <div className={sectionSpacing} data-testid={testId}>
      <DropZone
        active={isLeadingDropTarget}
        sizeClassName="h-3"
        className="px-2"
        testId={`category-dropzone-before-${bucket.categoryId}`}
        onDragOver={event => {
          const data = draggingItem ?? parseDragData(event);
          if (data?.type !== 'category') {
            return;
          }
          event.preventDefault();
          if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'move';
          }
          headerDropPositionRef.current = 'before';
          setCategoryDropTarget({
            targetIndex: categoryInsertionIndex,
            position: 'before',
            hoveredCategoryId: bucket.categoryId,
          });
        }}
        onDragLeave={() => {
          setCategoryDropTarget(prev => {
            if (
              prev &&
              prev.hoveredCategoryId === bucket.categoryId &&
              prev.targetIndex === categoryInsertionIndex &&
              prev.position === 'before'
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
          onCategoryDrop(data.id, categoryInsertionIndex);
          setCategoryDropTarget(null);
        }}
      />
      <CategoryHeader
        categoryId={bucket.categoryId}
        name={bucket.title ?? ''}
        isDragging={draggingItem?.type === 'category' && draggingItem.id === bucket.categoryId}
        categoryDropPosition={isCategoryDropTarget ? categoryDropPosition : null}
        isFeatureDropTarget={isFeatureHeaderDropTarget}
        labels={mergedLabels}
        isCollapsed={isCollapsed}
        isEditing={editingCategoryId === bucket.categoryId}
        editingValue={editingName}
        editingError={editingError}
        onToggleCollapse={() => onToggleCollapse(bucket.categoryId!)}
        onBeginRename={() => onBeginRename(bucket.categoryId!, bucket.title ?? '')}
        onDelete={() => onDeleteCategory(bucket.categoryId!)}
        onRenameChange={onRenameChange}
        onRenameKeyDown={onRenameKeyDown}
        onRenameBlur={onRenameBlur}
        onDragStart={event => onCategoryDragStart(event, bucket.categoryId!)}
        onDragEnd={onCategoryDragEnd}
        onKeyDown={event => onCategoryKeyDown(event, bucket.categoryId!)}
        onHeaderDragOver={handleHeaderDragOver}
        onHeaderDragLeave={handleHeaderDragLeave}
        onHeaderDrop={handleHeaderDrop}
      />
      {!isCollapsed ? (
        <FeatureList
          bucket={bucket}
          collapsed={collapsed}
          activeMode={activeMode}
          iconMap={iconMap}
          tabLabels={tabLabels}
          draggingItem={draggingItem}
          featureDropTarget={featureDropTarget}
          onSelectMode={onSelectMode}
          onDragStart={onFeatureDragStart}
          onDragEnd={onFeatureDragEnd}
          onKeyDown={onFeatureKeyDown}
          onDrop={onFeatureDrop}
          setFeatureDropTarget={setFeatureDropTarget}
          parseDragData={parseDragData}
        />
      ) : null}
    </div>
  );
};
