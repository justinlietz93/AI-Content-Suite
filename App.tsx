


import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { ProgressBar } from './components/ui/ProgressBar';
import { Tabs } from './components/ui/Tabs';
import { ReportModal } from './components/modals/ReportModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { useStarfield } from './hooks/useStarfield';
import type { ProcessedOutput, ProgressUpdate, AppState, ProcessingError, Mode, RewriteLength, SummaryFormat, ReasoningSettings, ScaffolderSettings, RequestSplitterSettings, PromptEnhancerSettings, AgentDesignerSettings, ChatSettings, ChatMessage, SavedPrompt, AIProviderSettings } from './types';
import {
  INITIAL_PROGRESS,
  INITIAL_REASONING_SETTINGS,
  INITIAL_SCAFFOLDER_SETTINGS,
  INITIAL_REQUEST_SPLITTER_SETTINGS,
  INITIAL_PROMPT_ENHANCER_SETTINGS,
  INITIAL_AGENT_DESIGNER_SETTINGS,
  INITIAL_CHAT_SETTINGS,
  DEFAULT_PROVIDER_MODELS,
} from './constants';
import { TABS, DESCRIPTION_TEXT, getButtonText } from './constants/uiConstants';
import { handleSubmission } from './services/submissionService';
import { setActiveProviderConfig } from './services/geminiService';
import { AI_PROVIDERS, fetchModelsForProvider } from './services/providerRegistry';
import {
  downloadReasoningArtifact,
  downloadScaffoldArtifact,
  downloadRequestSplitterArtifact,
  downloadPromptEnhancerArtifact,
  downloadAgentDesignerArtifact,
} from './utils/downloadUtils';
import { useWorkspaceState } from './hooks/useWorkspaceState';
import { usePersistentChatSettings } from './hooks/usePersistentChatSettings';
import { usePersistentProviderSettings } from './hooks/usePersistentProviderSettings';
import { useSavedPrompts } from './hooks/useSavedPrompts';
import { useLayoutPreferences } from './hooks/useLayoutPreferences';
import { useMainFormProps } from './hooks/useMainFormProps';
import { useChatSubmission } from './hooks/useChatSubmission';
import { deepClone } from './utils/deepClone';
import { XCircleIcon } from './components/icons/XCircleIcon';
import { MenuBar } from './components/layouts/MenuBar';

// Import new modular components
import { ChatInterface } from './components/layouts/ChatInterface';
import { MainForm } from './components/layouts/MainForm';
import { SubmitButton } from './components/ui/SubmitButton';
import { StopButton } from './components/ui/StopButton';
import { ResultsViewer } from './components/layouts/ResultsViewer';


