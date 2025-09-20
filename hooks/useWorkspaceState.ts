import { useCallback, useMemo, useState } from 'react';
import type {
  AgentDesignerSettings,
  AppState,
  ChatMessage,
  Mode,
  ProcessedOutput,
  ProcessingError,
  ProgressUpdate,
  PromptEnhancerSettings,
  ReasoningSettings,
  RequestSplitterSettings,
  RewriteLength,
  ScaffolderSettings,
  SummaryFormat,
} from '../types';
import {
  INITIAL_AGENT_DESIGNER_SETTINGS,
  INITIAL_PROGRESS,
  INITIAL_PROMPT_ENHANCER_SETTINGS,
  INITIAL_REASONING_SETTINGS,
  INITIAL_REQUEST_SPLITTER_SETTINGS,
  INITIAL_SCAFFOLDER_SETTINGS,
} from '../constants';
import { MODE_IDS } from '../constants/uiConstants';
import { deepClone } from '../utils/deepClone';

export interface WorkspaceState {
  currentFiles: File[] | null;
  appState: AppState;
  progress: ProgressUpdate;
  processedData: ProcessedOutput | null;
  error: ProcessingError | null;
  nextStepSuggestions: string[] | null;
  suggestionsLoading: boolean;
  styleTarget: string;
  rewriteStyle: string;
  rewriteInstructions: string;
  rewriteLength: RewriteLength;
  useHierarchical: boolean;
  summaryFormat: SummaryFormat;
  summarySearchTerm: string;
  summaryTextInput: string;
  reasoningPrompt: string;
  reasoningSettings: ReasoningSettings;
  scaffolderPrompt: string;
  scaffolderSettings: ScaffolderSettings;
  requestSplitterSpec: string;
  requestSplitterSettings: RequestSplitterSettings;
  promptEnhancerSettings: PromptEnhancerSettings;
  agentDesignerSettings: AgentDesignerSettings;
  chatHistory: ChatMessage[];
  isStreamingResponse: boolean;
  chatInput: string;
  chatFiles: File[] | null;
}

type SetStateAction<T> = T | ((prev: T) => T);

type WorkspaceUpdate = Partial<WorkspaceState> | ((prev: WorkspaceState) => WorkspaceState);

type WorkspaceMap = Record<Mode, WorkspaceState>;

const createInitialWorkspaceState = (): WorkspaceState => ({
  currentFiles: null,
  appState: 'idle',
  progress: deepClone(INITIAL_PROGRESS),
  processedData: null,
  error: null,
  nextStepSuggestions: null,
  suggestionsLoading: false,
  styleTarget: '',
  rewriteStyle: '',
  rewriteInstructions: '',
  rewriteLength: 'medium',
  useHierarchical: false,
  summaryFormat: 'default',
  summarySearchTerm: '',
  summaryTextInput: '',
  reasoningPrompt: '',
  reasoningSettings: deepClone(INITIAL_REASONING_SETTINGS),
  scaffolderPrompt: '',
  scaffolderSettings: deepClone(INITIAL_SCAFFOLDER_SETTINGS),
  requestSplitterSpec: '',
  requestSplitterSettings: deepClone(INITIAL_REQUEST_SPLITTER_SETTINGS),
  promptEnhancerSettings: deepClone(INITIAL_PROMPT_ENHANCER_SETTINGS),
  agentDesignerSettings: deepClone(INITIAL_AGENT_DESIGNER_SETTINGS),
  chatHistory: [],
  isStreamingResponse: false,
  chatInput: '',
  chatFiles: null,
});

const createInitialWorkspaceMap = (): WorkspaceMap => {
  return MODE_IDS.reduce((acc, mode) => {
    acc[mode] = createInitialWorkspaceState();
    return acc;
  }, {} as WorkspaceMap);
};

export const useWorkspaceState = (activeMode: Mode) => {
  const [stateByMode, setStateByMode] = useState<WorkspaceMap>(() => createInitialWorkspaceMap());

  const setStateForMode = useCallback(
    (mode: Mode, updater: WorkspaceUpdate): void => {
      setStateByMode(prev => {
        const previous = prev[mode];
        const updated = typeof updater === 'function'
          ? (updater as (prevState: WorkspaceState) => WorkspaceState)(previous)
          : { ...previous, ...updater };

        if (previous === updated) {
          return prev;
        }

        return { ...prev, [mode]: { ...updated } };
      });
    },
    [],
  );

  const setValue = useCallback(
    <K extends keyof WorkspaceState>(key: K, value: SetStateAction<WorkspaceState[K]>, mode: Mode = activeMode) => {
      setStateForMode(mode, prevState => {
        const nextValue = typeof value === 'function'
          ? (value as (prev: WorkspaceState[K]) => WorkspaceState[K])(prevState[key])
          : value;

        if (Object.is(prevState[key], nextValue)) {
          return prevState;
        }

        return { ...prevState, [key]: nextValue };
      });
    },
    [activeMode, setStateForMode],
  );

  const mergeState = useCallback(
    (update: Partial<WorkspaceState>, mode: Mode = activeMode) => {
      setStateForMode(mode, prev => ({ ...prev, ...update }));
    },
    [activeMode, setStateForMode],
  );

  const resetMode = useCallback(
    (mode: Mode = activeMode) => {
      setStateForMode(mode, createInitialWorkspaceState());
    },
    [activeMode, setStateForMode],
  );

  const getStateForMode = useCallback((mode: Mode) => stateByMode[mode], [stateByMode]);

  const state = useMemo(() => stateByMode[activeMode], [stateByMode, activeMode]);

  return {
    state,
    setValue,
    mergeState,
    resetMode,
    getStateForMode,
    setStateForMode,
  };
};
