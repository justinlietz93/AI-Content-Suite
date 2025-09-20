import { processTranscript } from './summarizationService';
import { processStyleExtraction } from './styleExtractionService';
import { processRewrite } from './rewriterService';
import { processMathFormatting } from './mathFormattingService';
import { processReasoningRequest } from './reasoningService';
import { processScaffoldingRequest } from './scaffolderService';
import { processRequestSplitting } from './requestSplitterService';
import { processPromptEnhancement } from './promptEnhancerService';
import { processAgentDesign } from './agentDesignerService';
import { generateSuggestions, getActiveProviderConfig } from './geminiService';
import { AI_PROVIDERS } from './providerRegistry';
import { ocrPdf } from './ocrService';
import type { ProcessedOutput, ProgressUpdate, AppState, ProcessingError, Mode, SummaryOutput, StyleModelOutput, RewriteLength, SummaryFormat, ReasoningSettings, ScaffolderSettings, RequestSplitterSettings, PromptEnhancerSettings, AgentDesignerSettings, ChatSettings } from '../types';
import { fileToGenerativePart, readFileAsText } from '../utils/fileUtils';

type AllSettings = {
    summaryTextInput: string; useHierarchical: boolean; summaryFormat: SummaryFormat;
    styleTarget: string;
    rewriteStyle: string; rewriteInstructions: string; rewriteLength: RewriteLength;
    reasoningPrompt: string; reasoningSettings: ReasoningSettings;
    scaffolderPrompt: string; scaffolderSettings: ScaffolderSettings;
    requestSplitterSpec: string; requestSplitterSettings: RequestSplitterSettings;
    promptEnhancerSettings: PromptEnhancerSettings;
    agentDesignerSettings: AgentDesignerSettings;
    chatSettings: ChatSettings;
};

interface SubmissionArgs {
    activeMode: Mode;
    currentFiles: File[] | null;
    settings: AllSettings;
    setAppState: React.Dispatch<React.SetStateAction<AppState>>;
    setError: React.Dispatch<React.SetStateAction<ProcessingError | null>>;
    setProcessedData: React.Dispatch<React.SetStateAction<ProcessedOutput | null>>;
    setProgress: React.Dispatch<React.SetStateAction<ProgressUpdate>>;
    setNextStepSuggestions: React.Dispatch<React.SetStateAction<string[] | null>>;
    setSuggestionsLoading: React.Dispatch<React.SetStateAction<boolean>>;
    signal: AbortSignal;
}

