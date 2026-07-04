import React from 'react';
import { Icon } from '#src/components/ui/Icon.js';

interface ScrollToTopButtonProps {
  show: boolean;
  onClick: () => void;
  className?: string;
}

export function ScrollToTopButton({ show, onClick, className }: ScrollToTopButtonProps) {
  if (!show) return null;

  return (
    <button
      onClick={onClick}
      type="button"
      className={`absolute bottom-24 right-8 z-[9999] w-12 h-12 flex items-center justify-center rounded-full bg-slate-900/95 text-white border border-slate-800 shadow-xl hover:bg-slate-800 transition-all active:scale-90 focus:outline-none animate-in fade-in slide-in-from-bottom-3 duration-300 ${className || ''}`}
      title="Scroll to Top"
    >
      <Icon name="chevron-up" size={22} />
    </button>
  );
}
