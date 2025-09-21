/* @vitest-environment jsdom */
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
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
  it('allows collapsing and expanding navigation sections', () => {
    console.info(
      'Verifying sidebar sections toggle their mode lists without affecting the surrounding layout.',
    );

    render(
      <Sidebar
        collapsed={false}
        onToggle={noop}
        activeMode={'technical' as Mode}
        onSelectMode={noop}
      />,
    );

    const workspaceSection = screen.getByTestId('sidebar-section-workspace');
    const workspaceList = within(workspaceSection).getByRole('list');
    expect(workspaceList).toBeVisible();

    const toggleButton = within(workspaceSection).getByRole('button', { name: /workspace/i });
    fireEvent.click(toggleButton);
    expect(workspaceList).not.toBeVisible();

    fireEvent.click(toggleButton);
    expect(workspaceList).toBeVisible();
  });

  it('uses compact spacing between icons when collapsed', () => {
    console.info(
      'Ensuring collapsed sidebar sections drop extra padding so icon-only mode does not leave unintended gaps.',
    );

    render(
      <Sidebar
        collapsed={true}
        onToggle={noop}
        activeMode={'technical' as Mode}
        onSelectMode={noop}
      />,
    );

    const workspaceSection = screen.getByTestId('sidebar-section-workspace');
    expect(workspaceSection).toHaveClass('py-2');
    expect(workspaceSection).not.toHaveClass('py-4');
  });
});
