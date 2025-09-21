/**
 * @fileoverview Component that renders feature rows and their drag-and-drop drop zones.
 */

import React from 'react';
import type { Mode } from '../../../types';
import { DropZone } from './DropZone';
import { FeatureItem } from './FeatureItem';
import type { LayoutBucket } from './useLayoutBuckets';
import type { DraggingItem, FeatureDropTarget } from './dragTypes';
import type { ModeIconMap } from './types';

interface FeatureListProps {
  bucket: LayoutBucket;
  collapsed: boolean;
  activeMode: Mode;
  iconMap: ModeIconMap;
  tabLabels: Record<Mode, string>;
  draggingItem: DraggingItem | null;
  featureDropTarget: FeatureDropTarget;
  onSelectMode?: (mode: Mode) => void;
  onDragStart: (event: React.DragEvent<HTMLButtonElement>, featureId: string) => void;
  onDragEnd: () => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>, featureId: string) => void;
  onDrop: (featureId: string, categoryId: string | null, index: number) => void;
  setFeatureDropTarget: React.Dispatch<React.SetStateAction<FeatureDropTarget>>;
  parseDragData: (event: React.DragEvent) => DraggingItem | null;
}

/**
 * Visualizes all features for a specific bucket, wiring up drag drop slots.
 */
export const FeatureList: React.FC<FeatureListProps> = ({
  bucket,
  collapsed,
  activeMode,
  iconMap,
  tabLabels,
  draggingItem,
  featureDropTarget,
  onSelectMode,
  onDragStart,
  onDragEnd,
  onKeyDown,
  onDrop,
  setFeatureDropTarget,
  parseDragData,
}) => {
  /**
   * Determines whether the current drag position should insert a feature before or after
   * the referenced index by comparing the pointer offset with the element height.
   */
  const resolveItemDropPosition = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>, currentIndex: number) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const height = rect.height || 1;
      const offset = event.clientY - rect.top;
      const pointerOffset = Number.isFinite(offset) ? offset : 0;
      const isBefore = pointerOffset <= height / 2;

      return {
        index: isBefore ? currentIndex : currentIndex + 1,
        context: isBefore ? 'before-item' : 'after-item',
      } as const;
    },
    [],
  );

  const isBeforeTarget = (index: number) =>
    featureDropTarget?.categoryId === bucket.categoryId &&
    featureDropTarget.index === index &&
    featureDropTarget.context === 'before-item';

  const isAfterTarget = (index: number) =>
    featureDropTarget?.categoryId === bucket.categoryId &&
    featureDropTarget.index === index + 1 &&
    featureDropTarget.context === 'after-item';

  return (
    <ul role="list" className="space-y-1">
      {bucket.features.map((feature, index) => (
        <li key={feature.id}>
          <div
            className="relative rounded-md"
            onDragOver={event => {
              if (draggingItem?.type !== 'feature') {
                const data = parseDragData(event);
                if (data?.type !== 'feature') {
                  return;
                }
              }

              const { index: targetIndex, context } = resolveItemDropPosition(event, index);
              event.preventDefault();
              if (event.dataTransfer) {
                event.dataTransfer.dropEffect = 'move';
              }
              setFeatureDropTarget(prev => {
                if (
                  prev?.categoryId === bucket.categoryId &&
                  prev.index === targetIndex &&
                  prev.context === context
                ) {
                  return prev;
                }
                return {
                  categoryId: bucket.categoryId,
                  index: targetIndex,
                  context,
                };
              });
            }}
            onDragLeave={event => {
              const related = event.relatedTarget as Node | null;
              if (related && event.currentTarget.contains(related)) {
                return;
              }
              setFeatureDropTarget(prev => {
                if (prev?.categoryId !== bucket.categoryId) {
                  return prev;
                }
                const shouldClear =
                  (prev.context === 'before-item' && prev.index === index) ||
                  (prev.context === 'after-item' && prev.index === index + 1);
                return shouldClear ? null : prev;
              });
            }}
            onDrop={event => {
              const data = draggingItem?.type === 'feature' ? draggingItem : parseDragData(event);
              if (data?.type !== 'feature') {
                return;
              }
              const { index: targetIndex } = resolveItemDropPosition(event, index);
              event.preventDefault();
              event.stopPropagation();
              onDrop(data.id, bucket.categoryId, targetIndex);
              setFeatureDropTarget(null);
            }}
          >
            {isBeforeTarget(index) ? (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 -top-1 h-1 rounded-full bg-primary"
              />
            ) : null}
            {isAfterTarget(index) ? (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 -bottom-1 h-1 rounded-full bg-primary"
              />
            ) : null}
            <FeatureItem
              feature={feature}
              collapsed={collapsed}
              activeMode={activeMode}
              iconMap={iconMap}
              tabLabels={tabLabels}
              isDragging={draggingItem?.type === 'feature' && draggingItem.id === feature.id}
              onSelectMode={onSelectMode}
              onKeyDown={onKeyDown}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
          </div>
        </li>
      ))}
      <DropZone
        active={
          featureDropTarget?.categoryId === bucket.categoryId &&
          featureDropTarget.index === bucket.features.length &&
          featureDropTarget.context === 'zone'
        }
        sizeClassName={bucket.features.length === 0 ? 'h-12' : 'h-3'}
        className={collapsed ? '' : 'px-2'}
        onDragOver={event => {
          if (draggingItem?.type !== 'feature') {
            const data = parseDragData(event);
            if (data?.type !== 'feature') {
              return;
            }
          }
          event.preventDefault();
          if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'move';
          }
          setFeatureDropTarget({
            categoryId: bucket.categoryId,
            index: bucket.features.length,
            context: 'zone',
          });
        }}
        onDragLeave={event => {
          const related = event.relatedTarget as Node | null;
          if (related && event.currentTarget.contains(related)) {
            return;
          }
          setFeatureDropTarget(prev =>
            prev?.categoryId === bucket.categoryId &&
            prev.index === bucket.features.length &&
            prev.context === 'zone'
              ? null
              : prev,
          );
        }}
        onDrop={event => {
          const data = draggingItem?.type === 'feature' ? draggingItem : parseDragData(event);
          if (data?.type !== 'feature') {
            return;
          }
          event.preventDefault();
          onDrop(data.id, bucket.categoryId, bucket.features.length);
          setFeatureDropTarget(null);
        }}
      />
    </ul>
  );
};
