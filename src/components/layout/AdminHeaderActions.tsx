import React from 'react';
import { cn } from '#lib/utils.js';
import { Icon } from '#src/components/ui/Icon.js';
import { isTaskDrawerOpenSignal } from '#lib/store/index.js';
import { User, Theme, TranslationType } from '#src/types/index.js';
import { NativePopover } from '#src/components/ui/NativePopover.js';
import { useAppRouter } from '#lib/router/index.js';
import { LanguageSwitcher } from '#src/components/ui/LanguageSwitcher.js';
import { usePermission } from '#src/hooks/index.js';

interface AdminHeaderActionsProps {
  multiSelect: boolean;
  toggleMode: () => void;
  batchAiIdentify: () => void;
  taskCount: number;
  handleAuthAction: () => void;
  theme: Theme;
  t: (key: string, ...args: unknown[]) => string;
  user: User | null;
  signOut: () => void;
  isStaff: boolean;
  lang: string;
}

export function AdminHeaderActions({ 
  multiSelect, 
  toggleMode, 
  batchAiIdentify, 
  taskCount, 
  handleAuthAction, 
  theme, 
  t = (key: string) => key,
  user,
  signOut,
  isStaff,
  lang
}: AdminHeaderActionsProps) {
  const { navigate } = useAppRouter();
  const { can } = usePermission();
  const canBatchEdit = can('photo:batch-edit');
  const canManageSystem = can('system:settings');
  const canAccessDiagnostics = can('admin:dashboard:access');
  
  const menuItems = [
    { id: 'gallery', icon: 'image' as const, label: t('gallery', '相冊圖庫'), onClick: navigate.admin },
    ...(canBatchEdit ? [{ id: 'batchEdit', icon: 'layers' as const, label: t('batchEdit', '批量編輯'), onClick: navigate.adminBatchEdit }] : []),
    ...(canAccessDiagnostics ? [
      { id: 'diagnostics', icon: 'activity' as const, label: t('diagnostics', '系統診斷'), onClick: navigate.adminDiagnostics },
      { id: 'errorLogs', icon: 'file-text' as const, label: t('errorLogs', '錯誤日誌'), onClick: navigate.adminDiagnosticsLogs }
    ] : []),
    ...(canManageSystem ? [
      { id: 'divider1', divider: true },
      { id: 'settings', icon: 'settings' as const, label: t('settings', '系統設置'), onClick: navigate.settings }
    ] : [])
  ];

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap shrink-0">
      {canBatchEdit && (
        <button
          onClick={toggleMode}
          className={cn("w-9 h-9", multiSelect ? theme.buttonActive : theme.button)}
          title={multiSelect ? t('exitSelectMode') : t('selectModeToggle')}
        >
          <Icon name="check-square" size={18} />
        </button>
      )}

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
        <div className="flex flex-col min-w-[220px] p-1 gap-1">
          {isStaff ? (
            <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 select-none">
              <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-white overflow-hidden text-[8px] shrink-0">
                {user?.photoUrl && user.photoUrl.trim() !== '' ? (
                  <img src={user.photoUrl} referrerPolicy="no-referrer" alt="" loading="lazy" />
                ) : (
                  <Icon name="user" size={10} />
                )}
              </div>
              <span className="truncate">{user ? user.email?.split("@")[0] : t('loginTitleStaff')}</span>
            </div>
          ) : (
            <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none">
              {t('guestLabel')}
            </div>
          )}

          <div className="h-px bg-slate-100 my-1 mx-2" />

          <div className="flex flex-col gap-0.5">
            {menuItems.map((item) => {
              if (item.divider) {
                return <div key={item.id} className="h-px bg-slate-100 my-1 mx-2" />;
              }
              return (
                <button 
                  key={item.id}
                  onClick={item.onClick}
                  className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-slate-700 hover:bg-slate-100 transition-colors text-left"
                >
                  <Icon name={item.icon} size={16} className="text-slate-500" />
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="h-px bg-slate-100 my-1 mx-2" />

          <div className="px-2 py-1">
            <LanguageSwitcher mode="segmented" />
          </div>

          {isStaff && (
            <>
              <div className="h-px bg-slate-100 my-1 mx-2" />
              <button
                type="button"
                onClick={signOut}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors text-left"
              >
                <Icon name="log-out" size={16} />
                {t('signOutAccount')}
              </button>
            </>
          )}
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
