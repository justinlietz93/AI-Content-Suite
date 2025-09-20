import { useCallback, useEffect, useMemo, useState } from 'react';
import { UI_STORAGE_KEYS, UI_DIMENSIONS } from '../config/uiConfig';

const MIN_CONTENT_WIDTH = UI_DIMENSIONS.workspace.minContentWidth;
const MAX_CONTENT_WIDTH = UI_DIMENSIONS.workspace.maxContentWidth;
const DEFAULT_LAYOUT_PERCENT = UI_DIMENSIONS.workspace.defaultContentWidthPercent;

export const useLayoutPreferences = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    const saved = localStorage.getItem(UI_STORAGE_KEYS.sidebarState);
    return saved === 'collapsed';
  });

  const [contentWidthPercent, setContentWidthPercent] = useState<number>(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_LAYOUT_PERCENT;
    }
    const saved = Number(localStorage.getItem(UI_STORAGE_KEYS.layoutWidth));
    return Number.isFinite(saved) && saved >= 0 && saved <= 100 ? saved : DEFAULT_LAYOUT_PERCENT;
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    localStorage.setItem(UI_STORAGE_KEYS.sidebarState, isSidebarCollapsed ? 'collapsed' : 'expanded');
  }, [isSidebarCollapsed]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    localStorage.setItem(UI_STORAGE_KEYS.layoutWidth, String(contentWidthPercent));
  }, [contentWidthPercent]);

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed(prev => !prev);
  }, []);

  const contentWidthPixels = useMemo(
    () => MIN_CONTENT_WIDTH + ((MAX_CONTENT_WIDTH - MIN_CONTENT_WIDTH) * contentWidthPercent) / 100,
    [contentWidthPercent],
  );

  const appliedContentWidth = useMemo(
    () => (contentWidthPercent >= 100 ? '100%' : `${Math.round(contentWidthPixels)}px`),
    [contentWidthPercent, contentWidthPixels],
  );

  const contentWidthLabel = useMemo(
    () => (contentWidthPercent >= 100 ? 'Full width' : `${Math.round(contentWidthPixels)}px`),
    [contentWidthPercent, contentWidthPixels],
  );

  return {
    isSidebarCollapsed,
    toggleSidebar,
    contentWidthPercent,
    setContentWidthPercent,
    appliedContentWidth,
    contentWidthLabel,
  } as const;
};
