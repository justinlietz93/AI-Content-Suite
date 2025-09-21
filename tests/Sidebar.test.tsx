/* @vitest-environment jsdom */
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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

afterEach(() => {
  cleanup();
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
});
