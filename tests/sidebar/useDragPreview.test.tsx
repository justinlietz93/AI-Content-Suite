/* @vitest-environment jsdom */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { useDragPreview } from '../../components/layouts/sidebarOrganizer/useDragPreview';

type DragPreviewTestDataTransfer = DataTransfer & {
  setDragImage: ReturnType<typeof vi.fn>;
};

const createDataTransferMock = (): DragPreviewTestDataTransfer =>
  ({
    setData: vi.fn(),
    getData: vi.fn(),
    clearData: vi.fn(),
    setDragImage: vi.fn(),
    dropEffect: 'move',
    effectAllowed: 'all',
    files: [] as unknown as FileList,
    items: [] as unknown as DataTransferItemList,
    types: [],
  }) as unknown as DragPreviewTestDataTransfer;

const TestDragPreview: React.FC = () => {
  const handleRef = React.useRef<HTMLButtonElement | null>(null);
  const { applyDragPreview, clearDragPreview } = useDragPreview();

  return (
    <button
      ref={handleRef}
      data-testid="drag-preview-handle"
      draggable
      onDragStart={event => applyDragPreview(event, handleRef.current)}
      onDragEnd={() => clearDragPreview()}
    >
      Drag handle
    </button>
  );
};

describe('useDragPreview', () => {
  it('centers drag preview and cleans up after drag end', () => {
    // Ensure custom drag preview is enabled for this test regardless of env flags.
    window.localStorage.setItem('aics_use_custom_drag_preview', 'true');
    render(<TestDragPreview />);

    const handle = screen.getByTestId('drag-preview-handle');
    Object.defineProperty(handle, 'getBoundingClientRect', {
      value: () => ({
        width: 40,
        height: 20,
        top: 100,
        left: 50,
        right: 90,
        bottom: 120,
        x: 50,
        y: 100,
        toJSON: () => ({}),
      }),
    });

    const dataTransfer = createDataTransferMock();

    fireEvent.dragStart(handle, { dataTransfer, clientX: 70, clientY: 110 });

    expect(dataTransfer.setDragImage).toHaveBeenCalledTimes(1);
    const setDragImageMock = dataTransfer.setDragImage as ReturnType<typeof vi.fn>;
    const [previewNode, offsetX, offsetY] = setDragImageMock.mock.calls[0];
    expect(offsetX).toBeCloseTo(20);
    expect(offsetY).toBeCloseTo(10);
    expect(document.body.contains(previewNode)).toBe(true);

    fireEvent.dragEnd(handle, { dataTransfer });

    expect(document.body.contains(previewNode)).toBe(false);
    window.localStorage.removeItem('aics_use_custom_drag_preview');
  });
});
