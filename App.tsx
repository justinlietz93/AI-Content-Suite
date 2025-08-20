
import React, { useState, useCallback, useEffect } from 'react';
import { FileLoader } from './components/FileLoader';
import { ProgressBar } from './components/ProgressBar';
import { SummaryViewer } from './components/SummaryViewer';
import { Tabs } from './components/Tabs';
import { processTranscript } from './services/summarizationService';
import { processStyleExtraction } from './services/styleExtractionService';
import { generateSuggestions } from './services/geminiService';
import type { ProcessedOutput, ProgressUpdate, AppState, ProcessingError, Mode, SummaryOutput, StyleModelOutput } from './types';
import { INITIAL_PROGRESS } from './constants';
import { CheckCircleIcon } from './components/icons/CheckCircleIcon';
import { XCircleIcon } from './components/icons/XCircleIcon';
import { Spinner } from './components/Spinner';
import { ReportModal } from './components/ReportModal';
import { DownloadIcon } from './components/icons/DownloadIcon';


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

const App: React.FC = () => {
  const [currentFiles, setCurrentFiles] = useState<File[] | null>(null);
  const [appState, setAppState] = useState<AppState>('idle');
  const [activeMode, setActiveMode] = useState<Mode>('technical');
  const [styleTarget, setStyleTarget] = useState<string>('');
  const [progress, setProgress] = useState<ProgressUpdate>(INITIAL_PROGRESS);
  const [processedData, setProcessedData] = useState<ProcessedOutput | null>(null);
  const [error, setError] = useState<ProcessingError | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [nextStepSuggestions, setNextStepSuggestions] = useState<string[] | null>(null);
  const [suggestionsLoading, setSuggestionsLoading] = useState<boolean>(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const handleFileSelect = useCallback((files: File[]) => {
    setCurrentFiles(files);
    setProcessedData(null);
    setError(null);
    setAppState('fileSelected');
    setProgress(INITIAL_PROGRESS);
    setNextStepSuggestions(null); 
    setSuggestionsLoading(false);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!currentFiles || currentFiles.length === 0) return;

    setAppState('processing');
    setError(null);
    setProcessedData(null);
    setStartTime(Date.now());
    setNextStepSuggestions(null);
    setSuggestionsLoading(false);

    try {
      setProgress({ stage: 'Reading Files', percentage: 2, message: `Loading ${currentFiles.length} file(s)...` });
      const fileContents = await Promise.all(currentFiles.map(file => readFileAsText(file)));
      const combinedText = fileContents.join('\n\n--- DOCUMENT BREAK ---\n\n');
      const totalSize = currentFiles.reduce((acc, file) => acc + file.size, 0);
      const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
      setProgress({ stage: 'Files Loaded', percentage: 10, message: `All file content loaded (${totalSizeMB} MB).` });

      let result: ProcessedOutput;
      if (activeMode === 'technical') {
        result = await processTranscript(combinedText, (update) => {
          setProgress(update);
        });
      } else { // 'styleExtractor'
        result = await processStyleExtraction(combinedText, styleTarget, (update) => {
          setProgress(update);
        });
      }
      const endTime = Date.now();
      const durationSeconds = Math.round((endTime - (startTime ?? endTime)) / 1000);
      const fullResult = { ...result, processingTimeSeconds: durationSeconds };
      setProcessedData(fullResult);
      setAppState('completed');
      
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
  }, [currentFiles, startTime, activeMode, styleTarget]);

  const handleReset = useCallback(() => {
    setCurrentFiles(null);
    setProcessedData(null);
    setError(null);
    setAppState('idle');
    setProgress(INITIAL_PROGRESS);
    setStartTime(null);
    setStyleTarget('');
    setNextStepSuggestions(null);
    setSuggestionsLoading(false);
  }, []);

  const TABS = [
    { id: 'technical', label: 'Technical Summarizer' },
    { id: 'styleExtractor', label: 'Style Extractor' },
  ];

  const descriptionText = {
    technical: "Upload one or more large transcript files to get a concise summary and key highlights.",
    styleExtractor: "Upload one or more text files to analyze and extract a unique writing style model."
  };

  const buttonText = {
    technical: currentFiles && currentFiles.length > 0 ? `Summarize ${currentFiles.length} file(s)` : 'Summarize',
    styleExtractor: currentFiles && currentFiles.length > 0 ? `Extract Style from ${currentFiles.length} file(s)` : 'Extract Style',
  };

  return (
    <>
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 sm:p-8 transition-all duration-300">
        <div className="w-full max-w-3xl bg-surface shadow-2xl rounded-lg p-6 sm:p-10">
          <header className="mb-6 text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">
              AI Text Analyzer
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

          {activeMode === 'styleExtractor' && (appState === 'idle' || appState === 'fileSelected') && (
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
                className="w-full px-3 py-2 bg-slate-700 border border-border-color rounded-md shadow-sm focus:ring-primary focus:border-primary text-text-primary placeholder-slate-500 text-sm"
                aria-describedby="styleTargetDescription"
              />
              <p id="styleTargetDescription" className="mt-1 text-xs text-text-secondary">
                If left blank or "all", the overall style of the text will be analyzed.
              </p>
            </div>
          )}

          {appState === 'idle' || appState === 'fileSelected' ? (
            <FileLoader onFileSelect={handleFileSelect} selectedFiles={currentFiles} />
          ) : null}

          {currentFiles && currentFiles.length > 0 && (appState === 'fileSelected' || appState === 'processing') && (
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
            <div className="mt-8">
              <div className="flex items-center justify-center text-green-400 mb-4">
                <CheckCircleIcon className="w-8 h-8 mr-2" aria-hidden="true" />
                <p className="text-xl font-semibold">Processing Complete!</p>
              </div>
              <SummaryViewer output={processedData} mode={activeMode} />

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
                      {activeMode === 'technical' ? 'Summarize Another' : 'Extract Another'}
                  </button>
                  <button
                      onClick={() => setIsReportModalOpen(true)}
                      className="w-full px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface flex items-center justify-center gap-2"
                  >
                      <DownloadIcon className="w-5 h-5" />
                      Download Report
                  </button>
              </div>

            </div>
          )}

          {appState === 'error' && error && (
            <div className="mt-8 p-4 bg-red-900 border border-red-700 rounded-lg text-red-100" role="alert">
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
            <p>&copy; {new Date().getFullYear()} AI Text Tools. Powered by Gemini.</p>
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
