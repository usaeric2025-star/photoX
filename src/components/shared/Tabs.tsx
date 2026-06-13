import { ReactNode, useRef } from 'react';
import { cn } from '../../lib/utils';

interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  children: ReactNode; // Tab contents mapped by id
  className?: string;
  contentClassName?: string;
}

/**
 * Modern Tabs component with full ARIA support and keyboard navigation.
 * Uses flexbox and overflow control instead of sticky/z-index.
 */
export function Tabs({ 
  tabs, 
  activeTab, 
  onChange, 
  children, 
  className,
  contentClassName 
}: TabsProps) {
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const focusTab = (direction: 'prev' | 'next' | 'first' | 'last') => {
    const currentIndex = tabs.findIndex(t => t.id === activeTab);
    let nextIndex = currentIndex;

    if (direction === 'next') nextIndex = (currentIndex + 1) % tabs.length;
    else if (direction === 'prev') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    else if (direction === 'first') nextIndex = 0;
    else if (direction === 'last') nextIndex = tabs.length - 1;

    const nextTab = tabs[nextIndex];
    if (nextTab) {
      onChange(nextTab.id);
      tabRefs.current.get(nextTab.id)?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        focusTab('next');
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        focusTab('prev');
        break;
      case 'Home':
        e.preventDefault();
        focusTab('first');
        break;
      case 'End':
        e.preventDefault();
        focusTab('last');
        break;
    }
  };

  return (
    <div className={cn("flex flex-col h-full bg-white", className)}>
      <div 
        role="tablist" 
        onKeyDown={handleKeyDown}
        className="flex items-center gap-1 px-4 border-b border-slate-100 overflow-x-auto no-scrollbar shrink-0"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              ref={el => {
                if (el) tabRefs.current.set(tab.id, el);
                else tabRefs.current.delete(tab.id);
              }}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(tab.id)}
              className={cn(
                "relative flex items-center gap-2 px-4 py-4 text-sm font-bold transition-all whitespace-nowrap outline-none",
                isActive 
                  ? "text-brand-navy" 
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-50/50"
              )}
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              
              {isActive && (
                <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-brand-navy rounded-full animate-in fade-in zoom-in-y-0 duration-200" />
              )}
            </button>
          );
        })}
      </div>

      <div className={cn("flex-1 overflow-y-auto relative animate-fade-in", contentClassName)} key={activeTab}>
        <div
          role="tabpanel"
          id={`panel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
          className="w-full h-full focus:outline-none"
          tabIndex={0}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
