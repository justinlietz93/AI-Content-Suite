
import React, { useState, useCallback, useMemo } from 'react';
import { FileLoader } from './components/FileLoader';
import { ProgressBar } from './components/ProgressBar';
import { SummaryViewer } from './components/SummaryViewer';
import { ReasoningViewer } from './components/ReasoningViewer';
import { ScaffolderViewer } from './components/ScaffolderViewer';
import { RequestSplitterViewer } from './components/RequestSplitterViewer';
import { Tabs } from './components/Tabs';
import { processTranscript } from './services/summarizationService';
import { processStyleExtraction } from './services/styleExtractionService';
import { processRewrite } from './services/rewriterService';
import { processMathFormatting } from './services/mathFormattingService';
import { processReasoningRequest } from './services/reasoningService';
import { processScaffoldingRequest } from './services/scaffolderService';
import { processRequestSplitting } from './services/requestSplitterService';
import { generateSuggestions } from './services/geminiService';
import { ocrPdf } from './services/ocrService';
import type { ProcessedOutput, ProgressUpdate, AppState, ProcessingError, Mode, SummaryOutput, StyleModelOutput, RewriteLength, RewriterOutput, MathFormatterOutput, SummaryFormat, ReasoningOutput, ReasoningSettings, ScaffolderOutput, ScaffolderSettings, RequestSplitterOutput, RequestSplitterSettings } from './types';
import { INITIAL_PROGRESS, INITIAL_REASONING_SETTINGS, INITIAL_SCAFFOLDER_SETTINGS, INITIAL_REQUEST_SPLITTER_SETTINGS } from './constants';
import { SUMMARY_FORMAT_OPTIONS } from './data/summaryFormats';
import { CheckCircleIcon } from './components/icons/CheckCircleIcon';
import { XCircleIcon } from './components/icons/XCircleIcon';
import { Spinner } from './components/Spinner';
import { ReportModal } from './components/ReportModal';
import { DownloadIcon } from './components/icons/DownloadIcon';
import { ReasoningControls } from './components/ReasoningControls';
import { ScaffolderControls } from './components/ScaffolderControls';
import { RequestSplitterControls } from './components/RequestSplitterControls';


/**
 * Reads file content as text.
 * @param file The file to read.
 * @returns A promise that resolves with the file content as a string.
 */
const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
};

const HierarchicalToggle: React.FC<{ enabled: boolean; onChange: (enabled: boolean) => void; }> = ({ enabled, onChange }) => {
    return (
      <div className="flex items-center justify-between bg-slate-700/50 p-3 rounded-lg my-4">
        <div>
          <label htmlFor="hierarchical-toggle" className="font-semibold text-text-primary cursor-pointer">
            Hierarchical Processing
          </label>
          <p id="hierarchical-description" className="text-xs text-text-secondary mt-1 max-w-sm">
            For very large documents. Uses more parallel agents for faster, potentially more detailed results.
          </p>
        </div>
        <button
          type="button"
          id="hierarchical-toggle"
          role="switch"
          aria-checked={enabled}
          aria-describedby='hierarchical-description'
          onClick={() => onChange(!enabled)}
          className={`${
            enabled ? 'bg-primary' : 'bg-slate-600'
          } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface`}
        >
          <span
            aria-hidden="true"
            className={`${
              enabled ? 'translate-x-6' : 'translate-x-1'
            } inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out`}
          />
        </button>
      </div>
    );
};


