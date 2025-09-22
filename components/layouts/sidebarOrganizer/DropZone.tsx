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
  /** Optional test identifier to aid automated queries. */
  testId?: string;
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
  testId,
}) => (
  <div
    className={`relative flex items-center ${sizeClassName} ${className}`}
    onDragOver={onDragOver}
    onDragLeave={onDragLeave}
    onDrop={onDrop}
    data-testid={testId}
    data-drop-zone="true"
  >
    <span
      aria-hidden
      className={`pointer-events-none h-1.5 w-full rounded-full transform transition-all duration-150 ring-0 ring-transparent ring-offset-0 ring-offset-transparent ${
        active
          ? 'scale-y-125 bg-primary ring-2 ring-primary/50 ring-offset-2 ring-offset-surface opacity-100'
          : 'scale-y-100 bg-border-color/60 opacity-80'
      }`}
    />
  </div>
);
