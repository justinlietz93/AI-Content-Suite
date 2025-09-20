


import React, { useState, useCallback, useMemo, useEffect, FormEvent, useRef } from 'react';
import { ProgressBar } from './components/ui/ProgressBar';
import { Tabs } from './components/ui/Tabs';
import { ReportModal } from './components/modals/ReportModal';
import { ChatSettingsModal } from './components/modals/ChatSettingsModal';
import { XCircleIcon } from './components/icons/XCircleIcon';
import { useStarfield } from './hooks/useStarfield';
import type { ProcessedOutput, ProgressUpdate, AppState, ProcessingError, Mode, RewriteLength, SummaryFormat, ReasoningSettings, ScaffolderSettings, RequestSplitterSettings, PromptEnhancerSettings, AgentDesignerSettings, ChatSettings, ChatMessage, SavedPrompt, AIProviderSettings } from './types';
import { INITIAL_PROGRESS, INITIAL_REASONING_SETTINGS, INITIAL_SCAFFOLDER_SETTINGS, INITIAL_REQUEST_SPLITTER_SETTINGS, INITIAL_PROMPT_ENHANCER_SETTINGS, INITIAL_AGENT_DESIGNER_SETTINGS, INITIAL_CHAT_SETTINGS, INITIAL_AI_PROVIDER_SETTINGS, DEFAULT_PROVIDER_MODELS } from './constants';
import { SUMMARY_FORMAT_OPTIONS } from './data/summaryFormats';
import { TABS, DESCRIPTION_TEXT, getButtonText } from './constants/uiConstants';
import { handleSubmission } from './services/submissionService';
import { setActiveProviderConfig, sendChatMessage } from './services/geminiService';
import { AI_PROVIDERS, fetchModelsForProvider, getProviderLabel } from './services/providerRegistry';
import { fileToGenerativePart } from './utils/fileUtils';
import {
  downloadReasoningArtifact,
  downloadScaffoldArtifact,
  downloadRequestSplitterArtifact,
  downloadPromptEnhancerArtifact,
  downloadAgentDesignerArtifact
} from './utils/downloadUtils';

// Import new modular components
import { ChatInterface } from './components/layouts/ChatInterface';
import { MainForm } from './components/layouts/MainForm';
import { SubmitButton } from './components/ui/SubmitButton';
import { StopButton } from './components/ui/StopButton';
import { ResultsViewer } from './components/layouts/ResultsViewer';


const PROVIDER_SETTINGS_STORAGE_KEY = 'ai_content_suite_provider_settings';
const CHAT_SETTINGS_STORAGE_KEY = 'ai_content_suite_chat_settings';

