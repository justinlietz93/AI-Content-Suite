import { useCallback, useEffect, useMemo, useState } from 'react';

const SIDEBAR_STATE_STORAGE_KEY = 'ai_content_suite_sidebar_state';
const LAYOUT_WIDTH_STORAGE_KEY = 'ai_content_suite_layout_width';
const MIN_CONTENT_WIDTH = 640;
const MAX_CONTENT_WIDTH = 1440;
const DEFAULT_LAYOUT_PERCENT = 70;

export const useLayoutPreferences = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    const saved = localStorage.getItem(SIDEBAR_STATE_STORAGE_KEY);
    return saved === 'collapsed';
  });

  const [contentWidthPercent, setContentWidthPercent] = useState<number>(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_LAYOUT_PERCENT;
    }
    const saved = Number(localStorage.getItem(LAYOUT_WIDTH_STORAGE_KEY));
    return Number.isFinite(saved) && saved >= 0 && saved <= 100 ? saved : DEFAULT_LAYOUT_PERCENT;
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    localStorage.setItem(SIDEBAR_STATE_STORAGE_KEY, isSidebarCollapsed ? 'collapsed' : 'expanded');
  }, [isSidebarCollapsed]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    localStorage.setItem(LAYOUT_WIDTH_STORAGE_KEY, String(contentWidthPercent));
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
