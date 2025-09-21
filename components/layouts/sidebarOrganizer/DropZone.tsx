/**
 * @fileoverview Lightweight drop zone component used for drag-and-drop placeholders.
 */

import React from 'react';

interface DropZoneProps {
  /** Whether the drop zone is currently highlighted. */
  active: boolean;
  /** Invoked when a draggable element moves over the zone. */
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  /** Triggered when the draggable leaves the zone without dropping. */
  onDragLeave?: () => void;
  /** Fires when the draggable is dropped. */
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  /** Optional custom height classes. */
  sizeClassName?: string;
}

/**
 * Visual placeholder for drag targets.
 */
export const DropZone: React.FC<DropZoneProps> = ({
  active,
  onDragOver,
  onDragLeave,
  onDrop,
  sizeClassName = 'h-2',
}) => (
  <div
    className={`${sizeClassName} rounded transition-all duration-150 ease-out ${
      active ? 'bg-primary/40' : 'bg-transparent'
    }`}
    onDragOver={onDragOver}
    onDragLeave={onDragLeave}
    onDrop={onDrop}
  />
);
