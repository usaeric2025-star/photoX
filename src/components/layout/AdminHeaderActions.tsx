import React from 'react';
import { cn } from '#lib/utils.js';
import { Icon } from '#src/components/ui/Icon.js';
import { useSetAtom } from "jotai";
import { isTaskDrawerOpen } from '#lib/store/index.js';
import { User, Theme } from '#src/types/index.js';
import { NativePopover } from '#src/components/ui/NativePopover.js';
import { useAppLocation } from '#src/hooks/core/index.js';
import { LanguageSwitcher } from '#src/components/ui/LanguageSwitcher.js';
import { usePermission } from '#src/hooks/index.js';
import { ADMIN_ROUTES } from '#src/constants/config.js';

interface AdminHeaderActionsProps {
  multiSelect: boolean;
  toggleMode: () => void;
  batchAiIdentify: () => void;
  isAiAnalyzing?: boolean;
  taskCount: number;
  handleAuthAction: () => void;
  theme: Theme;
  t: (key: string, ...args: unknown[]) => string;
  user: User | null;
  signOut: () => void;
  lang: string;
}

export function AdminHeaderActions({ 
  multiSelect, 
  toggleMode, 
  batchAiIdentify,
  isAiAnalyzing,
  taskCount, 
  handleAuthAction, 
  theme, 
  t = (key: string) => key,
  user,
  signOut,
}: AdminHeaderActionsProps) {
  const [, setLocation] = useAppLocation();
  const setTaskDrawerOpen = useSetAtom(isTaskDrawerOpen);
  const { can } = usePermission();
  const canBatchEdit = can('photo:batch-edit');
  const canAiAnalyze = can('photo:ai-analyze');
  const canManageSystem = can('system:settings');
  const canAccessDiagnostics = can('admin:dashboard:access');

  const isStaff = user?.role === 'staff' || user?.id === 'staff-user';

  const menuItems = [
    ...(canBatchEdit ? [{ id: 'batchEdit', icon: 'layers' as const, label: t('batchEdit', '批量編輯'), onClick: () => setLocation(ADMIN_ROUTES.BATCH_EDIT) }] : []),
    ...(canAccessDiagnostics ? [
      { id: 'errorLogs', icon: 'file-text' as const, label: t('errorLogs', '錯誤日誌'), onClick: () => setLocation(ADMIN_ROUTES.ERROR_LOGS) }
    ] : []),
    ...(canManageSystem ? [
      { id: 'divider1', divider: true },
      { id: 'settings', icon: 'settings' as const, label: t('settings', '系統設置'), onClick: () => setLocation(ADMIN_ROUTES.SETTINGS) }
    ] : [])
  ];

  return (
    <div className="flex items-center gap-2 flex-nowrap shrink-0">
      {canBatchEdit && (
        <button
          type="button"
          onClick={toggleMode}
          className={cn("w-10 h-10", multiSelect ? theme.buttonActive : theme.button)}
          title={multiSelect ? t('exitSelectMode') : t('selectModeToggle')}
        >
          <Icon name="check-square" size={20} />
        </button>
      )}
      {canAiAnalyze && (
        <button
          type="button"
          onClick={() => batchAiIdentify()}
          disabled={isAiAnalyzing}
          className={cn("w-10 h-10 disabled:opacity-50 disabled:cursor-not-allowed", theme.button)}
          title={t('aiSmartIdentify')}
        >
          {isAiAnalyzing ? (
            <Icon name="loader" size={20} className="animate-spin text-blue-600" />
          ) : (
            <Icon name="sparkles" size={20} className="" />
          )}
        </button>
      )}

      <button
        type="button"
        onClick={() => { setTaskDrawerOpen(true); }}
        className={cn("w-10 h-10 relative shrink-0", theme.button)}
        title={t('taskCenter')}
      >
        <Icon name="activity" size={20} />
        {taskCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[1rem] w-auto px-1 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-slate-900 animate-in zoom-in duration-300">
            {taskCount > 99 ? '99+' : taskCount}
          </span>
        )}
      </button>

      {/* 公開頁面 / 前台視圖轉換按鈕 (直接放置於 Header) */}
      <button
        type="button"
        onClick={handleAuthAction}
        className={cn("w-10 h-10", theme.button)}
        title={t('viewModePublic', '查看前台視圖')}
      >
        <Icon name="eye" size={20} />
      </button>

      <NativePopover
        align="end"
        trigger={
          <button
            type="button"
            className={cn("w-10 h-10", theme.button)}
            title={t('adminMenu', '管理菜單')}
          >
            <Icon name="menu" size={20} />
          </button>
        }
      >
        <div className="flex flex-col min-w-[220px] p-1 gap-1">
          {user ? (
            <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 select-none">
              <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-white overflow-hidden text-[8px] shrink-0">
                {user?.photoUrl && user.photoUrl.trim() !== '' ? (
                  <img src={user.photoUrl} referrerPolicy="no-referrer" alt=""  />
                ) : (
                  <Icon name="user" size={10} />
                )}
              </div>
              <span className="truncate">{user.email?.split("@")[0] || t('loginTitleStaff')}</span>
            </div>
          ) : (
            <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none">
              {t('guestLabel')}
            </div>
          )}
          <div className="h-px bg-slate-100 my-1 mx-2" />
          <div className="flex flex-col gap-0.5">
            {menuItems.map((item: { id: string; icon?: import('#src/components/ui/Icon.js').IconName; label?: string; onClick?: () => void; divider?: boolean }) => {
              if (item.divider) {
                return <div key={item.id} className="h-px bg-slate-100 my-1 mx-2" />;
              }
              return (
                <button 
                   key={item.id}
                   type="button"
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
          <div className="px-3 py-1.5 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
              <Icon name="globe" size={12} />
              <span>{t('language') || '语言 / Language'}</span>
            </div>
            <LanguageSwitcher mode="segmented" />
          </div>
          {user && (
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
    </div>
  );
}
