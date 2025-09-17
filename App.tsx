
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { FileLoader } from './components/FileLoader';
import { ProgressBar } from './components/ProgressBar';
import { SummaryViewer } from './components/SummaryViewer';
import { ReasoningViewer } from './components/ReasoningViewer';
import { ScaffolderViewer } from './components/ScaffolderViewer';
import { RequestSplitterViewer } from './components/RequestSplitterViewer';
import { PromptEnhancerViewer } from './components/PromptEnhancerViewer';
import { AgentDesignerViewer } from './components/AgentDesignerViewer';
import { Tabs } from './components/Tabs';
import { ReportModal } from './components/ReportModal';
import { ReasoningControls } from './components/ReasoningControls';
import { ScaffolderControls } from './components/ScaffolderControls';
import { RequestSplitterControls } from './components/RequestSplitterControls';
import { PromptEnhancerControls } from './components/PromptEnhancerControls';
import { AgentDesignerControls } from './components/AgentDesignerControls';
import { HierarchicalToggle } from './components/HierarchicalToggle';
import { CheckCircleIcon } from './components/icons/CheckCircleIcon';
import { XCircleIcon } from './components/icons/XCircleIcon';
import { DownloadIcon } from './components/icons/DownloadIcon';
import { useStarfield } from './hooks/useStarfield';
import type { ProcessedOutput, ProgressUpdate, AppState, ProcessingError, Mode, RewriteLength, SummaryFormat, ReasoningSettings, ScaffolderSettings, RequestSplitterSettings, PromptEnhancerSettings, AgentDesignerSettings } from './types';
import { INITIAL_PROGRESS, INITIAL_REASONING_SETTINGS, INITIAL_SCAFFOLDER_SETTINGS, INITIAL_REQUEST_SPLITTER_SETTINGS, INITIAL_PROMPT_ENHANCER_SETTINGS, INITIAL_AGENT_DESIGNER_SETTINGS } from './constants';
import { SUMMARY_FORMAT_OPTIONS } from './data/summaryFormats';
import { TABS, DESCRIPTION_TEXT, getButtonText, RESET_BUTTON_TEXT } from './constants/uiConstants';
import { handleSubmission } from './services/submissionService';
import {
  downloadReasoningArtifact,
  downloadScaffoldArtifact,
  downloadRequestSplitterArtifact,
  downloadPromptEnhancerArtifact,
  downloadAgentDesignerArtifact
} from './utils/downloadUtils';


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

  // --- HOOKS ---
  useStarfield('space-background');

  // --- MEMOS ---
  const filteredSummaryFormats = useMemo(() => {
    if (!summarySearchTerm.trim()) {
      return SUMMARY_FORMAT_OPTIONS;
    }
    const lowercasedTerm = summarySearchTerm.toLowerCase();
    return SUMMARY_FORMAT_OPTIONS.filter(format =>
      format.label.toLowerCase().includes(lowercasedTerm) ||
      format.tags.some(tag => tag.toLowerCase().includes(lowercasedTerm))
    );
  }, [summarySearchTerm]);

  const selectedFormatDescription = useMemo(() => {
    return SUMMARY_FORMAT_OPTIONS.find(f => f.value === summaryFormat)?.description || '';
  }, [summaryFormat]);
  
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
  ]);

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
  
  const downloadButtonClass = "w-full px-4 py-2 bg-secondary text-text-primary font-semibold rounded-lg hover:bg-muted transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-surface flex items-center justify-center gap-2 text-sm";
  const primaryActionButtonClass = "w-full px-6 py-3 bg-secondary text-text-primary font-semibold rounded-lg hover:bg-muted transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-surface flex items-center justify-center gap-2";

  // --- EVENT HANDLERS ---
  const handleReset = useCallback(() => {
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
  }, []);

  const handleSubmit = useCallback(() => {
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
        promptEnhancerSettings, agentDesignerSettings
      },
      setAppState, setError, setProcessedData, setProgress,
      setNextStepSuggestions, setSuggestionsLoading
    });
  }, [
    activeMode, currentFiles, summaryTextInput, useHierarchical, summaryFormat,
    styleTarget, rewriteStyle, rewriteInstructions, rewriteLength,
    reasoningPrompt, reasoningSettings, scaffolderPrompt, scaffolderSettings,
    requestSplitterSpec, requestSplitterSettings, promptEnhancerSettings,
    agentDesignerSettings
  ]);

  const handleFileSelect = useCallback((files: File[]) => {
    if (files.length > 0) {
      setSummaryTextInput(''); // Clear text input when files are selected
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
      setCurrentFiles(null); // Clear files when text is entered
    }
  }, []);
  
  const handleRequestSplitterSpecChange = useCallback((spec: string) => {
    setRequestSplitterSpec(spec);
  }, []);

  const handlePromptEnhancerSettingsChange = useCallback((settings: PromptEnhancerSettings) => {
    setPromptEnhancerSettings(settings);
  }, []);

  const handleReasoningPromptChange = useCallback((prompt: string) => {
    setReasoningPrompt(prompt);
  }, []);

  const handleScaffolderPromptChange = useCallback((prompt: string) => {
    setScaffolderPrompt(prompt);
  }, []);

  const handleAgentDesignerSettingsChange = useCallback((settings: AgentDesignerSettings) => {
    setAgentDesignerSettings(settings);
  }, []);


  return (
    <>
      <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-4 sm:p-8 transition-all duration-300">
        <div className="w-full max-w-3xl bg-surface shadow-2xl rounded-lg p-6 sm:p-10 border border-border-color animate-breathing-glow">
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

          {/* RENDER CONTROLS */}
          {(appState === 'idle' || appState === 'fileSelected') && (
            <div className="animate-fade-in-scale">
              {activeMode === 'technical' && (
                <>
                  <div className="my-4 px-4 sm:px-0">
                    <label htmlFor="summaryFormatSelect" className="block text-sm font-medium text-text-secondary mb-1">
                      Summary Format:
                    </label>
                    <input
                      type="search"
                      placeholder="Search formats by name or tag (e.g., table, project)..."
                      value={summarySearchTerm}
                      onChange={(e) => setSummarySearchTerm(e.target.value)}
                      className="w-full px-3 py-2 bg-input border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring text-text-primary placeholder-text-secondary text-sm mb-2"
                      aria-controls="summaryFormatSelect"
                    />
                    <select
                      id="summaryFormatSelect"
                      value={summaryFormat}
                      onChange={(e) => setSummaryFormat(e.target.value as SummaryFormat)}
                      className="w-full px-3 py-2 bg-input border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring text-text-primary placeholder-text-secondary text-sm"
                    >
                      {filteredSummaryFormats.length > 0 ? (
                        filteredSummaryFormats.map(format => (
                          <option key={format.value} value={format.value}>{format.label}</option>
                        ))
                      ) : (
                        <option disabled>No formats found for "{summarySearchTerm}"</option>
                      )}
                    </select>
                    <p className="mt-1 text-xs text-text-secondary">
                      {selectedFormatDescription}
                    </p>
                  </div>
                  <div className="my-4 px-4 sm:px-0">
                    <label htmlFor="summaryTextInput" className="block text-sm font-medium text-text-secondary mb-1">
                      Or Paste Text to Summarize:
                    </label>
                    <textarea
                      id="summaryTextInput"
                      rows={8}
                      value={summaryTextInput}
                      onChange={(e) => handleSummaryTextChange(e.target.value)}
                      placeholder="Paste your transcript or document content here..."
                      className="w-full px-3 py-2 bg-input border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring text-text-primary placeholder-text-secondary text-sm"
                    />
                  </div>
                  <HierarchicalToggle enabled={useHierarchical} onChange={setUseHierarchical} />
                </>
              )}
              {activeMode === 'reasoningStudio' && <ReasoningControls prompt={reasoningPrompt} onPromptChange={handleReasoningPromptChange} settings={reasoningSettings} onSettingsChange={setReasoningSettings} />}
              {activeMode === 'scaffolder' && <ScaffolderControls prompt={scaffolderPrompt} onPromptChange={handleScaffolderPromptChange} settings={scaffolderSettings} onSettingsChange={setScaffolderSettings} />}
              {activeMode === 'requestSplitter' && <RequestSplitterControls spec={requestSplitterSpec} onSpecChange={handleRequestSplitterSpecChange} settings={requestSplitterSettings} onSettingsChange={setRequestSplitterSettings} />}
              {activeMode === 'promptEnhancer' && <PromptEnhancerControls settings={promptEnhancerSettings} onSettingsChange={handlePromptEnhancerSettingsChange} />}
              {activeMode === 'agentDesigner' && <AgentDesignerControls settings={agentDesignerSettings} onSettingsChange={handleAgentDesignerSettingsChange} />}
              {activeMode === 'styleExtractor' && (
                <div className="my-4 px-4 sm:px-0">
                  <label htmlFor="styleTargetInput" className="block text-sm font-medium text-text-secondary mb-1">
                    Specify Person/Character for Style Analysis (optional):
                  </label>
                  <input
                    type="text"
                    id="styleTargetInput"
                    value={styleTarget}
                    onChange={(e) => setStyleTarget(e.target.value)}
                    placeholder='e.g., Narrator, "John Doe", or leave blank for overall style'
                    className="w-full px-3 py-2 bg-input border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring text-text-primary placeholder-text-secondary text-sm"
                    aria-describedby="styleTargetDescription"
                  />
                  <p id="styleTargetDescription" className="mt-1 text-xs text-text-secondary">
                    If left blank or "all", the overall style of the text will be analyzed.
                  </p>
                </div>
              )}
              {activeMode === 'rewriter' && (
                <div className="my-4 px-4 sm:px-0 space-y-4">
                  <div>
                    <label htmlFor="rewriteStyleInput" className="block text-sm font-medium text-text-secondary mb-1">
                      Desired Writing Style:
                    </label>
                    <textarea id="rewriteStyleInput" rows={2} value={rewriteStyle} onChange={(e) => setRewriteStyle(e.target.value)} placeholder="e.g., A witty, informal blog post; a formal, academic paper; a thrilling short story..." className="w-full px-3 py-2 bg-input border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring text-text-primary placeholder-text-secondary text-sm" />
                  </div>
                  <div>
                    <label htmlFor="rewriteInstructionsInput" className="block text-sm font-medium text-text-secondary mb-1">
                      Other Instructions (optional):
                    </label>
                    <textarea id="rewriteInstructionsInput" rows={2} value={rewriteInstructions} onChange={(e) => setRewriteInstructions(e.target.value)} placeholder="e.g., The target audience is children. Focus on the emotional journey. End with a surprising twist." className="w-full px-3 py-2 bg-input border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring text-text-primary placeholder-text-secondary text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Desired Length:</label>
                    <div className="flex items-center space-x-2 bg-secondary rounded-lg p-1" role="radiogroup">
                      {(['short', 'medium', 'long'] as RewriteLength[]).map(len => (
                        <button key={len} onClick={() => setRewriteLength(len)} role="radio" aria-checked={rewriteLength === len} className={`flex-1 py-1.5 text-sm rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-secondary ${rewriteLength === len ? 'bg-primary text-primary-foreground font-semibold shadow' : 'text-text-secondary hover:bg-muted'}`}>
                          {len.charAt(0).toUpperCase() + len.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <FileLoader onFileSelect={handleFileSelect} selectedFiles={currentFiles} mode={activeMode} />
            </div>
          )}

          {/* SUBMIT BUTTON */}
          {canSubmit && appState !== 'completed' && appState !== 'error' && (
            <div className="mt-6 text-center">
              <button
                onClick={handleSubmit}
                disabled={appState === 'processing'}
                className="px-8 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-surface text-lg"
                aria-live="polite"
              >
                {appState === 'processing' ? 'Processing...' : buttonText}
              </button>
            </div>
          )}

          {/* PROGRESS & RESULTS */}
          {appState === 'processing' && <div className="mt-8"><ProgressBar progress={progress} /></div>}
          {appState === 'completed' && processedData && <div className="mt-8 animate-fade-in-scale">
            <div className="flex items-center justify-center text-green-400 mb-4"><CheckCircleIcon className="w-8 h-8 mr-2" aria-hidden="true" /><p className="text-xl font-semibold">Processing Complete!</p></div>
            {activeMode === 'reasoningStudio' ? <ReasoningViewer output={processedData as any} />
              : activeMode === 'scaffolder' ? <ScaffolderViewer output={processedData as any} />
              : activeMode === 'requestSplitter' ? <RequestSplitterViewer output={processedData as any} />
              : activeMode === 'promptEnhancer' ? <PromptEnhancerViewer output={processedData as any} />
              : activeMode === 'agentDesigner' ? <AgentDesignerViewer output={processedData as any} />
              : <SummaryViewer output={processedData} mode={activeMode} />}

            {/* Suggestions Section */}
            {/* ... same logic ... */}

            {/* Reset/Download Buttons */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button onClick={handleReset} className={primaryActionButtonClass}>
                {RESET_BUTTON_TEXT[activeMode]}
              </button>
              {activeMode === 'reasoningStudio' ? (
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => downloadReasoningArtifact(processedData, 'md')} className={downloadButtonClass}><DownloadIcon className="w-5 h-5" />Final (.md)</button>
                  <button onClick={() => downloadReasoningArtifact(processedData, 'json')} className={downloadButtonClass}><DownloadIcon className="w-5 h-5" />Trace (.json)</button>
                </div>
              ) : activeMode === 'scaffolder' ? (
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => downloadScaffoldArtifact(processedData, scaffolderSettings, 'script')} className={downloadButtonClass}><DownloadIcon className="w-5 h-5" />Script</button>
                  <button onClick={() => downloadScaffoldArtifact(processedData, scaffolderSettings, 'plan')} className={downloadButtonClass}><DownloadIcon className="w-5 h-5" />Plan (.json)</button>
                </div>
              ) : activeMode === 'requestSplitter' ? (
                 <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => downloadRequestSplitterArtifact(processedData, 'md')} className={downloadButtonClass}><DownloadIcon className="w-5 h-5" />Prompts (.md)</button>
                    <button onClick={() => downloadRequestSplitterArtifact(processedData, 'json')} className={downloadButtonClass}><DownloadIcon className="w-5 h-5" />Plan (.json)</button>
                 </div>
              ) : activeMode === 'promptEnhancer' ? (
                 <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => downloadPromptEnhancerArtifact(processedData, 'md')} className={downloadButtonClass}><DownloadIcon className="w-5 h-5" />Prompt (.md)</button>
                    <button onClick={() => downloadPromptEnhancerArtifact(processedData, 'json')} className={downloadButtonClass}><DownloadIcon className="w-5 h-5" />Data (.json)</button>
                 </div>
              ) : activeMode === 'agentDesigner' ? (
                 <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => downloadAgentDesignerArtifact(processedData, 'md')} className={downloadButtonClass}><DownloadIcon className="w-5 h-5" />Design (.md)</button>
                    <button onClick={() => downloadAgentDesignerArtifact(processedData, 'json')} className={downloadButtonClass}><DownloadIcon className="w-5 h-5" />Plan (.json)</button>
                 </div>
              ) : (
                <button onClick={() => setIsReportModalOpen(true)} className={primaryActionButtonClass}><DownloadIcon className="w-5 h-5" />Download Report</button>
              )}
            </div>
          </div>}

          {/* Error State */}
          {appState === 'error' && error && <div className="mt-8 p-4 bg-red-900 border border-red-700 rounded-lg text-red-100 animate-fade-in-scale" role="alert">
            <div className="flex items-center mb-2"><XCircleIcon className="w-6 h-6 mr-2" aria-hidden="true" /><h3 className="text-lg font-semibold">Error</h3></div>
            <p className="text-sm">{error.message}</p>
            {error.details && <details className="mt-2 text-xs"><summary>Show Details</summary><pre className="whitespace-pre-wrap break-all bg-red-800 p-2 rounded mt-1">{error.details}</pre></details>}
            <button onClick={handleReset} className="mt-4 w-full px-6 py-2 bg-red-700 text-white font-semibold rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-surface">Try Again</button>
          </div>}
        </div>
        <footer className="text-center mt-8 text-text-secondary text-xs">
          <p>&copy; {new Date().getFullYear()} AI Content Suite. Powered by Gemini.</p>
        </footer>
      </div>

      <ReportModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} output={processedData} mode={activeMode} styleTarget={activeMode === 'styleExtractor' ? styleTarget : undefined} nextStepSuggestions={nextStepSuggestions} />
    </>
  );
};

export default App;
