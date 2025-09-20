import React, { useState, useEffect, useCallback, useRef, MouseEvent } from 'react';
import type {
  ChatSettings,
  SavedPrompt,
  AIProviderSettings,
  AIProviderId,
  ModelOption,
  VectorStoreSettings,
  EmbeddingProviderId,
  FeatureModelPreferences,
  Mode,
} from '../../types';
import type { ProviderInfo, EmbeddingProviderInfo } from '../../services/providerRegistry';
import { DEFAULT_PROVIDER_MODELS, DEFAULT_EMBEDDING_MODELS } from '../../constants';
import {
  EMBEDDING_PROVIDERS,
  requiresEmbeddingApiKey,
  getEmbeddingProviderDefaultEndpoint,
} from '../../services/providerRegistry';
import { sanitizeFeatureModelPreferences } from '../../utils/providerSettings';
import { GlobalProviderSection } from './settings/GlobalProviderSection';
import { FeatureOverridesSection } from './settings/FeatureOverridesSection';
import { VectorStoreSection } from './settings/VectorStoreSection';
import { ChatPresetsSection } from './settings/ChatPresetsSection';
import { SettingsModalHeader } from './settings/SettingsModalHeader';
import { SettingsModalFooter } from './settings/SettingsModalFooter';
import {
  ensureVectorStoreSettings,
  withDefaults,
  featurePreferenceCount,
  sanitizeVectorStoreSettings,
} from './settings/helpers';
import type { SettingsCategoryId } from './settings/categories';
import { SETTINGS_CATEGORIES } from './settings/categories';
import { SettingsCategoryTabs } from './settings/SettingsCategoryTabs';
import { SettingsCategorySidebar } from './settings/SettingsCategorySidebar';

const DEFAULT_MODAL_WIDTH = 1200;
const DEFAULT_MODAL_HEIGHT = 720;
const MIN_MODAL_WIDTH = 640;
const MIN_MODAL_HEIGHT = 560;
const MAX_MODAL_WIDTH = 1440;
const MAX_MODAL_HEIGHT = 900;
const VIEWPORT_MARGIN_X = 48;
const VIEWPORT_MARGIN_Y = 64;
const WORKSPACE_LAYOUT_WIDTH_KEY = 'ai_content_suite_layout_width';
const MIN_WORKSPACE_CONTENT_WIDTH = 640;
const MAX_WORKSPACE_CONTENT_WIDTH = 1440;
const DEFAULT_WORKSPACE_LAYOUT_PERCENT = 70;
const CHAT_HEIGHT_VIEWPORT_RATIO = 0.75;
const WORKSPACE_SCROLLBAR_STYLE_ID = 'workspace-settings-scrollbar-theme';
const WORKSPACE_SCROLLBAR_CLASS = 'workspace-settings-scrollbar';

interface ModalSize {
  width: number;
  height: number;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: ChatSettings;
  providerSettings: AIProviderSettings;
  providers: ProviderInfo[];
  onSave: (newSettings: ChatSettings, providerSettings: AIProviderSettings) => void;
  onFetchModels: (providerId: AIProviderId, apiKey?: string) => Promise<ModelOption[]>;
  savedPrompts: SavedPrompt[];
  onSavePreset: (name: string, prompt: string) => void;
  onDeletePreset: (name: string) => void;
}

/**
 * Presents the workspace settings experience inside a full-featured, resizable modal window.
 *
 * @param props - Collection of event handlers and the current workspace configuration state.
 * @returns A rendered modal tree bound to the provided state values.
 */
