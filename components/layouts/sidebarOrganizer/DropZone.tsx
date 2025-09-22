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
    className={`relative ${className}`}
    data-testid={testId}
    data-drop-zone="true"
  >
    {/* Absolute overlay to avoid shifting layout while remaining hoverable */}
    <div
      className={`absolute inset-x-0 bottom-0 flex items-center ${sizeClassName}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <span
        aria-hidden
        className={`pointer-events-none h-1 w-full rounded-full transition-all duration-100 ${
          active
            ? 'bg-primary ring-2 ring-primary/50 ring-offset-1 ring-offset-surface opacity-100'
            : 'opacity-0 bg-transparent ring-0 ring-transparent'
        }`}
      />
    </div>
  </div>
);
