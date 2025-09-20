import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { ReportModal } from './components/modals/ReportModal';
import { ChatSettingsModal } from './components/modals/ChatSettingsModal';
import { useStarfield } from './hooks/useStarfield';
import type { Mode } from './types';
import {
  INITIAL_PROGRESS,
  DEFAULT_PROVIDER_MODELS,
} from './constants';
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
import { WorkspaceLayout } from './components/layouts/WorkspaceLayout';
import { getButtonText } from './constants/uiConstants';
import { deepClone } from './utils/deepClone';

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
  const [isChatSettingsModalOpen, setIsChatSettingsModalOpen] = useState(false);

  const { chatSettings, setChatSettings } = usePersistentChatSettings();
  const {
    providerSettings: aiProviderSettings,
    setProviderSettings: setAiProviderSettings,
    activeProviderInfo,
    activeProviderLabel,
    activeModelName,
    providerStatusText,
    providerStatusTone,
    providerSummaryText,
  } = usePersistentProviderSettings();
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
    styleTarget,
    summaryTextInput,
    reasoningPrompt,
    scaffolderPrompt,
    scaffolderSettings,
    requestSplitterSpec,
    promptEnhancerSettings,
    agentDesignerSettings,
    chatHistory,
    isStreamingResponse,
    chatInput,
    chatFiles,
  } = modeState;

  useStarfield('space-background');

  useEffect(() => {
    const apiKey = aiProviderSettings.apiKeys?.[aiProviderSettings.selectedProvider];
    const model =
      aiProviderSettings.selectedModel && aiProviderSettings.selectedModel.trim().length > 0
        ? aiProviderSettings.selectedModel
        : DEFAULT_PROVIDER_MODELS[aiProviderSettings.selectedProvider];

    setActiveProviderConfig({
      providerId: aiProviderSettings.selectedProvider,
      model,
      apiKey,
    });
  }, [aiProviderSettings]);

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

  const buttonText = useMemo(
    () =>
      getButtonText(
        activeMode,
        currentFiles?.length || 0,
        summaryTextInput,
        reasoningPrompt,
        scaffolderPrompt,
        requestSplitterSpec,
        promptEnhancerSettings.rawPrompt,
        agentDesignerSettings.goal,
      ),
    [
      activeMode,
      currentFiles,
      summaryTextInput,
      reasoningPrompt,
      scaffolderPrompt,
      requestSplitterSpec,
      promptEnhancerSettings.rawPrompt,
      agentDesignerSettings.goal,
    ],
  );

  const handleReset = useCallback(
    (mode?: Mode) => {
      const targetMode = mode ?? activeMode;
      const controller = abortControllersRef.current[targetMode];
      if (controller) {
        controller.abort();
        delete abortControllersRef.current[targetMode];
      }
      resetMode(targetMode);
      setIsReportModalOpen(false);
    },
    [activeMode, resetMode],
  );

  const handleStop = useCallback(
    (mode?: Mode) => {
      const targetMode = mode ?? activeMode;
      const controller = abortControllersRef.current[targetMode];
      if (controller) {
        controller.abort();
        delete abortControllersRef.current[targetMode];
      }
      setModeValue('appState', 'idle', targetMode);
      setModeValue('progress', deepClone(INITIAL_PROGRESS), targetMode);
      setModeValue('suggestionsLoading', false, targetMode);
      setModeValue('nextStepSuggestions', null, targetMode);
    },
    [activeMode, setModeValue],
  );

  const handleSubmit = useCallback(() => {
    const modeAtSubmission = activeMode;
    const controller = new AbortController();
    abortControllersRef.current[modeAtSubmission] = controller;
    const { signal } = controller;

    const stateForMode = getStateForMode(modeAtSubmission);

    handleSubmission({
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
      signal,
    }).finally(() => {
      if (abortControllersRef.current[modeAtSubmission] === controller) {
        delete abortControllersRef.current[modeAtSubmission];
      }
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

  const handleSavePromptPreset = useCallback((name: string, prompt: string) => {
    setSavedPrompts(prev => {
      const existingIndex = prev.findIndex(item => item.name === name);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = { name, prompt };
        return updated;
      }
      return [...prev, { name, prompt }];
    });
  }, [setSavedPrompts]);

  const handleDeletePromptPreset = useCallback((name: string) => {
    setSavedPrompts(prev => prev.filter(item => item.name !== name));
  }, [setSavedPrompts]);

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
      setActiveMode(prev => (prev === mode ? prev : mode));
      setIsReportModalOpen(false);
    },
    [],
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
    onOpenSettings: () => setIsChatSettingsModalOpen(true),
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
      <canvas id="space-background" className="fixed inset-0 -z-10 h-full w-full" aria-hidden="true" />
      <WorkspaceLayout
        activeMode={activeMode}
        sidebarProps={{
          collapsed: isSidebarCollapsed,
          onToggle: toggleSidebar,
          activeMode,
          onSelectMode: handleModeChange,
        }}
        onModeChange={handleModeChange}
        headerProps={{
          isSidebarCollapsed,
          onToggleSidebar: toggleSidebar,
          activeProviderLabel,
          activeModelName,
        }}
        layoutControls={{
          contentWidthLabel,
          contentWidthPercent,
          onWidthPercentChange: handleWidthSliderChange,
          appliedContentWidth,
        }}
        providerBanner={{
          activeProviderLabel,
          activeModelName,
          statusText: providerStatusText,
          statusTone: providerStatusTone,
          onManageSettings: () => setIsChatSettingsModalOpen(true),
        }}
        showChat={activeMode === 'chat'}
        chatProps={activeMode === 'chat' ? chatInterfaceProps : undefined}
        showMainForm={showMainForm}
        mainFormProps={showMainForm ? mainFormProps : undefined}
        showSubmitButton={showSubmitButton}
        buttonText={buttonText}
        onSubmit={handleSubmit}
        appState={appState}
        progress={progress}
        onStop={() => handleStop()}
        showResults={showResults}
        resultsProps={showResults ? resultsViewerProps : undefined}
        showError={showError}
        error={error}
        onErrorReset={() => handleReset()}
        providerSummaryText={providerSummaryText}
      />

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        output={processedData}
        mode={activeMode}
        styleTarget={activeMode === 'styleExtractor' ? styleTarget : undefined}
        nextStepSuggestions={nextStepSuggestions}
      />
      <ChatSettingsModal
        isOpen={isChatSettingsModalOpen}
        onClose={() => setIsChatSettingsModalOpen(false)}
        currentSettings={chatSettings}
        providerSettings={aiProviderSettings}
        providers={AI_PROVIDERS}
        onSave={(newSettings, newProviderSettings) => {
          setChatSettings(newSettings);
          setAiProviderSettings(newProviderSettings);
          setIsChatSettingsModalOpen(false);
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