export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentSettings,
  providerSettings,
  providers,
  onSave,
  onFetchModels,
  savedPrompts,
  onSavePreset,
  onDeletePreset,
}) => {
  const [editedSettings, setEditedSettings] = useState<ChatSettings>(() => withDefaults(currentSettings));
  const [editedProviderSettings, setEditedProviderSettings] = useState<AIProviderSettings>(providerSettings);
  const [modelOptions, setModelOptions] = useState<ModelOption[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<SettingsCategoryId>('global');
  const [modalSize, setModalSize] = useState<ModalSize>({
    width: DEFAULT_MODAL_WIDTH,
    height: DEFAULT_MODAL_HEIGHT,
  });
  const [isResizing, setIsResizing] = useState(false);
  const loadRequestIdRef = useRef(0);
  const initialSizeAppliedRef = useRef(false);
  const resizeStateRef = useRef<{
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);
  const resizeHandlersRef = useRef<{
    move: (event: PointerEvent) => void;
    end: (event: PointerEvent) => void;
  } | null>(null);
  const previousBodyStylesRef = useRef<{ cursor: string; userSelect: string } | null>(null);

  /**
   * Constrains the requested modal dimensions so the window remains within the viewport bounds
   * while respecting the design minimum and maximum breakpoints.
   *
   * @param width - Proposed modal width in pixels.
   * @param height - Proposed modal height in pixels.
   * @returns A sanitized pair of width and height values that fit the viewport.
   */
  const clampModalSize = useCallback(
    (width: number, height: number): ModalSize => {
      if (typeof window === 'undefined') {
        return { width, height };
      }

      const availableWidth = Math.max(
        window.innerWidth - VIEWPORT_MARGIN_X,
        Math.min(window.innerWidth, 320),
      );
      const availableHeight = Math.max(
        window.innerHeight - VIEWPORT_MARGIN_Y,
        Math.min(window.innerHeight, 360),
      );
      const minWidth = Math.min(MIN_MODAL_WIDTH, availableWidth);
      const minHeight = Math.min(MIN_MODAL_HEIGHT, availableHeight);
      const maxWidth = Math.min(MAX_MODAL_WIDTH, availableWidth);
      const maxHeight = Math.min(MAX_MODAL_HEIGHT, availableHeight);

      const clampedWidth = Math.min(Math.max(width, minWidth), maxWidth);
      const clampedHeight = Math.min(Math.max(height, minHeight), maxHeight);

      return { width: clampedWidth, height: clampedHeight };
    },
    [],
  );

  /**
   * Ensures the workspace-themed scrollbar styling is present so modal scroll regions
   * inherit the darker treatment that matches the rest of the application chrome.
   */
  const ensureScrollbarTheme = useCallback(() => {
    if (typeof document === 'undefined') {
      return;
    }

    if (document.getElementById(WORKSPACE_SCROLLBAR_STYLE_ID)) {
      return;
    }

    const styleElement = document.createElement('style');
    styleElement.id = WORKSPACE_SCROLLBAR_STYLE_ID;
    styleElement.textContent = `
.${WORKSPACE_SCROLLBAR_CLASS} {
  scrollbar-width: thin;
  scrollbar-color: oklch(0.35 0 0 / 0.85) transparent;
}
.${WORKSPACE_SCROLLBAR_CLASS}::-webkit-scrollbar {
  width: 12px;
}
.${WORKSPACE_SCROLLBAR_CLASS}::-webkit-scrollbar-track {
  background: transparent;
}
.${WORKSPACE_SCROLLBAR_CLASS}::-webkit-scrollbar-thumb {
  background-color: oklch(0.32 0 0 / 0.85);
  border-radius: 9999px;
  border: 2px solid oklch(0.18 0 0 / 0.8);
}
.${WORKSPACE_SCROLLBAR_CLASS}::-webkit-scrollbar-thumb:hover {
  background-color: oklch(0.36 0 0 / 0.9);
}
`;
    document.head.appendChild(styleElement);
  }, []);

  /**
   * Cleans up any active resize gesture by removing event listeners and restoring the document
   * cursor and selection styles.
   */
  const endResize = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handlers = resizeHandlersRef.current;
    if (handlers) {
      window.removeEventListener('pointermove', handlers.move);
      window.removeEventListener('pointerup', handlers.end);
      window.removeEventListener('pointercancel', handlers.end);
      resizeHandlersRef.current = null;
    }

    resizeStateRef.current = null;
    setIsResizing(false);

    if (previousBodyStylesRef.current) {
      document.body.style.cursor = previousBodyStylesRef.current.cursor;
      document.body.style.userSelect = previousBodyStylesRef.current.userSelect;
      previousBodyStylesRef.current = null;
    }
  }, []);

  /**
   * Begins a resize gesture when the resize affordance is activated, tracking pointer movement
   * to update the modal dimensions in real time.
   *
   * @param event - Pointer event emitted from the resize affordance.
   */
  const handleResizePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (typeof window === 'undefined') {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      resizeStateRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        startWidth: modalSize.width,
        startHeight: modalSize.height,
      };

      setIsResizing(true);

      if (!previousBodyStylesRef.current) {
        previousBodyStylesRef.current = {
          cursor: document.body.style.cursor,
          userSelect: document.body.style.userSelect,
        };
      }

      document.body.style.cursor = 'nwse-resize';
      document.body.style.userSelect = 'none';

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const resizeState = resizeStateRef.current;
        if (!resizeState) {
          return;
        }

        const nextWidth = resizeState.startWidth + (moveEvent.clientX - resizeState.startX);
        const nextHeight = resizeState.startHeight + (moveEvent.clientY - resizeState.startY);

        setModalSize(prevSize => {
          const constrainedSize = clampModalSize(nextWidth, nextHeight);
          if (
            constrainedSize.width === prevSize.width &&
            constrainedSize.height === prevSize.height
          ) {
            return prevSize;
          }
          return constrainedSize;
        });
      };

      const handlePointerEnd = () => {
        endResize();
      };

      resizeHandlersRef.current = {
        move: handlePointerMove,
        end: handlePointerEnd,
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerEnd);
      window.addEventListener('pointercancel', handlePointerEnd);
    },
    [clampModalSize, endResize, modalSize.height, modalSize.width],
  );

  const updateVectorStore = useCallback((updater: (prev: VectorStoreSettings) => VectorStoreSettings) => {
    setEditedSettings(prev => {
      const currentVector = ensureVectorStoreSettings(prev.vectorStore);
      return {
        ...prev,
        vectorStore: updater(currentVector),
      };
    });
  }, []);

  const enableFeatureOverride = useCallback((mode: Mode, enabled: boolean) => {
    setEditedProviderSettings(prev => {
      const nextPreferences: FeatureModelPreferences = { ...(prev.featureModelPreferences ?? {}) };
      if (enabled) {
        const globalModel = prev.selectedModel?.trim() || DEFAULT_PROVIDER_MODELS[prev.selectedProvider] || '';
        nextPreferences[mode] = {
          provider: prev.selectedProvider,
          model: globalModel,
        };
      } else {
        delete nextPreferences[mode];
      }

      return {
        ...prev,
        featureModelPreferences: featurePreferenceCount(nextPreferences) > 0 ? nextPreferences : undefined,
      };
    });
  }, []);

  const updateFeaturePreference = useCallback((mode: Mode, updater: (prev: { provider: AIProviderId; model: string }) => {
    provider: AIProviderId;
    model: string;
  }) => {
    setEditedProviderSettings(prev => {
      const existing = prev.featureModelPreferences?.[mode] ?? {
        provider: prev.selectedProvider,
        model: prev.selectedModel?.trim() || DEFAULT_PROVIDER_MODELS[prev.selectedProvider] || '',
      };
      const nextPreferences: FeatureModelPreferences = {
        ...(prev.featureModelPreferences ?? {}),
        [mode]: updater(existing),
      };
      return {
        ...prev,
        featureModelPreferences: nextPreferences,
      };
    });
  }, []);

  const loadModels = useCallback(async (providerId: AIProviderId, apiKey?: string) => {
    const providerInfo = providers.find(p => p.id === providerId);
    const trimmedKey = apiKey?.trim();

    if (providerInfo?.requiresApiKey && !trimmedKey) {
      setModelOptions([]);
      setModelsError(`${providerInfo.label} requires an API key to load models.`);
      setModelsLoading(false);
      return;
    }

    const requestId = ++loadRequestIdRef.current;
    setModelsLoading(true);
    setModelsError(null);
    setModelOptions([]);

    try {
      const models = await onFetchModels(providerId, trimmedKey);
      if (loadRequestIdRef.current !== requestId) {
        return;
      }
      setModelOptions(models);
      if (models.length > 0) {
        setEditedProviderSettings(prev => {
          if (prev.selectedProvider !== providerId) return prev;
          if (models.some(model => model.id === prev.selectedModel)) {
            return prev;
          }
          return { ...prev, selectedModel: models[0].id };
        });
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      setModelsError(message);
      setModelOptions([]);
    } finally {
      if (loadRequestIdRef.current === requestId) {
        setModelsLoading(false);
      }
    }
  }, [onFetchModels, providers]);

  /**
   * Derives a modal footprint that mirrors the active workspace layout so each settings
   * category opens at the same scale as the LLM chat experience.
   */
  const computeWorkspaceAlignedSize = useCallback((): ModalSize => {
    if (typeof window === 'undefined') {
      return clampModalSize(DEFAULT_MODAL_WIDTH, DEFAULT_MODAL_HEIGHT);
    }

    const storedPercentRaw = Number(localStorage.getItem(WORKSPACE_LAYOUT_WIDTH_KEY));
    const storedPercent = Number.isFinite(storedPercentRaw)
      ? storedPercentRaw
      : DEFAULT_WORKSPACE_LAYOUT_PERCENT;
    const normalizedPercent = Math.min(Math.max(storedPercent, 0), 100);

    const referenceWidth =
      normalizedPercent >= 100
        ? Math.min(MAX_WORKSPACE_CONTENT_WIDTH, window.innerWidth - VIEWPORT_MARGIN_X)
        : MIN_WORKSPACE_CONTENT_WIDTH +
          ((MAX_WORKSPACE_CONTENT_WIDTH - MIN_WORKSPACE_CONTENT_WIDTH) * normalizedPercent) / 100;

    const referenceHeight = window.innerHeight * CHAT_HEIGHT_VIEWPORT_RATIO;

    return clampModalSize(referenceWidth, referenceHeight);
  }, [clampModalSize]);

  useEffect(() => {
    ensureScrollbarTheme();
  }, [ensureScrollbarTheme]);

  useEffect(() => {

    if (!isOpen) {
      initialSizeAppliedRef.current = false;
      return;
    }

    if (!initialSizeAppliedRef.current) {
      const defaultSize = computeWorkspaceAlignedSize();
      setModalSize(prevSize => {
        if (prevSize.width === defaultSize.width && prevSize.height === defaultSize.height) {
          return prevSize;
        }
        return defaultSize;
      });
      initialSizeAppliedRef.current = true;
    } else {
      setModalSize(prevSize => {
        const constrainedSize = clampModalSize(prevSize.width, prevSize.height);
        if (
          constrainedSize.width === prevSize.width &&
          constrainedSize.height === prevSize.height
        ) {
          return prevSize;
        }
        return constrainedSize;
      });
    }

    setEditedSettings(withDefaults(currentSettings));
    setEditedProviderSettings(providerSettings);
    setModelOptions([]);
    setModelsError(null);
    setModelsLoading(false);
    setSelectedPreset('');
    setActiveCategory('global');
  }, [
    isOpen,
    currentSettings,
    providerSettings,
    clampModalSize,
    computeWorkspaceAlignedSize,
  ]);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') {
      return;
    }

    const handleWindowResize = () => {
      setModalSize(prevSize => {
        const constrainedSize = clampModalSize(prevSize.width, prevSize.height);
        if (
          constrainedSize.width === prevSize.width &&
          constrainedSize.height === prevSize.height
        ) {
          return prevSize;
        }
        return constrainedSize;
      });
    };

    window.addEventListener('resize', handleWindowResize);
    return () => {
      window.removeEventListener('resize', handleWindowResize);
    };
  }, [isOpen, clampModalSize]);

  useEffect(() => () => {
    endResize();
  }, [endResize]);

  useEffect(() => {
    if (isOpen) {
      const providerId = providerSettings.selectedProvider;
      const apiKey = providerSettings.apiKeys?.[providerId];
      loadModels(providerId, apiKey);
    }
  }, [isOpen, providerSettings, loadModels]);

  const handleSave = () => {
    const providerId = editedProviderSettings.selectedProvider;
    const trimmedModel = editedProviderSettings.selectedModel.trim();
    const fallbackModel = DEFAULT_PROVIDER_MODELS[providerId] ?? DEFAULT_PROVIDER_MODELS[providerSettings.selectedProvider];

    const sanitizedApiKeys = Object.entries(editedProviderSettings.apiKeys || {}).reduce<AIProviderSettings['apiKeys']>((acc, [key, value]) => {
      const trimmed = typeof value === 'string' ? value.trim() : '';
      if (trimmed) {
        acc[key as AIProviderId] = trimmed;
      }
      return acc;
    }, {});

    const sanitizedVectorStore = sanitizeVectorStoreSettings(editedSettings.vectorStore);

    const sanitizedFeaturePreferences = sanitizeFeatureModelPreferences(editedProviderSettings.featureModelPreferences);
    const finalFeaturePreferences = featurePreferenceCount(sanitizedFeaturePreferences) > 0
      ? sanitizedFeaturePreferences
      : undefined;

    const finalProviderSettings: AIProviderSettings = {
      selectedProvider: providerId,
      selectedModel: trimmedModel || fallbackModel,
      apiKeys: sanitizedApiKeys,
      featureModelPreferences: finalFeaturePreferences,
    };

    const finalChatSettings: ChatSettings = {
      ...editedSettings,
      vectorStore: sanitizedVectorStore,
    };

    onSave(finalChatSettings, finalProviderSettings);
  };

  const handleProviderChange = (providerId: AIProviderId) => {
    setEditedProviderSettings(prev => {
      const fallbackModel = DEFAULT_PROVIDER_MODELS[providerId] ?? prev.selectedModel;
      return {
        ...prev,
        selectedProvider: providerId,
        selectedModel: fallbackModel,
      };
    });
    const apiKey = editedProviderSettings.apiKeys?.[providerId];
    loadModels(providerId, apiKey);
  };

  const handleApiKeyChange = (providerId: AIProviderId, value: string) => {
    setEditedProviderSettings(prev => ({
      ...prev,
      apiKeys: { ...prev.apiKeys, [providerId]: value },
    }));
  };

  const handleModelInputChange = (value: string) => {
    setEditedProviderSettings(prev => ({
      ...prev,
      selectedModel: value,
    }));
  };

  const handleVectorStoreEnabledChange = (enabled: boolean) => {
    updateVectorStore(prev => ({ ...prev, enabled }));
  };

  const handleVectorStoreUrlChange = (value: string) => {
    updateVectorStore(prev => ({ ...prev, url: value }));
  };

  const handleVectorStoreCollectionChange = (value: string) => {
    updateVectorStore(prev => ({ ...prev, collection: value }));
  };

  const handleVectorStoreApiKeyChange = (value: string) => {
    updateVectorStore(prev => ({ ...prev, apiKey: value }));
  };

  const handleVectorStoreTopKChange = (value: string) => {
    const numericValue = Number(value);
    updateVectorStore(prev => ({
      ...prev,
      topK: value === '' ? 0 : Number.isFinite(numericValue) ? numericValue : prev.topK,
    }));
  };

  const handleEmbeddingProviderChange = (providerId: EmbeddingProviderId) => {
    updateVectorStore(prev => {
      if (prev.embedding.provider === providerId) {
        return { ...prev, embedding: { ...prev.embedding, provider: providerId } };
      }
      const defaultModel = DEFAULT_EMBEDDING_MODELS[providerId] ?? '';
      const defaultEndpoint = getEmbeddingProviderDefaultEndpoint(providerId) ?? '';
      return {
        ...prev,
        embedding: {
          ...prev.embedding,
          provider: providerId,
          model: defaultModel,
          baseUrl: providerId === 'custom' ? '' : defaultEndpoint,
        },
      };
    });
  };

  const handleEmbeddingModelChange = (value: string) => {
    updateVectorStore(prev => ({
      ...prev,
      embedding: { ...prev.embedding, model: value },
    }));
  };

  const handleEmbeddingApiKeyChange = (value: string) => {
    updateVectorStore(prev => ({
      ...prev,
      embedding: { ...prev.embedding, apiKey: value },
    }));
  };

  const handleEmbeddingBaseUrlChange = (value: string) => {
    updateVectorStore(prev => ({
      ...prev,
      embedding: { ...prev.embedding, baseUrl: value },
    }));
  };

  const handleLoadPreset = (name: string) => {
    const preset = savedPrompts.find(p => p.name === name);
    if (preset) {
      setEditedSettings({ ...editedSettings, systemInstruction: preset.prompt });
      setSelectedPreset(name);
    } else {
      setSelectedPreset('');
    }
  };

  const handleSaveAsPreset = () => {
    const name = window.prompt('Enter a name for this preset:', selectedPreset || 'New Preset');
    if (name && name.trim() !== '') {
      onSavePreset(name.trim(), editedSettings.systemInstruction);
      setSelectedPreset(name.trim());
    }
  };

  const handleDeletePreset = () => {
    if (selectedPreset && window.confirm(`Are you sure you want to delete the preset "${selectedPreset}"?`)) {
      onDeletePreset(selectedPreset);
      setSelectedPreset('');
    }
  };

  const handleOverlayClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const selectedProviderInfo = providers.find(p => p.id === editedProviderSettings.selectedProvider);
  const globalProviderLabel = selectedProviderInfo?.label ?? 'Selected provider';
  const selectedApiKey = editedProviderSettings.apiKeys?.[editedProviderSettings.selectedProvider] ?? '';
  const vectorStoreSettings = ensureVectorStoreSettings(editedSettings.vectorStore);
  const embeddingSettings = vectorStoreSettings.embedding;
  const selectedEmbeddingProviderInfo = EMBEDDING_PROVIDERS.find(
    provider => provider.id === embeddingSettings.provider,
  ) as EmbeddingProviderInfo | undefined;
  const embeddingEndpointPlaceholder =
    embeddingSettings.provider === 'custom'
      ? 'https://your-embedding-endpoint/v1/embeddings'
      : getEmbeddingProviderDefaultEndpoint(embeddingSettings.provider) ?? '';
  const embeddingRequiresApiKey = requiresEmbeddingApiKey(embeddingSettings.provider);
  const featurePreferences = editedProviderSettings.featureModelPreferences ?? {};
  const globalModelName = editedProviderSettings.selectedModel?.trim() || DEFAULT_PROVIDER_MODELS[editedProviderSettings.selectedProvider] || '';
  const activeCategoryConfig = SETTINGS_CATEGORIES.find(category => category.id === activeCategory);

  const renderCategoryContent = () => {
    switch (activeCategory) {
      case 'global':
        return (
          <GlobalProviderSection
            providers={providers}
            selectedProviderId={editedProviderSettings.selectedProvider}
            selectedModel={editedProviderSettings.selectedModel}
            selectedApiKey={selectedApiKey}
            modelOptions={modelOptions}
            modelsLoading={modelsLoading}
            modelsError={modelsError}
            onProviderChange={handleProviderChange}
            onApiKeyChange={handleApiKeyChange}
            onModelChange={handleModelInputChange}
            onRefreshModels={() => loadModels(editedProviderSettings.selectedProvider, selectedApiKey)}
          />
        );
      case 'feature-overrides':
        return (
          <FeatureOverridesSection
            providers={providers}
            featurePreferences={featurePreferences}
            globalProviderLabel={globalProviderLabel}
            globalModelName={globalModelName}
            selectedProviderId={editedProviderSettings.selectedProvider}
            onToggleOverride={enableFeatureOverride}
            onUpdatePreference={updateFeaturePreference}
          />
        );
      case 'vector-store':
        return (
          <VectorStoreSection
            vectorStoreSettings={vectorStoreSettings}
            embeddingEndpointPlaceholder={embeddingEndpointPlaceholder}
            embeddingRequiresApiKey={embeddingRequiresApiKey}
            selectedEmbeddingProviderInfo={selectedEmbeddingProviderInfo}
            onEnabledChange={handleVectorStoreEnabledChange}
            onUrlChange={handleVectorStoreUrlChange}
            onCollectionChange={handleVectorStoreCollectionChange}
            onApiKeyChange={handleVectorStoreApiKeyChange}
            onTopKChange={handleVectorStoreTopKChange}
            onEmbeddingProviderChange={handleEmbeddingProviderChange}
            onEmbeddingModelChange={handleEmbeddingModelChange}
            onEmbeddingApiKeyChange={handleEmbeddingApiKeyChange}
            onEmbeddingBaseUrlChange={handleEmbeddingBaseUrlChange}
          />
        );
      case 'chat-presets':
        return (
          <ChatPresetsSection
            savedPrompts={savedPrompts}
            selectedPreset={selectedPreset}
            systemInstruction={editedSettings.systemInstruction}
            onSelectPreset={handleLoadPreset}
            onDeletePreset={handleDeletePreset}
            onSystemInstructionChange={value => {
              setEditedSettings({ ...editedSettings, systemInstruction: value });
              if (selectedPreset) setSelectedPreset('');
            }}
          />
        );
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 z-50 transition-opacity duration-300 animate-fade-in-scale"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="workspace-settings-modal"
    >
      <div
        className={`relative flex flex-col overflow-hidden rounded-xl border border-border-color/80 bg-background/95 shadow-[0_40px_120px_-35px_rgba(0,0,0,0.85)] ${
          isResizing ? 'select-none' : ''
        }`}
        style={{
          width: modalSize.width,
          height: modalSize.height,
          minWidth: `min(${MIN_MODAL_WIDTH}px, calc(100vw - 3rem))`,
          minHeight: `min(${MIN_MODAL_HEIGHT}px, calc(100vh - 4rem))`,
          maxWidth: `min(${MAX_MODAL_WIDTH}px, calc(100vw - 2rem))`,
          maxHeight: `min(${MAX_MODAL_HEIGHT}px, calc(100vh - 2rem))`,
          transition: isResizing ? 'none' : 'width 220ms ease, height 220ms ease',
        }}
      >
        <SettingsModalHeader onClose={onClose} />
        <SettingsCategoryTabs
          categories={SETTINGS_CATEGORIES}
          activeCategory={activeCategory}
          onSelect={categoryId => setActiveCategory(categoryId)}
        />

        <div className="flex flex-1 overflow-hidden">
          <SettingsCategorySidebar
            categories={SETTINGS_CATEGORIES}
            activeCategory={activeCategory}
            onSelect={categoryId => setActiveCategory(categoryId)}
            scrollbarClassName={WORKSPACE_SCROLLBAR_CLASS}
          />

          <div
            className="relative flex-1 bg-background/80 sm:border-l sm:border-border-color/70"
            role="tabpanel"
            id={`settings-panel-${activeCategory}`}
            aria-labelledby={`settings-tab-${activeCategory}`}
          >
            <div
              key={activeCategory}
              className={`h-full overflow-y-auto ${WORKSPACE_SCROLLBAR_CLASS} px-6 py-6 sm:px-9 sm:py-8 transition-opacity duration-200 ease-out`}
            >
              {activeCategoryConfig && (
                <div className="mb-6 hidden sm:block">
                  <h3 className="text-lg font-semibold text-text-primary">{activeCategoryConfig.label}</h3>
                  <p className="mt-1 text-sm text-text-secondary/80">{activeCategoryConfig.description}</p>
                </div>
              )}
              {renderCategoryContent()}
            </div>
          </div>
        </div>

        <SettingsModalFooter onClose={onClose} onSave={handleSave} onSaveAsPreset={handleSaveAsPreset} />
        <div
          className="absolute bottom-0 right-0 p-3 cursor-nwse-resize text-text-secondary/70 hover:text-primary transition-colors duration-150"
          onPointerDown={handleResizePointerDown}
          role="presentation"
          aria-hidden="true"
        >
          <div
            className={`pointer-events-none h-3 w-3 border-b border-r border-current ${
              isResizing ? 'opacity-100' : 'opacity-70'
            }`}
          />
        </div>
      </div>
    </div>
  );
};
