import React from 'react';
import type { Mode, ProcessingError } from '../../types';
import type { AppState, ProgressUpdate } from '../../types';
import { Sidebar } from './Sidebar';
import { Tabs } from '../ui/Tabs';
import { ChatInterface, ChatInterfaceProps } from './ChatInterface';
import { MainForm, MainFormProps } from './MainForm';
import { SubmitButton } from '../ui/SubmitButton';
import { StopButton } from '../ui/StopButton';
import { ResultsViewer, ResultsViewerProps } from './ResultsViewer';
import { ProgressBar } from '../ui/ProgressBar';
import { DESCRIPTION_TEXT, TABS } from '../../constants/uiConstants';
import { WORKSPACE_CARD_MIN_HEIGHT } from '../../config/uiConfig';
import { XCircleIcon } from '../icons/XCircleIcon';

interface WorkspaceLayoutProps {
  activeMode: Mode;
  sidebarProps: React.ComponentProps<typeof Sidebar>;
  onModeChange: (mode: Mode) => void;
  headerProps: {
    isSidebarCollapsed: boolean;
    onToggleSidebar: () => void;
    activeProviderLabel: string;
    activeModelName: string;
  };
  layoutControls: {
    contentWidthLabel: string;
    contentWidthPercent: number;
    onWidthPercentChange: (value: number) => void;
    appliedContentWidth: string;
  };
  providerBanner: {
    activeProviderLabel: string;
    activeModelName: string;
    statusText: string;
    statusTone: string;
    onManageSettings: () => void;
  };
  showChat: boolean;
  chatProps?: ChatInterfaceProps;
  showMainForm: boolean;
  mainFormProps?: MainFormProps;
  showSubmitButton: boolean;
  buttonText: string;
  onSubmit: () => void;
  appState: AppState;
  progress: ProgressUpdate;
  onStop: () => void;
  showResults: boolean;
  resultsProps?: ResultsViewerProps;
  showError: boolean;
  error?: ProcessingError | null;
  onErrorReset: () => void;
  providerSummaryText: string;
}

