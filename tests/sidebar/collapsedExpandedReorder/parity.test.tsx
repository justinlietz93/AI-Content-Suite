/* @vitest-environment jsdom */
/**
 * Module Purpose: Validate parity between collapsed and expanded sidebar organizer states.
 * External Dependencies: Exercises the React sidebar component via Testing Library; no HTTP usage.
 * Fallback Semantics: Not applicable; tests assert direct DOM state changes without fallbacks.
 * Timeout Strategy: Relies on Testing Library's built-in async utilities with default timeouts.
 */
import React from 'react';
import { describe, expect, it } from 'vitest';
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

describe('Sidebar collapsed and expanded parity', () => {
  it('renders collapsed mode without exposing visible text labels', async () => {
    console.info('Verifying collapsed sidebar renders icon-only feature buttons.');

    render(
      <Sidebar collapsed onToggle={() => {}} activeMode={'technical' as Mode} onSelectMode={() => {}} />,
    );

    const handles = screen.getAllByTestId(/collapsed-category-handle-/i);
    expect(handles.length).toBeGreaterThan(0);

    const workspaceText = screen.queryByText(/workspace/i);
    expect(workspaceText).not.toBeInTheDocument();

    const summarizerLabel = await screen.findByText('Technical Summarizer');
    const labelRect = summarizerLabel.getBoundingClientRect();
    expect(labelRect.width).toBeLessThanOrEqual(1);
    expect(labelRect.height).toBeLessThanOrEqual(1);
  });

  it('allows categories to reorder while collapsed', async () => {
    console.info('Ensuring collapsed category handles support drag-and-drop reordering.');

    render(
      <Sidebar collapsed onToggle={() => {}} activeMode={'technical' as Mode} onSelectMode={() => {}} />,
    );

    const orchestrationHandle = await screen.findByTestId('collapsed-category-handle-orchestration');
    const workspaceHandle = await screen.findByTestId('collapsed-category-handle-workspace');
    const dataTransfer = createDataTransfer();

    fireEvent.dragStart(orchestrationHandle, { dataTransfer });
    fireEvent.dragOver(workspaceHandle, { dataTransfer });
    fireEvent.drop(workspaceHandle, { dataTransfer });
    fireEvent.dragEnd(orchestrationHandle, { dataTransfer });

    await waitFor(() => {
      expect(getRenderedCategoryOrder()).toEqual(['orchestration', 'workspace', 'interactive']);
    });
  });

  it('allows categories to reorder while expanded', async () => {
    console.info('Verifying expanded category headers maintain drag-and-drop ordering.');

    render(
      <Sidebar
        collapsed={false}
        onToggle={() => {}}
        activeMode={'technical' as Mode}
        onSelectMode={() => {}}
      />,
    );

    await waitFor(() => {
      expect(document.querySelector('[data-category-id="workspace"]')).toBeTruthy();
      expect(document.querySelector('[data-category-id="orchestration"]')).toBeTruthy();
    });

    const orchestrationHeader = document.querySelector('[data-category-id="orchestration"]') as HTMLElement;
    const workspaceHeader = document.querySelector('[data-category-id="workspace"]') as HTMLElement;
    const dataTransfer = createDataTransfer();

    fireEvent.dragStart(orchestrationHeader, { dataTransfer });
    fireEvent.dragOver(workspaceHeader, { dataTransfer });
    fireEvent.drop(workspaceHeader, { dataTransfer });
    fireEvent.dragEnd(orchestrationHeader, { dataTransfer });

    await waitFor(() => {
      expect(getRenderedCategoryOrder()).toEqual(['orchestration', 'workspace', 'interactive']);
    });
  });

  it('reorders features within a category when expanded', async () => {
    console.info('Ensuring expanded mode supports feature drag reordering within a category.');

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
      expect(document.querySelector('[data-feature-id="technical"]')).toBeTruthy();
    });

    const scaffolderButton = document.querySelector('[data-feature-id="scaffolder"]') as HTMLElement;
    const technicalButton = document.querySelector('[data-feature-id="technical"]') as HTMLElement;
    const targetWrapper = technicalButton.parentElement as HTMLElement;
    const dataTransfer = createDataTransfer();

    fireEvent.dragStart(scaffolderButton, { dataTransfer });
    fireEvent.dragOver(targetWrapper, { dataTransfer });
    fireEvent.drop(targetWrapper, { dataTransfer });
    fireEvent.dragEnd(scaffolderButton, { dataTransfer });

    await waitFor(() => {
      expect(getRenderedFeatureOrder('workspace')).toEqual([
        'scaffolder',
        'technical',
        'styleExtractor',
        'rewriter',
        'mathFormatter',
        'reasoningStudio',
      ]);
    });
  });

  it('reorders features within a category when collapsed', async () => {
    console.info('Ensuring collapsed mode retains feature drag-and-drop ordering semantics.');

    render(
      <Sidebar collapsed onToggle={() => {}} activeMode={'technical' as Mode} onSelectMode={() => {}} />,
    );

    await waitFor(() => {
      expect(document.querySelector('[data-feature-id="styleExtractor"]')).toBeTruthy();
      expect(document.querySelector('[data-feature-id="mathFormatter"]')).toBeTruthy();
    });

    const styleExtractorButton = document.querySelector('[data-feature-id="styleExtractor"]') as HTMLElement;
    const dropZones = document.querySelectorAll(
      '[data-testid="category-section-workspace"] [data-drop-zone="true"]',
    );
    const terminalZone = dropZones[dropZones.length - 1] as HTMLElement;
    const dataTransfer = createDataTransfer();

    fireEvent.dragStart(styleExtractorButton, { dataTransfer });
    fireEvent.dragOver(terminalZone, { dataTransfer });
    fireEvent.drop(terminalZone, { dataTransfer });
    fireEvent.dragEnd(styleExtractorButton, { dataTransfer });

    await waitFor(() => {
      expect(getRenderedFeatureOrder('workspace')).toEqual([
        'technical',
        'rewriter',
        'mathFormatter',
        'reasoningStudio',
        'scaffolder',
        'styleExtractor',
      ]);
    });
  });
});