const App: React.FC = () => {
  const [activeMode, setActiveMode] = useState<Mode>('technical');
  const {
    state: modeState,
    setValue: setModeValue,
    mergeState,
    resetMode,
    getStateForMode,
  } = useWorkspaceState(activeMode);
  const abortControllersRef = useRef<Partial<Record<Mode, AbortController>>>({});
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const { chatSettings, setChatSettings } = usePersistentChatSettings();
  const {
    providerSettings: aiProviderSettings,
    setProviderSettings: setAiProviderSettings,
    resolveProviderForMode,
    activeProviderInfo,
    activeProviderLabel,
    activeModelName,
    providerStatusText,
    providerStatusTone,
    providerSummaryText,
  } = usePersistentProviderSettings(activeMode);
  const { savedPrompts, setSavedPrompts } = useSavedPrompts();
  const {
    isSidebarCollapsed,
    toggleSidebar,
    contentWidthPercent,
    setContentWidthPercent,
    appliedContentWidth,
    contentWidthLabel,
  } = useLayoutPreferences();

  const {
    currentFiles,
    appState,
    progress,
    processedData,
    error,
    nextStepSuggestions,
    suggestionsLoading,
    styleTarget,
    rewriteStyle,
    rewriteInstructions,
    rewriteLength,
    useHierarchical,
    summaryFormat,
    summarySearchTerm,
    summaryTextInput,
    reasoningPrompt,
    reasoningSettings,
    scaffolderPrompt,
    scaffolderSettings,
    requestSplitterSpec,
    requestSplitterSettings,
    promptEnhancerSettings,
    agentDesignerSettings,
    chatHistory,
    isStreamingResponse,
    chatInput,
    chatFiles,
  } = modeState;

  useStarfield('space-background');

  useEffect(() => {
    const { providerId, model } = resolveProviderForMode(activeMode);
    const providerIdFallback = aiProviderSettings.selectedProvider;
    const modelFallback =
      (aiProviderSettings.selectedModel && aiProviderSettings.selectedModel.trim()) ||
      DEFAULT_PROVIDER_MODELS[providerIdFallback];

    const resolvedProviderId = providerId ?? providerIdFallback;
    const resolvedModel =
      (model && model.trim()) ||
      modelFallback ||
      DEFAULT_PROVIDER_MODELS[resolvedProviderId];

    const apiKey = aiProviderSettings.apiKeys?.[resolvedProviderId];

    setActiveProviderConfig({
      providerId: resolvedProviderId,
      model: resolvedModel,
      apiKey,
    });
  }, [activeMode, aiProviderSettings, resolveProviderForMode]);

  // Effect to handle state changes for cancellation
  // --- MEMOS ---
  const canSubmit = useMemo(() => {
    const hasFiles = currentFiles && currentFiles.length > 0;

    switch (activeMode) {
      case 'technical':
        return hasFiles || !!summaryTextInput.trim();
      case 'styleExtractor':
      case 'rewriter':
      case 'mathFormatter':
        return hasFiles;
      case 'reasoningStudio':
        return hasFiles || !!reasoningPrompt.trim();
      case 'scaffolder':
        return hasFiles || !!scaffolderPrompt.trim();
      case 'requestSplitter':
        return hasFiles || !!requestSplitterSpec.trim();
      case 'promptEnhancer':
        return hasFiles || !!promptEnhancerSettings.rawPrompt.trim();
      case 'agentDesigner':
        return hasFiles || !!agentDesignerSettings.goal.trim();
      case 'chat':
        return (!!chatInput.trim() || (chatFiles && chatFiles.length > 0)) && !isStreamingResponse;
      default:
        return false;
    }
  }, [
    activeMode,
    currentFiles,
    summaryTextInput,
    reasoningPrompt,
    scaffolderPrompt,
    requestSplitterSpec,
    promptEnhancerSettings.rawPrompt,
    agentDesignerSettings.goal,
    chatInput,
    chatFiles,
    isStreamingResponse,
  ]);

  const buttonText = useMemo(() => {
    return getButtonText(
      activeMode,
      currentFiles,
      summaryTextInput,
      reasoningPrompt,
      scaffolderPrompt,
      requestSplitterSpec,
      promptEnhancerSettings.rawPrompt,
      agentDesignerSettings.goal
    );
  }, [activeMode, currentFiles, summaryTextInput, reasoningPrompt, scaffolderPrompt, requestSplitterSpec, promptEnhancerSettings.rawPrompt, agentDesignerSettings.goal]);
  
  // --- EVENT HANDLERS ---
  const handleReset = useCallback(
    (mode: Mode = activeMode) => {
      const controller = abortControllersRef.current[mode];
      if (controller) {
        controller.abort();
        delete abortControllersRef.current[mode];
      }
      resetMode(mode);
      setIsReportModalOpen(false);
    },
    [activeMode, resetMode],
  );

  const handleStop = useCallback(() => {
    const controller = abortControllersRef.current[activeMode];
    if (controller) {
      controller.abort();
      delete abortControllersRef.current[activeMode];
    }
    setModeValue('appState', 'cancelled');
  }, [activeMode, setModeValue]);

  const handleSubmit = useCallback(() => {
    const modeAtSubmission = activeMode;
    const controller = new AbortController();
    abortControllersRef.current[modeAtSubmission] = controller;

    const stateForMode = getStateForMode(modeAtSubmission);

    const submissionPromise = handleSubmission({
      activeMode: modeAtSubmission,
      currentFiles: stateForMode.currentFiles,
      settings: {
        summaryTextInput: stateForMode.summaryTextInput,
        useHierarchical: stateForMode.useHierarchical,
        summaryFormat: stateForMode.summaryFormat,
        styleTarget: stateForMode.styleTarget,
        rewriteStyle: stateForMode.rewriteStyle,
        rewriteInstructions: stateForMode.rewriteInstructions,
        rewriteLength: stateForMode.rewriteLength,
        reasoningPrompt: stateForMode.reasoningPrompt,
        reasoningSettings: stateForMode.reasoningSettings,
        scaffolderPrompt: stateForMode.scaffolderPrompt,
        scaffolderSettings: stateForMode.scaffolderSettings,
        requestSplitterSpec: stateForMode.requestSplitterSpec,
        requestSplitterSettings: stateForMode.requestSplitterSettings,
        promptEnhancerSettings: stateForMode.promptEnhancerSettings,
        agentDesignerSettings: stateForMode.agentDesignerSettings,
        chatSettings,
      },
      setAppState: value => setModeValue('appState', value, modeAtSubmission),
      setError: value => setModeValue('error', value, modeAtSubmission),
      setProcessedData: value => setModeValue('processedData', value, modeAtSubmission),
      setProgress: value => setModeValue('progress', value, modeAtSubmission),
      setNextStepSuggestions: value => setModeValue('nextStepSuggestions', value, modeAtSubmission),
      setSuggestionsLoading: value => setModeValue('suggestionsLoading', value, modeAtSubmission),
      signal: controller.signal,
    });

    submissionPromise
      .finally(() => {
        if (abortControllersRef.current[modeAtSubmission] === controller) {
          delete abortControllersRef.current[modeAtSubmission];
        }
      })
      .catch(() => {
        // Errors are handled within handleSubmission
      });
  }, [activeMode, chatSettings, getStateForMode, setModeValue]);

  const handleChatSubmit = useChatSubmission({
    activeMode,
    aiProviderSettings,
    activeProviderInfo,
    chatSettings,
    canSubmit,
    chatInput,
    chatFiles,
    getStateForMode,
    setModeValue,
  });
  
  const handleSavePromptPreset = useCallback(
    (name: string, prompt: string) => {
      setSavedPrompts(prev => {
        const existingIndex = prev.findIndex(p => p.name === name);
        if (existingIndex > -1) {
          const updated = [...prev];
          updated[existingIndex] = { name, prompt };
          return updated;
        }
        return [...prev, { name, prompt }];
      });
    },
    [setSavedPrompts],
  );

  const handleDeletePromptPreset = useCallback(
    (name: string) => {
      setSavedPrompts(prev => prev.filter(item => item.name !== name));
    },
    [setSavedPrompts],
  );

  useEffect(() => {
    if (appState === 'cancelled') {
      handleReset();
    }
  }, [appState, handleReset]);

  const handleFileSelect = useCallback(
    (files: File[]) => {
      if (files.length > 0) {
        setModeValue('summaryTextInput', '', activeMode);
      }
      const nextFiles = files.length > 0 ? Array.from(files) : null;
      mergeState(
        {
          currentFiles: nextFiles,
          processedData: null,
          error: null,
          appState: 'fileSelected',
          progress: deepClone(INITIAL_PROGRESS),
          nextStepSuggestions: null,
          suggestionsLoading: false,
        },
        activeMode,
      );
    },
    [activeMode, mergeState, setModeValue],
  );

  const handleSummaryTextChange = useCallback(
    (text: string) => {
      setModeValue('summaryTextInput', text);
      if (text.trim()) {
        setModeValue('currentFiles', null);
      }
    },
    [setModeValue],
  );

  const handleModeChange = useCallback(
    (mode: Mode) => {
      if (mode === activeMode) {
        return;
      }
      handleReset(mode);
      setActiveMode(mode);
      setIsReportModalOpen(false);
    },
    [activeMode, handleReset],
  );

  const handleWidthSliderChange = useCallback(
    (percent: number) => {
      setContentWidthPercent(percent);
    },
    [setContentWidthPercent],
  );

  const showMainForm = activeMode !== 'chat' && (appState === 'idle' || appState === 'fileSelected');
  const showSubmitButton = activeMode !== 'chat' && canSubmit && appState !== 'completed' && appState !== 'error';
  const showResults = appState === 'completed' && !!processedData;
  const showError = appState === 'error' && !!error;

  const mainFormProps = useMainFormProps({
    activeMode,
    state: modeState,
    setModeValue,
    onFileSelect: handleFileSelect,
    onSummaryTextChange: handleSummaryTextChange,
  });

  const chatInterfaceProps = useMemo(() => ({
    history: chatHistory,
    isStreaming: isStreamingResponse,
    chatInput,
    onChatInputChange: (value: string) => setModeValue('chatInput', value),
    chatFiles,
    onChatFilesChange: (value: File[] | null) => setModeValue('chatFiles', value),
    onSubmit: handleChatSubmit,
    canSubmit,
    onOpenSettings: () => setIsSettingsModalOpen(true),
  }), [
    chatHistory,
    isStreamingResponse,
    chatInput,
    chatFiles,
    setModeValue,
    handleChatSubmit,
    canSubmit,
  ]);

  const resultsViewerProps = useMemo(() => {
    if (!processedData) return undefined;
    return {
      processedData,
      activeMode,
      scaffolderSettings,
      onReset: () => handleReset(),
      onOpenReportModal: () => setIsReportModalOpen(true),
      onDownloadReasoning: (type: 'md' | 'json') => downloadReasoningArtifact(processedData, type),
      onDownloadScaffold: (type: 'script' | 'plan') => downloadScaffoldArtifact(processedData, scaffolderSettings, type),
      onDownloadRequestSplitter: (type: 'md' | 'json') => downloadRequestSplitterArtifact(processedData, type),
      onDownloadPromptEnhancer: (type: 'md' | 'json') => downloadPromptEnhancerArtifact(processedData, type),
      onDownloadAgentDesigner: (type: 'md' | 'json') => downloadAgentDesignerArtifact(processedData, type),
    };
  }, [processedData, activeMode, scaffolderSettings, handleReset]);

  return (
    <>
      <MenuBar onOpenSettings={() => setIsSettingsModalOpen(true)} />
      <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-4 sm:p-8 transition-all duration-300">
        <div className={`w-full ${activeMode === 'chat' ? 'max-w-6xl' : 'max-w-3xl'} bg-surface shadow-2xl rounded-lg ${activeMode === 'chat' ? 'px-6 sm:px-10 pt-6 sm:pt-10 pb-2 sm:pb-3' : 'p-6 sm:p-10'} border border-border-color animate-breathing-glow transition-all duration-500 ease-in-out`}>
          <header className="mb-6 text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">
              AI Content Suite
            </h1>
            <p className="text-text-secondary mt-2 text-sm sm:text-base">
              {DESCRIPTION_TEXT[activeMode]}
            </p>
          </header>

          <div className="mb-6">
            <Tabs
              tabs={TABS}
              activeTabId={activeMode}
              onTabChange={id => handleModeChange(id as Mode)}
            />
          </div>

          <div className="mb-6 bg-secondary/60 border border-border-color rounded-lg px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-text-secondary">
              <div>
                <span className="text-text-primary font-semibold">Active AI Provider:</span>{' '}
                <span className="font-medium text-text-primary">{activeProviderLabel}</span>
              </div>
              <span className="hidden sm:inline text-text-secondary">•</span>
              <div>
                <span>Model: </span>
                <span className="font-medium text-text-primary">{activeModelName || 'Select a model'}</span>
              </div>
            </div>
            <span className={`font-medium ${providerStatusTone}`}>{providerStatusText}</span>
          </div>

          {activeMode === 'chat' ? (
            <ChatInterface {...chatInterfaceProps} />
          ) : (
            showMainForm && <MainForm {...mainFormProps} />
          )}

          {showSubmitButton && (
            <SubmitButton
              onClick={handleSubmit}
              disabled={appState === 'processing'}
              appState={appState}
              buttonText={buttonText}
            />
          )}

          {appState === 'processing' && (
            <div className="mt-8">
              <ProgressBar progress={progress} />
              <StopButton onClick={handleStop} />
            </div>
          )}

          {showResults && resultsViewerProps && <ResultsViewer {...resultsViewerProps} />}

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
                onClick={() => handleReset()}
                className="mt-4 w-full px-6 py-2 bg-red-700 text-white font-semibold rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-surface"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
        <footer className="text-center mt-8 text-text-secondary text-xs">
          <p>&copy; {new Date().getFullYear()} AI Content Suite. Powered by {providerSummaryText}.</p>
        </footer>
      </div>

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        output={processedData}
        mode={activeMode}
        styleTarget={activeMode === 'styleExtractor' ? styleTarget : undefined}
        nextStepSuggestions={nextStepSuggestions}
      />
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        currentSettings={chatSettings}
        providerSettings={aiProviderSettings}
        providers={AI_PROVIDERS}
        onSave={(newSettings, newProviderSettings) => {
          setChatSettings(newSettings);
          setAiProviderSettings(newProviderSettings);
          setIsSettingsModalOpen(false);
        }}
        onFetchModels={fetchModelsForProvider}
        savedPrompts={savedPrompts}
        onSavePreset={handleSavePromptPreset}
        onDeletePreset={handleDeletePromptPreset}
      />
    </>
  );
};

export default App;
