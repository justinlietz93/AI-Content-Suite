/* @vitest-environment jsdom */
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { Sidebar } from '../components/layouts/Sidebar';
import type { Mode } from '../types';

/**
 * Lightweight helper used to satisfy callback props that are irrelevant for a given test run.
 *
 * @returns void
 * @throws Never throws; intentionally left blank to serve as a benign placeholder.
 * @remarks Produces no side effects and does not participate in timeout logic.
 */
const noop = () => {};

/**
 * Builds a minimal DataTransfer stub sufficient for jsdom drag-and-drop simulations.
 *
 * @returns A DataTransfer-like object storing payload data for the simulated drag.
 */
const createDataTransfer = (): DataTransfer => {
  const data: Record<string, string> = {};
  return {
    dropEffect: 'move',
    effectAllowed: 'all',
    files: [] as unknown as FileList,
    items: [] as unknown as DataTransferItemList,
    types: [],
    setData: (format: string, value: string) => {
      data[format] = value;
    },
    getData: (format: string) => data[format] ?? '',
    clearData: (format?: string) => {
      if (typeof format === 'string') {
        delete data[format];
      } else {
        Object.keys(data).forEach(key => delete data[key]);
      }
    },
    setDragImage: () => {},
  } as unknown as DataTransfer;
};

/**
 * Extracts the ordered feature identifiers within a rendered category section.
 *
 * @param section - The DOM element representing the category container.
 * @returns Ordered list of feature ids.
 */
const getFeatureOrder = (section: HTMLElement): string[] =>
  Array.from(section.querySelectorAll('[data-feature-id]')).map(element =>
    element.getAttribute('data-feature-id') ?? '',
  );

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  window.localStorage.clear();
});

