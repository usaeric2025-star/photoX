import React from 'react';
import { cn } from '#lib/utils.js';
import { Icon } from '#src/components/ui/Icon.js';

export interface ModeSwitchProps {
  mode: 'to-public' | 'to-admin' | 'to-staff';
  onClick: () => void;
  title?: string;
  className?: string;
  buttonStyle?: string;
}

export function ModeSwitch({ mode, onClick, title, className, buttonStyle }: ModeSwitchProps) {
  const iconName = mode === 'to-public' ? 'eye' : 'layout-dashboard';
  
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-10 h-10 shrink-0 rounded-lg flex items-center justify-center transition-all outline-none border shadow-xs cursor-pointer",
        buttonStyle || "bg-white hover:bg-slate-100 text-slate-600 border-slate-200 hover:text-slate-900",
        className
      )}
      title={title}
    >
      <Icon name={iconName} size={20} />
    </button>
  );
}
