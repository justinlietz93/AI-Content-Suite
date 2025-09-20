/**
 * Generates a CSS `min()` expression representing a viewport-relative size clamped by a pixel ceiling.
 * The helper ensures consistent string formatting for height constraints used throughout the UI.
 *
 * @param ratio - Fraction of the viewport height to target (e.g. 0.75 for 75vh).
 * @param maxPx - Maximum pixel height allowed for the constraint.
 * @returns A CSS string using the `min()` function to combine viewport and pixel values.
 */
const viewportClamp = (ratio: number, maxPx: number): string => {
  const clampedRatio = Number.isFinite(ratio) ? Math.max(0, Math.min(ratio, 1)) : 0;
  const clampedMaxPx = Number.isFinite(maxPx) ? Math.max(0, Math.round(maxPx)) : 0;
  const ratioPercent = Math.round(clampedRatio * 100);
  return `min(${ratioPercent}vh, ${clampedMaxPx}px)`;
};

/**
 * Local storage keys used to persist layout preferences between sessions.
 */
export const UI_STORAGE_KEYS = {
  sidebarState: 'ai_content_suite_sidebar_state',
  layoutWidth: 'ai_content_suite_layout_width',
} as const;

/**
 * Canonical UI measurements leveraged across the workspace. Storing these values here keeps
 * layout math consistent while giving designers a single place to fine-tune proportions.
 */
export const UI_DIMENSIONS = {
  workspace: {
    minContentWidth: 640,
    maxContentWidth: 1440,
    defaultContentWidthPercent: 70,
    cardMinHeightViewportRatio: 0.75,
    cardMinHeightMaxPx: 960,
  },
  chat: {
    viewerMaxHeightRatio: 0.75,
    viewerMaxHeightMaxPx: 960,
    heightViewportRatio: 0.75,
  },
  settingsModal: {
    defaultWidth: 1360,
    defaultHeight: 840,
    minWidth: 720,
    minHeight: 600,
    maxWidth: 1600,
    maxHeight: 960,
    viewportMarginX: 32,
    viewportMarginY: 48,
  },
} as const;

/**
 * Scrollbar theming identifiers for the workspace settings modal. Consumers can opt-in to the
 * darker scrollbar styling by applying the exported class name and ensuring the style tag exists.
 */
export const SETTINGS_SCROLLBAR_THEME = {
  styleId: 'workspace-settings-scrollbar-theme',
  className: 'workspace-settings-scrollbar',
} as const;

/**
 * Pre-computed CSS constraint ensuring the main workspace card maintains parity with the chat
 * experience regardless of which feature tab is active.
 */
export const WORKSPACE_CARD_MIN_HEIGHT = viewportClamp(
  UI_DIMENSIONS.workspace.cardMinHeightViewportRatio,
  UI_DIMENSIONS.workspace.cardMinHeightMaxPx,
);

/**
 * Pre-computed CSS constraint limiting chat transcript scroll regions to a comfortable height.
 */
export const CHAT_VIEWER_MAX_HEIGHT = WORKSPACE_CARD_MIN_HEIGHT;

/**
 * Derived clamp mirroring the chat height ratio used when aligning the settings modal footprint.
 */
export const CHAT_HEIGHT_CLAMP = viewportClamp(
  UI_DIMENSIONS.chat.heightViewportRatio,
  UI_DIMENSIONS.settingsModal.maxHeight,
);
