/**
 * @fileoverview Hook that creates and cleans up drag preview elements for the sidebar organizer.
 * @purpose Ensure drag operations render a cursor-aligned preview across browsers without mutating source nodes.
 * @externalDependencies Relies only on the DOM and React's hook utilities; no CLI or HTTP communication occurs.
 * @fallbackSemantics If the browser rejects custom drag images, the hook silently falls back to native previews.
 * @timeoutStrategy Not applicable because all work executes synchronously in response to pointer events.
 */

import React from 'react';

/**
 * Describes the drag preview helpers returned by {@link useDragPreview}.
 */
export interface DragPreviewController {
  /** Applies a drag image aligned to the pointer by cloning the provided handle. */
  applyDragPreview: (event: React.DragEvent, handle: HTMLElement | null) => void;
  /** Removes any detached preview element previously appended to the DOM. */
  clearDragPreview: () => void;
}

/**
 * Manages lifecycle of cloned drag preview elements so dragged items appear beneath the pointer.
 *
 * @returns Controller exposing functions for applying and clearing drag previews.
 */
export const useDragPreview = (): DragPreviewController => {
  const dragPreviewRef = React.useRef<HTMLElement | null>(null);

  /**
   * Detaches the currently active drag preview from the DOM, if present.
   */
  const clearDragPreview = React.useCallback(() => {
    const preview = dragPreviewRef.current;
    if (preview && preview.parentNode) {
      preview.parentNode.removeChild(preview);
    }
    dragPreviewRef.current = null;
  }, []);

  /**
   * Clones the supplied handle element and positions the preview so the cursor remains centered.
   *
   * @param event - Drag event used to access the native data transfer payload.
   * @param handle - Element representing the item under drag; used to generate the preview snapshot.
   */
  // Decide whether to use custom drag image.
  // Re-enable custom drag image; guarded by checks and try/catch to avoid cancellations.
  const shouldUseCustomPreview = true;

  const applyDragPreview = React.useCallback(
    (event: React.DragEvent, handle: HTMLElement | null) => {
      if (!shouldUseCustomPreview) {
        clearDragPreview();
        return;
      }

      if (!event.dataTransfer || !handle || typeof handle.getBoundingClientRect !== 'function') {
        clearDragPreview();
        return;
      }

      clearDragPreview();

      const clone = handle.cloneNode(true) as HTMLElement;
      const rect = handle.getBoundingClientRect();
      const width = rect.width || handle.offsetWidth || 1;
      const height = rect.height || handle.offsetHeight || 1;

      clone.style.boxSizing = 'border-box';
      clone.style.pointerEvents = 'none';
      clone.style.position = 'fixed';
      clone.style.top = '-9999px';
      clone.style.left = '-9999px';
      clone.style.width = `${width}px`;
      clone.style.height = `${height}px`;
      clone.style.transform = 'none';
      clone.setAttribute('aria-hidden', 'true');

  document.body.appendChild(clone);
      dragPreviewRef.current = clone;

      const pointerOffsetX = Number.isFinite(event.clientX) ? event.clientX - rect.left : width / 2;
      const pointerOffsetY = Number.isFinite(event.clientY) ? event.clientY - rect.top : height / 2;

      try {
        event.dataTransfer.setDragImage(clone, pointerOffsetX, pointerOffsetY);
      } catch (error) {
        clearDragPreview();
        console.warn('Unable to set custom drag image for sidebar organizer handle.', error);
      }
    },
    [clearDragPreview, shouldUseCustomPreview],
  );

  React.useEffect(() => clearDragPreview, [clearDragPreview]);

  return { applyDragPreview, clearDragPreview };
};
