import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';


interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTabId: string;
  onTabChange: (id: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTabId, onTabChange }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkForScrollability = useCallback(() => {
    const el = scrollContainerRef.current;
    if (el) {
      const hasOverflow = el.scrollWidth > el.clientWidth;
      setCanScrollLeft(hasOverflow && el.scrollLeft > 0);
      setCanScrollRight(hasOverflow && el.scrollLeft < el.scrollWidth - el.clientWidth - 1); // -1 for precision
    }
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) {
      checkForScrollability();
      // Check on resize
      const resizeObserver = new ResizeObserver(checkForScrollability);
      resizeObserver.observe(el);
      // Check on tab change
      const activeButton = el.querySelector(`[aria-selected="true"]`);
      if (activeButton) {
        activeButton.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
      return () => resizeObserver.disconnect();
    }
  }, [tabs, activeTabId, checkForScrollability]);

  const handleScroll = () => {
    checkForScrollability();
  };
  
  const scroll = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (el) {
        const scrollAmount = el.clientWidth * 0.8; // Scroll 80% of the visible width
        el.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth'
        });
    }
  };

  return (
    <div className="relative">
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 flex items-center bg-gradient-to-r from-surface to-transparent pr-8 z-10">
          <button onClick={() => scroll('left')} className="p-1 rounded-full bg-slate-700/80 hover:bg-slate-600 text-white transition-colors" aria-label="Scroll left">
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
        </div>
      )}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex border-b border-border-color overflow-x-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        role="tablist" 
        aria-label="Analysis Modes"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            role="tab"
            aria-selected={activeTabId === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            className={`flex-shrink-0 px-4 py-3 sm:px-6 font-medium text-sm sm:text-base focus:outline-none transition-colors duration-150 whitespace-nowrap
              ${
                activeTabId === tab.id
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-text-secondary hover:text-text-primary hover:border-b-2 hover:border-slate-500'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>
       {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 flex items-center bg-gradient-to-l from-surface to-transparent pl-8 z-10">
          <button onClick={() => scroll('right')} className="p-1 rounded-full bg-slate-700/80 hover:bg-slate-600 text-white transition-colors" aria-label="Scroll right">
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};