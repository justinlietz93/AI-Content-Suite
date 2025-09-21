/* @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { WorkspaceLayout } from '../components/layouts/WorkspaceLayout';
import {
  FEATURE_PANEL_DEFAULT_FOOTER_HEIGHT,
  FEATURE_PANEL_PROCESSING_FOOTER_HEIGHT,
  WORKSPACE_CARD_MIN_HEIGHT,
} from '../config/uiConfig';
import type { AppState, Mode, ProcessedOutput, ProgressUpdate } from '../types';
import type { ChatInterfaceProps } from '../components/layouts/ChatInterface';
import type { MainFormProps } from '../components/layouts/MainForm';
import {
  INITIAL_AGENT_DESIGNER_SETTINGS,
  INITIAL_PROMPT_ENHANCER_SETTINGS,
  INITIAL_REASONING_SETTINGS,
  INITIAL_REQUEST_SPLITTER_SETTINGS,
  INITIAL_SCAFFOLDER_SETTINGS,
} from '../constants';

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

afterEach(() => {
  cleanup();
});

const baseProgress: ProgressUpdate = {
  stage: 'Idle',
  percentage: 0,
};

const createChatProps = (): ChatInterfaceProps => ({
  history: [],
  isStreaming: false,
  chatInput: '',
  onChatInputChange: noop,
  chatFiles: null,
  onChatFilesChange: noop,
  onSubmit: noop,
  canSubmit: true,
  onOpenSettings: noop,
});

const createMainFormProps = (): MainFormProps => ({
  activeMode: 'technical',
  currentFiles: null,
  summaryFormat: 'default',
  onSummaryFormatChange: noop,
  summarySearchTerm: '',
  onSummarySearchTermChange: noop,
  summaryTextInput: '',
  onSummaryTextChange: noop,
  useHierarchical: false,
  onUseHierarchicalChange: noop,
  styleTarget: '',
  onStyleTargetChange: noop,
  rewriteStyle: '',
  onRewriteStyleChange: noop,
  rewriteInstructions: '',
  onRewriteInstructionsChange: noop,
  rewriteLength: 'medium',
  onRewriteLengthChange: noop,
  reasoningPrompt: '',
  onReasoningPromptChange: noop,
  reasoningSettings: JSON.parse(JSON.stringify(INITIAL_REASONING_SETTINGS)) as typeof INITIAL_REASONING_SETTINGS,
  onReasoningSettingsChange: noop,
  scaffolderPrompt: '',
  onScaffolderPromptChange: noop,
  scaffolderSettings: JSON.parse(JSON.stringify(INITIAL_SCAFFOLDER_SETTINGS)) as typeof INITIAL_SCAFFOLDER_SETTINGS,
  onScaffolderSettingsChange: noop,
  requestSplitterSpec: '',
  onRequestSplitterSpecChange: noop,
  requestSplitterSettings: JSON.parse(JSON.stringify(INITIAL_REQUEST_SPLITTER_SETTINGS)) as typeof INITIAL_REQUEST_SPLITTER_SETTINGS,
  onRequestSplitterSettingsChange: noop,
  promptEnhancerSettings: JSON.parse(JSON.stringify(INITIAL_PROMPT_ENHANCER_SETTINGS)) as typeof INITIAL_PROMPT_ENHANCER_SETTINGS,
  onPromptEnhancerSettingsChange: noop,
  agentDesignerSettings: JSON.parse(JSON.stringify(INITIAL_AGENT_DESIGNER_SETTINGS)) as typeof INITIAL_AGENT_DESIGNER_SETTINGS,
  onAgentDesignerSettingsChange: noop,
  onFileSelect: noop,
});

const processingProgress: ProgressUpdate = {
  stage: 'Processing',
  percentage: 42,
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
  providerBanner: {
    activeProviderLabel: 'OpenAI',
    activeModelName: 'gpt-5.1-mini',
    statusText: 'Ready',
    statusTone: 'text-primary',
    onManageSettings: noop,
  },
  showChat: false,
  chatProps: createChatProps(),
  showMainForm: false,
  mainFormProps: createMainFormProps(),
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
    expect(card.style.getPropertyValue('--feature-panel-footer-default')).toBe(
      FEATURE_PANEL_DEFAULT_FOOTER_HEIGHT,
    );
    expect(card.style.getPropertyValue('--feature-panel-footer-processing')).toBe(
      FEATURE_PANEL_PROCESSING_FOOTER_HEIGHT,
    );
  });

  it('updates the feature panel footer reserve across states', async () => {
    const { rerender } = render(
      <WorkspaceLayout
        {...baseProps}
        showChat
        chatProps={createChatProps()}
        showMainForm={false}
      />,
    );

    const panel = await screen.findByTestId('feature-panel');
    expect(panel.style.getPropertyValue('--feature-panel-footer-height')).toBe('0px');

    rerender(
      <WorkspaceLayout
        {...baseProps}
        showChat={false}
        showMainForm
        mainFormProps={createMainFormProps()}
        showSubmitButton
      />,
    );

    const panelWithSubmit = await screen.findByTestId('feature-panel');
    expect(panelWithSubmit.style.getPropertyValue('--feature-panel-footer-height')).toBe(
      'var(--feature-panel-footer-default)',
    );

    rerender(
      <WorkspaceLayout
        {...baseProps}
        showChat={false}
        showMainForm
        mainFormProps={createMainFormProps()}
        showSubmitButton={false}
        appState={'processing' as AppState}
        progress={processingProgress}
      />,
    );

    const panelProcessing = await screen.findByTestId('feature-panel');
    expect(panelProcessing.style.getPropertyValue('--feature-panel-footer-height')).toBe(
      'var(--feature-panel-footer-processing)',
    );
  });

  it('renders completion output within the feature panel content area', () => {
    const promptEnhancerProcessedData = {
      enhancedPromptMd: '# Example Prompt',
      enhancedPromptJson: {
        template: 'featureBuilder',
        title: 'Example Prompt',
      },
    } as ProcessedOutput;

    render(
      <WorkspaceLayout
        {...baseProps}
        showChat={false}
        showMainForm={false}
        appState={'completed' as AppState}
        showSubmitButton={false}
        showResults
        resultsProps={{
          processedData: promptEnhancerProcessedData,
          activeMode: 'promptEnhancer',
          scaffolderSettings: JSON.parse(
            JSON.stringify(INITIAL_SCAFFOLDER_SETTINGS),
          ) as typeof INITIAL_SCAFFOLDER_SETTINGS,
          onReset: noop,
          onOpenReportModal: noop,
          onDownloadReasoning: noop,
          onDownloadScaffold: noop,
          onDownloadRequestSplitter: noop,
          onDownloadPromptEnhancer: noop,
          onDownloadAgentDesigner: noop,
        }}
      />,
    );

    const panel = screen.getByTestId('feature-panel');
    expect(panel).toHaveTextContent('Processing Complete!');
    expect(screen.getByText('Processing Complete!')).toBeInTheDocument();
  });

  it('keeps the feature panel content scrollable to avoid truncating results', () => {
    render(
      <WorkspaceLayout
        {...baseProps}
        showChat
        chatProps={createChatProps()}
      />,
    );

    const contentRegion = screen.getByTestId('feature-panel-content');
    console.info(
      'WorkspaceLayout: verifying the standardized feature panel exposes vertical scrolling so chat transcripts remain fully visible.',
    );
    expect(contentRegion).toHaveClass('overflow-y-auto');
    expect(contentRegion).toHaveClass('overflow-x-hidden');
  });
});
