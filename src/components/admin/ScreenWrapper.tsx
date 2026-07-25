import React from 'react';
import { Icon } from '#src/components/ui/Icon.js';

interface ScreenWrapperProps {
  children: React.ReactNode;
  onClose: () => void;
  title?: string;
}

export function ScreenWrapper({ children, onClose, title }: ScreenWrapperProps) {
  return (
    <div className="h-full bg-slate-50 flex flex-col ">
      <div className="flex items-center justify-between p-4 shrink-0 bg-slate-50 border-b border-slate-100">
        <div className="px-2">
          {title && <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest">{title}</h2>}
        </div>
        <button 
          type="button"
          onClick={onClose} 
          className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500 hover:text-slate-900"
        >
          <Icon name="x" size={24} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto w-full no-scrollbar px-4 sm:px-8 pb-8">
        {children}
      </div>
    </div>
  );
}