export const handleSubmission = async ({
    activeMode,
    currentFiles,
    settings,
    setAppState,
    setError,
    setProcessedData,
    setProgress,
    setNextStepSuggestions,
    setSuggestionsLoading,
    signal,
}: SubmissionArgs) => {

    const hasFiles = currentFiles && currentFiles.length > 0;
    let isReadyForSubmit = false;

    switch(activeMode) {
      case 'technical':
        isReadyForSubmit = !!settings.summaryTextInput.trim() || hasFiles;
        break;
      case 'styleExtractor':
      case 'rewriter':
      case 'mathFormatter':
        isReadyForSubmit = hasFiles;
        break;
      case 'reasoningStudio':
        isReadyForSubmit = hasFiles || !!settings.reasoningPrompt.trim();
        break;
      case 'scaffolder':
        isReadyForSubmit = hasFiles || !!settings.scaffolderPrompt.trim();
        break;
      case 'requestSplitter':
        isReadyForSubmit = !!settings.requestSplitterSpec.trim() || hasFiles;
        break;
      case 'promptEnhancer':
        isReadyForSubmit = !!settings.promptEnhancerSettings.rawPrompt.trim() || hasFiles;
        break;
      case 'agentDesigner':
        isReadyForSubmit = hasFiles || !!settings.agentDesignerSettings.goal.trim();
        break;
      case 'chat':
        // Chat has its own submit handler, this should not be called.
        return;
      default:
        isReadyForSubmit = false;
    }

    if (!isReadyForSubmit) return;

    const activeProviderConfig = getActiveProviderConfig();
    const providerInfo = AI_PROVIDERS.find(provider => provider.id === activeProviderConfig.providerId);
    if (providerInfo?.requiresApiKey && (!activeProviderConfig.apiKey || activeProviderConfig.apiKey.trim() === '')) {
      setError({ message: `${providerInfo.label} requires an API key. Please add it in settings before running this feature.` });
      return;
    }
    if (!activeProviderConfig.model || activeProviderConfig.model.trim() === '') {
      setError({ message: 'No model selected. Please choose a model in settings before running this feature.' });
      return;
    }

    setAppState('processing');
    setError(null);
    setProcessedData(null);
    const startTime = Date.now();
    setNextStepSuggestions(null);
    setSuggestionsLoading(false);

    try {
      let result: ProcessedOutput;
      
      const processedParts: any[] = [];
      const processedTexts: string[] = [];
      
      const checkForCancellation = () => {
        if (signal.aborted) throw new DOMException('Aborted by user', 'AbortError');
      };

      if(currentFiles && currentFiles.length > 0) {
        for (let i = 0; i < currentFiles.length; i++) {
          checkForCancellation();
          const file = currentFiles[i];
          const basePercentage = 2;
          const range = 8;
          const fileProgressStart = basePercentage + (i / currentFiles.length) * range;
          const fileProgressEnd = basePercentage + ((i + 1) / currentFiles.length) * range;

          if (file.type === 'application/pdf') {
            const ocrText = await ocrPdf(file, (ocrUpdate) => {
              checkForCancellation();
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
            if (['rewriter', 'reasoningStudio', 'scaffolder', 'requestSplitter', 'promptEnhancer', 'agentDesigner'].includes(activeMode)) {
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
            if (['rewriter', 'reasoningStudio', 'scaffolder', 'requestSplitter', 'promptEnhancer', 'agentDesigner'].includes(activeMode)) {
              processedParts.push({ text: textWithContext });
            }
          }
        }
      }
      
      checkForCancellation();

      if (activeMode === 'technical' && settings.summaryTextInput.trim()) {
          setProgress({ stage: 'Content Loaded', percentage: 10, message: `Text content loaded.` });
      } else if (currentFiles && currentFiles.length > 0) {
        const totalSize = currentFiles.reduce((acc, file) => acc + file.size, 0);
        const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
        setProgress({ stage: 'Content Loaded', percentage: 10, message: `All content loaded (${totalSizeMB} MB).` });
      } else {
        setProgress({ stage: 'Ready', percentage: 10, message: `Prompt ready for processing.` });
      }
      
      switch(activeMode) {
        case 'rewriter':
            result = await processRewrite(processedParts, settings.rewriteStyle, settings.rewriteInstructions, settings.rewriteLength, setProgress, signal);
            break;
        case 'reasoningStudio':
            result = await processReasoningRequest(settings.reasoningPrompt, settings.reasoningSettings, processedParts, setProgress, signal);
            break;
        case 'scaffolder':
            result = await processScaffoldingRequest(settings.scaffolderPrompt, settings.scaffolderSettings, processedParts, setProgress, signal);
            break;
        case 'requestSplitter':
            result = await processRequestSplitting(settings.requestSplitterSpec, settings.requestSplitterSettings, processedParts, setProgress, signal);
            break;
        case 'promptEnhancer':
            result = await processPromptEnhancement(settings.promptEnhancerSettings, processedParts, setProgress, signal);
            break;
        case 'agentDesigner':
            result = await processAgentDesign(settings.agentDesignerSettings, processedParts, setProgress, signal);
            break;
        case 'technical': {
            const combinedText = processedTexts.join('\n\n--- DOCUMENT BREAK ---\n\n');
            const textToProcess = settings.summaryTextInput.trim() || combinedText;
            if (!textToProcess) throw new Error("No content provided to summarize.");
            result = await processTranscript(textToProcess, setProgress, settings.useHierarchical, settings.summaryFormat, signal);
            break;
        }
        case 'styleExtractor': {
            const combinedText = processedTexts.join('\n\n--- DOCUMENT BREAK ---\n\n');
            result = await processStyleExtraction(combinedText, settings.styleTarget, setProgress, signal);
            break;
        }
        case 'mathFormatter': {
            const combinedText = processedTexts.join('\n\n--- DOCUMENT BREAK ---\n\n');
            result = await processMathFormatting(combinedText, setProgress, signal);
            break;
        }
        default:
            throw new Error(`Unknown processing mode: ${activeMode}`);
      }
      
      checkForCancellation();

      const endTime = Date.now();
      const durationSeconds = Math.round((endTime - (startTime ?? endTime)) / 1000);
      const fullResult = { ...result, processingTimeSeconds: durationSeconds };
      setProcessedData(fullResult);
      setAppState('completed');
      
      if (['rewriter', 'mathFormatter', 'reasoningStudio', 'scaffolder', 'requestSplitter', 'promptEnhancer', 'agentDesigner'].includes(activeMode)) {
        setSuggestionsLoading(false);
        setNextStepSuggestions(null);
        return;
      }

      setSuggestionsLoading(true);
      (async () => {
        try {
          const contentToSuggestOn = activeMode === 'technical'
            ? (fullResult as SummaryOutput).finalSummary
            : (fullResult as StyleModelOutput).styleDescription;
          
          const targetForSuggestions = activeMode === 'styleExtractor' ? settings.styleTarget : undefined;

          if (contentToSuggestOn && contentToSuggestOn.trim() !== "") {
            const suggestions = await generateSuggestions(activeMode, contentToSuggestOn, targetForSuggestions, signal);
            setNextStepSuggestions(suggestions);
          } else {
            setNextStepSuggestions(null);
          }
        } catch (suggestionError) {
          // Don't show suggestion errors if the main process was just cancelled
          if ((suggestionError as any).name !== 'AbortError') {
             console.error("Failed to generate next step suggestions:", suggestionError);
          }
          setNextStepSuggestions(null);
        } finally {
          setSuggestionsLoading(false);
        }
      })();

    } catch (err) {
      if ((err as any).name === 'AbortError') {
        console.log("Processing was cancelled by the user.");
        setAppState('cancelled'); // Let App.tsx handle the reset via this state
        return;
      }

      console.error(`Error during ${activeMode} processing:`, err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      const errorDetails = err instanceof Error ? ((err as any).details || err.stack) : undefined;
      setError({ message: `Failed to process: ${errorMessage}`, details: errorDetails });
      setAppState('error');
      setSuggestionsLoading(false);
    }
};