const App: React.FC = () => {
  const [currentFiles, setCurrentFiles] = useState<File[] | null>(null);
  const [appState, setAppState] = useState<AppState>('idle');
  const [activeMode, setActiveMode] = useState<Mode>('technical');
  const [styleTarget, setStyleTarget] = useState<string>('');
  const [rewriteStyle, setRewriteStyle] = useState<string>('');
  const [rewriteInstructions, setRewriteInstructions] = useState<string>('');
  const [rewriteLength, setRewriteLength] = useState<RewriteLength>('medium');
  const [progress, setProgress] = useState<ProgressUpdate>(INITIAL_PROGRESS);
  const [processedData, setProcessedData] = useState<ProcessedOutput | null>(null);
  const [error, setError] = useState<ProcessingError | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [nextStepSuggestions, setNextStepSuggestions] = useState<string[] | null>(null);
  const [suggestionsLoading, setSuggestionsLoading] = useState<boolean>(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [useHierarchical, setUseHierarchical] = useState(false);
  const [summaryFormat, setSummaryFormat] = useState<SummaryFormat>('default');
  const [summarySearchTerm, setSummarySearchTerm] = useState('');
  
  // State for Reasoning Studio
  const [reasoningPrompt, setReasoningPrompt] = useState('');
  const [reasoningSettings, setReasoningSettings] = useState<ReasoningSettings>(INITIAL_REASONING_SETTINGS);

  // State for Project Scaffolder
  const [scaffolderPrompt, setScaffolderPrompt] = useState('');
  const [scaffolderSettings, setScaffolderSettings] = useState<ScaffolderSettings>(INITIAL_SCAFFOLDER_SETTINGS);

  // State for Request Splitter
  const [requestSplitterSpec, setRequestSplitterSpec] = useState('');
  const [requestSplitterSettings, setRequestSplitterSettings] = useState<RequestSplitterSettings>(INITIAL_REQUEST_SPLITTER_SETTINGS);

  const handleRequestSplitterSpecChange = useCallback((spec: string) => {
    setRequestSplitterSpec(spec);
    if (spec.trim() || (currentFiles && currentFiles.length > 0)) {
        setAppState('fileSelected');
    } else {
        setAppState('idle');
    }
  }, [currentFiles]);


  const handleFileSelect = useCallback((files: File[]) => {
    setCurrentFiles(files);
    setProcessedData(null);
    setError(null);
    setAppState('fileSelected');
    setProgress(INITIAL_PROGRESS);
    setNextStepSuggestions(null); 
    setSuggestionsLoading(false);
    // Also trigger readiness check for request splitter
    if (activeMode === 'requestSplitter' && (files.length > 0 || requestSplitterSpec.trim())) {
        setAppState('fileSelected');
    }
  }, [activeMode, requestSplitterSpec]);

  const fileToGenerativePart = async (file: File): Promise<any> => {
    if (file.type.startsWith('image/')) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64Data = (reader.result as string).split(',')[1];
                resolve({
                    inlineData: {
                        mimeType: file.type,
                        data: base64Data,
                    },
                });
            };
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(file);
        });
    } else { // Assume text-based
        const text = await readFileAsText(file);
        return { text: `--- DOCUMENT START: ${file.name} ---\n\n${text}\n\n--- DOCUMENT END: ${file.name} ---` };
    }
  };

  const handleSubmit = useCallback(async () => {
    const isReadyForSubmit = 
      (activeMode === 'reasoningStudio' && reasoningPrompt) ||
      (activeMode === 'scaffolder' && scaffolderPrompt) ||
      (activeMode === 'requestSplitter' && (requestSplitterSpec || (currentFiles && currentFiles.length > 0))) ||
      (currentFiles && currentFiles.length > 0);

    if (!isReadyForSubmit) return;

    setAppState('processing');
    setError(null);
    setProcessedData(null);
    setStartTime(Date.now());
    setNextStepSuggestions(null);
    setSuggestionsLoading(false);

    try {
      let result: ProcessedOutput;
      
      const processedParts: any[] = []; // For rewriter, reasoning, scaffolder, splitter
      const processedTexts: string[] = []; // For text-based modes

      if(currentFiles && currentFiles.length > 0) {
        for (let i = 0; i < currentFiles.length; i++) {
          const file = currentFiles[i];
          const basePercentage = 2;
          const range = 8;
          const fileProgressStart = basePercentage + (i / currentFiles.length) * range;
          const fileProgressEnd = basePercentage + ((i + 1) / currentFiles.length) * range;

          if (file.type === 'application/pdf') {
            const ocrText = await ocrPdf(file, (ocrUpdate) => {
              const overallFileProgress = fileProgressStart + (fileProgressEnd - fileProgressStart) * ocrUpdate.progress;
              setProgress({
                stage: 'Processing PDF...',
                percentage: overallFileProgress,
                message: `[${i + 1}/${currentFiles.length}] ${file.name}: ${ocrUpdate.status}`,
                thinkingHint: ocrUpdate.totalPages > 0 ? `Page ${ocrUpdate.page} of ${ocrUpdate.totalPages}` : 'Preparing...'
              });
            });
            const textWithContext = `--- DOCUMENT START: ${file.name} ---\n\n${ocrText}\n\n--- DOCUMENT END: ${file.name} ---`;
            processedTexts.push(textWithContext);
            if (['rewriter', 'reasoningStudio', 'scaffolder', 'requestSplitter'].includes(activeMode)) {
              processedParts.push({ text: textWithContext });
            }
          } else if (file.type.startsWith('image/') && (activeMode === 'rewriter')) {
            setProgress({ stage: 'Processing Files', percentage: fileProgressStart, message: `[${i + 1}/${currentFiles.length}] Reading image ${file.name}...` });
            processedParts.push(await fileToGenerativePart(file));
          } else { 
            setProgress({ stage: 'Processing Files', percentage: fileProgressStart, message: `[${i + 1}/${currentFiles.length}] Reading file ${file.name}...` });
            const text = await readFileAsText(file);
            const textWithContext = `--- DOCUMENT START: ${file.name} ---\n\n${text}\n\n--- DOCUMENT END: ${file.name} ---`;
            processedTexts.push(textWithContext);
            if (['rewriter', 'reasoningStudio', 'scaffolder', 'requestSplitter'].includes(activeMode)) {
              processedParts.push({ text: textWithContext });
            }
          }
        }
      }

      if (currentFiles && currentFiles.length > 0) {
        const totalSize = currentFiles.reduce((acc, file) => acc + file.size, 0);
        const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
        setProgress({ stage: 'Content Loaded', percentage: 10, message: `All content loaded (${totalSizeMB} MB).` });
      } else {
        setProgress({ stage: 'Ready', percentage: 10, message: `Prompt ready for processing.` });
      }
      
      if (activeMode === 'rewriter') {
        result = await processRewrite(processedParts, rewriteStyle, rewriteInstructions, rewriteLength, (update) => {
            setProgress(update);
        });
      } else if (activeMode === 'reasoningStudio') {
        result = await processReasoningRequest(reasoningPrompt, reasoningSettings, processedParts, (update) => {
          setProgress(update);
        });
      } else if (activeMode === 'scaffolder') {
        result = await processScaffoldingRequest(scaffolderPrompt, scaffolderSettings, processedParts, (update) => {
          setProgress(update);
        });
      } else if (activeMode === 'requestSplitter') {
        result = await processRequestSplitting(requestSplitterSpec, requestSplitterSettings, processedParts, (update) => {
            setProgress(update);
        });
      } else {
        const combinedText = processedTexts.join('\n\n--- DOCUMENT BREAK ---\n\n');

        if (activeMode === 'technical') {
          result = await processTranscript(combinedText, (update) => {
            setProgress(update);
          }, useHierarchical, summaryFormat);
        } else if (activeMode === 'styleExtractor') {
          result = await processStyleExtraction(combinedText, styleTarget, (update) => {
            setProgress(update);
          });
        } else { // 'mathFormatter'
            result = await processMathFormatting(combinedText, (update) => {
                setProgress(update);
            });
        }
      }

      const endTime = Date.now();
      const durationSeconds = Math.round((endTime - (startTime ?? endTime)) / 1000);
      const fullResult = { ...result, processingTimeSeconds: durationSeconds };
      setProcessedData(fullResult);
      setAppState('completed');
      
      if (['rewriter', 'mathFormatter', 'reasoningStudio', 'scaffolder', 'requestSplitter'].includes(activeMode)) {
        setSuggestionsLoading(false);
        setNextStepSuggestions(null);
        return; // No suggestions for these modes
      }

      // Asynchronously fetch suggestions after primary processing is complete
      setSuggestionsLoading(true);
      (async () => {
        try {
          const contentToSuggestOn = activeMode === 'technical'
            ? (fullResult as SummaryOutput).finalSummary
            : (fullResult as StyleModelOutput).styleDescription;
          
          const targetForSuggestions = activeMode === 'styleExtractor' ? styleTarget : undefined;

          if (contentToSuggestOn && contentToSuggestOn.trim() !== "") {
            const suggestions = await generateSuggestions(activeMode, contentToSuggestOn, targetForSuggestions);
            setNextStepSuggestions(suggestions);
          } else {
            console.warn("No content available for generating suggestions.");
            setNextStepSuggestions(null);
          }
        } catch (suggestionError) {
          console.error("Failed to generate next step suggestions:", suggestionError);
          setNextStepSuggestions(null);
        } finally {
          setSuggestionsLoading(false);
        }
      })();

    } catch (err) {
      console.error(`Error during ${activeMode} processing:`, err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      const errorDetails = err instanceof Error && err.stack ? err.stack : undefined;
      setError({ message: `Failed to process: ${errorMessage}`, details: errorDetails });
      setAppState('error');
      setSuggestionsLoading(false);
    }
  }, [currentFiles, startTime, activeMode, styleTarget, rewriteStyle, rewriteInstructions, rewriteLength, useHierarchical, summaryFormat, reasoningPrompt, reasoningSettings, scaffolderPrompt, scaffolderSettings, requestSplitterSpec, requestSplitterSettings]);

  const handleReset = useCallback(() => {
    setCurrentFiles(null);
    setProcessedData(null);
    setError(null);
    setAppState('idle');
    setProgress(INITIAL_PROGRESS);
    setStartTime(null);
    setStyleTarget('');
    setRewriteStyle('');
    setRewriteInstructions('');
    setRewriteLength('medium');
    setNextStepSuggestions(null);
    setSuggestionsLoading(false);
    setUseHierarchical(false);
    setSummaryFormat('default');
    setSummarySearchTerm('');
    setReasoningPrompt('');
    setReasoningSettings(INITIAL_REASONING_SETTINGS);
    setScaffolderPrompt('');
    setScaffolderSettings(INITIAL_SCAFFOLDER_SETTINGS);
    setRequestSplitterSpec('');
    setRequestSplitterSettings(INITIAL_REQUEST_SPLITTER_SETTINGS);
  }, []);

  const TABS = [
    { id: 'technical', label: 'Technical Summarizer' },
    { id: 'styleExtractor', label: 'Style Extractor' },
    { id: 'rewriter', label: 'Rewriter' },
    { id: 'mathFormatter', label: 'Math Formatter' },
    { id: 'reasoningStudio', label: 'Reasoning Studio' },
    { id: 'scaffolder', label: 'Project Scaffolder' },
    { id: 'requestSplitter', label: 'Request Splitter' },
  ];

  const descriptionText = {
    technical: "Upload one or more large transcript or PDF files to get a concise summary and key highlights.",
    styleExtractor: "Upload one or more text or PDF files to analyze and extract a unique writing style model.",
    rewriter: "Upload documents, PDFs, and images, provide a style and instructions, and rewrite them into a new narrative.",
    mathFormatter: "Upload one or more LaTeX/Markdown or PDF documents to reformat mathematical notations for proper MathJax rendering.",
    reasoningStudio: "Input a complex goal, configure the reasoning pipeline, and receive a polished answer with a full, interactive reasoning trace.",
    scaffolder: "Describe a project to generate a complete, standards-compliant code scaffold with prompts for an AI coding agent.",
    requestSplitter: "Input a large specification to decompose it into a sequence of actionable, buildable implementation prompts.",
  };

  const buttonText = {
    technical: currentFiles && currentFiles.length > 0 ? `Summarize ${currentFiles.length} file(s)` : 'Summarize',
    styleExtractor: currentFiles && currentFiles.length > 0 ? `Extract Style from ${currentFiles.length} file(s)` : 'Extract Style',
    rewriter: currentFiles && currentFiles.length > 0 ? `Rewrite ${currentFiles.length} item(s)` : 'Rewrite',
    mathFormatter: currentFiles && currentFiles.length > 0 ? `Format ${currentFiles.length} file(s)` : 'Format Math',
    reasoningStudio: 'Run Reasoning Engine',
    scaffolder: 'Generate Project Scaffold',
    requestSplitter: 'Split Request',
  };

  const resetButtonText = {
      technical: 'Summarize Another',
      styleExtractor: 'Extract Another',
      rewriter: 'Rewrite Another',
      mathFormatter: 'Format Another',
      reasoningStudio: 'New Reasoning Task',
      scaffolder: 'New Project Scaffold',
      requestSplitter: 'New Split Request',
  }

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

  const downloadReasoningArtifact = (type: 'md' | 'json') => {
    if (!processedData || activeMode !== 'reasoningStudio') return;
    const reasoningOutput = processedData as ReasoningOutput;
    
    let content = '';
    let mimeType = '';
    let fileExtension = '';

    if (type === 'md') {
        content = reasoningOutput.finalResponseMd;
        mimeType = 'text/markdown';
        fileExtension = 'md';
    } else {
        content = JSON.stringify(reasoningOutput.reasoningTreeJson, null, 2);
        mimeType = 'application/json';
        fileExtension = 'json';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reasoning_${type === 'md' ? 'response' : 'trace'}.${fileExtension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadScaffoldArtifact = (type: 'script' | 'plan') => {
    if (!processedData || activeMode !== 'scaffolder') return;
    const scaffolderOutput = processedData as ScaffolderOutput;
    
    let content = '';
    let mimeType = '';
    let fileExtension = '';

    if (type === 'script') {
        content = scaffolderOutput.scaffoldScript;
        fileExtension = scaffolderSettings.language === 'python' ? 'py' : 'sh';
        mimeType = scaffolderSettings.language === 'python' ? 'text/x-python' : 'application/x-sh';
    } else { // plan
        content = JSON.stringify(scaffolderOutput.scaffoldPlanJson, null, 2);
        mimeType = 'application/json';
        fileExtension = 'json';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scaffold_${type}.${fileExtension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const downloadRequestSplitterArtifact = (type: 'md' | 'json') => {
    if (!processedData || activeMode !== 'requestSplitter') return;
    const splitterOutput = processedData as RequestSplitterOutput;
    
    let content = '';
    let mimeType = '';
    let fileExtension = '';

    if (type === 'md') {
        content = splitterOutput.orderedPromptsMd;
        mimeType = 'text/markdown';
        fileExtension = 'md';
    } else {
        content = JSON.stringify(splitterOutput.splitPlanJson, null, 2);
        mimeType = 'application/json';
        fileExtension = 'json';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `request_splitter_${type === 'md' ? 'prompts' : 'plan'}.${fileExtension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };


  return (
    <>
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 sm:p-8 transition-all duration-300">
        <div className="w-full max-w-3xl bg-surface shadow-2xl rounded-lg p-6 sm:p-10">
          <header className="mb-6 text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">
              AI Content Suite
            </h1>
            <p className="text-text-secondary mt-2 text-sm sm:text-base">
              {descriptionText[activeMode]}
            </p>
          </header>

          <div className="mb-6">
            <Tabs tabs={TABS} activeTabId={activeMode} onTabChange={(id) => {
              setActiveMode(id as Mode);
              handleReset(); 
            }} />
          </div>

          {activeMode === 'technical' && (appState === 'idle' || appState === 'fileSelected') && (
            <div className="animate-fade-in-scale">
              <HierarchicalToggle enabled={useHierarchical} onChange={setUseHierarchical} />
               <div className="my-4 px-4 sm:px-0">
                  <label htmlFor="summaryFormatSelect" className="block text-sm font-medium text-text-secondary mb-1">
                    Summary Format:
                  </label>
                  <input
                    type="search"
                    placeholder="Search formats by name or tag (e.g., table, project)..."
                    value={summarySearchTerm}
                    onChange={(e) => setSummarySearchTerm(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-border-color rounded-md shadow-sm focus:ring-primary focus:border-primary text-text-primary placeholder-slate-500 text-sm mb-2"
                    aria-controls="summaryFormatSelect"
                  />
                  <select
                    id="summaryFormatSelect"
                    value={summaryFormat}
                    onChange={(e) => setSummaryFormat(e.target.value as SummaryFormat)}
                    className="w-full px-3 py-2 bg-slate-700 border border-border-color rounded-md shadow-sm focus:ring-primary focus:border-primary text-text-primary placeholder-slate-500 text-sm"
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
            </div>
          )}
          
          {activeMode === 'reasoningStudio' && (appState === 'idle' || appState === 'fileSelected') && (
            <ReasoningControls 
                prompt={reasoningPrompt}
                onPromptChange={setReasoningPrompt}
                settings={reasoningSettings}
                onSettingsChange={setReasoningSettings}
            />
          )}

          {activeMode === 'scaffolder' && (appState === 'idle' || appState === 'fileSelected') && (
            <ScaffolderControls
                prompt={scaffolderPrompt}
                onPromptChange={setScaffolderPrompt}
                settings={scaffolderSettings}
                onSettingsChange={setScaffolderSettings}
            />
          )}

          {activeMode === 'requestSplitter' && (appState === 'idle' || appState === 'fileSelected') && (
              <RequestSplitterControls
                  spec={requestSplitterSpec}
                  onSpecChange={handleRequestSplitterSpecChange}
                  settings={requestSplitterSettings}
                  onSettingsChange={setRequestSplitterSettings}
              />
          )}

          {activeMode === 'styleExtractor' && (appState === 'idle' || appState === 'fileSelected') && (
            <div className="my-4 px-4 sm:px-0 animate-fade-in-scale">
              <label htmlFor="styleTargetInput" className="block text-sm font-medium text-text-secondary mb-1">
                Specify Person/Character for Style Analysis (optional):
              </label>
              <input
                type="text"
                id="styleTargetInput"
                value={styleTarget}
                onChange={(e) => setStyleTarget(e.target.value)}
                placeholder='e.g., Narrator, "John Doe", or leave blank for overall style'
                className="w-full px-3 py-2 bg-slate-700 border border-border-color rounded-md shadow-sm focus:ring-primary focus:border-primary text-text-primary placeholder-slate-500 text-sm"
                aria-describedby="styleTargetDescription"
              />
              <p id="styleTargetDescription" className="mt-1 text-xs text-text-secondary">
                If left blank or "all", the overall style of the text will be analyzed.
              </p>
            </div>
          )}

          {activeMode === 'rewriter' && (appState === 'idle' || appState === 'fileSelected') && (
            <div className="my-4 px-4 sm:px-0 space-y-4 animate-fade-in-scale">
              <div>
                <label htmlFor="rewriteStyleInput" className="block text-sm font-medium text-text-secondary mb-1">
                  Desired Writing Style:
                </label>
                <textarea
                  id="rewriteStyleInput"
                  rows={2}
                  value={rewriteStyle}
                  onChange={(e) => setRewriteStyle(e.target.value)}
                  placeholder="e.g., A witty, informal blog post; a formal, academic paper; a thrilling short story..."
                  className="w-full px-3 py-2 bg-slate-700 border border-border-color rounded-md shadow-sm focus:ring-primary focus:border-primary text-text-primary placeholder-slate-500 text-sm"
                />
              </div>
              <div>
                <label htmlFor="rewriteInstructionsInput" className="block text-sm font-medium text-text-secondary mb-1">
                  Other Instructions (optional):
                </label>
                <textarea
                  id="rewriteInstructionsInput"
                  rows={2}
                  value={rewriteInstructions}
                  onChange={(e) => setRewriteInstructions(e.target.value)}
                  placeholder="e.g., The target audience is children. Focus on the emotional journey. End with a surprising twist."
                  className="w-full px-3 py-2 bg-slate-700 border border-border-color rounded-md shadow-sm focus:ring-primary focus:border-primary text-text-primary placeholder-slate-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Desired Length:
                </label>
                <div className="flex items-center space-x-2 bg-slate-700 rounded-lg p-1" role="radiogroup">
                  {(['short', 'medium', 'long'] as RewriteLength[]).map(len => (
                    <button
                      key={len}
                      onClick={() => setRewriteLength(len)}
                      role="radio"
                      aria-checked={rewriteLength === len}
                      className={`flex-1 py-1.5 text-sm rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-slate-700 ${
                        rewriteLength === len
                          ? 'bg-primary text-white font-semibold shadow'
                          : 'text-text-secondary hover:bg-slate-600'
                      }`}
                    >
                      {len.charAt(0).toUpperCase() + len.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {(appState === 'idle' || appState === 'fileSelected') && (
            <FileLoader onFileSelect={handleFileSelect} selectedFiles={currentFiles} mode={activeMode} />
          )}

          {((currentFiles && currentFiles.length > 0) || (activeMode === 'reasoningStudio' && reasoningPrompt) || (activeMode === 'scaffolder' && scaffolderPrompt) || (activeMode === 'requestSplitter' && (requestSplitterSpec.trim() || (currentFiles && currentFiles.length > 0)))) && (appState === 'fileSelected' || appState === 'processing') && (
            <div className="mt-6 text-center">
              <button
                onClick={handleSubmit}
                disabled={appState === 'processing'}
                className="px-8 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface text-lg"
                aria-live="polite"
              >
                {appState === 'processing' ? 'Processing...' : buttonText[activeMode]}
              </button>
            </div>
          )}
          
          {appState === 'processing' && (
            <div className="mt-8">
              <ProgressBar progress={progress} />
            </div>
          )}

          {appState === 'completed' && processedData && (
            <div className="mt-8 animate-fade-in-scale">
              <div className="flex items-center justify-center text-green-400 mb-4">
                <CheckCircleIcon className="w-8 h-8 mr-2" aria-hidden="true" />
                <p className="text-xl font-semibold">Processing Complete!</p>
              </div>
              
              {activeMode === 'reasoningStudio' ? (
                  <ReasoningViewer output={processedData as ReasoningOutput} />
              ) : activeMode === 'scaffolder' ? (
                  <ScaffolderViewer output={processedData as ScaffolderOutput} />
              ) : activeMode === 'requestSplitter' ? (
                  <RequestSplitterViewer output={processedData as RequestSplitterOutput} />
              ) : (
                  <SummaryViewer output={processedData} mode={activeMode} />
              )}


              {/* Next Steps & Suggestions Section */}
              {suggestionsLoading && (
                <div className="mt-6 pt-6 border-t border-border-color text-center text-text-secondary flex items-center justify-center">
                  <Spinner className="w-5 h-5 mr-2 text-primary" />
                  <p>Generating suggestions...</p>
                </div>
              )}
              {!suggestionsLoading && nextStepSuggestions && nextStepSuggestions.length > 0 && (
                <div className="mt-8 pt-6 border-t border-border-color">
                  <h3 className="text-xl font-semibold text-text-primary mb-4 text-center sm:text-left">Next Steps & Suggestions</h3>
                  <ul className="space-y-2">
                    {nextStepSuggestions.map((suggestion, index) => (
                      <li 
                        key={index} 
                        className="p-3 bg-slate-800 border border-slate-700 rounded-md text-sm text-text-secondary shadow hover:bg-slate-700/80 transition-all duration-150 ease-in-out"
                        role="listitem"
                      >
                        <span className="text-primary mr-2 select-none" aria-hidden="true">&#8227;</span>{/* Bullet point */}
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {!suggestionsLoading && nextStepSuggestions === null && appState === 'completed' && !error && Object.keys(processedData).length > 0 && (
                  <div className="mt-6 pt-6 border-t border-border-color text-center text-text-secondary text-xs">
                      {/* Intentionally blank if suggestions are null and no error in fetching them, or if no suggestions were returned by the API */}
                  </div>
              )}

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                      onClick={handleReset}
                      className="w-full px-6 py-3 bg-secondary text-text-primary font-semibold rounded-lg hover:bg-slate-600 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 focus:ring-offset-surface flex items-center justify-center gap-2"
                  >
                      {resetButtonText[activeMode]}
                  </button>
                  {activeMode === 'reasoningStudio' ? (
                      <div className="grid grid-cols-2 gap-2">
                          <button
                              onClick={() => downloadReasoningArtifact('md')}
                              className="w-full px-4 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface flex items-center justify-center gap-2 text-sm"
                          >
                              <DownloadIcon className="w-5 h-5" />
                              Final (.md)
                          </button>
                          <button
                              onClick={() => downloadReasoningArtifact('json')}
                              className="w-full px-4 py-3 bg-sky-700 text-white font-semibold rounded-lg hover:bg-sky-600 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-surface flex items-center justify-center gap-2 text-sm"
                          >
                              <DownloadIcon className="w-5 h-5" />
                              Trace (.json)
                          </button>
                      </div>
                  ) : activeMode === 'scaffolder' ? (
                     <div className="grid grid-cols-2 gap-2">
                          <button
                              onClick={() => downloadScaffoldArtifact('script')}
                              className="w-full px-4 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface flex items-center justify-center gap-2 text-sm"
                          >
                              <DownloadIcon className="w-5 h-5" />
                              Script
                          </button>
                          <button
                              onClick={() => downloadScaffoldArtifact('plan')}
                              className="w-full px-4 py-3 bg-sky-700 text-white font-semibold rounded-lg hover:bg-sky-600 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-surface flex items-center justify-center gap-2 text-sm"
                          >
                              <DownloadIcon className="w-5 h-5" />
                              Plan (.json)
                          </button>
                      </div>
                  ) : activeMode === 'requestSplitter' ? (
                     <div className="grid grid-cols-2 gap-2">
                          <button
                              onClick={() => downloadRequestSplitterArtifact('md')}
                              className="w-full px-4 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface flex items-center justify-center gap-2 text-sm"
                          >
                              <DownloadIcon className="w-5 h-5" />
                              Prompts (.md)
                          </button>
                          <button
                              onClick={() => downloadRequestSplitterArtifact('json')}
                              className="w-full px-4 py-3 bg-sky-700 text-white font-semibold rounded-lg hover:bg-sky-600 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-surface flex items-center justify-center gap-2 text-sm"
                          >
                              <DownloadIcon className="w-5 h-5" />
                              Plan (.json)
                          </button>
                      </div>
                  ) : (
                      <button
                          onClick={() => setIsReportModalOpen(true)}
                          className="w-full px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface flex items-center justify-center gap-2"
                      >
                          <DownloadIcon className="w-5 h-5" />
                          Download Report
                      </button>
                  )}
              </div>

            </div>
          )}

          {appState === 'error' && error && (
            <div className="mt-8 p-4 bg-red-900 border border-red-700 rounded-lg text-red-100 animate-fade-in-scale" role="alert">
              <div className="flex items-center mb-2">
                <XCircleIcon className="w-6 h-6 mr-2" aria-hidden="true"/>
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
                onClick={handleReset}
                className="mt-4 w-full px-6 py-2 bg-red-700 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-red-900"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
        <footer className="text-center mt-8 text-text-secondary text-xs">
            <p>&copy; {new Date().getFullYear()} AI Content Suite. Powered by Gemini.</p>
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
    </>
  );
};

export default App;
