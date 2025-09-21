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
  if (bucket.categoryId === null) {
    return (
      <div className="px-2">
        <DropZone
          active={featureDropTarget?.categoryId === null && featureDropTarget.index === 0}
          onDragOver={event => {
            const data = parseDragData(event);
            if (data?.type !== 'feature') {
              return;
            }
            event.preventDefault();
            setFeatureDropTarget({ categoryId: null, index: 0 });
          }}
          onDragLeave={() => {
            setFeatureDropTarget(prev => (prev?.categoryId === null ? null : prev));
          }}
          onDrop={event => {
            const data = parseDragData(event);
            if (data?.type !== 'feature') {
              return;
            }
            event.preventDefault();
            onFeatureDrop(data.id, null, 0);
          }}
        />
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

  return (
    <div className="px-2">
      <DropZone
        active={categoryDropTarget?.targetIndex === bucketIndex}
        sizeClassName="h-3"
        onDragOver={event => {
          const data = parseDragData(event);
          if (data?.type !== 'category') {
            return;
          }
          event.preventDefault();
          setCategoryDropTarget({ targetIndex: bucketIndex });
        }}
        onDrop={event => {
          const data = parseDragData(event);
          if (data?.type !== 'category') {
            return;
          }
          event.preventDefault();
          onCategoryDrop(data.id, bucketIndex);
        }}
      />
      <CategoryHeader
        categoryId={bucket.categoryId}
        name={bucket.title ?? ''}
        collapsed={collapsed}
        isDragging={draggingItem?.type === 'category' && draggingItem.id === bucket.categoryId}
        labels={mergedLabels}
        isCollapsed={collapsedCategoryIds.includes(bucket.categoryId)}
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
      />
      {!collapsedCategoryIds.includes(bucket.categoryId) ? (
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
