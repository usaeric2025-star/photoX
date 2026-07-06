import React from 'react';
import { cn } from '#lib/utils.js';
import { Icon } from '#src/components/ui/Icon.js';
import { isTaskDrawerOpenSignal } from '#lib/store/index.js';
import { Theme, TranslationType } from '#src/types/index.js';
import { NativePopover } from '#src/components/ui/NativePopover.js';
import { useAppRouter } from '#lib/router/index.js';

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
  const { navigate } = useAppRouter();
  
  const menuItems = [
    { id: 'gallery', icon: 'image' as const, label: t('gallery', '相冊圖庫'), onClick: navigate.admin },
    { id: 'batchEdit', icon: 'layers' as const, label: t('batchEdit', '批量編輯'), onClick: navigate.adminBatchEdit },
    { id: 'diagnostics', icon: 'activity' as const, label: t('diagnostics', '系統診斷'), onClick: navigate.adminDiagnostics },
    { id: 'errorLogs', icon: 'file-text' as const, label: t('errorLogs', '錯誤日誌'), onClick: navigate.adminDiagnosticsLogs },
    { id: 'divider1', divider: true },
    { id: 'settings', icon: 'settings' as const, label: t('settings', '系統設置'), onClick: navigate.settings }
  ];

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

      <NativePopover
        align="end"
        trigger={
          <button
            className={cn("w-9 h-9", theme.button)}
            title={t('adminMenu', '管理菜單')}
          >
            <Icon name="menu" size={18} />
          </button>
        }
      >
        <div className="flex flex-col min-w-[180px] p-1">
          {menuItems.map((item) => {
            if (item.divider) {
              return <div key={item.id} className="h-px bg-slate-200 my-1 mx-2" />;
            }
            return (
              <button 
                key={item.id}
                onClick={item.onClick}
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-slate-700 hover:bg-slate-100 transition-colors text-left"
              >
                <Icon name={item.icon} size={16} className="text-slate-500" />
                {item.label}
              </button>
            );
          })}
        </div>
      </NativePopover>

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
