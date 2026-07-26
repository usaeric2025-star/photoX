import React from 'react';
import { Icon } from '#src/components/ui/Icon.js';

interface StandardModalLayoutProps {
  children: React.ReactNode;
  onClose: () => void;
  title?: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  hideHeader?: boolean;
  className?: string;
}

/**
 * A standard layout for large modals/dialogs (e.g., Settings, Edit, Upload).
 * Provides a sticky header, scrollable content area, and optional footer.
 */
export function StandardModalLayout({ 
  children, 
  onClose, 
  title, 
  header,
  footer,
  hideHeader,
  className 
}: StandardModalLayoutProps) {
  return (
    <div className={`h-full bg-slate-50 flex flex-col animate-fade-up ${className || ''}`}>
      {!hideHeader && (
        <header className="sticky-header-surface">
          {header ? header : (
            <>
              <div className="px-2">
                {title && <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest">{title}</h2>}
              </div>
              <button 
                onClick={onClose} 
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-900"
                title="Close"
              >
                <Icon name="x" size={24} />
              </button>
            </>
          )}
        </header>
      )}
      
      <main className="flex-1 overflow-y-auto w-full no-scrollbar px-4 sm:px-8 pb-28 sm:pb-36">
        {children}
      </main>

      {footer && (
        <footer className="p-4 bg-white border-t border-slate-100 shrink-0">
          {footer}
        </footer>
      )}
    </div>
  );
}
