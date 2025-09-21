import { useCallback, useEffect, useState } from 'react';
import { UI_STORAGE_KEYS } from '../config/uiConfig';

export const useLayoutPreferences = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    const saved = localStorage.getItem(UI_STORAGE_KEYS.sidebarState);
    return saved === 'collapsed';
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    localStorage.setItem(UI_STORAGE_KEYS.sidebarState, isSidebarCollapsed ? 'collapsed' : 'expanded');
  }, [isSidebarCollapsed]);

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed(prev => !prev);
  }, []);

  return {
    isSidebarCollapsed,
    toggleSidebar,
  } as const;
};
