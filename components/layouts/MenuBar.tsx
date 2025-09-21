import React, { useEffect, useRef, useState } from 'react';

interface MenuBarProps {
  onOpenSettings: () => void;
}

export const MenuBar: React.FC<MenuBarProps> = ({ onOpenSettings }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleToggle = () => setIsOpen(prev => !prev);

  const handleSettingsClick = () => {
    onOpenSettings();
    setIsOpen(false);
  };

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-border-color bg-surface/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-text-secondary">
          AI Content Suite
        </span>
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={handleToggle}
            className="inline-flex items-center gap-2 rounded-md bg-secondary px-3 py-1.5 text-sm font-semibold text-text-primary shadow-sm transition-colors duration-150 hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-surface"
            aria-haspopup="true"
            aria-expanded={isOpen}
          >
            Settings
            <span className={`transition-transform duration-150 ${isOpen ? 'rotate-180' : 'rotate-0'}`} aria-hidden="true">
              ▾
            </span>
          </button>
          {isOpen && (
            <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-md border border-border-color bg-surface shadow-xl">
              <button
                type="button"
                onClick={handleSettingsClick}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-text-primary hover:bg-secondary focus:outline-none focus:bg-secondary"
              >
                Workspace preferences
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