export const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({
  activeMode,
  sidebarProps,
  onModeChange,
  headerProps,
  layoutControls,
  providerBanner,
  showChat,
  chatProps,
  showMainForm,
  mainFormProps,
  showSubmitButton,
  buttonText,
  onSubmit,
  appState,
  progress,
  onStop,
  showResults,
  resultsProps,
  showError,
  error,
  onErrorReset,
  providerSummaryText,
}) => {
  const description = DESCRIPTION_TEXT[activeMode];
  const isProcessing = appState === 'processing';

  return (
    <div className="relative min-h-screen flex bg-transparent text-text-primary">
      <Sidebar {...sidebarProps} />
      <div className="flex-1 flex flex-col">
        <header className="flex items-center justify-between bg-surface/75 px-4 py-3 sm:px-6 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={headerProps.onToggleSidebar}
              className="md:hidden rounded-md bg-secondary/70 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-text-secondary hover:text-text-primary hover:bg-secondary/80 transition-colors"
              aria-label={headerProps.isSidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
            >
              Menu
            </button>
            <div className="text-left">
              <h1 className="text-xl font-semibold text-text-primary">AI Content Suite</h1>
              <p className="text-xs text-text-secondary">Unified workspace for advanced content tooling</p>
            </div>
          </div>
          <div className="hidden sm:flex flex-col items-end text-xs text-text-secondary">
            <span>
              Active provider: <span className="text-text-primary font-semibold">{headerProps.activeProviderLabel}</span>
            </span>
            <span>
              Model: <span className="text-text-primary font-medium">{headerProps.activeModelName || 'Select a model'}</span>
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-10 py-6">
          <div
            className="mx-auto flex flex-col gap-4 flex-1 min-h-0"
            style={{ width: layoutControls.appliedContentWidth, maxWidth: '100%' }}
          >
            <div className="rounded-xl bg-secondary/70 px-4 py-3 shadow-inner">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-text-secondary">Workspace width</p>
                  <p className="text-sm font-medium text-text-primary">{layoutControls.contentWidthLabel}</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs text-text-secondary">Compact</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={layoutControls.contentWidthPercent}
                    onChange={event => layoutControls.onWidthPercentChange(Number(event.target.value))}
                    className="flex-1 sm:w-48 accent-primary"
                    aria-label="Adjust workspace width"
                  />
                  <span className="text-xs text-text-secondary">Full</span>
                </div>
              </div>
            </div>

            <div
              data-testid="workspace-card"
              className="bg-surface/95 shadow-2xl rounded-2xl animate-breathing-glow p-6 sm:p-8 backdrop-blur-sm flex flex-col min-h-0 overflow-hidden"
              style={{
                minHeight: WORKSPACE_CARD_MIN_HEIGHT,
                maxHeight: WORKSPACE_CARD_MIN_HEIGHT,
                height: WORKSPACE_CARD_MIN_HEIGHT,
              }}
            >
              <header className="mb-6 text-center">
                <h2 className="text-3xl sm:text-4xl font-bold text-text-primary">AI Content Suite</h2>
                <p className="text-text-secondary mt-2 text-sm sm:text-base">{description}</p>
              </header>

              <div className="mb-6">
                <Tabs tabs={TABS} activeTabId={activeMode} onTabChange={id => onModeChange(id as Mode)} />
              </div>

              <div className="mb-6 bg-secondary/70 rounded-xl px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-text-secondary">
                  <span className="text-text-primary font-semibold">Active provider:</span>
                  <span className="text-text-primary font-medium">{providerBanner.activeProviderLabel}</span>
                  <span className="hidden sm:inline text-text-secondary">•</span>
                  <span className="text-text-primary font-medium">{providerBanner.activeModelName || 'Select a model'}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs sm:text-sm">
                  <span className={`font-medium ${providerBanner.statusTone}`}>{providerBanner.statusText}</span>
                  <button
                    type="button"
                    onClick={providerBanner.onManageSettings}
                    className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary-hover transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-secondary"
                  >
                    Manage AI Settings
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-6 flex-1 min-h-0">
                {showChat && chatProps ? (
                  <ChatInterface {...chatProps} />
                ) : showMainForm && mainFormProps ? (
                  <MainForm {...mainFormProps} />
                ) : null}

                {showSubmitButton && (
                  <SubmitButton onClick={onSubmit} disabled={isProcessing} appState={appState} buttonText={buttonText} />
                )}

                {isProcessing && (
                  <div className="flex flex-col gap-4">
                    <ProgressBar progress={progress} />
                    <StopButton onClick={onStop} />
                  </div>
                )}
              </div>

              {showResults && resultsProps && <ResultsViewer {...resultsProps} />}

              {showError && error && (
                <div className="mt-8 p-4 bg-red-900 border border-red-700 rounded-lg text-red-100 animate-fade-in-scale" role="alert">
                  <div className="flex items-center mb-2">
                    <XCircleIcon className="w-6 h-6 mr-2" aria-hidden="true" />
                    <h3 className="text-lg font-semibold">Error</h3>
                  </div>
                  <p className="text-sm">{error.message}</p>
                  {error.details && (
                    <details className="mt-2 text-xs">
                      <summary>Show Details</summary>
                      <pre className="whitespace-pre-wrap break-all bg-red-800 p-2 rounded mt-1">{error.details}</pre>
                    </details>
                  )}
                  <button
                    onClick={onErrorReset}
                    className="mt-4 w-full px-6 py-2 bg-red-700 text-white font-semibold rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-surface"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>

        <footer className="px-6 pb-6 text-center text-xs text-text-secondary">
          <p>&copy; {new Date().getFullYear()} AI Content Suite. Powered by {providerSummaryText}.</p>
        </footer>
      </div>
    </div>
  );
};
