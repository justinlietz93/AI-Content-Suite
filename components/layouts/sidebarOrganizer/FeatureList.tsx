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
  const isActiveDropTarget = (index: number) =>
    featureDropTarget?.categoryId === bucket.categoryId &&
    featureDropTarget.index === index &&
    featureDropTarget.context === 'item';

  return (
    <ul role="list" className="space-y-1">
      {bucket.features.map((feature, index) => (
        <li key={feature.id}>
          <div
            className={`rounded-md ${
              isActiveDropTarget(index) ? 'bg-primary/10 ring-2 ring-primary/60 ring-offset-1 ring-offset-surface' : ''
            }`}
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
                index,
                context: 'item',
              });
            }}
            onDragLeave={event => {
              const related = event.relatedTarget as Node | null;
              if (related && event.currentTarget.contains(related)) {
                return;
              }
              setFeatureDropTarget(prev =>
                prev?.categoryId === bucket.categoryId && prev.index === index && prev.context === 'item'
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
              event.stopPropagation();
              onDrop(data.id, bucket.categoryId, index);
            }}
          >
            <FeatureItem
              feature={feature}
              collapsed={collapsed}
              activeMode={activeMode}
              iconMap={iconMap}
              tabLabels={tabLabels}
              isDragging={draggingItem?.type === 'feature' && draggingItem.id === feature.id}
              isDropTarget={isActiveDropTarget(index)}
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
        }}
      />
    </ul>
  );
};
