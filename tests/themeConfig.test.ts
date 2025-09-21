/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from 'vitest';
import { applyThemeTokens, THEME_TOKENS, THEME_STYLE_ELEMENT_ID } from '../config/themeConfig';

describe('themeConfig', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    document.documentElement.style.removeProperty('--border-default');
    document.documentElement.style.removeProperty('--border-selected');
    document.documentElement.style.removeProperty('--scrollbar-track');
    document.documentElement.style.removeProperty('--scrollbar-thumb');
    document.documentElement.style.removeProperty('--scrollbar-thumb-hover');
  });

  it('applies css variables and injects a global scrollbar style', () => {
    applyThemeTokens(document);
    expect(document.documentElement.style.getPropertyValue('--border-default')).toBe(THEME_TOKENS.borders.default);
    expect(document.documentElement.style.getPropertyValue('--border-selected')).toBe(THEME_TOKENS.borders.selected);
    const styleElement = document.getElementById(THEME_STYLE_ELEMENT_ID) as HTMLStyleElement | null;
    expect(styleElement).toBeTruthy();
    expect(styleElement?.textContent).toContain(THEME_TOKENS.scrollbars.track);
    expect(styleElement?.textContent).toContain('--border-default');
    expect(styleElement?.textContent).toContain('border-color: var(--border-default);');
    expect(styleElement?.textContent).toContain('outline-color: var(--border-selected);');
  });

  it('reuses the existing style element on repeated application', () => {
    applyThemeTokens(document);
    const initialStyleElement = document.getElementById(THEME_STYLE_ELEMENT_ID);
    applyThemeTokens(document);
    const reusedStyleElement = document.getElementById(THEME_STYLE_ELEMENT_ID);
    expect(initialStyleElement).toBe(reusedStyleElement);
  });
});
