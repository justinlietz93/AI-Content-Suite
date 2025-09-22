/* @vitest-environment jsdom */
/**
 * Module Purpose: Exercise sidebar drag-and-drop interactions across collapsed and expanded modes.
 * External Dependencies: Utilizes Testing Library DOM helpers exclusively; no network or CLI calls occur.
 * Fallback Semantics: Not applicable; tests assert deterministic drag handling behavior.
 * Timeout Strategy: Depends on Testing Library's default async wait utilities.
 */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
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

describe('Sidebar drag interactions', () => {
  it('supports cross-category feature moves while updating each bucket consistently', async () => {
    console.info('Ensuring features can move across categories without desynchronizing lists.');

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
      expect(getRenderedFeatureOrder('workspace')).toEqual([
        'technical',
        'styleExtractor',
        'rewriter',
        'mathFormatter',
        'reasoningStudio',
      ]);
      expect(getRenderedFeatureOrder('orchestration')).toEqual([
        'requestSplitter',
        'promptEnhancer',
        'agentDesigner',
        'scaffolder',
      ]);
      const liveRegion = document.querySelector('[aria-live="polite"]');
      expect(liveRegion?.textContent?.trim()).toBe('Moved into category Orchestration.');
    });
  });

  it('initiates drag from collapsed feature icons via shared handles', async () => {
    console.info('Validating collapsed icon buttons expose reliable drag handles.');

    render(
      <Sidebar collapsed onToggle={() => {}} activeMode={'technical' as Mode} onSelectMode={() => {}} />,
    );

    await waitFor(() => {
      expect(document.querySelector('[data-feature-id="styleExtractor"]')).toBeTruthy();
    });

    const styleExtractorButton = document.querySelector('[data-feature-id="styleExtractor"]') as HTMLElement;
    const srOnlyLabel = styleExtractorButton.querySelector('.sr-only') as HTMLElement | null;
    expect(srOnlyLabel?.textContent).toContain('Style Extractor');

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

  it('captures button-level drops to trigger feature reorders via capture handlers', async () => {
    console.info('Ensuring feature buttons dropping directly onto peers still reorder via capture phase.');

    render(
      <Sidebar collapsed onToggle={() => {}} activeMode={'technical' as Mode} onSelectMode={() => {}} />,
    );

    await waitFor(() => {
      expect(document.querySelector('[data-feature-id="styleExtractor"]')).toBeTruthy();
      expect(document.querySelector('[data-feature-id="rewriter"]')).toBeTruthy();
    });

    const styleExtractorButton = document.querySelector('[data-feature-id="styleExtractor"]') as HTMLElement;
    const rewriterButton = document.querySelector('[data-feature-id="rewriter"]') as HTMLElement;
    const dataTransfer = createDataTransfer();

    fireEvent.dragStart(rewriterButton, { dataTransfer });
    fireEvent.drop(styleExtractorButton, { dataTransfer, clientY: 0 });
    fireEvent.dragEnd(rewriterButton, { dataTransfer });

    await waitFor(() => {
      expect(getRenderedFeatureOrder('workspace')).toEqual([
        'technical',
        'rewriter',
        'styleExtractor',
        'mathFormatter',
        'reasoningStudio',
        'scaffolder',
      ]);
    });
  });

  it('ignores drops on ambient whitespace outside explicit drop zones', async () => {
    console.info('Validating that dropping over container whitespace does not reposition features.');

    render(
      <Sidebar collapsed onToggle={() => {}} activeMode={'technical' as Mode} onSelectMode={() => {}} />,
    );

    await waitFor(() => {
      expect(document.querySelector('[data-feature-id="styleExtractor"]')).toBeTruthy();
    });

    const styleExtractorButton = document.querySelector('[data-feature-id="styleExtractor"]') as HTMLElement;
    const workspaceSection = document.querySelector('[data-testid="category-section-workspace"]') as HTMLElement;
    const dataTransfer = createDataTransfer();

    fireEvent.dragStart(styleExtractorButton, { dataTransfer });
    fireEvent.drop(workspaceSection, { dataTransfer });
    fireEvent.dragEnd(styleExtractorButton, { dataTransfer });

    await waitFor(() => {
      expect(getRenderedFeatureOrder('workspace')).toEqual([
        'technical',
        'styleExtractor',
        'rewriter',
        'mathFormatter',
        'reasoningStudio',
        'scaffolder',
      ]);
    });
  });

  it('applies high-contrast drop indicator styling when hovering feature targets', async () => {
    console.info('Checking that feature drop targets render high-contrast guides while hovering.');

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
    const rewriterButton = document.querySelector('[data-feature-id="rewriter"]') as HTMLElement;
    const rewriterWrapper = rewriterButton.parentElement as HTMLElement;
    const dataTransfer = createDataTransfer();

    fireEvent.dragStart(styleExtractorButton, { dataTransfer });
    fireEvent.dragOver(rewriterWrapper, { dataTransfer });

    const indicator = rewriterWrapper.querySelector('span.pointer-events-none');
    expect(indicator).toBeTruthy();
    expect(indicator?.className).toContain('bg-primary');
    expect(indicator?.className).toContain('h-1');
    expect(indicator?.className).toContain('ring-2');
    expect(indicator?.className).toContain('ring-primary');
    expect(indicator?.className).toContain('ring-offset-surface');
    expect(indicator?.className).not.toContain('shadow[');

    fireEvent.dragEnd(styleExtractorButton, { dataTransfer });
  });

  it('performs repeated cross-category drags without emitting console noise', async () => {
    console.info('Confirming repeated drag sequences do not log warnings or errors.');

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      render(
        <Sidebar
          collapsed={false}
          onToggle={() => {}}
          activeMode={'technical' as Mode}
          onSelectMode={() => {}}
        />,
      );

      await waitFor(() => {
        expect(document.querySelector('[data-feature-id="technical"]')).toBeTruthy();
        expect(document.querySelector('[data-category-id="workspace"]')).toBeTruthy();
        expect(document.querySelector('[data-category-id="orchestration"]')).toBeTruthy();
      });

      const iterations = 20;

      for (let iteration = 0; iteration < iterations; iteration += 1) {
        const targetCategoryId = getRenderedFeatureOrder('workspace').includes('technical')
          ? 'orchestration'
          : 'workspace';
        const sourceButton = document.querySelector('[data-feature-id="technical"]') as HTMLElement;
        const targetCategory = document.querySelector(
          `[data-category-id="${targetCategoryId}"]`,
        ) as HTMLElement;
        const dataTransfer = createDataTransfer();

        fireEvent.dragStart(sourceButton, { dataTransfer });
        fireEvent.dragOver(targetCategory, { dataTransfer });
        fireEvent.drop(targetCategory, { dataTransfer });
        fireEvent.dragEnd(sourceButton, { dataTransfer });

        await waitFor(() => {
          expect(getRenderedFeatureOrder(targetCategoryId).includes('technical')).toBe(true);
        });
      }
    } finally {
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    }

    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
