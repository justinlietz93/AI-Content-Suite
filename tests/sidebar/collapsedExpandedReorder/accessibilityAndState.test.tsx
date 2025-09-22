/* @vitest-environment jsdom */
/**
 * Module Purpose: Confirm accessibility state and persistence behaviors across sidebar drag workflows.
 * External Dependencies: Leverages Testing Library utilities with no HTTP or CLI integrations.
 * Fallback Semantics: Not applicable; tests execute deterministic UI operations without fallbacks.
 * Timeout Strategy: Utilizes Testing Library wait helpers with default timeout behavior.
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { Sidebar } from '../../../components/layouts/Sidebar';
import type { Mode } from '../../../types';
import {
  createDataTransfer,
  getRenderedCategoryOrder,
  getRenderedFeatureOrder,
  initializeSidebarOrganizerTestSuite,
} from './testUtils';

initializeSidebarOrganizerTestSuite();

describe('Sidebar accessibility and state handling', () => {
  it('updates aria-grabbed attributes to reflect drag lifecycle state changes', async () => {
    console.info('Verifying aria-grabbed state toggles true during drag and resets on drag end.');

    render(
      <Sidebar
        collapsed={false}
        onToggle={() => {}}
        activeMode={'technical' as Mode}
        onSelectMode={() => {}}
      />,
    );

    await waitFor(() => {
      expect(document.querySelector('[data-feature-id="styleExtractor"]')).toBeTruthy();
    });

    const styleExtractorButton = document.querySelector('[data-feature-id="styleExtractor"]') as HTMLElement;
    const dataTransfer = createDataTransfer();

    expect(styleExtractorButton.getAttribute('aria-grabbed')).toBe('false');

    fireEvent.dragStart(styleExtractorButton, { dataTransfer });
    expect(styleExtractorButton.getAttribute('aria-grabbed')).toBe('true');

    fireEvent.dragEnd(styleExtractorButton, { dataTransfer });
    expect(styleExtractorButton.getAttribute('aria-grabbed')).toBe('false');
  });

  it('preserves keyboard focus on the moved feature after pointer drag completes', async () => {
    console.info('Ensuring focus remains on the dragged feature button after drop.');

    render(
      <Sidebar
        collapsed={false}
        onToggle={() => {}}
        activeMode={'technical' as Mode}
        onSelectMode={() => {}}
      />,
    );

    await waitFor(() => {
      expect(document.querySelector('[data-feature-id="styleExtractor"]')).toBeTruthy();
      expect(document.querySelector('[data-feature-id="rewriter"]')).toBeTruthy();
    });

    const styleExtractorButton = document.querySelector('[data-feature-id="styleExtractor"]') as HTMLElement;
    const rewriterWrapper = (document.querySelector('[data-feature-id="rewriter"]') as HTMLElement).parentElement as HTMLElement;
    const dataTransfer = createDataTransfer();

    styleExtractorButton.focus();
    expect(document.activeElement).toBe(styleExtractorButton);

    fireEvent.dragStart(styleExtractorButton, { dataTransfer });
    fireEvent.dragOver(rewriterWrapper, { dataTransfer });
    fireEvent.drop(rewriterWrapper, { dataTransfer });
    fireEvent.dragEnd(styleExtractorButton, { dataTransfer });

    expect(document.activeElement).toBe(styleExtractorButton);
  });

  it('cancels feature drag state when Escape is pressed during keyboard interactions', async () => {
    console.info('Confirming Escape key exits drag state without altering ordering.');

    render(
      <Sidebar
        collapsed={false}
        onToggle={() => {}}
        activeMode={'technical' as Mode}
        onSelectMode={() => {}}
      />,
    );

    await waitFor(() => {
      expect(document.querySelector('[data-feature-id="styleExtractor"]')).toBeTruthy();
    });

    const styleExtractorButton = document.querySelector('[data-feature-id="styleExtractor"]') as HTMLElement;

    fireEvent.keyDown(styleExtractorButton, { key: ' ', code: 'Space' });
    expect(styleExtractorButton.getAttribute('aria-grabbed')).toBe('true');

    fireEvent.keyDown(styleExtractorButton, { key: 'Escape', code: 'Escape' });
    expect(styleExtractorButton.getAttribute('aria-grabbed')).toBe('false');
    expect(getRenderedFeatureOrder('workspace')).toEqual([
      'technical',
      'styleExtractor',
      'rewriter',
      'mathFormatter',
      'reasoningStudio',
      'scaffolder',
    ]);
  });

  it('treats empty categories as valid drop targets for first insertions', async () => {
    console.info('Verifying uncategorized bucket accepts initial feature drops.');

    render(
      <Sidebar
        collapsed={false}
        onToggle={() => {}}
        activeMode={'technical' as Mode}
        onSelectMode={() => {}}
      />,
    );

    await waitFor(() => {
      expect(document.querySelector('[data-feature-id="scaffolder"]')).toBeTruthy();
    });

    const scaffolderButton = document.querySelector('[data-feature-id="scaffolder"]') as HTMLElement;
    const dataTransfer = createDataTransfer();

    fireEvent.dragStart(scaffolderButton, { dataTransfer });
    const uncategorizedDropZone = document.querySelector(
      '[data-testid="category-section-uncategorized"] [data-drop-zone="true"]',
    ) as HTMLElement;
    fireEvent.dragOver(uncategorizedDropZone, { dataTransfer });
    fireEvent.drop(uncategorizedDropZone, { dataTransfer });
    fireEvent.dragEnd(scaffolderButton, { dataTransfer });

    await waitFor(() => {
      expect(getRenderedFeatureOrder(null)).toEqual(['scaffolder']);
      expect(getRenderedFeatureOrder('workspace')).toEqual([
        'technical',
        'styleExtractor',
        'rewriter',
        'mathFormatter',
        'reasoningStudio',
      ]);
    });
  });

  it('persists reordered state across component remounts', async () => {
    console.info('Checking that feature reorders persist in localStorage across remounts.');

    const initial = render(
      <Sidebar
        collapsed={false}
        onToggle={() => {}}
        activeMode={'technical' as Mode}
        onSelectMode={() => {}}
      />,
    );

    await waitFor(() => {
      expect(document.querySelector('[data-feature-id="scaffolder"]')).toBeTruthy();
      expect(document.querySelector('[data-category-id="orchestration"]')).toBeTruthy();
    });

    const scaffolderButton = document.querySelector('[data-feature-id="scaffolder"]') as HTMLElement;
    const orchestrationHeader = document.querySelector('[data-category-id="orchestration"]') as HTMLElement;
    const dataTransfer = createDataTransfer();

    fireEvent.dragStart(scaffolderButton, { dataTransfer });
    fireEvent.dragOver(orchestrationHeader, { dataTransfer });
    fireEvent.drop(orchestrationHeader, { dataTransfer });
    fireEvent.dragEnd(scaffolderButton, { dataTransfer });

    await waitFor(() => {
      expect(getRenderedFeatureOrder('orchestration')).toEqual([
        'requestSplitter',
        'promptEnhancer',
        'agentDesigner',
        'scaffolder',
      ]);
    });

    initial.unmount();

    const stored = JSON.parse(
      window.localStorage.getItem('ai_content_suite_sidebar_organization_v1') ?? 'null',
    );
    expect(stored).toBeTruthy();
    expect(stored.features.some((feature: { id: string; categoryId: string | null }) =>
      feature.id === 'scaffolder' && feature.categoryId === 'orchestration',
    )).toBe(true);

    const rerendered = render(
      <Sidebar
        collapsed={false}
        onToggle={() => {}}
        activeMode={'technical' as Mode}
        onSelectMode={() => {}}
      />,
    );

    await waitFor(() => {
      expect(getRenderedFeatureOrder('orchestration')).toEqual([
        'requestSplitter',
        'promptEnhancer',
        'agentDesigner',
        'scaffolder',
      ]);
    });

    rerendered.unmount();
  });

  it('preserves ordering and active selection when toggling collapse state', async () => {
    console.info('Validating that switching collapse state preserves order and active mode.');

    const { rerender } = render(
      <Sidebar
        collapsed={false}
        onToggle={() => {}}
        activeMode={'technical' as Mode}
        onSelectMode={() => {}}
      />,
    );

    await waitFor(() => {
      expect(document.querySelector('[data-category-id="interactive"]')).toBeTruthy();
      expect(document.querySelector('[data-category-id="workspace"]')).toBeTruthy();
    });

    const interactiveHeader = document.querySelector('[data-category-id="interactive"]') as HTMLElement;
    const workspaceHeader = document.querySelector('[data-category-id="workspace"]') as HTMLElement;
    const dataTransfer = createDataTransfer();

    fireEvent.dragStart(interactiveHeader, { dataTransfer });
    fireEvent.dragOver(workspaceHeader, { dataTransfer });
    fireEvent.drop(workspaceHeader, { dataTransfer });
    fireEvent.dragEnd(interactiveHeader, { dataTransfer });

    await waitFor(() => {
      expect(getRenderedCategoryOrder()).toEqual(['interactive', 'workspace', 'orchestration']);
    });

    rerender(
      <Sidebar collapsed onToggle={() => {}} activeMode={'technical' as Mode} onSelectMode={() => {}} />,
    );

    await waitFor(() => {
      expect(getRenderedCategoryOrder()).toEqual(['interactive', 'workspace', 'orchestration']);
    });

    const collapsedCategoryHandles = document.querySelectorAll('[data-drag-handle="category"]');
    expect(collapsedCategoryHandles.length).toBe(0);

    const activeButton = document.querySelector('[data-feature-id="technical"]') as HTMLElement;
    expect(activeButton).toHaveClass('bg-primary/20');

    rerender(
      <Sidebar
        collapsed={false}
        onToggle={() => {}}
        activeMode={'technical' as Mode}
        onSelectMode={() => {}}
      />,
    );

    await waitFor(() => {
      expect(getRenderedCategoryOrder()).toEqual(['interactive', 'workspace', 'orchestration']);
    });
  });

  it('suppresses click events immediately following a drag interaction', async () => {
    console.info('Checking that finishing a drag does not trigger an unintended mode change.');

    const onSelectMode = vi.fn();

    render(
      <Sidebar
        collapsed={false}
        onToggle={() => {}}
        activeMode={'technical' as Mode}
        onSelectMode={onSelectMode}
      />,
    );

    await waitFor(() => {
      expect(document.querySelector('[data-feature-id="styleExtractor"]')).toBeTruthy();
    });
    const styleButton = document.querySelector('[data-feature-id="styleExtractor"]') as HTMLElement;

    vi.useFakeTimers();
    const dataTransfer = createDataTransfer();

    fireEvent.dragStart(styleButton, { dataTransfer });
    fireEvent.dragEnd(styleButton, { dataTransfer });
    fireEvent.click(styleButton);

    expect(onSelectMode).not.toHaveBeenCalled();

    vi.runAllTimers();
    fireEvent.click(styleButton);
    expect(onSelectMode).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });
});
