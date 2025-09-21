/**
 * Theme token values centralized for reuse across components and runtime styling hooks.
 */
export const THEME_TOKENS = {
  borders: {
    default: '#2A2A2E',
    selected: '#3B82F6',
  },
  scrollbars: {
    track: '#1F1F23',
    thumb: '#3A3A3F',
    thumbHover: '#4A4A50',
  },
} as const;

/**
 * Identifier applied to the global style element responsible for injecting theme tokens.
 */
export const THEME_STYLE_ELEMENT_ID = 'global-theme-token-styles';

/**
 * Establishes CSS custom properties and cross-browser scrollbar styling so the application adheres to the
 * dark theme specification. The helper is resilient to repeated invocation and operates as a no-op on the
 * server where the DOM is unavailable.
 *
 * @param doc - Optional document reference, primarily used during testing. Defaults to the global document.
 */
export const applyThemeTokens = (doc: Document | undefined = typeof document !== 'undefined' ? document : undefined): void => {
  if (!doc) {
    return;
  }

  const root = doc.documentElement;
  root.style.setProperty('--border-default', THEME_TOKENS.borders.default);
  root.style.setProperty('--border-selected', THEME_TOKENS.borders.selected);
  root.style.setProperty('--scrollbar-track', THEME_TOKENS.scrollbars.track);
  root.style.setProperty('--scrollbar-thumb', THEME_TOKENS.scrollbars.thumb);
  root.style.setProperty('--scrollbar-thumb-hover', THEME_TOKENS.scrollbars.thumbHover);

  const styleContent = `:root {
  --border-default: ${THEME_TOKENS.borders.default};
  --border-selected: ${THEME_TOKENS.borders.selected};
  --scrollbar-track: ${THEME_TOKENS.scrollbars.track};
  --scrollbar-thumb: ${THEME_TOKENS.scrollbars.thumb};
  --scrollbar-thumb-hover: ${THEME_TOKENS.scrollbars.thumbHover};
}

*, *::before, *::after {
  border-color: var(--border-default);
}

:focus-visible {
  outline-color: var(--border-selected);
}

* {
  scrollbar-width: thin;
  scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track);
}

*::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}

*::-webkit-scrollbar-track {
  background: var(--scrollbar-track);
}

*::-webkit-scrollbar-thumb {
  background-color: var(--scrollbar-thumb);
  border-radius: 9999px;
  border: 3px solid var(--scrollbar-track);
}

*::-webkit-scrollbar-thumb:hover {
  background-color: var(--scrollbar-thumb-hover);
}`;

  let styleElement = doc.getElementById(THEME_STYLE_ELEMENT_ID) as HTMLStyleElement | null;
  if (!styleElement) {
    styleElement = doc.createElement('style');
    styleElement.id = THEME_STYLE_ELEMENT_ID;
    doc.head.appendChild(styleElement);
  }
  styleElement.textContent = styleContent;
};
