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
}) => (
  <ul role="list" className="space-y-1">
    {bucket.features.map((feature, index) => (
      <React.Fragment key={feature.id}>
        <DropZone
          active={featureDropTarget?.categoryId === bucket.categoryId && featureDropTarget.index === index}
          onDragOver={event => {
            const data = parseDragData(event);
            if (data?.type !== 'feature') {
              return;
            }
            event.preventDefault();
            setFeatureDropTarget({ categoryId: bucket.categoryId, index });
          }}
          onDragLeave={() => {
            setFeatureDropTarget(prev =>
              prev?.categoryId === bucket.categoryId && prev.index === index ? null : prev,
            );
          }}
          onDrop={event => {
            const data = parseDragData(event);
            if (data?.type !== 'feature') {
              return;
            }
            event.preventDefault();
            onDrop(data.id, bucket.categoryId, index);
          }}
        />
        <li>
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
        </li>
      </React.Fragment>
    ))}
    <DropZone
      active={
        featureDropTarget?.categoryId === bucket.categoryId &&
        featureDropTarget.index === bucket.features.length
      }
      onDragOver={event => {
        const data = parseDragData(event);
        if (data?.type !== 'feature') {
          return;
        }
        event.preventDefault();
        setFeatureDropTarget({ categoryId: bucket.categoryId, index: bucket.features.length });
      }}
      onDragLeave={() => {
        setFeatureDropTarget(prev =>
          prev?.categoryId === bucket.categoryId && prev.index === bucket.features.length ? null : prev,
        );
      }}
      onDrop={event => {
        const data = parseDragData(event);
        if (data?.type !== 'feature') {
          return;
        }
        event.preventDefault();
        onDrop(data.id, bucket.categoryId, bucket.features.length);
      }}
    />
  </ul>
);
