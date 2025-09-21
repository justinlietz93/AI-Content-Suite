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
  onDragLeave?: (event: React.DragEvent<HTMLDivElement>) => void;
  /** Fires when the draggable is dropped. */
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  /** Optional custom height classes. */
  sizeClassName?: string;
  /** Additional custom classes for the container. */
  className?: string;
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
  className = '',
}) => (
  <div
    className={`relative flex items-center ${sizeClassName} ${className}`}
    onDragOver={onDragOver}
    onDragLeave={onDragLeave}
    onDrop={onDrop}
  >
    <span
      aria-hidden
      className={`pointer-events-none h-1 w-full rounded-full transition-colors duration-150 ${
        active ? 'bg-primary' : 'bg-transparent'
      }`}
    />
  </div>
);
