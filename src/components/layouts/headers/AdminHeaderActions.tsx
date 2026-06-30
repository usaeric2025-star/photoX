import React from 'react';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/Icon';
import { isTaskDrawerOpenSignal } from '@/lib/store';

import { Theme, TranslationType } from '@/types';

interface AdminHeaderActionsProps {
  multiSelect: boolean;
  toggleMode: () => void;
  batchAiIdentify: () => void;
  taskCount: number;
  handleAuthAction: () => void;
  theme: Theme;
  t: TranslationType;
}

export function AdminHeaderActions({ 
  multiSelect, 
  toggleMode, 
  batchAiIdentify, 
  taskCount, 
  handleAuthAction, 
  theme, 
  t 
}: AdminHeaderActionsProps) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap shrink-0">
      <button
        onClick={toggleMode}
        className={cn("w-9 h-9 sm:w-10 sm:h-10", multiSelect ? theme.buttonActive : theme.button)}
        title={multiSelect ? t.exitSelectMode : t.selectModeToggle}
      >
        <Icon name="check-square" className="size-4 sm:size-4.5" />
      </button>

      <button
        onClick={batchAiIdentify}
        className={cn("w-9 h-9 sm:w-10 sm:h-10", theme.button)}
        title={t.aiSmartIdentify}
      >
        <Icon name="sparkles" className="size-4 sm:size-4.5 animate-pulse" />
      </button>

      <button
        onClick={() => isTaskDrawerOpenSignal.set(true)}
        className={cn("w-9 h-9 sm:w-10 sm:h-10 relative shrink-0", theme.button)}
        title={t.taskCenter}
      >
        <Icon name="activity" className="size-4 sm:size-4.5" />
        {taskCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[1rem] w-auto px-1 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-slate-950 animate-in zoom-in duration-300">
            {taskCount > 99 ? '99+' : taskCount}
          </span>
        )}
      </button>

      <button
        onClick={handleAuthAction}
        className={cn("w-9 h-9 sm:w-10 sm:h-10", theme.button)}
        title={t.viewModePublic}
      >
        <Icon name="layout-dashboard" className="size-4 sm:size-4.5" />
      </button>
    </div>
  );
}
