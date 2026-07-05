import React from 'react';
import { cn } from '#lib/utils.js';
import { Icon } from '#src/components/ui/Icon.js';
import { isTaskDrawerOpenSignal } from '#lib/store/index.js';

import { Theme, TranslationType } from '#src/types/index.js';

interface AdminHeaderActionsProps {
  multiSelect: boolean;
  toggleMode: () => void;
  batchAiIdentify: () => void;
  taskCount: number;
  handleAuthAction: () => void;
  theme: Theme;
  t: (key: string, ...args: any[]) => any;
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
        className={cn("w-9 h-9", multiSelect ? theme.buttonActive : theme.button)}
        title={multiSelect ? t('exitSelectMode') : t('selectModeToggle')}
      >
        <Icon name="check-square" size={18} />
      </button>

      <button
        onClick={() => batchAiIdentify()}
        className={cn("w-9 h-9", theme.button)}
        title={t('aiSmartIdentify')}
      >
        <Icon name="sparkles" size={18} className="animate-pulse" />
      </button>

      <button
        onClick={() => { isTaskDrawerOpenSignal.value = true; }}
        className={cn("w-9 h-9 relative shrink-0", theme.button)}
        title={t('taskCenter')}
      >
        <Icon name="activity" size={18} />
        {taskCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[1rem] w-auto px-1 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white animate-in zoom-in duration-300">
            {taskCount > 99 ? '99+' : taskCount}
          </span>
        )}
      </button>

      <button
        onClick={handleAuthAction}
        className={cn("w-9 h-9", theme.button)}
        title={t('viewModePublic')}
      >
        <Icon name="layout-dashboard" size={18} />
      </button>
    </div>
  );
}