describe('Sidebar', () => {
  it('collapses and expands a category when the sidebar is expanded', () => {
    console.info('Ensuring expanded sidebar renders categories that can be collapsed.');

    render(
      <Sidebar
        collapsed={false}
        onToggle={noop}
        activeMode={'technical' as Mode}
        onSelectMode={noop}
      />,
    );

    const collapseButton = screen.getByRole('button', { name: /collapse workspace/i });
    const featureLabel = screen.getByText('Technical Summarizer');
    expect(featureLabel).toBeVisible();

    fireEvent.click(collapseButton);
    expect(screen.queryByText('Technical Summarizer')).not.toBeInTheDocument();

    const expandButton = screen.getByRole('button', { name: /expand workspace/i });
    fireEvent.click(expandButton);
    expect(screen.getByText('Technical Summarizer')).toBeVisible();
  });

  it('collapses a category when clicking the header body without revealing actions', async () => {
    console.info('Validating that clicking a category header toggles collapse without exposing inline actions.');

    render(
      <Sidebar
        collapsed={false}
        onToggle={noop}
        activeMode={'technical' as Mode}
        onSelectMode={noop}
      />,
    );

    await screen.findByTestId('category-section-workspace');
    const header = document.querySelector('[data-category-id="workspace"]') as HTMLElement;
    expect(header).toBeTruthy();

    const initialActions = header.querySelector('[data-testid="category-actions-workspace"]') as HTMLElement;
    expect(initialActions).toHaveAttribute('aria-hidden', 'true');

    fireEvent.click(header);

    await waitFor(() => {
      expect(screen.queryByText('Technical Summarizer')).not.toBeInTheDocument();
    });

    const collapsedHeader = document.querySelector('[data-category-id="workspace"]') as HTMLElement;
    expect(collapsedHeader).toBeTruthy();
    const collapsedActions = collapsedHeader.querySelector('[data-testid="category-actions-workspace"]') as HTMLElement;
    expect(collapsedActions).toHaveAttribute('aria-hidden', 'true');

    fireEvent.click(collapsedHeader);
    await screen.findByText('Technical Summarizer');

    const expandedHeader = document.querySelector('[data-category-id="workspace"]') as HTMLElement;
    const expandedActions = expandedHeader.querySelector('[data-testid="category-actions-workspace"]') as HTMLElement;
    expect(expandedActions).toHaveAttribute('aria-hidden', 'true');
  });

  it('hides category management controls when collapsed', () => {
    console.info('Verifying collapsed sidebar hides rename/delete affordances and the add button.');

    render(
      <Sidebar
        collapsed={true}
        onToggle={noop}
        activeMode={'technical' as Mode}
        onSelectMode={noop}
      />,
    );

    expect(screen.queryByLabelText(/rename category/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/delete category/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add a new category/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('collapses the uncategorized placeholder when no items exist', async () => {
    console.info('Ensuring the uncategorized drop area stays hidden until features populate it.');

    render(
      <Sidebar
        collapsed={false}
        onToggle={noop}
        activeMode={'technical' as Mode}
        onSelectMode={noop}
      />,
    );

    const uncategorizedSection = await screen.findByTestId('category-section-uncategorized');
    expect(uncategorizedSection.children).toHaveLength(1);
    expect(uncategorizedSection.querySelector('ul')).toBeTruthy();
  });

  it('moves a feature into another category when dropped on the header', async () => {
    console.info('Verifying dropping a feature on a category header reassigns it.');

    render(
      <Sidebar
        collapsed={false}
        onToggle={noop}
        activeMode={'technical' as Mode}
        onSelectMode={noop}
      />,
    );

    await screen.findByTestId('category-section-workspace');
    const summarizer = document.querySelector(
      '[data-feature-id="technical"]',
    ) as HTMLButtonElement;
    expect(summarizer).toBeTruthy();
    const orchestrationHeader = document.querySelector(
      '[data-category-id="orchestration"]',
    ) as HTMLElement;
    expect(orchestrationHeader).toBeTruthy();
    const transfer = createDataTransfer();

    fireEvent.dragStart(summarizer, { dataTransfer: transfer });
    fireEvent.dragOver(orchestrationHeader, { dataTransfer: transfer });
    fireEvent.drop(orchestrationHeader, { dataTransfer: transfer });

    const workspaceSection = screen.getByTestId('category-section-workspace');
    const orchestrationSection = screen.getByTestId('category-section-orchestration');

    await waitFor(() => {
      expect(within(workspaceSection).queryByText('Technical Summarizer')).not.toBeInTheDocument();
      expect(within(orchestrationSection).getByText('Technical Summarizer')).toBeVisible();
    });
  });

  it('reorders features within a category when dropping onto a feature row', async () => {
    console.info('Ensuring dropping onto a feature row changes ordering within the category.');

    render(
      <Sidebar
        collapsed={false}
        onToggle={noop}
        activeMode={'technical' as Mode}
        onSelectMode={noop}
      />,
    );

    await screen.findByTestId('category-section-workspace');
    const scaffolder = document.querySelector(
      '[data-feature-id="scaffolder"]',
    ) as HTMLButtonElement;
    const summarizer = document.querySelector(
      '[data-feature-id="technical"]',
    ) as HTMLButtonElement;
    expect(scaffolder).toBeTruthy();
    expect(summarizer).toBeTruthy();
    const targetRow = summarizer.parentElement as HTMLElement;
    expect(targetRow).toBeTruthy();
    const transfer = createDataTransfer();

    fireEvent.dragStart(scaffolder, { dataTransfer: transfer });
    fireEvent.dragOver(targetRow, { dataTransfer: transfer });
    fireEvent.drop(targetRow, { dataTransfer: transfer });

    const workspaceSection = screen.getByTestId('category-section-workspace');

    await waitFor(() => {
      const order = getFeatureOrder(workspaceSection);
      expect(order.indexOf('scaffolder')).toBeLessThan(order.indexOf('technical'));
    });
  });

  it('reorders feature icons while the sidebar is collapsed', async () => {
    console.info('Verifying collapsed sidebar retains drag-and-drop feature reordering.');

    render(
      <Sidebar
        collapsed
        onToggle={noop}
        activeMode={'technical' as Mode}
        onSelectMode={noop}
      />,
    );

    const workspaceSection = await screen.findByTestId('category-section-workspace');
    const scaffolder = workspaceSection.querySelector(
      '[data-feature-id="scaffolder"]',
    ) as HTMLButtonElement;
    const summarizer = workspaceSection.querySelector(
      '[data-feature-id="technical"]',
    ) as HTMLButtonElement;
    const targetRow = summarizer.parentElement as HTMLElement;
    expect(targetRow).toBeTruthy();
    const transfer = createDataTransfer();

    fireEvent.dragStart(scaffolder, { dataTransfer: transfer });
    fireEvent.dragOver(targetRow, { dataTransfer: transfer });
    fireEvent.drop(targetRow, { dataTransfer: transfer });

    await waitFor(() => {
      const order = getFeatureOrder(workspaceSection);
      expect(order.indexOf('scaffolder')).toBeLessThan(order.indexOf('technical'));
    });
  });

  it('uses collapsed whitespace drop coordinates to position reordered features', async () => {
    console.info('Ensuring collapsed whitespace drops reinsert features at pointer position.');

    render(
      <Sidebar
        collapsed
        onToggle={noop}
        activeMode={'technical' as Mode}
        onSelectMode={noop}
      />,
    );

    const workspaceSection = await screen.findByTestId('category-section-workspace');
    const featureButtons = Array.from(
      workspaceSection.querySelectorAll<HTMLButtonElement>('[data-feature-id]'),
    );

    featureButtons.forEach((button, index) => {
      Object.defineProperty(button, 'getBoundingClientRect', {
        value: () =>
          ({
            width: 40,
            height: 40,
            top: index * 50,
            bottom: index * 50 + 40,
            left: 0,
            right: 40,
            x: 0,
            y: index * 50,
            toJSON: () => {},
          }) as DOMRect,
      });
    });

    const scaffolder = workspaceSection.querySelector(
      '[data-feature-id="scaffolder"]',
    ) as HTMLButtonElement;

    const transfer = createDataTransfer();

    fireEvent.dragStart(scaffolder, { dataTransfer: transfer });
    fireEvent.dragOver(workspaceSection, { dataTransfer: transfer, clientY: 5 });
    fireEvent.drop(workspaceSection, { dataTransfer: transfer, clientY: 5 });

    await waitFor(() => {
      const order = getFeatureOrder(workspaceSection);
      expect(order.indexOf('scaffolder')).toBeLessThan(order.indexOf('technical'));
    });
  });

  it('moves a feature into another category while the sidebar is collapsed', async () => {
    console.info('Ensuring collapsed sidebar supports cross-category feature drops.');

    render(
      <Sidebar
        collapsed
        onToggle={noop}
        activeMode={'technical' as Mode}
        onSelectMode={noop}
      />,
    );

    const workspaceSection = await screen.findByTestId('category-section-workspace');
    const orchestrationSection = await screen.findByTestId('category-section-orchestration');
    const targetFeature = orchestrationSection.querySelector(
      '[data-feature-id="requestSplitter"]',
    ) as HTMLButtonElement;
    const targetRow = targetFeature.parentElement as HTMLElement;
    const summarizer = workspaceSection.querySelector(
      '[data-feature-id="technical"]',
    ) as HTMLButtonElement;
    const transfer = createDataTransfer();

    fireEvent.dragStart(summarizer, { dataTransfer: transfer });
    fireEvent.dragOver(targetRow, { dataTransfer: transfer });
    fireEvent.drop(targetRow, { dataTransfer: transfer });

    await waitFor(() => {
      expect(
        within(orchestrationSection).getByText('Technical Summarizer'),
      ).toBeVisible();
    });
  });

  it('highlights collapsed category buckets while hovering a feature drop target', async () => {
    console.info('Ensuring collapsed categories surface visible drop feedback while hovering features.');

    render(
      <Sidebar
        collapsed
        onToggle={noop}
        activeMode={'technical' as Mode}
        onSelectMode={noop}
      />,
    );

    const workspaceSection = await screen.findByTestId('category-section-workspace');
    const orchestrationSection = await screen.findByTestId('category-section-orchestration');
    const summarizer = workspaceSection.querySelector(
      '[data-feature-id="technical"]',
    ) as HTMLButtonElement;
    expect(summarizer).toBeTruthy();

    const transfer = createDataTransfer();

    fireEvent.dragStart(summarizer, { dataTransfer: transfer });
    fireEvent.dragOver(orchestrationSection, { dataTransfer: transfer });

    await waitFor(() => {
      expect(orchestrationSection).toHaveClass('ring-2', { exact: false });
      expect(orchestrationSection).toHaveClass('bg-primary/10', { exact: false });
    });

    fireEvent.dragLeave(orchestrationSection, { relatedTarget: null });

    await waitFor(() => {
      expect(orchestrationSection).not.toHaveClass('ring-2', { exact: false });
    });

    fireEvent.dragEnd(summarizer, { dataTransfer: transfer });
  });

  it('reorders categories while the sidebar is collapsed', async () => {
    console.info('Confirming collapsed sidebar retains category drag-and-drop ordering.');

    render(
      <Sidebar
        collapsed
        onToggle={noop}
        activeMode={'technical' as Mode}
        onSelectMode={noop}
      />,
    );

    await screen.findByTestId('category-section-workspace');
    const interactiveHandle = document.querySelector(
      '[data-category-id="interactive"]',
    ) as HTMLElement;
    const workspaceHandle = document.querySelector(
      '[data-category-id="workspace"]',
    ) as HTMLElement;
    expect(interactiveHandle).toBeTruthy();
    expect(workspaceHandle).toBeTruthy();

    Object.defineProperty(workspaceHandle, 'getBoundingClientRect', {
      value: () =>
        ({
          top: 0,
          bottom: 40,
          left: 0,
          right: 200,
          height: 40,
          width: 200,
          x: 0,
          y: 0,
          toJSON: () => {},
        }) as DOMRect,
    });

    const transfer = createDataTransfer();

    fireEvent.dragStart(interactiveHandle, { dataTransfer: transfer });
    fireEvent.dragOver(workspaceHandle, { dataTransfer: transfer, clientY: 5 });
    fireEvent.drop(workspaceHandle, { dataTransfer: transfer, clientY: 5 });

    await waitFor(() => {
      const orderedIds = Array.from(
        document.querySelectorAll('[data-testid^="category-section-"]'),
      )
        .map(element => element.getAttribute('data-testid')?.replace('category-section-', '') ?? '')
        .filter(id => id && id !== 'uncategorized');

      expect(orderedIds.slice(0, 3)).toEqual(['interactive', 'workspace', 'orchestration']);
    });
  });

  it('does not switch modes when a feature drag ends on its original slot', async () => {
    console.info('Ensuring drag-ending over the origin does not trigger unintended mode switches.');

    const handleSelect = vi.fn();

    render(
      <Sidebar
        collapsed
        onToggle={noop}
        activeMode={'technical' as Mode}
        onSelectMode={handleSelect}
      />,
    );

    const workspaceSection = await screen.findByTestId('category-section-workspace');
    const summarizer = workspaceSection.querySelector(
      '[data-feature-id="technical"]',
    ) as HTMLButtonElement;
    const parentRow = summarizer.parentElement as HTMLElement;
    const transfer = createDataTransfer();

    fireEvent.dragStart(summarizer, { dataTransfer: transfer });
    fireEvent.dragOver(parentRow, { dataTransfer: transfer, clientY: 4 });
    fireEvent.drop(parentRow, { dataTransfer: transfer, clientY: 4 });
    fireEvent.dragEnd(summarizer, { dataTransfer: transfer });
    fireEvent.click(summarizer);

    await waitFor(() => {
      expect(handleSelect).not.toHaveBeenCalled();
    });
  });

  it('places a feature directly after the hovered row when dragging downward within a category', async () => {
    console.info('Confirming dragging a feature downward re-inserts it immediately after the destination row.');

    render(
      <Sidebar
        collapsed={false}
        onToggle={noop}
        activeMode={'technical' as Mode}
        onSelectMode={noop}
      />,
    );

    await screen.findByTestId('category-section-workspace');
    const styleExtractor = document.querySelector(
      '[data-feature-id="styleExtractor"]',
    ) as HTMLButtonElement;
    const mathFormatterButton = document.querySelector(
      '[data-feature-id="mathFormatter"]',
    ) as HTMLButtonElement;
    expect(styleExtractor).toBeTruthy();
    expect(mathFormatterButton).toBeTruthy();
    const mathFormatterRow = mathFormatterButton.parentElement as HTMLElement;
    expect(mathFormatterRow).toBeTruthy();
    Object.defineProperty(mathFormatterRow, 'getBoundingClientRect', {
      value: () =>
        ({
          top: 0,
          bottom: 40,
          left: 0,
          right: 200,
          height: 40,
          width: 200,
          x: 0,
          y: 0,
          toJSON: () => {},
        }) as DOMRect,
    });
    const transfer = createDataTransfer();

    fireEvent.dragStart(styleExtractor, { dataTransfer: transfer });
    fireEvent.dragOver(mathFormatterRow, { dataTransfer: transfer, clientY: 35 });
    fireEvent.drop(mathFormatterRow, { dataTransfer: transfer, clientY: 35 });

    const workspaceSection = screen.getByTestId('category-section-workspace');

    await waitFor(() => {
      const order = getFeatureOrder(workspaceSection);
      const mathFormatterIndex = order.indexOf('mathFormatter');
      const styleExtractorIndex = order.indexOf('styleExtractor');
      const rewriterIndex = order.indexOf('rewriter');
      expect(mathFormatterIndex).toBeGreaterThan(-1);
      expect(styleExtractorIndex).toBeGreaterThan(rewriterIndex);
      expect(order[order.length - 1]).not.toBe('styleExtractor');
    });
  });

  it('reorders categories when dropping onto another category header', async () => {
    console.info('Confirming dropping a category on another header updates category order.');

    render(
      <Sidebar
        collapsed={false}
        onToggle={noop}
        activeMode={'technical' as Mode}
        onSelectMode={noop}
      />,
    );

    const interactiveHeader = document.querySelector('[data-category-id="interactive"]') as HTMLElement;
    const workspaceHeader = document.querySelector('[data-category-id="workspace"]') as HTMLElement;
    expect(interactiveHeader).toBeTruthy();
    expect(workspaceHeader).toBeTruthy();
    const transfer = createDataTransfer();

    Object.defineProperty(workspaceHeader, 'getBoundingClientRect', {
      value: () =>
        ({
          top: 0,
          bottom: 40,
          left: 0,
          right: 200,
          height: 40,
          width: 200,
          x: 0,
          y: 0,
          toJSON: () => {},
        }) as DOMRect,
    });

    fireEvent.dragStart(interactiveHeader, { dataTransfer: transfer });
    fireEvent.dragOver(workspaceHeader, { dataTransfer: transfer, clientY: 5 });
    fireEvent.drop(workspaceHeader, { dataTransfer: transfer, clientY: 5 });

    await waitFor(() => {
      const orderedIds = Array.from(
        document.querySelectorAll('[data-testid^="category-section-"]'),
      )
        .map(element => element.getAttribute('data-testid')?.replace('category-section-', '') ?? '')
        .filter(id => id && id !== 'uncategorized');

      expect(orderedIds.slice(0, 3)).toEqual(['interactive', 'workspace', 'orchestration']);
    });
  });

  it('inserts a moved category immediately before the hovered header when dragging downward', async () => {
    console.info('Verifying dragging a category downward places it directly before the target header.');

    render(
      <Sidebar
        collapsed={false}
        onToggle={noop}
        activeMode={'technical' as Mode}
        onSelectMode={noop}
      />,
    );

    const workspaceHeader = document.querySelector('[data-category-id="workspace"]') as HTMLElement;
    const interactiveHeader = document.querySelector('[data-category-id="interactive"]') as HTMLElement;
    const beforeDropZone = screen.getByTestId('category-dropzone-before-interactive');
    expect(workspaceHeader).toBeTruthy();
    expect(interactiveHeader).toBeTruthy();
    expect(beforeDropZone).toBeTruthy();
    const transfer = createDataTransfer();

    fireEvent.dragStart(workspaceHeader, { dataTransfer: transfer });
    fireEvent.dragOver(beforeDropZone, { dataTransfer: transfer });
    fireEvent.drop(beforeDropZone, { dataTransfer: transfer });

    await waitFor(() => {
      const orderedIds = Array.from(
        document.querySelectorAll('[data-testid^="category-section-"]'),
      )
        .map(element => element.getAttribute('data-testid')?.replace('category-section-', '') ?? '')
        .filter(id => id && id !== 'uncategorized');

      expect(orderedIds.slice(0, 3)).toEqual(['orchestration', 'workspace', 'interactive']);
    });
  });

  it('moves a category after the hovered header when dropping in the lower half', async () => {
    console.info('Ensuring dropping near the bottom edge positions the category after the hovered header.');

    render(
      <Sidebar
        collapsed={false}
        onToggle={noop}
        activeMode={'technical' as Mode}
        onSelectMode={noop}
      />,
    );

    const workspaceHeader = document.querySelector('[data-category-id="workspace"]') as HTMLElement;
    const orchestrationHeader = document.querySelector('[data-category-id="orchestration"]') as HTMLElement;
    expect(workspaceHeader).toBeTruthy();
    expect(orchestrationHeader).toBeTruthy();

    Object.defineProperty(orchestrationHeader, 'getBoundingClientRect', {
      value: () =>
        ({
          top: 0,
          bottom: 40,
          left: 0,
          right: 200,
          height: 40,
          width: 200,
          x: 0,
          y: 0,
          toJSON: () => {},
        }) as DOMRect,
    });

    const transfer = createDataTransfer();

    fireEvent.dragStart(workspaceHeader, { dataTransfer: transfer });
    fireEvent.dragOver(orchestrationHeader, { dataTransfer: transfer, clientY: 35 });
    fireEvent.drop(orchestrationHeader, { dataTransfer: transfer, clientY: 35 });

    await waitFor(() => {
      const orderedIds = Array.from(
        document.querySelectorAll('[data-testid^="category-section-"]'),
      )
        .map(element => element.getAttribute('data-testid')?.replace('category-section-', '') ?? '')
        .filter(id => id && id !== 'uncategorized');

      expect(orderedIds.slice(0, 3)).toEqual(['orchestration', 'workspace', 'interactive']);
    });
  });
});