const App: React.FC = () => {
  // --- STATE MANAGEMENT ---
  const [currentFiles, setCurrentFiles] = useState<File[] | null>(null);
  const [appState, setAppState] = useState<AppState>('idle');
  const [activeMode, setActiveMode] = useState<Mode>('technical');
  const [progress, setProgress] = useState<ProgressUpdate>(INITIAL_PROGRESS);
  const [processedData, setProcessedData] = useState<ProcessedOutput | null>(null);
  const [error, setError] = useState<ProcessingError | null>(null);
  const [nextStepSuggestions, setNextStepSuggestions] = useState<string[] | null>(null);
  const [suggestionsLoading, setSuggestionsLoading] = useState<boolean>(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // --- MODE-SPECIFIC SETTINGS ---
  const [styleTarget, setStyleTarget] = useState<string>('');
  const [rewriteStyle, setRewriteStyle] = useState<string>('');
  const [rewriteInstructions, setRewriteInstructions] = useState<string>('');
  const [rewriteLength, setRewriteLength] = useState<RewriteLength>('medium');
  const [useHierarchical, setUseHierarchical] = useState(false);
  const [summaryFormat, setSummaryFormat] = useState<SummaryFormat>('default');
  const [summarySearchTerm, setSummarySearchTerm] = useState('');
  const [summaryTextInput, setSummaryTextInput] = useState('');
  const [reasoningPrompt, setReasoningPrompt] = useState('');
  const [reasoningSettings, setReasoningSettings] = useState<ReasoningSettings>(INITIAL_REASONING_SETTINGS);
  const [scaffolderPrompt, setScaffolderPrompt] = useState('');
  const [scaffolderSettings, setScaffolderSettings] = useState<ScaffolderSettings>(INITIAL_SCAFFOLDER_SETTINGS);
  const [requestSplitterSpec, setRequestSplitterSpec] = useState('');
  const [requestSplitterSettings, setRequestSplitterSettings] = useState<RequestSplitterSettings>(INITIAL_REQUEST_SPLITTER_SETTINGS);
  const [promptEnhancerSettings, setPromptEnhancerSettings] = useState<PromptEnhancerSettings>(INITIAL_PROMPT_ENHANCER_SETTINGS);
  const [agentDesignerSettings, setAgentDesignerSettings] = useState<AgentDesignerSettings>(INITIAL_AGENT_DESIGNER_SETTINGS);

  // --- CHAT-SPECIFIC STATE ---
  const [chatSettings, setChatSettings] = useState<ChatSettings>(INITIAL_CHAT_SETTINGS);
  const [aiProviderSettings, setAiProviderSettings] = useState<AIProviderSettings>(INITIAL_AI_PROVIDER_SETTINGS);
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isStreamingResponse, setIsStreamingResponse] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatFiles, setChatFiles] = useState<File[] | null>(null);
  const [isChatSettingsModalOpen, setIsChatSettingsModalOpen] = useState(false);


  // --- HOOKS ---
  useStarfield('space-background');

  // --- EFFECTS ---
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem(CHAT_SETTINGS_STORAGE_KEY);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed && typeof parsed === 'object') {
          const defaults = INITIAL_CHAT_SETTINGS.vectorStore;
          const parsedVectorStore = parsed.vectorStore && typeof parsed.vectorStore === 'object' ? parsed.vectorStore : {};
          const mergedVectorStore = defaults
            ? {
                ...defaults,
                ...parsedVectorStore,
                embedding: {
                  ...defaults.embedding,
                  ...(parsedVectorStore.embedding ?? {}),
                },
              }
            : parsedVectorStore;

          setChatSettings({
            ...INITIAL_CHAT_SETTINGS,
            ...parsed,
            vectorStore: mergedVectorStore,
          });
        }
      }
    } catch (error) {
      console.error('Failed to load chat settings from local storage:', error);
    }
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PROVIDER_SETTINGS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const availableProviders = new Set(AI_PROVIDERS.map(provider => provider.id));
        const providerId = (availableProviders.has(parsed.selectedProvider)
          ? parsed.selectedProvider
          : INITIAL_AI_PROVIDER_SETTINGS.selectedProvider) as AIProviderSettings['selectedProvider'];
        const fallbackModel = DEFAULT_PROVIDER_MODELS[providerId] ?? DEFAULT_PROVIDER_MODELS[INITIAL_AI_PROVIDER_SETTINGS.selectedProvider];
        const selectedModel = typeof parsed.selectedModel === 'string' && parsed.selectedModel.trim() !== ''
          ? parsed.selectedModel
          : fallbackModel;
        const apiKeys = parsed.apiKeys && typeof parsed.apiKeys === 'object' && parsed.apiKeys !== null ? parsed.apiKeys : {};
        setAiProviderSettings({ selectedProvider: providerId, selectedModel, apiKeys });
      }
    } catch (e) {
      console.error('Failed to load provider settings from local storage:', e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(PROVIDER_SETTINGS_STORAGE_KEY, JSON.stringify(aiProviderSettings));
    } catch (e) {
      console.error('Failed to save provider settings to local storage:', e);
    }
  }, [aiProviderSettings]);

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_SETTINGS_STORAGE_KEY, JSON.stringify(chatSettings));
    } catch (error) {
      console.error('Failed to save chat settings to local storage:', error);
    }
  }, [chatSettings]);

  useEffect(() => {
    const apiKey = aiProviderSettings.apiKeys?.[aiProviderSettings.selectedProvider];
    const model = aiProviderSettings.selectedModel && aiProviderSettings.selectedModel.trim() !== ''
      ? aiProviderSettings.selectedModel
      : DEFAULT_PROVIDER_MODELS[aiProviderSettings.selectedProvider];
    setActiveProviderConfig({
      providerId: aiProviderSettings.selectedProvider,
      model,
      apiKey,
    });
  }, [aiProviderSettings]);

  // Load saved prompts from local storage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ai_content_suite_saved_prompts');
      if (saved) {
        setSavedPrompts(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load saved prompts from local storage:", e);
    }
  }, []);

  // Save prompts to local storage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('ai_content_suite_saved_prompts', JSON.stringify(savedPrompts));
    } catch (e) {
      console.error("Failed to save prompts to local storage:", e);
    }
  }, [savedPrompts]);

  // Effect to handle state changes for cancellation
  useEffect(() => {
    if (appState === 'cancelled') {
      handleReset();
    }
  }, [appState]);

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

  const activeProviderLabel = useMemo(
    () => getProviderLabel(aiProviderSettings.selectedProvider),
    [aiProviderSettings.selectedProvider],
  );

  const activeProviderInfo = useMemo(
    () => AI_PROVIDERS.find(provider => provider.id === aiProviderSettings.selectedProvider),
    [aiProviderSettings.selectedProvider],
  );

  const activeModelName = useMemo(() => {
    const trimmed = aiProviderSettings.selectedModel?.trim();
    if (trimmed && trimmed.length > 0) {
      return trimmed;
    }
    return DEFAULT_PROVIDER_MODELS[aiProviderSettings.selectedProvider] ?? '';
  }, [aiProviderSettings]);

  const isApiKeyConfigured = useMemo(() => {
    const key = aiProviderSettings.apiKeys?.[aiProviderSettings.selectedProvider];
    return typeof key === 'string' && key.trim() !== '';
  }, [aiProviderSettings]);

  const providerStatusText = useMemo(() => {
    if (!activeProviderInfo) return 'Provider status unavailable';
    if (activeProviderInfo.requiresApiKey) {
      return isApiKeyConfigured ? 'API key saved' : 'API key required';
    }
    return 'API key optional';
  }, [activeProviderInfo, isApiKeyConfigured]);

  const providerStatusTone = useMemo(() => {
    if (!activeProviderInfo) return 'text-destructive';
    if (activeProviderInfo.requiresApiKey) {
      return isApiKeyConfigured ? 'text-emerald-400' : 'text-destructive';
    }
    return 'text-text-secondary';
  }, [activeProviderInfo, isApiKeyConfigured]);

  const providerSummaryText = useMemo(
    () => (activeModelName ? `${activeProviderLabel} • ${activeModelName}` : activeProviderLabel),
    [activeProviderLabel, activeModelName],
  );

  const buttonText = useMemo(() => {
    return getButtonText(
      activeMode,
      currentFiles?.length || 0,
      summaryTextInput,
      reasoningPrompt,
      scaffolderPrompt,
      requestSplitterSpec,
      promptEnhancerSettings.rawPrompt,
      agentDesignerSettings.goal
    );
  }, [activeMode, currentFiles, summaryTextInput, reasoningPrompt, scaffolderPrompt, requestSplitterSpec, promptEnhancerSettings.rawPrompt, agentDesignerSettings.goal]);
  
  // --- EVENT HANDLERS ---
  const handleReset = useCallback(() => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
    }
    setCurrentFiles(null);
    setProcessedData(null);
    setError(null);
    setAppState('idle');
    setProgress(INITIAL_PROGRESS);
    setStyleTarget('');
    setRewriteStyle('');
    setRewriteInstructions('');
    setRewriteLength('medium');
    setNextStepSuggestions(null);
    setSuggestionsLoading(false);
    setUseHierarchical(false);
    setSummaryFormat('default');
    setSummarySearchTerm('');
    setSummaryTextInput('');
    setReasoningPrompt('');
    setReasoningSettings(INITIAL_REASONING_SETTINGS);
    setScaffolderPrompt('');
    setScaffolderSettings(INITIAL_SCAFFOLDER_SETTINGS);
    setRequestSplitterSpec('');
    setRequestSplitterSettings(INITIAL_REQUEST_SPLITTER_SETTINGS);
    setPromptEnhancerSettings(INITIAL_PROMPT_ENHANCER_SETTINGS);
    setAgentDesignerSettings(INITIAL_AGENT_DESIGNER_SETTINGS);
    setChatSettings(INITIAL_CHAT_SETTINGS);
    setChatHistory([]);
    setIsStreamingResponse(false);
    setChatInput('');
    setChatFiles(null);
  }, []);
  
  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
    }
    setAppState('cancelled');
  }, []);

  const handleSubmit = useCallback(() => {
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    handleSubmission({
      activeMode,
      currentFiles,
      settings: {
        summaryTextInput, useHierarchical, summaryFormat,
        styleTarget,
        rewriteStyle, rewriteInstructions, rewriteLength,
        reasoningPrompt, reasoningSettings,
        scaffolderPrompt, scaffolderSettings,
        requestSplitterSpec, requestSplitterSettings,
        promptEnhancerSettings, agentDesignerSettings,
        chatSettings,
      },
      setAppState, setError, setProcessedData, setProgress,
      setNextStepSuggestions, setSuggestionsLoading,
      signal,
    });
  }, [
    activeMode, currentFiles, summaryTextInput, useHierarchical, summaryFormat,
    styleTarget, rewriteStyle, rewriteInstructions, rewriteLength,
    reasoningPrompt, reasoningSettings, scaffolderPrompt, scaffolderSettings,
    requestSplitterSpec, requestSplitterSettings, promptEnhancerSettings,
    agentDesignerSettings, chatSettings
  ]);

  const handleChatSubmit = useCallback(async (e?: FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (!canSubmit) return;

    const providerInfo = AI_PROVIDERS.find(provider => provider.id === aiProviderSettings.selectedProvider);
    const apiKeyForProvider = aiProviderSettings.apiKeys?.[aiProviderSettings.selectedProvider];
    if (providerInfo?.requiresApiKey && (!apiKeyForProvider || apiKeyForProvider.trim() === '')) {
      setError({ message: `${providerInfo.label} requires an API key. Please add it in settings before starting a chat.` });
      return;
    }

    const historyBeforeMessage = chatHistory;
    const trimmedInput = chatInput.trim();

    try {
      const fileParts = chatFiles ? await Promise.all(chatFiles.map(fileToGenerativePart)) : [];
      const textParts = trimmedInput ? [{ text: trimmedInput }] : [];
      const userMessageParts = [...fileParts, ...textParts];

      if (userMessageParts.length === 0) {
        return;
      }

      const userMessage: ChatMessage = { role: 'user', parts: userMessageParts };

      setChatHistory(prev => [...prev, userMessage, { role: 'model', parts: [{ text: '' }], thinking: [] }]);
      setChatInput('');
      setChatFiles(null);
      setIsStreamingResponse(true);
      setError(null);

      const response = await sendChatMessage({
        history: historyBeforeMessage,
        userMessage: userMessageParts,
        systemInstruction: chatSettings.systemInstruction,
        vectorStoreSettings: chatSettings.vectorStore,
      });

      setChatHistory(prev => {
        if (prev.length === 0) return prev;
        const updatedHistory = [...prev];
        const lastIndex = updatedHistory.length - 1;
        const lastMessage = updatedHistory[lastIndex];
        if (lastMessage && lastMessage.role === 'model') {
          const thinkingSegments = response.thinking.length > 0 ? [...response.thinking] : undefined;
          const finalText = response.text;
          const firstPart = lastMessage.parts[0];

          if (firstPart && 'text' in firstPart) {
            firstPart.text = finalText;
            lastMessage.thinking = thinkingSegments;
          } else {
            updatedHistory[lastIndex] = { role: 'model', parts: [{ text: finalText }], thinking: thinkingSegments };
          }
        }
        return updatedHistory;
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setChatHistory(prev => (prev.length > 0 ? prev.slice(0, prev.length - 1) : prev));
        return;
      }
      console.error('Chat error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError({ message: `Chat failed: ${errorMessage}` });
      setChatHistory(prev => (prev.length > 0 ? prev.slice(0, prev.length - 1) : prev));
    } finally {
      setIsStreamingResponse(false);
    }
  }, [
    aiProviderSettings,
    canSubmit,
    chatFiles,
    chatHistory,
    chatInput,
    chatSettings.systemInstruction,
    chatSettings.vectorStore,
  ]);
  
    const handleSavePromptPreset = (name: string, prompt: string) => {
      setSavedPrompts(prev => {
        const existingIndex = prev.findIndex(p => p.name === name);
        if (existingIndex > -1) {
          // Update existing
          const newPrompts = [...prev];
          newPrompts[existingIndex] = { name, prompt };
          return newPrompts;
        } else {
          // Add new
          return [...prev, { name, prompt }];
        }
      });
    };

    const handleDeletePromptPreset = (name: string) => {
      setSavedPrompts(prev => prev.filter(p => p.name !== name));
    };


  const handleFileSelect = useCallback((files: File[]) => {
    if (files.length > 0) {
      setSummaryTextInput(''); 
    }
    setCurrentFiles(files);
    setProcessedData(null);
    setError(null);
    setAppState('fileSelected');
    setProgress(INITIAL_PROGRESS);
    setNextStepSuggestions(null);
    setSuggestionsLoading(false);
  }, []);

  const handleSummaryTextChange = useCallback((text: string) => {
    setSummaryTextInput(text);
    if (text.trim()) {
      setCurrentFiles(null); 
    }
  }, []);
  
  return (
    <>
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
            <Tabs tabs={TABS} activeTabId={activeMode} onTabChange={(id) => {
              setActiveMode(id as Mode);
              handleReset();
            }} />
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
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs sm:text-sm">
              <span className={`font-medium ${providerStatusTone}`}>{providerStatusText}</span>
              <button
                type="button"
                onClick={() => setIsChatSettingsModalOpen(true)}
                className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary-hover transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-secondary"
              >
                Manage AI Settings
              </button>
            </div>
          </div>

          {activeMode === 'chat' ? (
              <ChatInterface
                history={chatHistory}
                isStreaming={isStreamingResponse}
                chatInput={chatInput}
                onChatInputChange={setChatInput}
                chatFiles={chatFiles}
                onChatFilesChange={setChatFiles}
                onSubmit={handleChatSubmit}
                canSubmit={canSubmit}
                onOpenSettings={() => setIsChatSettingsModalOpen(true)}
              />
          ) : (appState === 'idle' || appState === 'fileSelected') && (
            <MainForm 
              activeMode={activeMode}
              currentFiles={currentFiles}
              summaryFormat={summaryFormat} onSummaryFormatChange={setSummaryFormat}
              summarySearchTerm={summarySearchTerm} onSummarySearchTermChange={setSummarySearchTerm}
              summaryTextInput={summaryTextInput} onSummaryTextChange={handleSummaryTextChange}
              useHierarchical={useHierarchical} onUseHierarchicalChange={setUseHierarchical}
              styleTarget={styleTarget} onStyleTargetChange={setStyleTarget}
              rewriteStyle={rewriteStyle} onRewriteStyleChange={setRewriteStyle}
              rewriteInstructions={rewriteInstructions} onRewriteInstructionsChange={setRewriteInstructions}
              rewriteLength={rewriteLength} onRewriteLengthChange={setRewriteLength}
              reasoningPrompt={reasoningPrompt} onReasoningPromptChange={setReasoningPrompt}
              reasoningSettings={reasoningSettings} onReasoningSettingsChange={setReasoningSettings}
              scaffolderPrompt={scaffolderPrompt} onScaffolderPromptChange={setScaffolderPrompt}
              scaffolderSettings={scaffolderSettings} onScaffolderSettingsChange={setScaffolderSettings}
              requestSplitterSpec={requestSplitterSpec} onRequestSplitterSpecChange={setRequestSplitterSpec}
              requestSplitterSettings={requestSplitterSettings} onRequestSplitterSettingsChange={setRequestSplitterSettings}
              promptEnhancerSettings={promptEnhancerSettings} onPromptEnhancerSettingsChange={setPromptEnhancerSettings}
              agentDesignerSettings={agentDesignerSettings} onAgentDesignerSettingsChange={setAgentDesignerSettings}
              onFileSelect={handleFileSelect}
            />
          )}

          {activeMode !== 'chat' && canSubmit && appState !== 'completed' && appState !== 'error' && (
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
          
          {appState === 'completed' && processedData && (
            <ResultsViewer 
              processedData={processedData}
              activeMode={activeMode}
              scaffolderSettings={scaffolderSettings}
              onReset={handleReset}
              onOpenReportModal={() => setIsReportModalOpen(true)}
              onDownloadReasoning={(type) => downloadReasoningArtifact(processedData, type)}
              onDownloadScaffold={(type) => downloadScaffoldArtifact(processedData, scaffolderSettings, type)}
              onDownloadRequestSplitter={(type) => downloadRequestSplitterArtifact(processedData, type)}
              onDownloadPromptEnhancer={(type) => downloadPromptEnhancerArtifact(processedData, type)}
              onDownloadAgentDesigner={(type) => downloadAgentDesignerArtifact(processedData, type)}
            />
          )}

          {appState === 'error' && error && <div className="mt-8 p-4 bg-red-900 border border-red-700 rounded-lg text-red-100 animate-fade-in-scale" role="alert">
            <div className="flex items-center mb-2"><XCircleIcon className="w-6 h-6 mr-2" aria-hidden="true" /><h3 className="text-lg font-semibold">Error</h3></div>
            <p className="text-sm">{error.message}</p>
            {error.details && <details className="mt-2 text-xs"><summary>Show Details</summary><pre className="whitespace-pre-wrap break-all bg-red-800 p-2 rounded mt-1">{error.details}</pre></details>}
            <button onClick={handleReset} className="mt-4 w-full px-6 py-2 bg-red-700 text-white font-semibold rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-surface">Try Again</button>
          </div>}
        </div>
        <footer className="text-center mt-8 text-text-secondary text-xs">
          <p>&copy; {new Date().getFullYear()} AI Content Suite. Powered by {providerSummaryText}.</p>
        </footer>
      </div>

      <ReportModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} output={processedData} mode={activeMode} styleTarget={activeMode === 'styleExtractor' ? styleTarget : undefined} nextStepSuggestions={nextStepSuggestions} />
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