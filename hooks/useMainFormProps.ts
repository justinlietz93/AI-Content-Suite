import { useMemo } from 'react';
import type { SetStateAction } from 'react';
import type { Mode } from '../types';
import type { MainFormProps } from '../components/layouts/MainForm';
import type { WorkspaceState } from './useWorkspaceState';

export type SetModeValue = <K extends keyof WorkspaceState>(
  key: K,
  value: SetStateAction<WorkspaceState[K]>,
  mode?: Mode,
) => void;

interface UseMainFormPropsParams {
  activeMode: Mode;
  state: WorkspaceState;
  setModeValue: SetModeValue;
  onFileSelect: (files: File[]) => void;
  onSummaryTextChange: (text: string) => void;
}

export const useMainFormProps = ({
  activeMode,
  state,
  setModeValue,
  onFileSelect,
  onSummaryTextChange,
}: UseMainFormPropsParams): MainFormProps => {
  return useMemo(
    () => ({
      activeMode,
      currentFiles: state.currentFiles,
      summaryFormat: state.summaryFormat,
      onSummaryFormatChange: value => setModeValue('summaryFormat', value),
      summarySearchTerm: state.summarySearchTerm,
      onSummarySearchTermChange: value => setModeValue('summarySearchTerm', value),
      summaryTextInput: state.summaryTextInput,
      onSummaryTextChange,
      useHierarchical: state.useHierarchical,
      onUseHierarchicalChange: value => setModeValue('useHierarchical', value),
      styleTarget: state.styleTarget,
      onStyleTargetChange: value => setModeValue('styleTarget', value),
      rewriteStyle: state.rewriteStyle,
      onRewriteStyleChange: value => setModeValue('rewriteStyle', value),
      rewriteInstructions: state.rewriteInstructions,
      onRewriteInstructionsChange: value => setModeValue('rewriteInstructions', value),
      rewriteLength: state.rewriteLength,
      onRewriteLengthChange: value => setModeValue('rewriteLength', value),
      reasoningPrompt: state.reasoningPrompt,
      onReasoningPromptChange: value => setModeValue('reasoningPrompt', value),
      reasoningSettings: state.reasoningSettings,
      onReasoningSettingsChange: value => setModeValue('reasoningSettings', value),
      scaffolderPrompt: state.scaffolderPrompt,
      onScaffolderPromptChange: value => setModeValue('scaffolderPrompt', value),
      scaffolderSettings: state.scaffolderSettings,
      onScaffolderSettingsChange: value => setModeValue('scaffolderSettings', value),
      requestSplitterSpec: state.requestSplitterSpec,
      onRequestSplitterSpecChange: value => setModeValue('requestSplitterSpec', value),
      requestSplitterSettings: state.requestSplitterSettings,
      onRequestSplitterSettingsChange: value => setModeValue('requestSplitterSettings', value),
      promptEnhancerSettings: state.promptEnhancerSettings,
      onPromptEnhancerSettingsChange: value => setModeValue('promptEnhancerSettings', value),
      agentDesignerSettings: state.agentDesignerSettings,
      onAgentDesignerSettingsChange: value => setModeValue('agentDesignerSettings', value),
      onFileSelect,
    }),
    [activeMode, onFileSelect, onSummaryTextChange, setModeValue, state],
  );
};
