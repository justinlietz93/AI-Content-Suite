/* @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { WorkspaceLayout } from '../components/layouts/WorkspaceLayout';
import { WORKSPACE_CARD_MIN_HEIGHT } from '../config/uiConfig';
import type { AppState, Mode, ProgressUpdate } from '../types';

if (typeof window !== 'undefined' && !('ResizeObserver' in window)) {
  class MockResizeObserver {
    observe() {}
    disconnect() {}
    unobserve() {}
  }
  // @ts-ignore - jsdom environment needs a lightweight polyfill
  window.ResizeObserver = MockResizeObserver;
}

if (typeof window !== 'undefined' && typeof window.HTMLElement !== 'undefined') {
  const proto = window.HTMLElement.prototype as { scrollIntoView?: (options?: unknown) => void };
  if (!proto.scrollIntoView) {
    proto.scrollIntoView = () => {};
  }
}

const noop = () => {};

const baseProgress: ProgressUpdate = {
  stage: 'Idle',
  percentage: 0,
};

const baseProps = {
  activeMode: 'chat' as Mode,
  sidebarProps: {
    collapsed: false,
    onToggle: noop,
    activeMode: 'chat' as Mode,
  },
  onModeChange: noop,
  headerProps: {
    isSidebarCollapsed: false,
    onToggleSidebar: noop,
    activeProviderLabel: 'OpenAI',
    activeModelName: 'gpt-5.1-mini',
  },
  layoutControls: {
    contentWidthLabel: '70%',
    contentWidthPercent: 70,
    onWidthPercentChange: noop,
    appliedContentWidth: '960px',
  },
  providerBanner: {
    activeProviderLabel: 'OpenAI',
    activeModelName: 'gpt-5.1-mini',
    statusText: 'Ready',
    statusTone: 'text-primary',
    onManageSettings: noop,
  },
  showChat: false,
  showMainForm: false,
  showSubmitButton: false,
  buttonText: 'Submit',
  onSubmit: noop,
  appState: 'idle' as AppState,
  progress: baseProgress,
  onStop: noop,
  showResults: false,
  showError: false,
  onErrorReset: noop,
  providerSummaryText: 'OpenAI',
} satisfies React.ComponentProps<typeof WorkspaceLayout>;

describe('WorkspaceLayout', () => {
  it('applies a consistent height clamp to the workspace card', () => {
    render(<WorkspaceLayout {...baseProps} />);
    const card = screen.getByTestId('workspace-card');
    expect(card).toHaveStyle({ minHeight: WORKSPACE_CARD_MIN_HEIGHT });
    expect(card).toHaveStyle({ maxHeight: WORKSPACE_CARD_MIN_HEIGHT });
    expect(card).toHaveStyle({ height: WORKSPACE_CARD_MIN_HEIGHT });
  });
});
